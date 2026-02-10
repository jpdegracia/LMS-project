import { Course } from '../models/CourseSchema.js';
import { Section } from '../models/SectionSchema.js';
import { Module, LessonModule, QuizModule } from '../models/ModuleSchema.js';
import { LessonContent } from '../models/LessonContentSchema.js';
import { Question } from '../models/QuestionSchema.js';
import { Category } from '../models/CategorySchema.js';
import { User } from '../models/UserSchema.js';
import { SATGradingScale } from '../models/SATGradingScale.js'; 
import { recalculateProgressOnCourseUpdate } from './enrollment-controller.js';
import mongoose from 'mongoose';

const sendErrorResponseCourse = (res, statusCode, message, errorDetails = null) => {
    console.error(`Error ${statusCode}: ${message}`, errorDetails);
    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};

// --- getCourses and getCourseById remain the same (No changes needed) ---

export const getCourses = async (req, res) => {
    try {
        const courses = await Course.find({})
            .populate('category', 'name')
            .populate('createdBy', 'firstName lastName email bio avatar')
            .populate('teacher', 'firstName lastName email bio avatar')
            .lean();
        res.status(200).json({ success: true, count: courses.length, data: courses });
    } catch (error) {
        sendErrorResponseCourse(res, 500, 'Failed to retrieve courses.', error.message);
    }
};

export const getCourseById = async (req, res) => {
    const courseId = req.params.id;
    try {
        const course = await Course.findById(courseId)
            .populate('category', 'name')
            .populate('createdBy', 'firstName lastName email bio avatar')
            .populate('teacher', 'firstName lastName email bio avatar')
            .populate({
                path: 'sections',
                options: { sort: { order: 1 } },
                populate: {
                    path: 'modules',
                    options: { sort: { order: 1 } },
                    populate: [
                        {
                            path: 'contents',
                            model: 'LessonContent',
                            select: 'title description type contentHtml videoUrl'
                        },
                        {
                            path: 'questions.question',
                            model: 'Question',
                            select: 'questionTextRaw questionTextHtml questionType options correctAnswer feedback questionContext trueFalseAnswer'
                        }
                    ]
                }
            })
            .exec();

        if (!course) {
            return sendErrorResponseCourse(res, 404, 'Course not found.');
        }

        let createdCoursesCount = 0;
        if (course.createdBy) {
            createdCoursesCount = await Course.countDocuments({ createdBy: course.createdBy._id });
        }

        let teacherCoursesCount = 0;
        if (course.teacher) {
            teacherCoursesCount = await Course.countDocuments({ teacher: course.teacher._id });
        }

        const courseObject = course.toObject();
        courseObject.createdCoursesCount = createdCoursesCount;
        courseObject.teacherCoursesCount = teacherCoursesCount;

        res.status(200).json({ success: true, data: courseObject });

    } catch (error) {
        console.error("[Course Controller] Error in getCourseById (caught exception):", error);
        if (error.name === 'CastError') {
            return sendErrorResponseCourse(res, 400, 'Invalid Course ID format.', error.message);
        }
        sendErrorResponseCourse(res, 500, "Failed to retrieve course details.", error.message);
    }
};

export const createCourse = async (req, res) => {
    try {
        const { contentType, title, description, category, difficulty, thumbnail, status, teacher } = req.body;
        const authenticatedUser = req.user;

        if (!contentType || !title || !description || !category) {
            return sendErrorResponseCourse(res, 400, 'Please provide content type, title, description, and category.');
        }

        const existingCategory = await Category.findById(category);
        if (!existingCategory) {
            return sendErrorResponseCourse(res, 400, 'Invalid category ID provided.');
        }
        
        let assignedTeacherId;
        
        const isAdmin = authenticatedUser?.roleNames?.some(name => name === 'admin');

        if (isAdmin && teacher) {
            const foundTeacher = await User.findById(teacher).populate('roles', 'name');
            const isTeacher = foundTeacher?.roles?.some(role => role.name === 'teacher');
            
            if (!foundTeacher || !isTeacher) {
                return sendErrorResponseCourse(res, 400, 'Invalid teacher ID or user is not a teacher.');
            }
            assignedTeacherId = foundTeacher._id;
        } else {
            assignedTeacherId = authenticatedUser._id;
        }

        // Use Course.create which reliably triggers the 'post-save' hook 
        // to auto-create the SATGradingScale if contentType is 'practice_test'
        const newCourse = await Course.create({
            contentType,
            title,
            description,
            category,
            difficulty,
            thumbnail,
            status,
            createdBy: authenticatedUser._id,
            teacher: assignedTeacherId
        });

        res.status(201).json({ success: true, message: 'Course created successfully.', data: newCourse });
    } catch (error) {
        if (error.code === 11000) {
            return sendErrorResponseCourse(res, 400, 'Course title must be unique.');
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponseCourse(res, 400, messages.join(', '));
        }
        sendErrorResponseCourse(res, 500, 'Failed to create course.', error.message);
    }
};

