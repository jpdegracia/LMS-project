import { QuizAttempt } from '../models/QuizAttemptSchema.js';
import { QuizSnapshot } from '../models/QuizSnapshotSchema.js';
import { PracticeTestAttempt } from '../models/PracticeTestAttemptSchema.js';
import { Module, QuizModule } from '../models/ModuleSchema.js';
import { Enrollment } from '../models/EnrollmentSchema.js';
import { Section } from '../models/SectionSchema.js';
import { Course } from '../models/CourseSchema.js';
import he from 'he';
import mongoose from 'mongoose';
import { calculateOverallCourseProgress } from './enrollment-controller.js';

// Helper function to send consistent API error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[API Error] Status: ${statusCode}, Message: ${message}`, errorDetails);
    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};



const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


const decodeEntities = (html) => {
    if (!html) return '';
    // A quick way to decode if you can't use a library on the backend side:
    // This creates an element, sets its innerHTML, and gets textContent (Node.js may not support this easily)
    // The safer approach in Node.js is explicit replacements or using a module.
    let decoded = html.replace(/&nbsp;/gi, ' '); // Replace non-breaking space
    decoded = decoded.replace(/&amp;/gi, '&'); // Replace ampersand
    // Add other critical entities here (e.g., <, >)

    // For simplicity and effectiveness in Mongoose/Node.js, rely on targeted replacements
    return decoded;
};

// 🟢 CRITICAL NEW HELPER: Aggressively cleans wrapper tags and normalizes whitespace
const cleanHtmlWrapperTags = (html) => {
    if (!html) return '';
    let cleaned = html.trim();
    
    // ⭐ STEP 1: Decode ALL HTML entities (like &nbsp;, &amp;) into characters.
    cleaned = he.decode(cleaned); 

    // Use regex to non-destructively remove only OUTER <p> tags
    if (cleaned.toLowerCase().startsWith('<p')) {
        // Regex to capture the content inside the first <p> and last </p>
        const pRegex = /<\s*p[^>]*>(.*?)<\s*\/p\s*>/is; 
        const match = cleaned.match(pRegex);
        if (match && match[1]) {
            cleaned = match[1].trim();
        }
    }
    
    // Also remove outer div tags if present
    if (cleaned.toLowerCase().startsWith('<div')) {
        const divRegex = /<\s*div[^>]*>(.*?)<\s*\/div\s*>/is;
        const match = cleaned.match(divRegex);
        if (match && match[1]) {
            cleaned = match[1].trim();
        }
    }

    // 🛑 STEP 2: Aggressively remove known zero-width and other control characters
    cleaned = cleaned.replace(/[\u200b\n\r\t]/g, ' '); 
    
    // STEP 3: Replace multiple spaces (from collapsed tags or multiple user spaces) with a single space.
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    
    // Final defensive trim
    return cleaned.trim();
};

// This function creates the regex needed to match and remove the specific serialized highlight segment.
const highlightRegex = (highlightId) => {
    const escapedId = highlightId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Finds the segment that starts OR is preceded by '^', contains the escaped ID, 
    // and ends OR is followed by '^' or the end of the string.
    return new RegExp(`(?:^|\\^)([^\^]*?\\$${escapedId}\\$(?:[^\^]*?))(?:\\^|$)`, 'g');
};

// ----------------------------------------------------
// 🎯 HELPER: checkAnswer (Unchanged)
// ----------------------------------------------------
const checkAnswer = (questionType, userAnswer, questionSnapshot) => {
    
    if (userAnswer === undefined || userAnswer === null || (typeof userAnswer === 'string' && userAnswer.trim() === '')) {
        return false;
    }

    switch (questionType) {
        case 'multipleChoice':
            const correctOption = questionSnapshot.optionsSnapshot.find(opt => opt.isCorrect); 
            const correctAnswerHtml = correctOption ? correctOption.optionTextHtml : null;
            return String(userAnswer).trim() === String(correctAnswerHtml || '').trim();

        case 'trueFalse':
            const correctAnswer = questionSnapshot.trueFalseAnswerSnapshot; 
            const userAnswerBoolean = typeof userAnswer === 'boolean' ? userAnswer : String(userAnswer).trim().toLowerCase() === 'true'; 
            return userAnswerBoolean === correctAnswer; 

        case 'numerical':
            const numericalSnapshot = questionSnapshot.numericalAnswerSnapshot;
            if (!numericalSnapshot || typeof numericalSnapshot.answer !== 'number') {
                return false;
            }
            const correctValue = numericalSnapshot.answer;
            const tolerance = numericalSnapshot.tolerance || 0;
            const userValue = Number(userAnswer);
            if (isNaN(userValue)) {
                return false;
            }
            return Math.abs(userValue - correctValue) <= tolerance;
        
        // --- Text Answer Logic (Case Sensitivity Check) ---
        case 'shortAnswer':
        case 'essay': 
            // 🎯 CRITICAL: Read caseSensitive flag from the snapshot
            const isCaseSensitive = questionSnapshot.caseSensitive === true;
            
            // Normalize user and correct answers based on the flag
            const userAns = String(userAnswer).trim();
            const normalizedUserAns = isCaseSensitive ? userAns : userAns.toLowerCase();
            
            const correctAnswers = questionSnapshot.correctAnswersSnapshot || [];
            
            return correctAnswers.some(ansObj => {
                const correctAns = String(ansObj.answer || '').trim();
                const normalizedCorrectAns = isCaseSensitive ? correctAns : correctAns.toLowerCase();

                // Perform the comparison
                return normalizedCorrectAns === normalizedUserAns;
            });

        default:
            console.warn(`[checkAnswer] Unknown or unsupported question type: ${questionType}. Cannot grade.`);
            return false;
    }
};

// A helper function to check for the specific error (Unchanged)
const isTransientTransactionError = (error) => {
    return error.errorLabelSet && error.errorLabelSet.has('TransientTransactionError');
};

