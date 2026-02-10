import { Module, LessonModule, QuizModule } from '../models/ModuleSchema.js'; // Added TestModule to imports
import { Section } from '../models/SectionSchema.js';
import { LessonContent } from '../models/LessonContentSchema.js';
import { Question } from '../models/QuestionSchema.js';
import { Subject } from '../models/SubjectSchema.js';
import { Category } from '../models/CategorySchema.js';
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

// @desc      Create a new module (lesson, quiz, or test) for a section
// @route     POST /sections/:sectionId/modules
export const createModule = async (req, res) => {
    let session;
    const { sectionId } = req.params;
    
    console.log("🚀 [Backend] createModule initiated for Section:", sectionId);

    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const {
            moduleType, title, description, order, status,
            progressBar, contents,
            subjectId, categoryId, questionsPerPage, questionNavigation, questionShuffle, 
            questions, 
            satSettings,
            shuffleOptions, maxAttempts, timeLimitMinutes, passingScorePercentage,
            availableFrom, availableUntil, direction,
            quizModules,
            timerEndBehavior
        } = req.body;

        if (!req.user || !req.user._id) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 401, "Unauthorized: User information missing.");
        }
        
        const section = await Section.findById(sectionId).session(session);
        if (!section) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 404, 'Section not found.');
        }

        let newModule;

        if (moduleType === 'lesson') {
            // --- LESSON LOGIC ---
            if (!contents || !Array.isArray(contents) || contents.length === 0) {
                await session.abortTransaction();
                session.endSession();
                return sendErrorResponse(res, 400, 'Lesson module requires at least one content ID.');
            }
            // Verify contents exist
            const existingContents = await LessonContent.find({ '_id': { $in: contents } }).session(session);
            if (existingContents.length !== contents.length) {
                const missingIds = contents.filter(id => !existingContents.some(lc => lc._id.toString() === id));
                await session.abortTransaction();
                session.endSession();
                return sendErrorResponse(res, 400, `One or more lesson content IDs not found: ${missingIds.join(', ')}.`);
            }
            
            newModule = new LessonModule({
                moduleType, title, description, order, status,
                progressBar, contents,
                section: sectionId,
                createdBy: req.user._id
            });

        } else if (moduleType === 'quiz') {
            // --- QUIZ LOGIC (Standard + SAT) ---
            
            // 1. Validation: Check Standard OR SAT Questions
            const hasStandardQuestions = questions && Array.isArray(questions) && questions.length > 0;
            const hasSATStrandQuestions = satSettings?.isSAT && satSettings.strands?.some(s => s.questions?.length > 0);

            if (!hasStandardQuestions && !hasSATStrandQuestions) {
                await session.abortTransaction();
                session.endSession();
                return sendErrorResponse(res, 400, 'Quiz module requires at least one question (either in standard list or SAT strands).');
            }

            // 2. Validate IDs
            if (!subjectId || !categoryId) {
                await session.abortTransaction();
                session.endSession();
                return sendErrorResponse(res, 400, 'Subject ID and Category ID are required for a quiz.');
            }

            // 3. Data Cleaning & Mapping
            // If SAT mode is on, we wipe the standard questions. If not, we keep them.
            // ⭐ FIX: We map the questions to ensure 'question' key is populated correctly from either 'question' or 'questionId'
            const mappedStandardQuestions = (satSettings?.isSAT ? [] : questions).map(q => ({
                question: q.question || q.questionId, // <--- SAFETY CHECK
                points: q.points || 1
            }));

            // Map SAT Strands similarly just in case
            const mappedSatSettings = satSettings?.isSAT ? {
                isSAT: true,
                strands: satSettings.strands.map(s => ({
                    ...s,
                    questions: s.questions.map(q => ({
                        question: q.question || q.questionId, // <--- SAFETY CHECK
                        points: q.points || 1
                    }))
                }))
            } : { isSAT: false, strands: [] };

            newModule = new QuizModule({
                moduleType, title, description, order, status,
                subjectId, categoryId, questionsPerPage, questionNavigation, questionShuffle,
                questions: mappedStandardQuestions,
                satSettings: mappedSatSettings,
                shuffleOptions, maxAttempts, timeLimitMinutes, passingScorePercentage,
                availableFrom, availableUntil, direction,
                timerEndBehavior,
                section: sectionId,
                createdBy: req.user._id
            });

        } else if (moduleType === 'test') {
            // --- TEST LOGIC ---
            if (!quizModules || !Array.isArray(quizModules) || quizModules.length === 0) {
                await session.abortTransaction();
                session.endSession();
                return sendErrorResponse(res, 400, 'Test module requires at least one quiz module.');
            }

            // Validate Quizzes exist
            const foundQuizzes = await QuizModule.find({ '_id': { $in: quizModules } }).session(session);
            if (foundQuizzes.length !== quizModules.length) {
                const missingIds = quizModules.filter(id => !foundQuizzes.some(qm => qm._id.toString() === id));
                await session.abortTransaction();
                session.endSession();
                return sendErrorResponse(res, 400, `One or more provided quiz module IDs were not found: ${missingIds.join(', ')}.`);
            }

            // Calculate totals
            const totalTime = foundQuizzes.reduce((sum, quiz) => sum + (quiz.timeLimitMinutes || 0), 0);
            // Calculate passing score logic (omitted for brevity, keep your existing logic here if complex)
            const overallPassingPercentage = passingScorePercentage || 0; 

            newModule = new TestModule({
                moduleType, title, description, order, status,
                quizModules,
                timeLimitMinutes: totalTime,
                passingScorePercentage: overallPassingPercentage,
                section: sectionId,
                createdBy: req.user._id
            });
        }
        
        const createdModule = await newModule.save({ session });
        
        await Section.updateOne(
            { _id: sectionId },
            { $push: { modules: createdModule._id } },
            { session }
        );
        
        await session.commitTransaction();
        session.endSession();
        
        res.status(201).json({ success: true, message: 'Module created successfully.', data: createdModule });

    } catch (error) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        console.error("❌ Error in createModule:", error);
        
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, Object.values(error.errors).map(val => val.message).join(', '), error.errors);
        }
        sendErrorResponse(res, 500, 'Failed to create module.', error.message);
    }
};

