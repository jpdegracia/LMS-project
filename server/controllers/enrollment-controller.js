import { Enrollment } from '../models/EnrollmentSchema.js';
import { User } from '../models/UserSchema.js';
import { Course } from '../models/CourseSchema.js';
import { Module } from '../models/ModuleSchema.js';
import { PracticeTestAttempt } from '../models/PracticeTestAttemptSchema.js';
import { QuizAttempt } from '../models/QuizAttemptSchema.js';
import mongoose from 'mongoose';

// Helper function for consistent error handling and response structure
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[API Error] Status: ${statusCode}, Message: ${message}`, errorDetails);
    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};

export const calculateOverallCourseProgress = async (enrollmentDoc, session = null) => {
    try {
        const course = await Course.findById(enrollmentDoc.courseId)
            .populate({
                path: 'sections',
                options: { sort: { order: 1 } },
                populate: {
                    path: 'modules',
                    model: 'Module',
                    options: { sort: { order: 1 } },
                    populate: {
                        path: 'contents',
                        model: 'LessonContent'
                    }
                }
            })
            .session(session)
            .lean();

        if (!course || !course.sections || course.sections.length === 0) {
            console.log(`[Progress Calc] Course ${enrollmentDoc.courseId} has no sections. Returning 0.`);
            return 0;
        }

        let totalProgressUnits = 0;
        let completedProgressUnits = 0;
        
        const completedModules = new Set(enrollmentDoc.completedModules?.map(m => m.moduleId.toString()) || []);
        const completedContentIds = new Set(enrollmentDoc.completedContentIds?.map(String) || []);

        for (const section of course.sections) {
            for (const module of section.modules) {
                if (module.moduleType === 'lesson' && module.contents && module.contents.length > 0) {
                    const moduleContentIds = module.contents.map(c => c._id.toString());
                    totalProgressUnits += moduleContentIds.length;
                    
                    for (const contentId of moduleContentIds) {
                        if (completedContentIds.has(contentId)) {
                            completedProgressUnits++;
                        }
                    }
                } else if (module.moduleType === 'quiz') {
                    totalProgressUnits += 1;
                    if (completedModules.has(module._id.toString())) {
                        completedProgressUnits++;
                    }
                }
            }
        }

        if (totalProgressUnits === 0) {
            return 0;
        }

        const progress = (completedProgressUnits / totalProgressUnits) * 100;
        return Math.min(100, Math.round(progress));
    } catch (error) {
        console.error('[Progress Calc] Error in calculateOverallCourseProgress:', error);
        return 0;
    }
};

export const recalculateProgressOnCourseUpdate = async (courseId, session) => {
    try {
        const enrollments = await Enrollment.find({ courseId }).session(session);
        const updatePromises = enrollments.map(async (enrollment) => {
            const newProgress = await calculateOverallCourseProgress(enrollment, session);
            if (enrollment.progressPercentage !== newProgress) {
                enrollment.progressPercentage = newProgress;
                if (newProgress < 100 && enrollment.status === 'completed') {
                    enrollment.status = 'in-progress';
                } else if (newProgress === 100 && enrollment.status === 'in-progress') {
                    enrollment.status = 'completed';
                }
                await enrollment.save({ session });
            }
        });
        await Promise.all(updatePromises);
    } catch (error) {
        console.error(`[Recalculate Progress] Error recalculating progress for course ${courseId}:`, error);
        throw error;
    }
};

export const enrollInCourse = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const { courseId } = req.body;
        const userId = req.user._id;
        const course = await Course.findById(courseId).session(session);
        if (!course) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Course not found.');
        }
        let enrollment = await Enrollment.findOne({ userId, courseId }).session(session);
        if (enrollment) {
            await session.abortTransaction();
            return res.status(200).json({ success: true, message: 'Already enrolled in this course.', data: enrollment });
        }
        
        enrollment = new Enrollment({
            userId,
            courseId,
            status: 'enrolled',
            progressPercentage: 0,
            grade: null,
            completedModules: [],
            completedContentIds: [],
            quizAttempts: [],
            quizGradeDetails: {
                totalPointsEarned: 0,
                totalPointsPossible: 0
            },
            lastAccessedAt: new Date(),
        });
        
        await enrollment.save({ session });
        await session.commitTransaction();
        res.status(201).json({ success: true, message: 'Enrolled successfully.', data: enrollment });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error('Error enrolling in course:', error);
        if (error.code === 11000) {
            return sendErrorResponse(res, 409, 'You are already enrolled in this course.');
        }
        sendErrorResponse(res, 500, 'Server error during enrollment.', error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

/**
 * @desc    Updates progress for a user in a course
 * @route   POST /enrollments/mark-progress
 * @access  Private (User requires 'enrollment:update' permission)
 */
export const markProgress = async (req, res) => {
    const userId = req.user._id;
    const { courseId, moduleId, contentId, statusUpdate, quizAttemptId, progressPercentage } = req.body;
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const enrollment = await Enrollment.findOne({ userId, courseId }).session(session);
        if (!enrollment) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Enrollment not found.');
        }

        let hasProgressChanged = false;
        const moduleIdObj = new mongoose.Types.ObjectId(moduleId);

        // Find existing progress for this module
        let moduleProgress = enrollment.completedModules.find(m => m.moduleId.equals(moduleIdObj));

        switch (statusUpdate) {
            case 'content_viewed':
                if (contentId && !enrollment.completedContentIds.some(cId => cId.equals(contentId))) {
                    enrollment.completedContentIds.push(contentId);
                    hasProgressChanged = true;
                }
                break;

            case 'quiz_completed':
                if (moduleId && !moduleProgress) {
                    const quizAttempt = await QuizAttempt.findById(quizAttemptId).session(session);
                    if (!quizAttempt || !quizAttempt.passed) { 
                        await session.abortTransaction();
                        return sendErrorResponse(res, 400, 'Quiz must be passed to mark module as complete.');
                    }
                    enrollment.completedModules.push({ moduleId: moduleIdObj, progressPercentage: 100, completionDate: new Date() });
                    hasProgressChanged = true;
                } else if (moduleProgress) {
                    moduleProgress.progressPercentage = 100;
                    moduleProgress.completionDate = new Date();
                    hasProgressChanged = true;
                }
                break;
            
            // NEW CASE: To handle partial quiz progress
            case 'quiz_in_progress':
                if (!moduleProgress) {
                    enrollment.completedModules.push({ moduleId: moduleIdObj, progressPercentage: progressPercentage, completionDate: null });
                } else {
                    moduleProgress.progressPercentage = progressPercentage;
                }
                hasProgressChanged = true;
                break;

            case 'module_completed':
                if (moduleId && !moduleProgress) {
                    const lessonModule = await Module.findById(moduleId).session(session).lean();
                    if (!lessonModule || lessonModule.moduleType !== 'lesson' || !lessonModule.contents) {
                        await session.abortTransaction();
                        return sendErrorResponse(res, 400, 'Invalid module or module type.');
                    }
                    
                    const totalContents = lessonModule.contents.length;
                    const completedContentsInModule = enrollment.completedContentIds.filter(cId => 
                        lessonModule.contents.some(contentRef => contentRef.equals(cId))
                    ).length;
                    
                    if (totalContents === completedContentsInModule && totalContents > 0) {
                        enrollment.completedModules.push({ moduleId: moduleIdObj, completionDate: new Date() });
                        hasProgressChanged = true;
                    } else {
                        await session.abortTransaction();
                        return sendErrorResponse(res, 400, 'Not all content in this lesson module has been completed.');
                    }
                }
                break;
            default:
                break;
        }

        if (enrollment.status === 'enrolled' && hasProgressChanged) {
            enrollment.status = 'in-progress';
        }
        
        if (hasProgressChanged) {
            enrollment.lastActiveModuleId = moduleId;
            enrollment.lastViewedAt = new Date();
            const newProgress = await calculateOverallCourseProgress(enrollment, session);
            enrollment.progressPercentage = newProgress;
            
            if (newProgress === 100) {
                enrollment.status = 'completed';
            }
            await enrollment.save({ session });
        }

        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Progress updated successfully.', data: enrollment });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error('[Enrollment Controller] Error marking progress:', error);
        sendErrorResponse(res, 500, 'Failed to update progress.', error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

export const resetProgress = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const { courseId } = req.body;
        const userId = req.user._id;
        const enrollment = await Enrollment.findOne({ userId, courseId }).session(session);
        if (!enrollment) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Enrollment not found.');
        }
        enrollment.completedModules = [];
        enrollment.completedContentIds = [];
        enrollment.progressPercentage = 0;
        enrollment.grade = null;
        enrollment.status = 'enrolled';
        await enrollment.save({ session });
        await QuizAttempt.deleteMany({ userId, enrollmentId: enrollment._id }).session(session);
        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Course progress reset successfully.', data: enrollment });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error('CRITICAL BACKEND ERROR in resetProgress:', error);
        sendErrorResponse(res, 500, 'Server error resetting progress.', error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

export const getAllUserEnrollments = async (req, res) => {
    const userId = req.user._id;
    try {
        const enrollments = await Enrollment.find({ userId })
            .populate('courseId', 'title description difficulty thumbnail contentType')
            .sort({ enrollmentDate: -1 })
            .lean();
        const validEnrollments = enrollments.filter(e => e.courseId);
        const enrollmentsWithProgress = await Promise.all(validEnrollments.map(async (enrollment) => {
            const progress = await calculateOverallCourseProgress(enrollment);
            return {
                ...enrollment,
                progressPercentage: progress
            };
        }));
        res.status(200).json({ success: true, data: enrollmentsWithProgress });
    } catch (error) {
        console.error('CRITICAL BACKEND ERROR in getAllUserEnrollments:', error);
        sendErrorResponse(res, 500, 'Server error fetching all user enrollments.', error.message);
    }
};

export const getEnrollmentByCourseId = async (req, res) => {
    const userId = req.user._id;
    const { courseId } = req.params;
    try {
        const enrollment = await Enrollment.findOne({ userId, courseId })
            .populate({
                path: 'courseId',
                select: 'title description difficulty thumbnail sections',
                populate: {
                    path: 'sections',
                    model: 'Section',
                    options: { sort: { order: 1 } },
                    populate: [
                        { path: 'modules', model: 'Module', options: { sort: { order: 1 } } },
                        { path: 'modules.contents', model: 'LessonContent' }
                    ]
                }
            })
            .lean();
        if (!enrollment) {
            return res.status(200).json({
                success: true,
                message: 'Enrollment not found for this course and user.',
                data: null
            });
        }
        const mapCompletedIds = (item) => (item && item._id) ? item._id : item;
        const responseData = {
            ...enrollment,
            completedContentIds: enrollment.completedContentIds?.map(mapCompletedIds),
            completedModuleIds: enrollment.completedModules?.map(m => mapCompletedIds(m.moduleId)),
        };
        res.status(200).json({ success: true, data: responseData });
    } catch (error) {
        console.error('CRITICAL BACKEND ERROR in getEnrollmentByCourseId:', error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid course ID format.', error.message);
        }
        sendErrorResponse(res, 500, 'Server error fetching enrollment. Please check server logs.', error.message);
    }
};

export const getEnrolleesByCourseId = async (req, res) => {
    const { courseId } = req.params;
    try {
        console.log(`[Enrollees Fetch] Starting fetch for courseId: ${courseId}`);
        const enrollees = await Enrollment.find({ courseId })
            .populate('userId', 'firstName lastName email IDnumber avatar')
            .lean();

        if (!enrollees || enrollees.length === 0) {
            console.log(`[Enrollees Fetch] No enrollees found for courseId: ${courseId}`);
            return res.status(200).json({ success: true, message: 'No users are enrolled in this course.', data: [] });
        }

        const enrolleesList = await Promise.all(enrollees.map(async (enrollment) => {
            const progress = await calculateOverallCourseProgress(enrollment);
            return {
                enrollmentId: enrollment._id,
                user: enrollment.userId,
                enrollmentDate: enrollment.enrollmentDate,
                lastAccessedAt: enrollment.lastAccessedAt,
                progressPercentage: progress
            };
        }));
        
        console.log('[Enrollees Fetch] Final data being sent to frontend:', enrolleesList);
        res.status(200).json({ success: true, message: 'Enrollees fetched successfully.', data: enrolleesList });
    } catch (error) {
        console.error('Error fetching enrollees by course ID:', error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid course ID format.');
        }
        sendErrorResponse(res, 500, 'Failed to retrieve enrollees.', error.message);
    }
};

export const getEnrollmentForSpecificUser = async (req, res) => {
    const { userId, courseId } = req.params;
    try {
        const enrollment = await Enrollment.findOne({ userId, courseId })
            .populate('userId', 'firstName lastName email IDnumber')
            .populate('courseId', 'title description difficulty thumbnail')
            .lean();
        if (!enrollment) {
            return sendErrorResponse(res, 404, 'Enrollment not found for this user and course.');
        }
        res.status(200).json({ success: true, message: 'Enrollment details fetched successfully.', data: enrollment });
    } catch (error) {
        console.error('Error fetching enrollment for specific user:', error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid user or course ID format.');
        }
        sendErrorResponse(res, 500, 'Failed to retrieve enrollment.', error.message);
    }
};

export const updateAnyEnrollment = async (req, res) => {
    const { enrollmentId } = req.params;
    const { status, progressPercentage, grade } = req.body;
    try {
        const updatedEnrollment = await Enrollment.findByIdAndUpdate(
            enrollmentId,
            { status, progressPercentage, grade },
            { new: true, runValidators: true }
        ).lean();
        if (!updatedEnrollment) {
            return sendErrorResponse(res, 404, 'Enrollment not found.');
        }
        res.status(200).json({ success: true, message: 'Enrollment updated successfully.', data: updatedEnrollment });
    } catch (error) {
        console.error('Error updating any enrollment:', error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid enrollment ID format.');
        }
        sendErrorResponse(res, 500, 'Failed to update enrollment.', error.message);
    }
};

export const deleteEnrollment = async (req, res) => {
    const { enrollmentId } = req.params;
    try {
        const enrollment = await Enrollment.findByIdAndDelete(enrollmentId);
        if (!enrollment) {
            return sendErrorResponse(res, 404, 'Enrollment not found.');
        }
        await QuizAttempt.deleteMany({ enrollmentId: enrollment._id });
        res.status(200).json({ success: true, message: 'Enrollment and associated data deleted successfully.' });
    } catch (error) {
        console.error('Error deleting any enrollment:', error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid enrollment ID format.');
        }
        sendErrorResponse(res, 500, 'Failed to delete enrollment.', error.message);
    }
};

/**
 * @desc    Admin/Staff-controlled enrollment of a user in a course.
 * @route   POST /enrollments/admin/enroll
 * @access  Private (Requires 'admin:enrollment:create' permission).
 */
export const enrollByAdmin = async (req, res) => {
    const { studentId, courseId } = req.body;

    // 1. Input Validation
    if (!studentId || !courseId) {
        return res.status(400).json({ success: false, message: 'Student ID and Course ID are required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }

    try {
        // 2. Check for existence of user and course
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        // 3. Check if enrollment already exists (using correct field names)
        const existingEnrollment = await Enrollment.findOne({ userId: studentId, courseId: courseId });
        if (existingEnrollment) {
            return res.status(409).json({ success: false, message: 'Student is already enrolled in this course.' });
        }

        // 4. Create the enrollment record
        const newEnrollment = new Enrollment({
            userId: studentId,
            courseId: courseId,
            enrollmentDate: new Date(),
            lastAccessedAt: new Date(),
        });
        const savedEnrollment = await newEnrollment.save();

        // 5. Update the user document
        await User.findByIdAndUpdate(studentId, {
            $push: { enrolledCourses: { course: courseId, enrollmentDate: savedEnrollment.enrollmentDate } }
        });

        res.status(201).json({
            success: true,
            message: 'Student enrolled in course successfully.',
            enrollment: savedEnrollment
        });

    } catch (error) {
        console.error('Error in enrollByAdmin:', error);
        // We'll return a more user-friendly message for a duplicate key error
        if (error.code === 11000) {
            res.status(409).json({ success: false, message: 'This student is already enrolled in the course.' });
        } else {
            res.status(500).json({ success: false, message: 'Server error during enrollment.' });
        }
    }
}

/**
 * @desc    Updates the lastAccessedAt timestamp for a user's enrollment.
 * @route   POST /enrollments/update-last-access
 * @access  Private (User requires 'enrollment:update' permission)
 */
export const updateLastAccess = async (req, res) => {
    const userId = req.user._id; // This is a crucial line. Make sure `req.user` is available from your auth middleware.
    const { courseId } = req.body;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ success: false, message: 'Invalid course ID.' });
    }

    try {
        const enrollment = await Enrollment.findOneAndUpdate(
            { userId, courseId },
            { $set: { lastAccessedAt: new Date() } },
            { new: true } // This returns the updated document, which is good for confirmation.
        );

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found.' });
        }

        return res.status(200).json({ success: true, message: 'Last access updated.', data: enrollment });
    } catch (error) {
        console.error('Error updating last access:', error);
        return res.status(500).json({ success: false, message: 'Server error updating last access.' });
    }
};

/**
 * @desc    Explicitly updates an enrollment status (used by practice test save & exit)
 * @route   PUT /enrollments/:enrollmentId/update-status
 * @access  Private (User requires 'enrollment:update' permission)
 */
export const updateEnrollmentStatus = async (req, res) => {
    const { enrollmentId } = req.params;
    const { status } = req.body;
    const userId = req.user._id; 

    // 🚀 UPDATE: Include all defined statuses in the master validation list
    const VALID_ENROLLMENT_STATUSES = ['enrolled', 'in-progress', 'completed', 'dropped'];
    
    if (!status || !VALID_ENROLLMENT_STATUSES.includes(status)) {
        return sendErrorResponse(res, 400, `Invalid status field. Must be one of: ${VALID_ENROLLMENT_STATUSES.join(', ')}.`);
    }
    
    // Note: We ignore 'partially-graded' here as it should ONLY be set by the grading controller, not the user.
    if (status === 'completed' || status === 'dropped') {
        // Prevent accidental completion status outside of the standard flow/admin
        console.warn(`[Status Update] Attempt to manually set status to ${status} for ${userId}. Proceeding with update if logic allows.`);
    }

    try {
        const updatedEnrollment = await Enrollment.findOneAndUpdate(
            { _id: enrollmentId, userId: userId }, // Ensure the user owns the enrollment
            { $set: { status: status, lastAccessedAt: new Date() } },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedEnrollment) {
            return sendErrorResponse(res, 404, 'Enrollment not found for this user.');
        }

        return res.status(200).json({ success: true, message: 'Enrollment status updated.', data: updatedEnrollment });

    } catch (error) {
        console.error('Error in updateEnrollmentStatus:', error);
        // Include specific validation error messages if available
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(val => val.message).join('; ');
            return sendErrorResponse(res, 400, `Validation failed: ${message}`, error.message);
        }
        sendErrorResponse(res, 500, 'Server error updating enrollment status.', error.message);
    }
};

export const getEnrollmentWithAttempts = async (req, res) => {
try {
const { courseId } = req.params;
const userId = req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }

    const enrollment = await Enrollment.findOne({ userId, courseId }).lean();
    if (!enrollment) {
        return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    }

    const ptaIds = enrollment.practiceTestAttempts || [];

    const practiceTestAttempts = await PracticeTestAttempt.find({ _id: { $in: ptaIds } })
        .sort({ updatedAt: -1 })
        .select('overallScore overallTotalPoints status sectionScores satScoreDetails lastActiveQuizModuleId lastActiveQuizAttemptId createdAt updatedAt quizAttempts')
        .populate({
            path: 'quizAttempts',
            select: '_id quizModuleId status annotations',
            model: 'QuizAttempt'
        })
        .lean();

    const enhancedPracticeTestAttempts = practiceTestAttempts.map(pta => {
        const validSectionScores = Array.isArray(pta.sectionScores) 
            ? pta.sectionScores.map(s => ({ id: s.id.toString(), score: s.score }))
            : [];

        return {
            ...pta,
            sectionScores: validSectionScores,
            satScoreDetails: pta.satScoreDetails || {},
            lastActiveQuizModuleId: pta.lastActiveQuizModuleId ? pta.lastActiveQuizModuleId.toString() : null,
            lastActiveQuizAttemptId: pta.lastActiveQuizAttemptId ? pta.lastActiveQuizAttemptId.toString() : null,
            quizAttempts: pta.quizAttempts || []
        };
    });

    // Find the resumable attempt and include its annotations explicitly
    const resumePta = enhancedPracticeTestAttempts.find(a => ['in-progress', 'partially-graded'].includes(a.status));
    let resumeQa = null;

    if (resumePta?.lastActiveQuizAttemptId) {
        resumeQa = resumePta.quizAttempts.find(qa => qa._id.toString() === resumePta.lastActiveQuizAttemptId) || null;
    }

    const resumeQaId = resumeQa?._id.toString() || 'NONE';
    const lastModuleId = resumePta?.lastActiveQuizModuleId || 'NONE';

    console.log(`[BACKEND ENROLLMENT] Sending resume data: PTA_ID=${resumePta?._id || 'NONE'}, LastModuleID=${lastModuleId}, ResumableQA_ID=${resumeQaId}`);

    const responseData = {
        ...enrollment,
        practiceTestAttempts: enhancedPracticeTestAttempts,
        resumableQA: resumeQa ? { _id: resumeQa._id, annotations: resumeQa.annotations || {} } : null
    };

    return res.status(200).json({ success: true, data: responseData });

} catch (error) {
    console.error('Error fetching enrollment data with attempts:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
}

};