// ----------------------------------------------------
// 🎯 HELPER: calculateQuizAttemptResults (Unchanged)
// ----------------------------------------------------
const calculateQuizAttemptResults = (quizAttempt, userAnswers) => {
    let score = 0;
    let totalPointsPossible = 0;
    let needsManualReview = false; 
    const questionsAttemptedDetails = [];
    
    if (!quizAttempt.quizSnapshotId || !quizAttempt.quizSnapshotId.questionsSnapshot) {
        console.error('[Calculate Results] QuizSnapshot is missing or not populated.');
        return { score: 0, totalPointsPossible: 0, gradePercentage: 0, passed: false, questionsAttemptedDetails: [], needsManualReview: false };
    }

    const { questionsSnapshot, quizModuleSettingsSnapshot } = quizAttempt.quizSnapshotId;

    const userAnswersMap = new Map(Object.entries(userAnswers));

    for (const questionSnapshot of questionsSnapshot) {
        
        const questionId = questionSnapshot.questionId.toString();
        const rawUserAnswer = userAnswersMap.get(questionId); 
        const questionType = questionSnapshot.questionType;
        
        const hasAnswer = rawUserAnswer !== undefined && rawUserAnswer !== null && (typeof rawUserAnswer !== 'string' || rawUserAnswer.trim() !== '');

        let isCorrect = false;
        let pointsAwarded = 0;
        
        // --- 1. Determine Manual Review Status ---
        const isManuallyReviewableType = ['shortAnswer', 'essay'].includes(questionType);
        
        const requiresManualReview = questionSnapshot.requiresManualGradingSnapshot && isManuallyReviewableType; 
        
        if (requiresManualReview) {
            needsManualReview = true;
            pointsAwarded = 0; 
        } else if (hasAnswer) {
            // --- 2. Auto-Grade (MC, T/F, Numerical, and ShortAnswer if auto-graded) ---
            isCorrect = checkAnswer(questionType, rawUserAnswer, questionSnapshot); 
            
            pointsAwarded = isCorrect ? questionSnapshot.pointsPossibleSnapshot : 0;
            score += pointsAwarded; 
        } 

        totalPointsPossible += questionSnapshot.pointsPossibleSnapshot;

        // --- 3. Populate Specific Answer Fields for Schema ---
        let userTextAnswer = '';
        let userNumericalAnswer = null;
        let userBooleanAnswer = null;

        if (hasAnswer) {
            if (['multipleChoice', 'shortAnswer', 'essay'].includes(questionType)) {
                userTextAnswer = String(rawUserAnswer);
            } else if (questionType === 'trueFalse') {
                userBooleanAnswer = typeof rawUserAnswer === 'boolean' ? rawUserAnswer : String(rawUserAnswer).toLowerCase() === 'true';
            } else if (questionType === 'numerical') {
                userNumericalAnswer = Number(rawUserAnswer);
                if (isNaN(userNumericalAnswer)) userNumericalAnswer = null;
            }
        }

        questionsAttemptedDetails.push({
            questionId: questionSnapshot.questionId,
            questionType: questionType, 
            
            // 🛑 NEW/MODIFIED FIELDS
            userTextAnswer: userTextAnswer,
            userNumericalAnswer: userNumericalAnswer, 
            userBooleanAnswer: userBooleanAnswer, 
            
            isCorrect: isCorrect,
            pointsAwarded: pointsAwarded,
            
            // Manual grading flags
            requiresManualReview: requiresManualReview,
            isManuallyGraded: !requiresManualReview, 
            isMarkedForReview: false,
            
        });
    }

    const gradePercentage = totalPointsPossible > 0 ? (score / totalPointsPossible) * 100 : 0;
    const passed = score > 0 && gradePercentage >= quizModuleSettingsSnapshot.passingScorePercentage;

    return { 
        score, 
        totalPointsPossible, 
        gradePercentage, 
        passed, 
        questionsAttemptedDetails,
        needsManualReview 
    };
};

const updateEnrollmentForQuizCompletion = async (enrollmentId, quizModuleId, passed, session) => {
    try {
        const enrollment = await Enrollment.findById(enrollmentId).session(session);
        if (!enrollment) {
            console.warn('[Update Enrollment] Enrollment not found, cannot update progress.');
            return null;
        }

        if (passed) {
            const moduleIdStr = quizModuleId.toString();
            const moduleAlreadyCompleted = enrollment.completedModules.some(
                m => m.moduleId.toString() === moduleIdStr
            );

            if (!moduleAlreadyCompleted) {
                console.log(`[Update Enrollment] Marking module ${quizModuleId} as completed for enrollment ${enrollmentId}.`);
                enrollment.completedModules.push({
                    moduleId: quizModuleId,
                    progressPercentage: 100,
                    completionDate: new Date()
                });
                
                const newProgress = await calculateOverallCourseProgress(enrollment, session);
                enrollment.progressPercentage = newProgress;
                
                if (newProgress === 100) {
                    enrollment.status = 'completed';
                }

                await enrollment.save({ session });
                console.log(`[Update Enrollment] Enrollment progress updated to ${newProgress}%.`);
            } else {
                console.log(`[Update Enrollment] Module ${quizModuleId} was already completed. No change needed.`);
            }
        } else {
            console.log('[Update Enrollment] Quiz was not passed, so enrollment progress was not updated.');
        }

        return enrollment;

    } catch (error) {
        console.error('[Update Enrollment] CRITICAL ERROR updating enrollment after quiz:', error);
        throw error;
    }
};