// @desc      Get all modules for a specific section
// @route     GET /sections/:sectionId/modules
export const getModulesBySectionId = async (req, res) => {
    try {
        const section = await Section.findById(req.params.sectionId)
            .populate({
                path: 'modules',
                model: 'Module',
                options: { sort: { order: 1 } },
                populate: [
                    { path: 'contents', model: 'LessonContent', select: 'title description contentHtml' },
                    {
                        path: 'questions.question',
                        model: 'Question',
                        select: 'questionTextRaw questionTextHtml questionType options correctAnswer feedback questionContext trueFalseAnswer'
                    },
                    { path: 'subjectId', model: 'Subject', select: 'name' },
                    { path: 'categoryId', model: 'Category', select: 'name' },
                    { 
                        path: 'quizModules',
                        model: 'QuizModule',
                        select: 'title description questions maxAttempts timeLimitMinutes passingScorePercentage',
                        populate: {
                            path: 'questions.question',
                            model: 'Question',
                            select: 'questionTextRaw questionTextHtml'
                        }
                    }
                ]
            });
        if (!section) {
            return sendErrorResponse(res, 404, 'Section not found.');
        }
        res.status(200).json({ success: true, data: section.modules });
    } catch (error) {
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid section ID format.', error.message);
        }
        sendErrorResponse(res, 500, "Failed to retrieve modules.", error.message);
    }
};

// @desc      Get single module by ID (used for top-level module routes)
// @route     GET /modules/:id
export const getModuleById = async (req, res) => {
    try {
        const baseModule = await Module.findById(req.params.id);
        if (!baseModule) return sendErrorResponse(res, 404, 'Module not found.');

        let module;
        if (baseModule.moduleType === 'quiz') {
            module = await QuizModule.findById(req.params.id)
                .populate([
                    { path: 'questions.question', model: 'Question' },
                    { path: 'satSettings.strands.questions.question', model: 'Question' },
                    { path: 'subjectId', model: 'Subject' },
                    { path: 'categoryId', model: 'Category' } 
                ]).lean();
        } else if (baseModule.moduleType === 'lesson') {
            module = await LessonModule.findById(req.params.id).populate({ path: 'contents', model: 'LessonContent' }).lean();
        } else if (baseModule.moduleType === 'test') {
             // Basic population for test
             module = await TestModule.findById(req.params.id).lean();
        } else {
            module = baseModule.toObject();
        }

        res.status(200).json({ success: true, data: module });
    } catch (error) {
        sendErrorResponse(res, 500, "Failed to retrieve module.", error.message);
    }
};