export const updateCourse = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const { id } = req.params;
        // Destructure 'teacher' and 'category' separately as we need to validate and set them explicitly
        const { teacher, category, ...updateFields } = req.body;
        const authenticatedUser = req.user;

        // 1. FIND the existing course (required for .save())
        const course = await Course.findById(id).session(session);
        if (!course) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponseCourse(res, 404, 'Course not found.');
        }

        const isAdmin = authenticatedUser?.roleNames?.some(name => name === 'admin');
        const originalStatus = course.status;
        
        // 2. MODIFY the document instance (Apply updates)
        
        // Apply generic fields using Object.assign or a loop
        Object.assign(course, updateFields); 

        // --- Teacher Assignment Validation ---
        if (teacher !== undefined) {
            if (isAdmin) {
                if (teacher === null || teacher === "") {
                    course.teacher = null; // Direct modification to document instance
                } else {
                    const foundTeacher = await User.findById(teacher).populate('roles', 'name').session(session);
                    const isTeacher = foundTeacher?.roles?.some(role => role.name === 'teacher');
                    
                    if (!foundTeacher || !isTeacher) {
                        await session.abortTransaction();
                        session.endSession();
                        return sendErrorResponseCourse(res, 400, 'Invalid teacher ID or user is not a teacher.');
                    }
                    course.teacher = foundTeacher._id; // Direct modification
                }
            } else {
                await session.abortTransaction();
                session.endSession();
                return sendErrorResponseCourse(res, 403, 'Unauthorized: You cannot reassign this course.');
            }
        }
        
        // --- Category Validation ---
        if (category !== undefined) {
            if (category === null || category === "") {
                course.category = null; // Direct modification
            } else {
                const existingCategory = await Category.findById(category).session(session);
                if (!existingCategory) {
                    await session.abortTransaction();
                    session.endSession();
                    return sendErrorResponseCourse(res, 400, 'Invalid category ID provided.');
                }
                course.category = existingCategory._id; // Direct modification
            }
        }
        
        // 3. SAVE the modified document
        // This forces pre/post hooks (like the SAT scale creation) to run.
        const updatedCourse = await course.save({ session });
        
        // 4. Handle Post-Save Logic (Progress Recalculation)
        if (originalStatus !== updatedCourse.status && updatedCourse.status === 'published') {
            // Recalculation runs outside transaction for performance, but only after commit
            recalculateProgressOnCourseUpdate(updatedCourse._id, session);
        }

        // Commit transaction after all document modifications and status checks are done
        await session.commitTransaction();
        session.endSession();

        // 5. Populate fields needed for the final response after commit
        await updatedCourse.populate([
            { path: 'category', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName email bio avatar' },
            { path: 'teacher', select: 'firstName lastName email bio avatar' }
        ]);

        res.status(200).json({ success: true, message: 'Course updated successfully.', data: updatedCourse });
        
    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        console.error('Error updating course:', error);
        
        if (error.name === 'CastError') {
            return sendErrorResponseCourse(res, 400, 'Invalid course ID or field format.');
        }
        if (error.code === 11000) {
            return sendErrorResponseCourse(res, 400, 'Course title must be unique.');
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponseCourse(res, 400, messages.join(', '));
        }
        sendErrorResponseCourse(res, 500, 'Failed to update course.', error.message);
    }
};

export const deleteCourse = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const course = await Course.findById(req.params.id).session(session);
        if (!course) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponseCourse(res, 404, 'Course not found.');
        }

        // --- NEW: Delete associated SAT Grading Scale (Data cleanup) ---
        if (course.contentType === 'practice_test') {
            await SATGradingScale.deleteOne({ courseId: course._id }).session(session);
            console.log(`🗑️ Deleted SAT Grading Scale for course ID: ${course._id}`);
        }
        // --- END NEW LOGIC ---

        await course.deleteOne({ session });
        
        await session.commitTransaction();
        session.endSession();
        
        res.status(200).json({ success: true, message: 'Course and associated data deleted successfully.' });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        if (error.name === 'CastError') {
            return sendErrorResponseCourse(res, 400, 'Invalid course ID format.');
        }
        sendErrorResponseCourse(res, 500, 'Failed to delete course and its content.', error.message);
    }
};