// @desc    Start a new quiz attempt / Resume existing one
// @route   POST /api/quiz-attempts/start
// @access  Private (requires authentication)
export const startQuizAttempt = async (req, res) => {
    const { quizModuleId, enrollmentId, practiceTestAttemptId } = req.body;
    const userId = req.user._id;

    console.log('[B-START] Request received.');

    if (!quizModuleId || !enrollmentId || !userId) {
        return sendErrorResponse(res, 400, 'Missing required fields: quizModuleId, enrollmentId.');
    }

    let session;
    try {
        
        // 1. Check for an existing, resumable attempt. 
        console.log('[B-LOOKUP] Starting existing attempt lookup.');
        // We fetch the full Mongoose Document Instance (no .lean()) 
        // to use .toObject() for safe Map deserialization.
        let existingAttempt = await QuizAttempt.findOne({
            userId,
            quizModuleId,
            practiceTestAttemptId: practiceTestAttemptId || null, 
            status: { $in: ['in-progress', 'partially-graded'] }
        })
        .sort({ createdAt: -1 })
        // Explicitly select annotations to ensure Mongoose includes it in the document instance
        .select('+annotations'); 

        if (existingAttempt) {
            console.log(`[B-RESUME] Found existing attempt: ${existingAttempt._id}`);
            
            // 🛑 CRITICAL FIX: MANUAL RECURSIVE MAP CONVERSION
            // 1. Convert the Mongoose document instance to a clean JS object.
            const resumedData = existingAttempt.toObject({ virtuals: true }); 

            let annotationsObject = resumedData.annotations || {};
            
            // 2. The top-level 'annotations' map must be checked/converted.
            if (annotationsObject instanceof Map) {
                annotationsObject = Object.fromEntries(annotationsObject);
            }

            const finalAnnotations = {};

            // 3. Iterate over question annotations to convert nested 'notes' Maps.
            for (const [qId, annotationData] of Object.entries(annotationsObject)) {
                
                const processedAnnotationData = { ...annotationData }; 
                
                // 4. Convert questionContext.notes Map
                if (processedAnnotationData.questionContext && processedAnnotationData.questionContext.notes instanceof Map) {
                    processedAnnotationData.questionContext.notes = Object.fromEntries(processedAnnotationData.questionContext.notes);
                }
                // 🟢 NEW: Convert questionContext.snippets Map
                if (processedAnnotationData.questionContext && processedAnnotationData.questionContext.snippets instanceof Map) {
                    processedAnnotationData.questionContext.snippets = Object.fromEntries(processedAnnotationData.questionContext.snippets);
                }
                
                // 5. Convert questionText.notes Map
                if (processedAnnotationData.questionText && processedAnnotationData.questionText.notes instanceof Map) {
                    processedAnnotationData.questionText.notes = Object.fromEntries(processedAnnotationData.questionText.notes);
                }
                // 🟢 NEW: Convert questionText.snippets Map
                if (processedAnnotationData.questionText && processedAnnotationData.questionText.snippets instanceof Map) {
                    processedAnnotationData.questionText.snippets = Object.fromEntries(processedAnnotationData.questionText.snippets);
                }
                
                finalAnnotations[qId] = processedAnnotationData;
            }
            
            resumedData.annotations = finalAnnotations; // Attach the fully converted structure

            // VERIFICATION LOGS 
            console.log('[RESUME VERIFY - START] Annotations sent to Frontend (Final):', resumedData.annotations);
            if (resumedData.annotations && Object.keys(resumedData.annotations).length > 0) {
                const qId = Object.keys(resumedData.annotations)[0];
                const contextAnn = resumedData.annotations[qId]?.questionContext;
                const noteCount = Object.keys(contextAnn?.notes || {}).length; 
                console.log(`[RESUME VERIFY - START] ✅ Annotations data successfully loaded. Keys found: ${Object.keys(resumedData.annotations).length}, First Q Note Count: ${noteCount}`);
            } else {
                console.log(`[RESUME VERIFY - START] ❌ Annotations field is empty or undefined.`);
            }

            return res.status(200).json({
                success: true,
                message: 'Quiz attempt resumed successfully.',
                data: resumedData // Send the clean JS object
            });
        }

        // ----------------------------------------------------
        // PROCEED WITH NEW ATTEMPT CREATION
        // ----------------------------------------------------
        console.log('[B-NEW] No existing attempt found. Starting transaction for new attempt.');
        
        session = await mongoose.startSession();
        session.startTransaction();

        // 2. Find the QuizModule and create/find its snapshot.
        const quizModule = await Module.findById(quizModuleId)
            .populate({
                path: 'questions.question',
                select: 'questionTextRaw questionTextHtml questionContext questionContextHtml questionType options.optionTextHtml options.optionTextRaw options.isCorrect correctAnswers feedback trueFalseAnswer requiresManualGrading numericalAnswer caseSensitive',
            }) 
            .session(session);

        console.log(`[B-MODULE] Quiz Module found: ${quizModule?._id}`);

        if (!quizModule) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Quiz module not found.');
        }

        let quizSnapshot = await QuizSnapshot.findOne({ originalQuizModuleId: quizModuleId }).session(session);
        
        if (!quizSnapshot) {
            // ⭐ SNAPSHOT CREATION LOGIC RESTORED (from your previous code)
            console.log(`[BACKEND LOG] No existing snapshot found. Creating a new one...`);
            const questionsSnapshot = quizModule.questions.map(q => {
                const sourceQ = q.question;
                
                let optionsSnap = [];
                let correctAnswersSnapshot = []; 
                let trueFalseAnswerSnapshot = undefined; 
                let numericalAnswerSnapshot = undefined;
                let requiresManualGradingSnapshot = sourceQ.requiresManualGrading || false;

                if (sourceQ.questionType === 'multipleChoice') {
                    optionsSnap = sourceQ.options.map(opt => ({
                        optionTextHtml: opt.optionTextHtml,
                        isCorrect: opt.isCorrect,
                    }));
                } else if (sourceQ.questionType === 'trueFalse') {
                    if (typeof sourceQ.trueFalseAnswer === 'boolean') {
                        trueFalseAnswerSnapshot = sourceQ.trueFalseAnswer;
                    }
                } else if (sourceQ.questionType === 'shortAnswer' || sourceQ.questionType === 'essay') {
                    correctAnswersSnapshot = sourceQ.correctAnswers ? sourceQ.correctAnswers.map(ans => ({
                        answer: ans.answer,
                        answerHtml: ans.answerHtml || '',
                    })) : [];
                } else if (sourceQ.questionType === 'numerical') {
                    numericalAnswerSnapshot = sourceQ.numericalAnswer ? {
                        answer: sourceQ.numericalAnswer.answer,
                        tolerance: sourceQ.numericalAnswer.tolerance || 0,
                    } : undefined;
                }

                return {
                    questionId: sourceQ._id,
                    questionTextHtml: cleanHtmlWrapperTags(sourceQ.questionTextHtml),
                    questionTextRaw: sourceQ.questionTextRaw,
                    questionContextHtml: cleanHtmlWrapperTags(sourceQ.questionContextHtml || sourceQ.questionContext), 
                    questionContextRaw: sourceQ.questionContext || '', 
                    questionType: sourceQ.questionType,
                    optionsSnapshot: optionsSnap, 
                    trueFalseAnswerSnapshot: trueFalseAnswerSnapshot, 
                    correctAnswersSnapshot: correctAnswersSnapshot, 
                    numericalAnswerSnapshot: numericalAnswerSnapshot,
                    requiresManualGradingSnapshot: requiresManualGradingSnapshot,
                    pointsPossibleSnapshot: q.points,
                    feedbackSnapshot: sourceQ.feedback,
                    caseSensitive: sourceQ.caseSensitive 
                };
            });

            // 3. Create and save the QuizSnapshot
            quizSnapshot = new QuizSnapshot({
                originalQuizModuleId: quizModuleId,
                originalSectionId: quizModule.sectionId,
                quizModuleSettingsSnapshot: {
                    title: quizModule.title,
                    description: quizModule.description,
                    maxAttempts: quizModule.maxAttempts,
                    timeLimitMinutes: quizModule.timeLimitMinutes,
                    passingScorePercentage: quizModule.passingScorePercentage,
                    questionShuffle: quizModule.questionShuffle,
                    shuffleOptions: quizModule.shuffleOptions,
                    timerEndBehavior: quizModule.timerEndBehavior
                },
                questionsSnapshot
            });
            await quizSnapshot.save({ session });
        }

        // 4. Generate and save the shuffled order for a NEW attempt.
        let questionOrder = quizSnapshot.questionsSnapshot.map(q => q.questionId);
        if (quizModule.questionShuffle) {
            questionOrder = shuffleArray(questionOrder);
        }

        const timeLimitMinutes = quizModule.timeLimitMinutes || 0;
        const fullTimeSeconds = timeLimitMinutes * 60;
        
        // 5. Create the new QuizAttempt
        const totalPointsPossible = quizModule.questions.reduce((sum, q) => sum + q.points, 0);

        const newAttempt = new QuizAttempt({
            userId,
            quizModuleId,
            enrollmentId,
            practiceTestAttemptId: practiceTestAttemptId || null,
            quizSnapshotId: quizSnapshot._id, 
            shuffledQuestionOrder: questionOrder,
            startTime: null, 
            remainingTime: fullTimeSeconds,
            status: 'in-progress',
            totalPointsPossible,
            questionsAttemptedDetails: [],
            annotations: {} 
        });

        const savedAttempt = await newAttempt.save({ session });

        // ⭐ 6. LINK THE NEW QUIZATTEMPT TO ITS PARENT DOCUMENT
        let parentDocument;
        if (practiceTestAttemptId) {
            parentDocument = await PracticeTestAttempt.findById(practiceTestAttemptId).session(session);
        } else {
            parentDocument = await Enrollment.findById(enrollmentId).session(session);
        }

        if (!parentDocument) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Parent document (Enrollment or PracticeTestAttempt) not found.');
        }

        if (parentDocument.quizAttempts) {
            parentDocument.quizAttempts.push(savedAttempt._id);
            await parentDocument.save({ session });
        }

        // 7. Update the main enrollment's last accessed info.
        await Enrollment.findByIdAndUpdate(enrollmentId, {
            $set: { lastAccessedAt: new Date(), lastActiveModuleId: quizModuleId }
        }).session(session);

        await session.commitTransaction();

        return res.status(201).json({
            success: true,
            message: 'Quiz attempt started successfully.',
            data: savedAttempt.toJSON() // Send back clean JSON object
        });

    } catch (error) {
        if (session) await session.abortTransaction();
        console.error('[startQuizAttempt] CRASH ERROR:', error);
        return sendErrorResponse(res, 500, 'Server error processing quiz attempt request.', error.message);
    } finally {
        if (session) session.endSession();
    }
};