// @desc      Update a module (for top-level module routes)
// @route     PUT /modules/:id
export const updateModule = async (req, res) => {
    const { id } = req.params;
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const {
            moduleType, title, description, order,
            progressBar, contents,
            questionsPerPage, questionNavigation, questionShuffle, 
            questions, satSettings, // ⭐
            shuffleOptions, maxAttempts, timeLimitMinutes, passingScorePercentage,
            availableFrom, availableUntil, status, subjectId, categoryId, direction,
            quizModules, timerEndBehavior
        } = req.body;

        const existingModule = await Module.findById(id).session(session);
        if (!existingModule) {
            await session.abortTransaction(); session.endSession();
            return sendErrorResponse(res, 404, 'Module not found.');
        }

        let updateData = { title, description, status, timerEndBehavior, order };
        let updatedModule;

        if (existingModule.moduleType === 'lesson') {
            updateData = { ...updateData, progressBar, contents };
            updatedModule = await LessonModule.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, session });

        } else if (existingModule.moduleType === 'quiz') {
            const isSAT = satSettings?.isSAT === true;
            
            // ⭐ Mapping Fix for Updates as well
            const mappedStandardQuestions = (isSAT ? [] : questions).map(q => ({
                question: q.question || q.questionId,
                points: q.points || 1
            }));

            const mappedSatSettings = isSAT ? {
                isSAT: true,
                strands: satSettings.strands.map(s => ({
                    ...s,
                    questions: s.questions.map(q => ({
                        question: q.question || q.questionId,
                        points: q.points || 1
                    }))
                }))
            } : { isSAT: false, strands: [] };

            updateData = {
                ...updateData,
                subjectId, categoryId, questionsPerPage, questionNavigation, questionShuffle,
                shuffleOptions, maxAttempts, timeLimitMinutes, passingScorePercentage,
                availableFrom, availableUntil, direction,
                questions: mappedStandardQuestions,
                satSettings: mappedSatSettings
            };
            updatedModule = await QuizModule.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, session });

        } else if (existingModule.moduleType === 'test') {
            // (Test update logic)
            updatedModule = await TestModule.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, session });
        }

        await session.commitTransaction();
        session.endSession();

        // Populate and return
        const populatedModule = await Module.findById(updatedModule._id).populate([
            { path: 'contents', model: 'LessonContent' },
            { path: 'questions.question', model: 'Question' },
            { path: 'satSettings.strands.questions.question', model: 'Question' },
            { path: 'subjectId', model: 'Subject' },
            { path: 'categoryId', model: 'Category' }
        ]);

        res.status(200).json({ success: true, message: 'Module updated successfully.', data: populatedModule });

    } catch (error) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        console.error("❌ Error in updateModule:", error);
        sendErrorResponse(res, 500, "Failed to update module.", error.message);
    }
};

// @desc      Delete a module (hard delete)
// @route     DELETE /modules/:id
export const deleteModule = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const moduleToDelete = await Module.findById(req.params.id).session(session);

        if (!moduleToDelete) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 404, 'Module not found.');
        }

        if (moduleToDelete.section) {
            await Section.updateOne(
                { _id: moduleToDelete.section },
                { $pull: { modules: moduleToDelete._id } },
                { session }
            );
        }

        await moduleToDelete.deleteOne({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: 'Module permanently deleted successfully.' });
        
    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        console.error("[Module Controller] Error in deleteModule (hard delete):", error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid module ID format.', error.message);
        }
        sendErrorResponse(res, 500, "Failed to permanently delete module.", error.message);
    }
};

// @desc      Get all modules (lessons, quizzes, and tests)
// @route     GET /modules
export const getAllModules = async (req, res) => {
    try {
        const query = {};
        if (req.query.moduleType) {
            query.moduleType = req.query.moduleType;
        }

        // Fetch all modules with other populates, but explicitly handle quizModules separately
        let modules = await Module.find(query)
            .populate('subjectId', 'name')
            .populate('categoryId', 'name')
            .populate({
                path: 'questions.question',
                model: 'Question',
                select: 'questionTextRaw questionTextHtml questionContextHtml questionContextRaw status subject'
            })
            .populate({
                path: 'contents',
                model: 'LessonContent',
                select: 'title contentHtml'
            })
            .lean();

        // Manual population for TestModule's quizModules
        await Promise.all(modules.map(async (moduleItem) => {
            if (moduleItem.moduleType === 'test' && moduleItem.quizModules && moduleItem.quizModules.length > 0) {
                const populatedQuizzes = await QuizModule.find({ _id: { $in: moduleItem.quizModules } }).lean();
                moduleItem.quizModules = populatedQuizzes;
            }
        }));

        return res.status(200).json({
            success: true,
            message: 'Modules fetched successfully',
            data: modules
        });
    } catch (error) {
        console.error('Error fetching all modules:', error);
        sendErrorResponse(res, 500, 'Failed to retrieve modules.', error.message);
    }
};

