import { PracticeTestAttempt } from '../models/PracticeTestAttemptSchema.js';
import { QuizAttempt } from '../models/QuizAttemptSchema.js';
import { Course } from '../models/CourseSchema.js';
import { QuizSnapshot } from '../models/QuizSnapshotSchema.js';
import { Module, QuizModule } from '../models/ModuleSchema.js';
import { Enrollment } from '../models/EnrollmentSchema.js';
import { Section } from '../models/SectionSchema.js';
import { User } from '../models/UserSchema.js';
import { SATGradingScale } from '../models/SATGradingScale.js';
// Assuming this utility is available and stable
import SAT_CONVERSION_TABLE_ENTRIES from '../utils/SATConversionData.js'; 
import mongoose from 'mongoose';

const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[API Error] Status: ${statusCode}, Message: ${message}`, errorDetails);
    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};

// --- Internal Utility Function for SAT Scoring ---
async function applySatGrading(attemptId, courseId) {
    // 1. Fetch necessary data
    const [attempt, course, gradingScaleIdDoc] = await Promise.all([
        PracticeTestAttempt.findById(attemptId)
            // Fetch QuizAttempt details needed for raw score calculation (points awarded & module ID)
            .populate({ path: 'quizAttempts', select: 'questionsAttemptedDetails quizModuleId' })
            .exec(),
        Course.findById(courseId)
            .populate({ path: 'sections', populate: { path: 'modules' } })
            .exec(),
        // Get the grading scale ID for audit trail
        SATGradingScale.findOne({ courseId: courseId }).select('_id').lean().exec()
    ]);
    
    const conversionTable = SAT_CONVERSION_TABLE_ENTRIES;

    if (!attempt || !course || !conversionTable || conversionTable.length === 0) {
        throw new Error("Missing data (attempt, course, or static SAT scale) required for grading.");
    }

    let correctedOverallTotalPoints = 0;
    
    // 2. Aggregate Raw Scores ACHIEVED by Section 
    const rawScoresAchievedBySection = {};
    const sectionDataMap = {};
    let overallRawScoreAchieved = 0;

    course.sections.forEach(section => {
        const sectionIdStr = section._id.toString();
        sectionDataMap[sectionIdStr] = { 
            title: section.sectionTitle, 
            order: section.order 
        };
        rawScoresAchievedBySection[sectionIdStr] = 0;

        // Recalculate MAX POSSIBLE POINTS here
        section.modules.forEach(module => {
            if (module.moduleType === 'quiz') {
                // NOTE: Max points are calculated based on the questions in the module, 
                // not the snapshot, as the module is the source of truth for potential points.
                module.questions.forEach(q => {
                    const points = (typeof q.points === 'number' && q.points > 0) ? q.points : 1;
                    correctedOverallTotalPoints += points;
                });
            }
        });
    });

    attempt.quizAttempts.forEach(quizAttempt => {
        // Raw Score for SAT is the count of correctly answered questions (pointsAwarded > 0)
        const correctCount = quizAttempt.questionsAttemptedDetails.filter(q => q.pointsAwarded > 0).length;
        overallRawScoreAchieved += correctCount; 
        
        const parentSection = course.sections.find(section => 
            section.modules.some(m => m._id.equals(quizAttempt.quizModuleId))
        );

        if (parentSection) {
            rawScoresAchievedBySection[parentSection._id.toString()] += correctCount;
        }
    });

    // 3. Identify, Lookup, and Scale Scores
    let rwRawScore = 0;
    let mathRawScore = 0;
    let sectionScoresForDisplay = []; 

    let rwScaledFinal = 200; 
    let mathScaledFinal = 200;

    for (const [sectionId, rawScore] of Object.entries(rawScoresAchievedBySection)) {
        const title = sectionDataMap[sectionId].title.toLowerCase();
        
        const conversionEntry = conversionTable.find(e => e.raw_score === rawScore);

        if (conversionEntry) {
            if (title.includes('writing') || title.includes('reading')) {
                rwRawScore = rawScore;
                const scaledScore = conversionEntry.reading_writing_score || 200; 
                rwScaledFinal = scaledScore;
                sectionScoresForDisplay.push({ id: sectionId, score: scaledScore }); 
                
            } else if (title.includes('math')) {
                mathRawScore = rawScore;
                const scaledScore = conversionEntry.math_score || 200; 
                mathScaledFinal = scaledScore;
                sectionScoresForDisplay.push({ id: sectionId, score: scaledScore });
            }
        } else {
            console.warn(`[Grading] No conversion entry found for raw score ${rawScore}. Defaulting to min score of 200.`);
            if (title.includes('writing') || title.includes('reading')) {
                rwScaledFinal = 200;
                sectionScoresForDisplay.push({ id: sectionId, score: 200 }); 
            } else if (title.includes('math')) {
                mathScaledFinal = 200;
                sectionScoresForDisplay.push({ id: sectionId, score: 200 }); 
            }
        }
    }

    // Sort display scores based on course section order
    sectionScoresForDisplay.sort((a, b) => {
        const orderA = sectionDataMap[a.id]?.order || Infinity;
        const orderB = sectionDataMap[b.id]?.order || Infinity;
        return orderA - orderB;
    });

    // 4. Final Total Score Calculation (Scaled)
    const totalSatScore = rwScaledFinal + mathScaledFinal;
    
    // 5. Build the Update Object
    const updateObject = {
        overallScore: totalSatScore,
        overallTotalPoints: correctedOverallTotalPoints, 
        sectionScores: sectionScoresForDisplay,
        endTime: new Date(),
        status: 'graded',
        lastActiveQuizModuleId: undefined, // Clear resume pointer
        satScoreDetails: {
            rawScoreReadingWriting: rwRawScore,
            rawScoreMath: mathRawScore,
            // Store the single scaled score as both lower/upper bounds for the range field
            scaledScoreReadingWriting: { lower: rwScaledFinal, upper: rwScaledFinal }, 
            scaledScoreMath: { lower: mathScaledFinal, upper: mathScaledFinal },
            totalSatScore: { lower: totalSatScore, upper: totalSatScore },
            gradingScaleId: gradingScaleIdDoc?._id || null, 
        }
    };
    
    console.log(`\n--- FINAL SCORING DEBUG ---`);
    console.log(`[SCALED TOTAL] Calculated Final Score: ${totalSatScore}`);
    console.log(`---------------------------\n`);

    return { attempt, updateObject };
}

/**
 * @desc    Start a new practice test attempt
 * @route   POST /api/practice-tests/start/:sectionId
 * @access  Private (Student)
 */
export const startPracticeTest = async (req, res) => {
    const { sectionId: initialSectionId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(initialSectionId)) {
        return sendErrorResponse(res, 400, 'Invalid section ID format.');
    }

    try {
        // 1. Load the section with deep population to get the full course structure
        const initialSection = await Section.findById(initialSectionId)
            .populate({
                path: 'course',
                populate: {
                    path: 'sections',
                    model: 'Section',
                    populate: {
                        path: 'modules',
                        model: 'Module',
                        populate: {
                            // Populate questions in the standard array
                            path: 'questions.question',
                            model: 'Question',
                            select: 'questionTextHtml questionContextHtml questionTextRaw questionContext questionType options.optionTextHtml options.optionTextRaw options.isCorrect correctAnswers feedback trueFalseAnswer requiresManualGrading numericalAnswer caseSensitive'
                        }
                    }
                }
            })
            // ⭐ CRITICAL: Also populate questions inside SAT STRANDS
            .populate({
                path: 'course',
                populate: {
                    path: 'sections',
                    populate: {
                        path: 'modules',
                        populate: {
                            path: 'satSettings.strands.questions.question',
                            model: 'Question',
                            select: 'questionTextHtml questionContextHtml questionTextRaw questionContext questionType options.optionTextHtml options.optionTextRaw options.isCorrect correctAnswers feedback trueFalseAnswer requiresManualGrading numericalAnswer caseSensitive'
                        }
                    }
                }
            })
            .lean();

        if (!initialSection || initialSection.course.contentType !== 'practice_test') {
            return sendErrorResponse(res, 404, 'Section not found or is not part of a practice test course.');
        }
        const courseId = initialSection.course._id;

        // 2. Extract ALL Quiz Modules
        const allSections = initialSection.course.sections || [];
        const allQuizModules = allSections.flatMap(section => 
            section.modules.filter(m => m.moduleType === 'quiz')
        );
        
        if (allQuizModules.length === 0) {
            return sendErrorResponse(res, 400, 'The course sections do not contain any quiz modules.');
        }

        // 3. Find Latest In-Progress PTA (Practice Test Attempt)
        let attempt = await PracticeTestAttempt.findOne({
            userId,
            courseId,
            status: { $in: ['in-progress', 'partially-graded'] } 
        })
        .sort({ createdAt: -1 })
        .exec();

        let shouldCreateNew = !attempt;

        // 4. If NO resume point is found, create a NEW attempt document.
        if (shouldCreateNew) {
            
            // Calculate total points (handling SAT structure)
            const totalPointsPossible = allQuizModules.reduce((sum, module) => {
                let modulePoints = 0;
                if (module.satSettings?.isSAT && module.satSettings.strands) {
                    modulePoints = module.satSettings.strands.reduce((sSum, strand) => {
                        return sSum + strand.questions.reduce((qSum, q) => qSum + (q.points || 1), 0);
                    }, 0);
                } else {
                    modulePoints = module.questions.reduce((qSum, q) => qSum + (q.points || 1), 0);
                }
                return sum + modulePoints;
            }, 0);
            
            const sectionIdsToSave = allSections.filter(s => s.modules.some(m => m.moduleType === 'quiz')).map(s => s._id);
            const attemptNumber = (await PracticeTestAttempt.countDocuments({ userId, courseId })) + 1;

            attempt = new PracticeTestAttempt({
                userId,
                courseId,
                sectionIds: sectionIdsToSave, 
                overallScore: 0,
                overallTotalPoints: totalPointsPossible, 
                quizSnapshots: [], 
                startTime: new Date(), 
                status: 'in-progress', 
                attemptNumber: attemptNumber,
                lastActiveQuizAttemptId: null, 
            });

            await attempt.save(); 
        }

        // 5. Create snapshots only if it's a new attempt (or snapshots array is empty)
        const isNewAttemptSession = attempt.quizSnapshots.length === 0 || shouldCreateNew;

        if (isNewAttemptSession) { 
            const snapshotIds = await Promise.all(allQuizModules.map(async module => {
                
                const parentSection = allSections.find(s => 
                    s.modules.some(m => m._id.toString() === module._id.toString())
                );
                if (!parentSection) return null;
                const parentSectionId = parentSection._id; 

                let quizSnapshot; 
                let existingSnapshot = await QuizSnapshot.findOne({ originalQuizModuleId: module._id }).lean();
                
                const currentModuleSettings = {
                    title: module.title, description: module.description, maxAttempts: module.maxAttempts,
                    timeLimitMinutes: module.timeLimitMinutes, passingScorePercentage: module.passingScorePercentage,
                    questionShuffle: module.questionShuffle, shuffleOptions: module.shuffleOptions,
                    timerEndBehavior: module.timerEndBehavior
                };

                // --- Snapshot Creation Logic (Fixed for SAT) ---
                let sourceQuestions = [];

                // A. Determine Source (SAT vs Standard)
                if (module.satSettings && module.satSettings.isSAT) {
                    // Extract from strands
                    if (module.satSettings.strands) {
                        module.satSettings.strands.forEach(strand => {
                            if (strand.questions) {
                                // Apply strand shuffling if needed
                                let strandQs = [...strand.questions];
                                if (strand.shuffleStrandQuestions) {
                                    for (let i = strandQs.length - 1; i > 0; i--) {
                                        const j = Math.floor(Math.random() * (i + 1));
                                        [strandQs[i], strandQs[j]] = [strandQs[j], strandQs[i]];
                                    }
                                }
                                sourceQuestions.push(...strandQs);
                            }
                        });
                    }
                } else {
                    // Extract from standard array
                    sourceQuestions = module.questions || [];
                    // Apply global shuffling if needed
                    if (module.questionShuffle) {
                        for (let i = sourceQuestions.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [sourceQuestions[i], sourceQuestions[j]] = [sourceQuestions[j], sourceQuestions[i]];
                        }
                    }
                }

                // B. Map to Snapshot Format
                const questionsSnapshot = sourceQuestions.map(q => {
                    const sourceQ = q.question;

                    // Skip if source question is null/deleted
                    if (!sourceQ) {
                        console.warn(`[Snapshot Creation] Skipping question link: Source question (ID: ${q._id}) is null/deleted.`);
                        return null; 
                    }
                    
                    let correctAnswersSnapshot = []; 
                    let trueFalseAnswerSnapshot = undefined; 
                    let numericalAnswerSnapshot = undefined; 
                    let requiresManualGradingSnapshot = sourceQ.requiresManualGrading || false; 
                    
                    const optionsSnap = (sourceQ.options || []).map(opt => ({
                        optionTextHtml: opt.optionTextHtml || opt.optionTextRaw || '',
                        optionTextRaw: opt.optionTextRaw || '',
                        isCorrect: opt.isCorrect,
                    }));

                    if (sourceQ.questionType === 'trueFalse' && typeof sourceQ.trueFalseAnswer === 'boolean') {
                        trueFalseAnswerSnapshot = sourceQ.trueFalseAnswer; 
                    } else if (sourceQ.questionType === 'shortAnswer' || sourceQ.questionType === 'essay') { 
                        correctAnswersSnapshot = (sourceQ.correctAnswers || []).map(ans => ({
                            answer: ans.answer,
                            answerHtml: ans.answerHtml || '',
                        }));
                    } else if (sourceQ.questionType === 'numerical') { 
                        numericalAnswerSnapshot = sourceQ.numericalAnswer ? {
                            answer: sourceQ.numericalAnswer.answer,
                            tolerance: sourceQ.numericalAnswer.tolerance || 0,
                        } : undefined;
                    }
                    
                    return {
                        questionId: sourceQ._id, 
                        questionTextHtml: sourceQ.questionTextHtml || sourceQ.questionTextRaw || '',
                        questionTextRaw: sourceQ.questionTextRaw || '',
                        questionContextHtml: sourceQ.questionContextHtml || sourceQ.questionContext || '',
                        questionType: sourceQ.questionType, 
                        optionsSnapshot: optionsSnap,
                        trueFalseAnswerSnapshot: trueFalseAnswerSnapshot, 
                        correctAnswersSnapshot: correctAnswersSnapshot, 
                        numericalAnswerSnapshot: numericalAnswerSnapshot, 
                        requiresManualGradingSnapshot: requiresManualGradingSnapshot,
                        pointsPossibleSnapshot: q.points || 1, 
                        feedbackSnapshot: sourceQ.feedback
                    };
                })
                .filter(q => q !== null); 
                
                if (questionsSnapshot.length === 0) {
                     console.warn(`[Snapshot Creation] Module ${module._id} resulted in an empty snapshot after filtering missing questions.`);
                     return null; 
                }

                if (existingSnapshot) {
                    await QuizSnapshot.findByIdAndUpdate(existingSnapshot._id, {
                        $set: { 
                            quizModuleSettingsSnapshot: currentModuleSettings, 
                            originalSectionId: parentSectionId,
                            questionsSnapshot: questionsSnapshot 
                        }
                    });
                    quizSnapshot = await QuizSnapshot.findById(existingSnapshot._id).lean(); 
                } else {
                    quizSnapshot = new QuizSnapshot({
                        originalQuizModuleId: module._id, originalSectionId: parentSectionId,
                        quizModuleSettingsSnapshot: currentModuleSettings, questionsSnapshot
                    });
                    await quizSnapshot.save();
                }
                
                return quizSnapshot._id; 
            }));
            
            const filteredSnapshotIds = snapshotIds.filter(id => id); 

            if (filteredSnapshotIds.length === 0) {
                throw new Error("No valid quiz modules could be snapshotted. Check module question links.");
            }

            // 6. Save the new snapshot IDs back to the PracticeTestAttempt document
            attempt = await PracticeTestAttempt.findByIdAndUpdate(
                attempt._id,
                { $set: { quizSnapshots: filteredSnapshotIds } },
                { new: true } 
            );
        }

        // 7. Link the PTA ID to the parent Enrollment document and update status
        const enrollment = await Enrollment.findOne({ userId, courseId });
        if (enrollment) {
            const ptaIdString = attempt._id.toString();
            
            if (!enrollment.practiceTestAttempts.map(id => id.toString()).includes(ptaIdString)) {
                await Enrollment.findByIdAndUpdate(enrollment._id, {
                    $addToSet: { practiceTestAttempts: attempt._id }
                });
            }

            if (enrollment.status === 'enrolled') {
                await Enrollment.findByIdAndUpdate(enrollment._id, {
                    $set: { status: 'in-progress', lastAccessedAt: new Date() }
                });
            }
        }

        // 8. Final response
        const populatedAttempt = await PracticeTestAttempt.findById(attempt._id)
            .populate('userId', 'firstName lastName')
            .populate('courseId', 'title')
            .populate('sectionIds', 'sectionTitle') 
            .populate({ 
                path: 'quizSnapshots',
                model: 'QuizSnapshot', 
                select: 'originalQuizModuleId originalSectionId questionsSnapshot',
            })
            .populate({
                path: 'quizAttempts',
                populate: {
                    path: 'quizSnapshotId',
                    select: 'quizModuleSettingsSnapshot questionsSnapshot originalSectionId'
                }
            })
            .lean();
            
        res.status(200).json({
            success: true,
            message: 'Practice test attempt started or resumed successfully.',
            data: populatedAttempt 
        });

    } catch (error) {
        console.error('❌ Error in startPracticeTest:', error);
        sendErrorResponse(res, 500, `Server error starting practice test attempt. ${error.message}`, error.message);
    }
};

/**
 * @desc    Manually review and grade a single question item within a QuizAttempt.
 * @route   PUT /api/quiz-attempts/:attemptId/review/:itemIndex
 * @access  Private (Teacher/Admin)
 */
export const reviewAttemptItem = async (req, res) => {
    const { attemptId, itemIndex } = req.params;
    const { manualScore, teacherNotes } = req.body;
    const reviewerId = req.user._id;

    if (manualScore === undefined || typeof manualScore !== 'number' || manualScore < 0) {
        return sendErrorResponse(res, 400, 'Invalid or missing manual score. Score must be a non-negative number.');
    }
    
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
        return sendErrorResponse(res, 400, 'Invalid Attempt ID format.');
    }

    try {
        // 1. Fetch Attempt and Snapshot (needed for max points)
        const attempt = await QuizAttempt.findById(attemptId).populate('quizSnapshotId');
        if (!attempt) {
            return sendErrorResponse(res, 404, 'Quiz Attempt not found.');
        }
        
        const item = attempt.questionsAttemptedDetails[itemIndex];
        const quizSnapshot = attempt.quizSnapshotId;

        if (!item || !item.requiresManualReview) {
            return sendErrorResponse(res, 400, `Item not found or does not require manual review.`);
        }
        
        if (!quizSnapshot) {
             return sendErrorResponse(res, 500, 'Cannot grade: Quiz Snapshot data is missing.');
        }
        
        // 2. Find Max Points Possible
        const maxPointsPossible = quizSnapshot.questionsSnapshot[itemIndex]?.pointsPossibleSnapshot || 0;

        if (manualScore > maxPointsPossible) {
            return sendErrorResponse(res, 400, `Score ${manualScore} exceeds the maximum possible points of ${maxPointsPossible}.`);
        }

        // 3. Apply Manual Grade to the Item
        item.isManuallyGraded = true;
        item.pointsAwarded = manualScore;
        item.isCorrect = manualScore > 0;
        item.teacherReviewerId = reviewerId;
        item.teacherNotes = teacherNotes || '';

        // 4. Recalculate Overall Attempt Score and Status
        let totalScore = 0;
        let requiresFurtherReview = false;

        attempt.questionsAttemptedDetails.forEach(detail => {
            // Recalculate total score by summing all awarded points (including new manual score)
            totalScore += detail.pointsAwarded; 
            
            // Check if any item still requires manual grading
            if (detail.requiresManualReview && !detail.isManuallyGraded) {
                requiresFurtherReview = true;
            }
        });

        attempt.score = totalScore;
        
        if (!requiresFurtherReview) {
            // All items are now graded, update to final 'graded' status
            attempt.status = 'graded';
            
            // Final check for 'passed' status
            const quizModule = await QuizModule.findById(attempt.quizModuleId);
            const passingPercentage = quizModule?.passingScorePercentage || 0;
            const gradePercentage = attempt.totalPointsPossible > 0 ? (totalScore / attempt.totalPointsPossible) * 100 : 0;
            attempt.passed = gradePercentage >= passingPercentage;

        } else {
            attempt.status = 'partially-graded';
        }

        // 5. Save and Respond
        const updatedAttempt = await attempt.save();

        res.status(200).json({ 
            success: true, 
            message: 'Question manually graded successfully.', 
            data: updatedAttempt,
            gradedItem: item
        });

    } catch (error) {
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid ID or item index format.');
        }
        sendErrorResponse(res, 500, "Failed to manually grade item due to server error.", error.message);
    }
};


/**
 * @desc    Save in-progress progress on the overall practice test
 * @route   PUT /api/practice-tests/:id/save-progress
 * @access  Private (Student)
 */
export const savePracticeTestProgress = async (req, res) => {
const { id: practiceTestAttemptId } = req.params;
const { lastActiveQuizModuleId, lastActiveQuizAttemptId } = req.body;
const userId = req.user?._id;

try {
    const existingAttempt = await PracticeTestAttempt.findById(practiceTestAttemptId);

    if (!existingAttempt || !existingAttempt.userId.equals(userId)) {
        return sendErrorResponse(res, 404, 'Practice test attempt not found for this user.');
    }
    
    if (existingAttempt.status === 'submitted' || existingAttempt.status === 'graded') {
         return res.status(200).json({ success: true, message: 'Practice test is already submitted/graded. Progress update skipped.', data: existingAttempt });
    }

    // Ensure both module and QA IDs are updated
    const updateData = {
        lastActiveQuizModuleId: lastActiveQuizModuleId || existingAttempt.lastActiveQuizModuleId,
        lastActiveQuizAttemptId: lastActiveQuizAttemptId || existingAttempt.lastActiveQuizAttemptId,
    };

    // Update status if not partially-graded
    if (!['partially-graded'].includes(existingAttempt.status)) {
        updateData.status = 'in-progress';
    }

    // Update the Practice Test Attempt
    const attempt = await PracticeTestAttempt.findOneAndUpdate(
        { 
            _id: practiceTestAttemptId, 
            userId, 
            status: { $in: ['in-progress', 'partially-graded'] } 
        },
        { $set: updateData },
        { new: true }
    );

    if (!attempt) {
         return sendErrorResponse(res, 404, 'Practice test attempt not found or already submitted.');
    }
    
    // Update parent enrollment status if necessary
    const currentEnrollment = await Enrollment.findOne({ _id: attempt.enrollmentId, userId }).lean();
    if (currentEnrollment && !['in-progress', 'completed'].includes(currentEnrollment.status)) {
        await Enrollment.findOneAndUpdate(
            { _id: attempt.enrollmentId, userId, status: { $in: ['enrolled', 'not-enrolled'] } }, 
            { $set: { status: 'in-progress', lastAccessedAt: new Date() } },
            { new: true }
        );
    }

    return res.status(200).json({
        success: true,
        message: 'Practice test progress saved successfully.',
        data: attempt
    });

} catch (error) {
    console.error('Error saving practice test progress:', error);
    sendErrorResponse(res, 500, 'Server error saving practice test progress.', error.message);
}

};


/**
 * @desc    Submit a completed practice test attempt for grading
 * @route   PUT /api/practice-tests/:id/submit
 * @access  Private (Student)
 */
export const submitPracticeTest = async (req, res) => {
    const { id: practiceTestAttemptId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(practiceTestAttemptId)) {
        return sendErrorResponse(res, 400, 'Invalid practice test attempt ID.');
    }

    try {
        let attempt = await PracticeTestAttempt.findById(practiceTestAttemptId);
        
        // --- 1. Basic Validation ---
        if (!attempt) { return sendErrorResponse(res, 404, 'Practice test attempt not found.'); }
        if (!attempt.userId.equals(userId)) { return sendErrorResponse(res, 403, 'Unauthorized: You do not own this practice test attempt.'); }
        // Allow submission if in 'partially-graded' status (in case user finishes all modules)
        if (attempt.status === 'graded') { return sendErrorResponse(res, 400, 'This practice test has already been graded.'); }
        
        // 2. Perform Grading
        const { updateObject } = await applySatGrading(practiceTestAttemptId, attempt.courseId);
        
        // 3. Update the Attempt Document and Save
        Object.assign(attempt, updateObject); 
        await attempt.save(); 
        
        const gradedAttempt = await PracticeTestAttempt.findById(attempt._id).lean();

        // 4. Update Parent Enrollment to 'completed'
        const enrollment = await Enrollment.findOneAndUpdate(
            { userId, courseId: gradedAttempt.courseId },
            { $set: { 
                grade: gradedAttempt.overallScore, 
                status: 'completed', 
                progressPercentage: 100,
                lastAccessedAt: new Date()
            } },
            { new: true }
        );
        
        res.status(200).json({
            success: true,
            message: 'Practice test submitted and graded successfully.',
            data: gradedAttempt
        });

    } catch (error) {
        if (error.message.includes('Missing data')) {
            console.error('❌ Grading failed due to missing SAT scale or course data:', error);
            return sendErrorResponse(res, 500, 'Test submitted, but grading failed.', error.message);
        }
        console.error('Error submitting practice test attempt:', error);
        sendErrorResponse(res, 500, 'Server error submitting practice test.', error.message);
    }
};



export const getCoursePracticeTestAttempts = async (req, res) => {
    const { courseId } = req.params;
    const { status } = req.query; 

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return sendErrorResponse(res, 400, 'Invalid course ID format.');
    }
    
    try {
        const filter = { courseId };
        
        if (status === 'graded') {
            filter.status = { $in: ['submitted', 'graded', 'partially-graded'] };
        }

        // 1. Fetch PTAs and deeply populate QuizAttempts (QAs)
        const attempts = await PracticeTestAttempt.find(filter)
            .populate('userId', 'firstName lastName email')
            .populate({
                path: 'sectionIds',
                select: 'sectionTitle order',
                model: 'Section'
            })
            // CRITICAL: Deeply populate nested QuizAttempts, grabbing only status
            .populate({
                path: 'quizAttempts',
                select: 'status',
                model: 'QuizAttempt'
            })
            // Select all necessary fields
            .select([ 
                'overallScore',
                'overallTotalPoints',
                'satScoreDetails.scaledScoreReadingWriting',
                'satScoreDetails.scaledScoreMath',         
                'satScoreDetails.totalSatScore',         
                'satScoreDetails.gradingScaleId',
                'satScoreDetails.rawScoreReadingWriting',
                'satScoreDetails.rawScoreMath',
                'sectionScores',
                'createdAt',
                'status',
                'attemptNumber', 
                'quizAttempts' // Include the populated quizAttempts array
            ])
            .sort({ createdAt: -1 })
            .lean(); 

        const formattedAttempts = attempts.map(attempt => {
            
            // 2. Determine the true display status based on nested QAs
            let displayStatus = attempt.status;
            
            if (displayStatus === 'submitted' || displayStatus === 'graded') {
                const needsManualReview = attempt.quizAttempts.some(
                    qa => qa.status === 'partially-graded'
                );

                if (needsManualReview) {
                    displayStatus = 'partially-graded';
                }
            }
            
            // 3. Clean up the attempt object for the frontend
            return {
                ...attempt,
                status: displayStatus, 
                quizAttempts: undefined 
            };
        });

        res.status(200).json({
            success: true,
            message: 'Practice test attempts fetched successfully.',
            data: formattedAttempts,
        });
    } catch (error) {
        console.error('Error fetching practice test attempts:', error);
        sendErrorResponse(res, 500, 'Server error fetching practice test attempts.', error.message);
    }
};

/**
 * @desc    Get a specific practice test attempt by ID for review
 * @route   GET /api/practice-tests/:id
 * @access  Private (Admin/Staff)
 */
export const getPracticeTestAttemptDetails = async (req, res) => {
    const { id: practiceTestAttemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(practiceTestAttemptId)) {
        return sendErrorResponse(res, 400, 'Invalid practice test attempt ID.');
    }

    try {
        const attempt = await PracticeTestAttempt.findById(practiceTestAttemptId)
            .populate('userId', 'firstName lastName')
            .populate('sectionIds', 'sectionTitle') 
            .populate({
                path: 'quizAttempts',
                select: 'quizModuleId questionsAttemptedDetails quizSnapshotId',
                populate: {
                    path: 'quizSnapshotId',
                    // CRITICAL: Ensure numericalAnswerSnapshot is selected here
                    select: 'quizModuleSettingsSnapshot originalSectionId questionsSnapshot trueFalseAnswerSnapshot optionsSnapshot numericalAnswerSnapshot feedbackSnapshot',
                }
            })
            .populate('courseId', 'title')
            .lean();

        if (!attempt) {
            return sendErrorResponse(res, 404, 'Practice test attempt not found.');
        }

        res.status(200).json({
            success: true,
            data: attempt,
        });

    } catch (error) {
        console.error('Error fetching practice test attempt details:', error);
        sendErrorResponse(res, 500, 'Server error fetching practice test attempt details.', error.message);
    }
};