// @desc    Set the startTime for a quiz attempt if it's currently null
// @route   PUT /api/quiz-attempts/:id/start-timed-session
// @access  Private (User can only update their own attempt)
export const startTimedSession = async (req, res) => {
    const { id: quizAttemptId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(quizAttemptId)) {
        return sendErrorResponse(res, 400, 'Invalid quiz attempt ID format.');
    }

    try {
        const currentTime = new Date();
        
        // Ensure annotations field is selected for the response object
        const existingAttempt = await QuizAttempt.findById(quizAttemptId)
            .populate('quizModuleId')
            .select('+annotations'); // Safe practice to include

        if (!existingAttempt || !existingAttempt.userId.equals(userId) || existingAttempt.status === 'submitted') {
            return sendErrorResponse(res, 404, 'Quiz attempt not found, unauthorized, or already submitted.');
        }

        const quizModule = existingAttempt.quizModuleId;
        const timeLimitMinutes = quizModule ? quizModule.timeLimitMinutes : 0;
        const timeLimitSeconds = timeLimitMinutes * 60;
        
        const savedRemainingTime = existingAttempt.remainingTime || timeLimitSeconds; 

        let finalAttempt = existingAttempt;
        let remainingSeconds;
        
        if (!existingAttempt.startTime) {
            const timeElapsedFromFull = timeLimitSeconds - savedRemainingTime; 
            const calculatedStartTime = new Date(currentTime.getTime() - timeElapsedFromFull * 1000); 

            const updatedDoc = await QuizAttempt.findOneAndUpdate(
                { 
                    _id: quizAttemptId, 
                    startTime: { $eq: null } 
                },
                {
                    $set: { startTime: calculatedStartTime } 
                },
                { new: true }
            );

            if (updatedDoc) {
                finalAttempt = updatedDoc;
            } else {
                console.warn('[Timer/API] Race condition detected. StartTime was set by another process.');
            }
        }

        if (finalAttempt.startTime) {
            const timeElapsedMs = currentTime.getTime() - finalAttempt.startTime.getTime();
            const timeElapsedSeconds = Math.floor(timeElapsedMs / 1000);
            
            remainingSeconds = Math.max(0, timeLimitSeconds - timeElapsedSeconds);
        } else {
            remainingSeconds = savedRemainingTime; 
        }
        
        res.status(200).json({
            success: true,
            message: 'Quiz timer synchronized successfully.',
            data: {
                startTime: finalAttempt.startTime,
                remainingSeconds: remainingSeconds 
            }
        });

    } catch (error) {
        console.error('Error starting quiz timer:', error);
        sendErrorResponse(res, 500, 'Server error starting quiz timer.', error.message);
    }
};