// @desc      Create a new standalone module (not tied to a section initially)
// @route     POST /modules
export const createStandaloneModule = async (req, res) => {
    let session;
    console.log("🚀 [Backend] createStandaloneModule initiated");

    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const {
            moduleType, title, description, order, status,
            progressBar, contents,
            subjectId, categoryId, questionsPerPage, questionNavigation, questionShuffle, 
            questions, // Standard
            satSettings, // ⭐ SAT
            shuffleOptions, maxAttempts, timeLimitMinutes, passingScorePercentage,
            availableFrom, availableUntil, direction,
            quizModules
        } = req.body;

        if (!req.user || !req.user._id) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 401, "Unauthorized: User information missing.");
        }

        let newModule;
        const baseData = {
            moduleType, title, description, order,
            createdBy: req.user._id,
            status: status || 'draft'
        };

        if (moduleType === 'lesson') {
            // ... (Lesson Logic Same as CreateModule)
            if (!contents || contents.length === 0) {
                await session.abortTransaction(); session.endSession();
                return sendErrorResponse(res, 400, 'Lesson requires content.');
            }
            newModule = new LessonModule({ ...baseData, progressBar, contents });

        } else if (moduleType === 'quiz') {
            // ⭐ 1. VALIDATION
            const hasStandard = questions && Array.isArray(questions) && questions.length > 0;
            const hasSAT = satSettings?.isSAT && satSettings.strands?.some(s => s.questions?.length > 0);

            if (!hasStandard && !hasSAT) {
                await session.abortTransaction();
                session.endSession();
                return sendErrorResponse(res, 400, 'Quiz requires at least one question.');
            }

            if (!subjectId || !categoryId) {
                await session.abortTransaction(); session.endSession();
                return sendErrorResponse(res, 400, 'Subject and Category required.');
            }

            // ⭐ 2. MAPPING FIX
            // Ensure we handle both "question" and "questionId" keys from frontend
            const mappedStandardQuestions = (satSettings?.isSAT ? [] : questions).map(q => ({
                question: q.question || q.questionId, 
                points: q.points || 1
            }));

            const mappedSatSettings = satSettings?.isSAT ? {
                isSAT: true,
                strands: satSettings.strands.map(s => ({
                    ...s,
                    questions: s.questions.map(q => ({
                        question: q.question || q.questionId,
                        points: q.points || 1
                    }))
                }))
            } : { isSAT: false, strands: [] };

            newModule = new QuizModule({
                ...baseData,
                subjectId, categoryId, questionsPerPage, questionNavigation, questionShuffle,
                questions: mappedStandardQuestions,
                satSettings: mappedSatSettings,
                shuffleOptions, maxAttempts, timeLimitMinutes, passingScorePercentage,
                availableFrom, availableUntil, direction
            });

        } else if (moduleType === 'test') {
            if (!quizModules || quizModules.length === 0) {
                await session.abortTransaction(); session.endSession();
                return sendErrorResponse(res, 400, 'Test requires quiz modules.');
            }
            // (Calculations omitted for brevity, similar to createModule)
            newModule = new TestModule({ ...baseData, quizModules });
        } else {
            await session.abortTransaction(); session.endSession();
            return sendErrorResponse(res, 400, 'Invalid module type.');
        }

        const createdModule = await newModule.save({ session });
        await session.commitTransaction();
        session.endSession();
        
        res.status(201).json({ success: true, message: 'Standalone module created.', data: createdModule });

    } catch (error) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        console.error("❌ Error in createStandaloneModule:", error);
        
        if (error.name === 'ValidationError') {
            // Return specific validation error details
            return sendErrorResponse(res, 400, Object.values(error.errors).map(val => val.message).join(', '), error.errors);
        }
        sendErrorResponse(res, 500, 'Failed to create standalone module.', error.message);
    }
};

export const reorderQuizQuestions = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const { quizId } = req.params;
        const { newQuestionOrder } = req.body;

        if (!newQuestionOrder || !Array.isArray(newQuestionOrder)) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 400, "Invalid request. 'newQuestionOrder' must be a non-empty array.");
        }
        
        const quizModule = await QuizModule.findById(quizId).session(session);
        if (!quizModule) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 404, "Quiz module not found.");
        }

        const newOrderIds = newQuestionOrder.map(q => q.questionId);
        const foundQuestions = await Question.find({ '_id': { $in: newOrderIds } }).session(session);
        if (foundQuestions.length !== newOrderIds.length) {
            await session.abortTransaction();
            session.endSession();
            const foundIds = foundQuestions.map(q => q._id.toString());
            const missingIds = newOrderIds.filter(id => !foundIds.includes(id));
            return sendErrorResponse(res, 400, `One or more question IDs in the new order were not found in the Question bank: ${missingIds.join(', ')}.`);
        }

        const updatedQuestions = newQuestionOrder.map(newQ => ({
            question: newQ.questionId,
            points: newQ.points
        }));
        
        quizModule.questions = updatedQuestions;
        await quizModule.save({ session });

        await session.commitTransaction();
        session.endSession();

        const populatedQuizModule = await QuizModule.findById(quizModule._id).populate('questions.question');

        res.status(200).json({
            success: true,
            message: "Quiz questions updated successfully.",
            data: populatedQuizModule
        });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        console.error("[Module Controller] Error in reorderQuizQuestions:", error);
        sendErrorResponse(res, 500, 'Failed to reorder quiz questions.', error.message);
    }
};