// @desc    Submit a quiz attempt
// @route   PUT /api/quiz-attempts/:id/submit
// @access  Private (requires authentication)
export const submitQuizAttempt = async (req, res) => {
    const { id: quizAttemptId } = req.params;
    // Annotations payload is removed from save-answers, but needed here if submission is final.
    // Keeping the annotations destructure for now, but in a clean structure it should be handled 
    // by the dedicated saveAnnotations endpoint before submission.
    const { userAnswers, isAutoSubmitted } = req.body; 
    const userId = req.user._id;

    try {
        // Step 1: Find the quiz attempt and populate the snapshot (crucial for scoring)
        const quizAttempt = await QuizAttempt.findById(quizAttemptId).populate('quizSnapshotId');
        
        if (!quizAttempt) { return sendErrorResponse(res, 404, 'Quiz attempt not found.'); }
        if (!quizAttempt.userId.equals(userId)) { return sendErrorResponse(res, 403, 'Unauthorized: You do not own this quiz attempt.'); }
        if (quizAttempt.status === 'submitted' || quizAttempt.status === 'graded') {
            return sendErrorResponse(res, 400, `Quiz already submitted with status: ${quizAttempt.status}.`);
        }

        // Step 2: Calculate results (auto-grading done here)
        const results = calculateQuizAttemptResults(quizAttempt, userAnswers); 

        // Step 3: Adjust score for strict-zero-score behavior if applicable
        let finalScore = results.score;
        let finalPassed = results.passed;
        
        const quizModule = await QuizModule.findById(quizAttempt.quizModuleId); 
        
        if (isAutoSubmitted && quizModule?.timerEndBehavior === 'strict-zero-score') {
            finalScore = 0;
            finalPassed = false;
        }

        // 🎯 Determine the final status based on pending review
        const finalStatus = results.needsManualReview ? 'partially-graded' : 'graded';

        // Step 4: Perform the atomic update
        const updatableStatuses = ['in-progress', 'partially-graded'];
        const updatedAttempt = await QuizAttempt.findOneAndUpdate(
            { _id: quizAttemptId, status: { $in: updatableStatuses } }, 
            {
                $set: {
                    score: finalScore,
                    totalPointsPossible: results.totalPointsPossible,
                    passed: finalPassed,
                    questionsAttemptedDetails: results.questionsAttemptedDetails, 
                    status: finalStatus, 
                    endTime: new Date(),
                    
                    // 🛑 CLEANUP: Removed explicit setting of annotations here.
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedAttempt) {
             return sendErrorResponse(res, 404, 'Quiz attempt not found or is not in an updatable state.');
        }

        // ----------------------------------------------------------------------------------
        // Advance the Practice Test Attempt (PTA) Resume Pointer (Logic remains the same)
        // ----------------------------------------------------------------------------------
        if (updatedAttempt.practiceTestAttemptId) {
            console.log(`[PTA ADVANCE] Attempting to advance resume pointer for PTA: ${updatedAttempt.practiceTestAttemptId}`);

            const practiceTestAttempt = await PracticeTestAttempt.findById(updatedAttempt.practiceTestAttemptId).populate('courseId');
            
            const courseWithModules = await Course.findById(practiceTestAttempt.courseId._id)
                .populate({ 
                    path: 'sections', 
                    populate: { path: 'modules' } 
                }); 
                
            const allQuizModules = courseWithModules?.sections
                ?.flatMap(s => s.modules || [])
                .filter(m => m.moduleType === 'quiz')
                .sort((a, b) => a.order - b.order); 
                
            const currentModuleIndex = allQuizModules?.findIndex(m => m._id.equals(updatedAttempt.quizModuleId));
            const nextModule = allQuizModules?.[currentModuleIndex + 1];
            
            const nextModuleIdToSave = nextModule?._id || undefined; 
            
            console.log(`[PTA ADVANCE] Next module ID to set: ${nextModuleIdToSave || 'END OF TEST'}`);
            
            await PracticeTestAttempt.findByIdAndUpdate(
                updatedAttempt.practiceTestAttemptId,
                { $set: { lastActiveQuizModuleId: nextModuleIdToSave } },
                { new: true }
             );
        }
        // ----------------------------------------------------------------------------------

        // Step 6: Update the enrollment and course progress (Logic remains the same)
        const enrollment = await Enrollment.findById(updatedAttempt.enrollmentId);
        if (enrollment) {
            
            if (!enrollment.quizGradeDetails) {
                enrollment.quizGradeDetails = { totalPointsEarned: 0, totalPointsPossible: 0 };
            }
            // Ensure the attempt is linked to the enrollment
               if (!enrollment.quizAttempts.includes(updatedAttempt._id)) {
                     enrollment.quizAttempts.push(updatedAttempt._id);
               }
               
               enrollment.quizGradeDetails.totalPointsEarned += updatedAttempt.score;
               enrollment.quizGradeDetails.totalPointsPossible += updatedAttempt.totalPointsPossible;
               enrollment.grade = (enrollment.quizGradeDetails.totalPointsPossible > 0) 
                     ? (enrollment.quizGradeDetails.totalPointsEarned / enrollment.quizGradeDetails.totalPointsPossible) * 100 
                     : 0;

               // Only update course progress if it's fully graded
               if (updatedAttempt.status === 'graded') {
                     await updateEnrollmentForQuizCompletion(enrollment._id, updatedAttempt.quizModuleId, updatedAttempt.passed); 
               }
               
               await enrollment.save();
             }

             res.status(200).json({
                 success: true,
                 message: 'Quiz submitted successfully.',
                 data: updatedAttempt,
             });

         } catch (error) {
             console.error('Error submitting quiz attempt:', error);
             sendErrorResponse(res, 500, 'Failed to submit quiz attempt.', error.message);
         }
     };

/**
 * @desc    Save in-progress user answers to a quiz attempt without submitting it.
 * @route   PUT /api/quiz-attempts/:id/save-answers
 * @access  Private (User can only update their own attempt)
 */
export const saveQuizAnswers = async (req, res) => {
    const { id: quizAttemptId } = req.params;
    // 🛑 Removed annotations from destructuring as they are now handled by saveAnnotations
    const { userAnswers, currentQuestionIndex, remainingTime, markedForReview } = req.body;
    const userId = req.user._id;

    console.log(`\n[Save/API DEBUG] Processing save for QuizAttempt ID: ${quizAttemptId}`);

    if (!mongoose.Types.ObjectId.isValid(quizAttemptId)) {
        return sendErrorResponse(res, 400, 'Invalid quiz attempt ID format.');
    }

    try {
        // 1. Load the QuizAttempt document
        const attempt = await QuizAttempt.findById(quizAttemptId).populate('quizSnapshotId');

        if (!attempt || !attempt.userId.equals(userId)) {
            return sendErrorResponse(res, 404, 'Quiz attempt not found or unauthorized.');
        }

        const quizSnapshot = attempt.quizSnapshotId;
        if (!quizSnapshot || !quizSnapshot.questionsSnapshot) {
            return sendErrorResponse(res, 500, 'Cannot save: Quiz Snapshot data is missing.');
        }

        // 2. Prepare maps and sets
        const existingDetailsMap = new Map(attempt.questionsAttemptedDetails.map(detail => [detail.questionId.toString(), detail]));
        const markedForReviewSet = new Set((markedForReview || []).map(id => id.toString()));
        const newDetailsArray = [];
        let markedCount = 0;
        let answerUpdateCount = 0;

        // 3. Iterate through questions to update attempted details
        quizSnapshot.questionsSnapshot.forEach(qSnapshot => {
            const qIdString = qSnapshot.questionId.toString();
            const existingDetail = existingDetailsMap.get(qIdString) || {};
            const questionType = qSnapshot.questionType;
            const rawUserAnswer = userAnswers?.[qIdString];

            let userTextAnswer = existingDetail.userTextAnswer || '';
            let userNumericalAnswer = existingDetail.userNumericalAnswer || null;
            let userBooleanAnswer = existingDetail.userBooleanAnswer || null;

            if (rawUserAnswer !== undefined) {
                answerUpdateCount++;
                if (['multipleChoice', 'shortAnswer', 'essay'].includes(questionType)) {
                    userTextAnswer = String(rawUserAnswer);
                    userNumericalAnswer = null;
                    userBooleanAnswer = null;
                } else if (questionType === 'trueFalse') {
                    userBooleanAnswer = typeof rawUserAnswer === 'boolean'
                        ? rawUserAnswer
                        : String(rawUserAnswer).toLowerCase() === 'true';
                    userTextAnswer = '';
                    userNumericalAnswer = null;
                } else if (questionType === 'numerical') {
                    userNumericalAnswer = Number(rawUserAnswer);
                    if (isNaN(userNumericalAnswer)) userNumericalAnswer = null;
                    userTextAnswer = '';
                    userBooleanAnswer = null;
                }
            }
            if (markedForReviewSet.has(qIdString)) { markedCount++; }

            newDetailsArray.push({
                questionId: qSnapshot.questionId,
                questionType,
                userTextAnswer,
                userNumericalAnswer,
                userBooleanAnswer,
                isCorrect: existingDetail.isCorrect || false,
                pointsAwarded: existingDetail.pointsAwarded || 0,
                requiresManualReview: existingDetail.requiresManualReview || qSnapshot.requiresManualGradingSnapshot || false,
                isManuallyGraded: existingDetail.isManuallyGraded || false,
                teacherReviewerId: existingDetail.teacherReviewerId,
                teacherNotes: existingDetail.teacherNotes,
                isMarkedForReview: markedForReviewSet.has(qIdString),
            });
        });

        // 4. Assign non-annotation data
        attempt.questionsAttemptedDetails = newDetailsArray;
        attempt.lastActiveQuestionIndex = currentQuestionIndex;
        attempt.remainingTime = remainingTime;
        attempt.startTime = null; // Pauses the clock

        // 🛑 REMOVED COMPLEX ANNOTATION MERGE LOGIC - NOW IN saveAnnotations

        // 5. Save the attempt
        const updatedAttempt = await attempt.save();

        console.log(`[Save/API 5] Quiz Attempt ${quizAttemptId} updated. Index=${currentQuestionIndex}, Time=${remainingTime}, Marked=${markedCount}, New_Answers_Saved=${answerUpdateCount}`);

        // 6. Update parent PTA if exists
        if (updatedAttempt.practiceTestAttemptId) {
            const ptaUpdate = await PracticeTestAttempt.findByIdAndUpdate(
                updatedAttempt.practiceTestAttemptId,
                { $set: { lastActiveQuizModuleId: updatedAttempt.quizModuleId } },
                { new: true }
            );
            console.log(`[Save/API 6] Parent PTA ${updatedAttempt.practiceTestAttemptId} updated. Resuming on module: ${ptaUpdate.lastActiveQuizModuleId}`);
        }

        return res.status(200).json({
            success: true,
            message: 'In-progress answers saved successfully.',
            data: updatedAttempt.toJSON(),
        });

    } catch (error) {
        console.error('Error saving quiz answers:', error);
        sendErrorResponse(res, 500, 'Server error saving quiz answers.', error.message);
    }
};

// @desc    Get single quiz attempt by ID
// @route   GET /api/quiz-attempts/:id
// @access  Private (or private)
export const getQuizAttemptById = async (req, res) => {
    const { id: quizAttemptId } = req.params;
    const userId = req.user._id;

    try {
        console.log(`[Attempt Fetch] User ${userId} is attempting to view quiz attempt: ${quizAttemptId}`);

        const quizAttempt = await QuizAttempt.findById(quizAttemptId)
            .populate('userId', 'firstName lastName email IDnumber avatar')
            .populate('quizModuleId', 'title description')
            .populate({
                path: 'enrollmentId',
                select: 'courseId', 
                populate: {
                    path: 'courseId', 
                    select: 'title' 
                }
            })
            .populate('quizSnapshotId')
            .select('+annotations') // ⭐ CRITICAL FIX: Ensure annotations are included on fetch
            .lean();

        if (!quizAttempt) {
            console.log(`[Attempt Fetch] Quiz attempt ${quizAttemptId} not found.`);
            return sendErrorResponse(res, 404, 'Quiz attempt not found.');
        }

        const userHasAllPermission = req.user.permissions.includes('quiz_attempt:read:all');
        const isAttemptOwner = quizAttempt.userId._id.toString() === userId.toString();

        if (!isAttemptOwner && !userHasAllPermission) {
            console.log(`[Attempt Fetch] User ${userId} is not the owner and lacks 'quiz_attempt:read:all' permission.`);
            return sendErrorResponse(res, 403, 'Forbidden: You do not have access to this quiz attempt.');
        }

        res.status(200).json({ success: true, data: quizAttempt });

    } catch (error) {
        console.error('Error fetching quiz attempt by ID:', error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid quiz attempt ID format.');
        }
        sendErrorResponse(res, 500, 'Server error fetching quiz attempt.', error.message);
    }
};

export const getQuizAttemptsByCourseId = async (req, res) => {
    const { courseId } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ success: false, message: 'Invalid course ID format.' });
        }

        const sectionsInCourse = await Section.find({ course: courseId })
            .populate({
                path: 'modules',
                select: 'title moduleType',
                model: 'Module'
            })
            .sort({ order: 1 })
            .lean();

        if (!sectionsInCourse || sectionsInCourse.length === 0) {
            console.log("No sections found for this course.");
            return res.status(200).json({ success: true, message: 'No sections found for this course.', attempts: [] });
        }

        const quizModuleIdToSectionTitleMap = {};
        const quizModuleIds = [];
        
        sectionsInCourse.forEach(section => {
            section.modules.forEach(module => {
                if (module.moduleType === 'quiz') {
                    quizModuleIdToSectionTitleMap[module._id.toString()] = section.sectionTitle;
                    quizModuleIds.push(module._id);
                }
            });
        });

        if (quizModuleIds.length === 0) {
            console.log("No quizzes found in this course based on the provided data.");
            return res.status(200).json({ success: true, message: 'No quizzes found in this course.', attempts: [] });
        }
        
        const attempts = await QuizAttempt.find({ quizModuleId: { $in: quizModuleIds } })
            .populate('userId', 'firstName lastName email IDnumber avatar')
            .populate('quizSnapshotId')
        .sort({ startTime: -1 })
            .lean();

        const formattedAttempts = attempts.map(attempt => {
            const sectionTitle = quizModuleIdToSectionTitleMap[attempt.quizModuleId.toString()] || 'Section Not Found';
            
            return {
                _id: attempt._id,
                userId: attempt.userId,
                quizModuleId: attempt.quizModuleId,
                quizTitle: attempt.quizSnapshotId?.quizModuleSettingsSnapshot?.title || 'Untitled Quiz',
                section: sectionTitle,
                score: attempt.score,
                totalPointsPossible: attempt.totalPointsPossible,
                passed: attempt.passed,
                createdAt: attempt.createdAt,
                duration: attempt.endTime ? (attempt.endTime - attempt.startTime) / 1000 : null
            };
        });

        res.status(200).json({
            success: true,
            message: 'Quiz attempts fetched successfully.',
            attempts: formattedAttempts
        });

    } catch (error) {
        console.error('Error fetching quiz attempts by course ID:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving quiz attempts.' });
    }
};

/**
 * @desc    Delete a specific quiz attempt by ID.
 * @route   DELETE /api/quiz-attempts/:id
 * @access  Private (Admin/Staff requires 'quiz_attempt:delete' permission)
*/
export const deleteQuizAttempt = async (req, res) => {
    const { id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid quiz attempt ID format.' });
        }

        const deletedAttempt = await QuizAttempt.findByIdAndDelete(id);

        if (!deletedAttempt) {
            return res.status(404).json({ success: false, message: 'Quiz attempt not found.' });
        }

        res.status(200).json({ success: true, message: 'Quiz attempt deleted successfully.', data: deletedAttempt });

    } catch (error) {
        console.error('Error deleting quiz attempt:', error);
        res.status(500).json({ success: false, message: 'Server error deleting quiz attempt.', error: error.message });
    }
};

export const getQuizSnapshotById = async (req, res) => {
    const { id: quizModuleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quizModuleId)) {
        return sendErrorResponse(res, 400, 'Invalid quiz module ID format.');
   }

    console.log(`\n--- [BACKEND LOG] Fetching Snapshot for Module ID: ${quizModuleId} ---`); 

    try {
        const snapshot = await QuizSnapshot.findOne({ originalQuizModuleId: quizModuleId })
            .select([
                'quizModuleSettingsSnapshot', 
                'originalSectionId',
                'questionsSnapshot.questionId',
                'questionsSnapshot.questionType',
                'questionsSnapshot.correctAnswersSnapshot', 
                'questionsSnapshot.trueFalseAnswerSnapshot',
                'questionsSnapshot.numericalAnswerSnapshot',
                'questionsSnapshot.pointsPossibleSnapshot',
                'questionsSnapshot.questionTextHtml', 
                'questionsSnapshot.questionTextRaw',   
                'questionsSnapshot.questionContextHtml', 
                'questionsSnapshot.questionContextRaw',  
                'questionsSnapshot.feedbackSnapshot',
                'questionsSnapshot.optionsSnapshot.optionTextHtml', 
                'questionsSnapshot.optionsSnapshot.isCorrect',
                'questionsSnapshot.caseSensitive' 
            ])
            .lean();

        if (!snapshot) {
            console.log(`[BACKEND LOG] Snapshot NOT FOUND.`);
            return sendErrorResponse(res, 404, 'Quiz snapshot not found. The quiz may not have been started yet.');
        }

        // ⬇️ ADD THIS DETAILED LOG ⬇️
        console.log(`[BACKEND LOG] Snapshot Found. Checking first question...`);
        if (snapshot.questionsSnapshot && snapshot.questionsSnapshot.length > 0) {
            const firstQuestion = snapshot.questionsSnapshot[0];
            console.log({
                questionId: firstQuestion.questionId,
                hasQuestionTextHtml: !!firstQuestion.questionTextHtml,
                hasQuestionTextRaw: !!firstQuestion.questionTextRaw, 
                questionTextRaw_Value: firstQuestion.questionTextRaw, 
                hasQuestionContextRaw: !!firstQuestion.questionContextRaw, 
                questionContextRaw_Value: firstQuestion.questionContextRaw 
            });
        } else {
            console.log('[BACKEND LOG] Snapshot found, but questionsSnapshot is empty.');
        }
        // ⬆️ END OF LOG ⬆️
        
        res.status(200).json({
            success: true,
            data: snapshot,
        });

    } catch (error) {
        console.error('Error fetching quiz snapshot:', error);
        sendErrorResponse(res, 500, 'Server error fetching quiz snapshot.', error.message);
    }
};

export const getEnrollmentQuizAttempts = async (req, res) => {
    const { enrollmentId } = req.params;
    const userId = req.user._id;
    try {
        const enrollment = await Enrollment.findById(enrollmentId);
        if (!enrollment || enrollment.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this enrollment.' });
        }
        const quizAttempts = await QuizAttempt.find({ enrollmentId })
            .sort({ startTime: 1 })
            .populate('userId', 'name email')
            .populate('quizModuleId', 'title description')
            .populate('enrollmentId', 'courseId');
        res.status(200).json({ success: true, data: quizAttempts });
    } catch (error) {
        console.error('Error fetching enrollment quiz attempts:', error);
        res.status(500).json({ success: false, message: 'Server error fetching enrollment quiz attempts.', error: error.message });
    }
};

export const getUserQuizAttempts = async (req, res) => {
    const { userId: paramUserId, quizModuleId } = req.params;
    const authUserId = req.user._id;
    if (paramUserId !== authUserId.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own quiz attempts.' });
    }
    try {
        const quizAttempts = await QuizAttempt.find({ userId: authUserId, quizModuleId })
            .sort({ startTime: 1 })
            .populate('userId', 'name email')
            .populate('quizModuleId', 'title description')
            .populate('enrollmentId', 'courseId');
        res.status(200).json({ success: true, data: quizAttempts });
    } catch (error) {
        console.error('Error fetching user quiz attempts:', error);
        res.status(500).json({ success: false, message: 'Server error fetching user quiz attempts.', error: error.message });
    }
};

export const saveAnnotations = async (req, res) => {
    const { quizAttemptId } = req.params;
    const { questionId, annotationData } = req.body;
    const updateFields = {}; // Object to hold all fields for $set
    const unsetFields = {}; // Object to hold fields for $unset (for removal)

    // Safety check
    if (!questionId || !annotationData) {
        return res.status(400).json({ error: "Missing required fields: questionId or annotationData." });
    }

    try {
        let debugLog = {};

        // Helper to process a specific annotation area (questionText or questionContext)
        const processArea = (areaKey, data) => {
            const baseAreaPath = `annotations.${questionId}.${areaKey}`;

            // Check for deletion/cleanup case (empty notes AND empty/missing serialized string)
            const isAreaEmpty = (data.notes && Object.keys(data.notes).length === 0) && 
                                (!data.serialized || data.serialized.length === 0);

            if (isAreaEmpty) {
                // If the entire annotation area is empty, UNSET the field for cleanup
                // This removes the {questionContext: {notes:{}, serialized:""}} structure entirely
                unsetFields[baseAreaPath] = "";
                debugLog[`${areaKey}Status`] = 'UNSET/CLEAN';
                return;
            }

            // If data exists, use $set for the individual fields.
            if (data.serialized !== undefined) {
                updateFields[`${baseAreaPath}.serialized`] = data.serialized;
            }
            // Notes must always be explicitly set because it's a Mixed type
            if (data.notes !== undefined) {
                updateFields[`${baseAreaPath}.notes`] = data.notes;
            }
            // 🟢 CRITICAL ADDITION: Handle the Snippets field
            if (data.snippets !== undefined) {
                updateFields[`${baseAreaPath}.snippets`] = data.snippets;
            }
            debugLog[`${areaKey}Status`] = 'SET/UPDATED';
        };

        // 1. Process Question Text Annotations
        if (annotationData.questionText) {
            processArea('questionText', annotationData.questionText);
            debugLog.textNotesIn = annotationData.questionText.notes;
        }

        // 2. Process Question Context Annotations
        if (annotationData.questionContext) {
            processArea('questionContext', annotationData.questionContext);
            debugLog.contextNotesIn = annotationData.questionContext.notes;
        }

        // Check if there's anything to update
        if (Object.keys(updateFields).length === 0 && Object.keys(unsetFields).length === 0) {
            return res.json({ success: true, message: "No annotation data provided or necessary to update." });
        }

        // 3. Atomically Update the Document
        const updateOperation = {};
        if (Object.keys(updateFields).length > 0) {
            updateOperation.$set = updateFields;
        }
        if (Object.keys(unsetFields).length > 0) {
            updateOperation.$unset = unsetFields;
        }
        
        // Use findByIdAndUpdate for atomic operation
        const updatedAttempt = await QuizAttempt.findByIdAndUpdate(
            quizAttemptId,
            updateOperation,
            { 
                new: true, 
                runValidators: true, 
                // upsert: true should typically only be used if you intend to create the QuizAttempt document here, 
                // which seems wrong given its complexity. Assuming you rely on startQuizAttempt for creation.
            } 
        ).select('annotations'); 

        if (!updatedAttempt) {
            return res.status(404).json({ error: "QuizAttempt not found." });
        }

        // Debug Logs
        console.log(`\n======================================================`);
        console.log(`[ANNOTATION SAVE DEBUG] Attempt: ${quizAttemptId}`);
        console.log(`[MONGO UPDATE] SET:`, JSON.stringify(updateFields, null, 2));
        console.log(`[MONGO UPDATE] UNSET:`, JSON.stringify(unsetFields, null, 2));
        console.log(`[INCOMING DATA] Raw Note Payload:`, debugLog.textNotesIn || debugLog.contextNotesIn);
        console.log(`[CONVERSION RESULT] Question ID: ${questionId}`);
        console.log(`======================================================\n`);

        // 4. Respond
        // The rest of the response logic remains fine.
        const annotationsForResponse = updatedAttempt.annotations[questionId];
        
        const plainObjectAnnotations = annotationsForResponse ? 
            JSON.parse(JSON.stringify(annotationsForResponse)) : {};

        res.json({ success: true, annotations: plainObjectAnnotations });

    } catch (err) {
        console.error("Failed to save annotations:", err);
        res.status(500).json({ error: "Failed to save annotations" });
    }
};

/**
 * @desc    Removes a specific note and its corresponding serialized highlight segment.
 * @route   DELETE /api/quiz-attempts/:attemptId/annotations/:questionId/:areaKey/:highlightId
 * @access  Private (User can only delete from their own attempt)
 */
export const deleteAnnotation = async (req, res) => {
    const { attemptId, questionId, areaKey, highlightId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
        return sendErrorResponse(res, 400, 'Invalid quiz attempt ID format.');
    }
    if (!['questionText', 'questionContext'].includes(areaKey)) {
        return sendErrorResponse(res, 400, 'Invalid annotation area key.');
    }
    
    // Debug logging the incoming request
    console.log(`\n[DELETE ANNOTATION] Attempt: ${attemptId}, QID: ${questionId}, Area: ${areaKey}, Highlight: ${highlightId}`);


    try {
        // 1. Fetch the document and perform ownership check
        const attempt = await QuizAttempt.findById(attemptId).select('+annotations');

        if (!attempt || !attempt.userId.equals(userId)) {
            return sendErrorResponse(res, 404, 'Quiz attempt not found or unauthorized.');
        }

        // 2. Access the annotation paths using bracket notation for Mixed types
        const annotations = attempt.annotations || {};
        const questionAnnotations = annotations[questionId];

        if (!questionAnnotations || !questionAnnotations[areaKey]) {
            console.warn(`[DELETE ANNOTATION] Target annotation path not found: annotations.${questionId}.${areaKey}`);
            return sendErrorResponse(res, 404, 'Annotation data for the specified question and area not found.');
        }

        const areaPath = questionAnnotations[areaKey];
        const { serialized, notes } = areaPath;
        const snippets = areaPath.snippets || {};
        
        // Path string for Mongoose markModified
        const notesPath = `annotations.${questionId}.${areaKey}.notes`;
        const snippetsPath = `annotations.${questionId}.${areaKey}.snippets`;
        const serializedPath = `annotations.${questionId}.${areaKey}.serialized`;

        let highlightRemoved = false;
        
        // --- A. Remove the Note (from the Mixed type Map) ---
        if (notes && notes.hasOwnProperty(highlightId)) {
            delete notes[highlightId]; 
            // CRITICAL: Mark the Mixed field as modified before saving
            attempt.markModified(notesPath); 
            console.log(`[DELETE ANNOTATION] Note with ID ${highlightId} successfully removed from map.`);
        } else {
            console.warn(`[DELETE ANNOTATION] Note not found in notes map, only attempting highlight removal.`);
        }

        // 🟢 CRITICAL ADDITION: Remove the Snippet (from the Mixed type Map)
        if (snippets && snippets.hasOwnProperty(highlightId)) {
            delete snippets[highlightId]; 
            attempt.markModified(snippetsPath); // Mark snippets as modified
            console.log(`[DELETE ANNOTATION] Snippet with ID ${highlightId} successfully removed from map.`);
            highlightRemoved = true;
        } else {
            console.warn(`[DELETE ANNOTATION] Snippet not found in snippets map...`);
        }

        // --- B. Update the Serialized Highlight String ---
        if (serialized) {
            const regex = highlightRegex(highlightId);
            
            let newSerialized = serialized.replace(regex, '');
            
            // Cleanup double separators (e.g., 'seg1^^seg3' -> 'seg1^seg3')
            newSerialized = newSerialized.replace(/\^{2,}/g, '^');

            // Cleanup leading/trailing separators (e.g., '^seg1' -> 'seg1')
            newSerialized = newSerialized.replace(/^\^|\^$/g, '');
            
            if (newSerialized !== serialized) {
                // Apply the updated string and mark the field as modified
                areaPath.serialized = newSerialized;
                // Since this is nested within a Mixed type, Mongoose often needs markModified 
                // for the parent annotations object if the parent object structure changes.
                // However, directly assigning it to the sub-document path is generally tracked.
                // To be safest, we use .markModified on the entire annotations object structure 
                // if the note deletion flag was used (already covered above).
                highlightRemoved = true;
                console.log(`[DELETE ANNOTATION] Highlight segment successfully removed from serialized string.`);
            } else {
                console.warn(`[DELETE ANNOTATION] Highlight ID ${highlightId} not found in serialized string.`);
            }
        }
        
        if (!highlightRemoved && !notes.hasOwnProperty(highlightId)) {
             // If both parts were already missing, return a success but log the warning.
            return res.status(200).json({ 
                success: true, 
                message: "Annotation was not found, but deletion request processed successfully (idempotent)." 
            });
        }
        
        // 3. Save the document
        await attempt.save();

        // 4. Respond
        return res.status(200).json({ 
            success: true, 
            message: `Highlight and note for ID ${highlightId} deleted successfully.`
        });

    } catch (error) {
        console.error('Error deleting annotation:', error);
        return sendErrorResponse(res, 500, 'Server error deleting annotation.', error.message);
    }
};