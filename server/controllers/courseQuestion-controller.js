import { Question } from '../models/QuestionSchema.js';
import { Module } from '../models/ModuleSchema.js';
import { User } from '../models/UserSchema.js';
import mongoose from 'mongoose';
// Assuming this utility is available and handles the KaTeX conversion
import { renderHtmlWithLatex } from '../utils/katexRenderer.js'; 
import striptags from 'striptags'; // ⬅️ NEW: Import the package

// Helper function for consistent error handling and response structure
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`Error ${statusCode}: ${message}`, errorDetails);
    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};

// ==========================================================
// 🎯 FIX #1: Update Helper Functions to Strip Tags
// ==========================================================

// Helper: Processes the incoming options to render math AND strip raw text
const processOptions = (options) => {
    return (options || []).map(option => {
        const rawText = option.optionTextRaw || ''; // ⬅️ MODIFIED
        return {
            optionTextRaw: striptags(rawText), // ⬅️ MODIFIED: Ensure raw is plain text
            optionTextHtml: renderHtmlWithLatex(rawText), // ⬅️ MODIFIED: Render from original
            isCorrect: option.isCorrect,
        };
    });
};

// Processes the incoming correctAnswers to render math AND strip raw text
const processCorrectAnswers = (rawCorrectAnswers) => {
    return (rawCorrectAnswers || []).map(answerObj => {
        const rawAnswer = answerObj.answer || '';
        return {
            answer: striptags(rawAnswer), // ⬅️ MODIFIED: Ensure raw is plain text
            answerHtml: renderHtmlWithLatex(rawAnswer), // ⬅️ MODIFIED: Render from original
        };
    });
};

// 🎯 NEW/MODIFIED HELPER: Check Answer with Case Sensitivity Logic
// (This function was fine, no changes needed here)
const checkAnswer = (questionType, userAnswer, questionSnapshot) => {
    // ... (your existing logic)
};

// ==========================================================
// 🎯 FIX #2: Update createQuestion
// ==========================================================

// @desc      Create a new question (add to question bank)
// @route     POST /questions
// @access    Private (admin/teacher)
export const createQuestion = async (req, res) => {
    try {
        const { 
            // 🚀 ADDED: questionTitle
            questionTitle, 
            questionTextRaw: htmlInput, // ⬅️ MODIFIED: Rename for clarity
            questionType, 
            questionContext: contextHtmlInput, // ⬅️ MODIFIED: Rename for clarity
            options: rawOptions, 
            correctAnswers: rawCorrectAnswers, 
            trueFalseAnswer, 
            numericalAnswer: rawNumericalAnswer, 
            tolerance: rawTolerance, 
            feedback: feedbackHtmlInput, // ⬅️ MODIFIED: Rename for clarity
            difficulty, 
            subject, 
            tags,
            status,
            requiresManualGrading,
            // 🎯 CRITICAL FIX: Add caseSensitive to destructuring
            caseSensitive 
        } = req.body;

        if (!req.user || !req.user._id) {
            return sendErrorResponse(res, 401, "Unauthorized: User information missing from request.");
        }

        // 1. RENDER CORE HTML FIELDS & CREATE RAW TEXT
        const questionTextHtml = renderHtmlWithLatex(htmlInput);
        const questionTextRaw = striptags(htmlInput); // ⬅️ NEW: Create true plain text

        const contextHtml = contextHtmlInput ? renderHtmlWithLatex(contextHtmlInput) : '';
        const contextRaw = contextHtmlInput ? striptags(contextHtmlInput) : ''; // ⬅️ NEW

        // 2. RENDER OPTIONS HTML (now also strips raw text via helper)
        const options = processOptions(rawOptions);

        // 3. RENDER SA/FIB ANSWERS HTML (now also strips raw text via helper)
        const correctAnswers = processCorrectAnswers(rawCorrectAnswers);
        
        // 4. RENDER FEEDBACK HTML
        const feedbackHtml = feedbackHtmlInput ? renderHtmlWithLatex(feedbackHtmlInput) : '';

        // 5. CONSTRUCT NUMERICAL ANSWER OBJECT
        let numericalAnswer = undefined;
        if (questionType === 'numerical' && rawNumericalAnswer !== undefined) {
            numericalAnswer = {
                answer: rawNumericalAnswer,
                tolerance: typeof rawTolerance === 'number' ? rawTolerance : 0, 
            };
        }
        
        const question = new Question({
            // 🚀 ADDED: questionTitle
            questionTitle, 
            questionTextRaw,     // ⬅️ MODIFIED: Saves the new plain text version
            questionTextHtml,    // ⬅️ MODIFIED: Saves the rendered HTML
            questionType,
            questionContext: contextRaw, // ⬅️ MODIFIED: Saves the new plain text version
            questionContextHtml: contextHtml, // ⬅️ MODIFIED
            options,           
            correctAnswers,
            trueFalseAnswer,
            numericalAnswer,
            feedback: feedbackHtml, // ⬅️ MODIFIED
            difficulty,
            subject, 
            tags,
            status,
            requiresManualGrading,
            // 🎯 CRITICAL FIX: Add caseSensitive to assignment
            caseSensitive,
            createdBy: req.user._id,
            // 💡 ANNOTATIONS: Will default to an empty array [] via schema default
        });

        const createdQuestion = await question.save();
        res.status(201).json({ success: true, data: createdQuestion });
    } catch (error) {
        console.error("Error in createQuestion:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponse(res, 400, "Validation Error: " + messages.join(', '), error.errors);
        }
        if (error.message.includes("Short Answer") || error.message.includes("Numerical") || error.message.includes("True/False")) {
            return sendErrorResponse(res, 400, error.message, error.message);
        }
        sendErrorResponse(res, 500, "Failed to create question due to server error.", error.message);
    }
};

// @desc      Get all questions (from question bank)
// @route     GET /questions
// @access    Public (or private for teachers to manage)
export const getQuestions = async (req, res) => {
    try {
        // Annotations are included by default since they are embedded.
        const questions = await Question.find({}).populate('subject', 'name'); 
        res.status(200).json({ success: true, data: questions });
    } catch (error) {
        console.error("Error in getQuestions:", error);
        sendErrorResponse(res, 500, "Failed to retrieve questions.", error.message);
    }
};

// @desc      Get single question by ID
// @route     GET /questions/:id
// @access    Public (or private)
export const getQuestionById = async (req, res) => {
    try {
        // Annotations are included by default since they are embedded.
        const question = await Question.findById(req.params.id)
            .populate('subject', 'name') 
            .populate('createdBy', 'firstName lastName email username');

        if (!question) {
            return sendErrorResponse(res, 404, 'Question not found.');
        }

        res.status(200).json({ success: true, data: question });
    } catch (error) {
        console.error("[Question Controller] Error in getQuestionById (caught exception):", error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid question ID format.', error.message);
        }
        sendErrorResponse(res, 500, "Failed to retrieve question.", error.message);
    }
};

// ==========================================================
// 🎯 FIX #3: Update updateQuestion
// ==========================================================

// @desc      Update a question
// @route     PUT /questions/:id
// @access    Private (admin/teacher)
export const updateQuestion = async (req, res) => {
    try {
        const { 
            // NOTE: annotations should NOT be destructured here. 
            // We use the separate updateAnnotations route for that.
            questionTitle, 
            questionTextRaw: htmlInput, // ⬅️ MODIFIED: Rename
            questionType, 
            questionContext: contextHtmlInput, // ⬅️ MODIFIED: Rename
            options: rawOptions, 
            correctAnswers: rawCorrectAnswers, 
            trueFalseAnswer, 
            numericalAnswer: rawNumericalAnswer, 
            tolerance: rawTolerance,
            feedback: feedbackHtmlInput, // ⬅️ MODIFIED: Rename
            difficulty, 
            subject, 
            tags,
            status,
            requiresManualGrading,
            caseSensitive,
        } = req.body;
        
        // 💡 Ensure we DO NOT overwrite annotations if they were not passed in the request body.
        // Mongoose only updates fields you explicitly set. We fetch the document first.
        const question = await Question.findById(req.params.id);

        if (!question) {
            return sendErrorResponse(res, 404, 'Question not found.');
        }

        // --- 1. Update and Render Core Text Fields ---
        
        if (questionTitle !== undefined) {
            question.questionTitle = questionTitle;
        }

        if (htmlInput !== undefined) { // ⬅️ MODIFIED
            question.questionTextRaw = striptags(htmlInput); // ⬅️ MODIFIED
            question.questionTextHtml = renderHtmlWithLatex(htmlInput); // ⬅️ MODIFIED
        }
        
        if (contextHtmlInput !== undefined) { // ⬅️ MODIFIED
            question.questionContext = striptags(contextHtmlInput); // ⬅️ MODIFIED
            question.questionContextHtml = renderHtmlWithLatex(contextHtmlInput); // ⬅️ MODIFIED
        }

        if (questionType !== undefined) {
            question.questionType = questionType;
        }
        
        if (caseSensitive !== undefined) {
            question.caseSensitive = caseSensitive;
        }

        const effectiveQuestionType = questionType || question.questionType;

        // --- 2. Update Answer Fields based on Question Type ---
        
        // --- 2a. Multiple Choice ---
        if (effectiveQuestionType === 'multipleChoice') {
            if (rawOptions !== undefined) {
                question.options = processOptions(rawOptions); // ⬅️ MODIFIED (uses new helper)
            }
            // Clear other fields
            question.correctAnswers = undefined;
            question.trueFalseAnswer = undefined;
            question.numericalAnswer = undefined;

        // --- 2b. True/False ---
        } else if (effectiveQuestionType === 'trueFalse') {
            if (trueFalseAnswer !== undefined) {
                question.trueFalseAnswer = trueFalseAnswer;
            }
            // Clear other fields
            question.correctAnswers = undefined;
            question.options = [];
            question.numericalAnswer = undefined;

        // --- 2c. Short Answer / Essay ---
        } else if (effectiveQuestionType === 'shortAnswer' || effectiveQuestionType === 'essay') {
            if (rawCorrectAnswers !== undefined) {
                question.correctAnswers = processCorrectAnswers(rawCorrectAnswers); // ⬅️ MODIFIED (uses new helper)
            }
            // Clear non-text fields
            question.trueFalseAnswer = undefined;
            question.options = [];
            question.numericalAnswer = undefined; 
            
        // --- 2d. Numerical ---
        } else if (effectiveQuestionType === 'numerical') {
            let currentNumericalAnswer = question.numericalAnswer || {};

            if (rawNumericalAnswer !== undefined) {
                currentNumericalAnswer.answer = rawNumericalAnswer;
            }
            if (rawTolerance !== undefined) {
                currentNumericalAnswer.tolerance = rawTolerance;
            }
            
            if (rawNumericalAnswer !== undefined || rawTolerance !== undefined) {
                question.numericalAnswer = currentNumericalAnswer;
            }

            // Clear non-numerical fields
            question.correctAnswers = undefined;
            question.trueFalseAnswer = undefined;
            question.options = [];
            
        } 
        
        // --- 3. Update Misc. Fields ---
        if (feedbackHtmlInput !== undefined) { // ⬅️ MODIFIED
            question.feedback = renderHtmlWithLatex(feedbackHtmlInput); // ⬅️ MODIFIED
        }
        
        question.difficulty = difficulty !== undefined ? difficulty : question.difficulty;
        question.subject = subject !== undefined ? subject : question.subject; 
        question.tags = tags !== undefined ? tags : question.tags;
        
        if (status !== undefined) {
            question.status = status;
        }

        if (requiresManualGrading !== undefined) {
            question.requiresManualGrading = requiresManualGrading;
        }

        const updatedQuestion = await question.save();
        res.status(200).json({ success: true, data: updatedQuestion });
    } catch (error) {
        console.error("Error in updateQuestion:", error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid question ID format.');
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponse(res, 400, "Validation Error: " + messages.join(', '), error.message);
        }
        sendErrorResponse(res, 500, "Failed to update question.", error.message);
    }
};

// @desc      Delete a question (keep as is)
// @route     DELETE /questions/:id
// @access    Private (admin/teacher)
export const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return sendErrorResponse(res, 404, 'Question not found.');
        }

        const moduleUsingQuestion = await Module.findOne({ questions: question._id });
        if (moduleUsingQuestion) {
            return sendErrorResponse(res, 409, 'Question is currently in use by a quiz module and cannot be deleted. Remove it from quizzes first.');
        }

        await question.deleteOne();
        res.status(200).json({ success: true, message: 'Question removed from bank.' });
    } catch (error) {
        console.error("Error in deleteQuestion:", error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid question ID format.');
        }
        sendErrorResponse(res, 500, "Failed to delete question.", error.message);
    }
};

// 🚀 NEW EXPORTED FUNCTION
// @desc      Update *only* the annotations array for a question
// @route     PUT /questions/:id/annotations
// @access    Private (Specific Annotation Permission)
export const updateAnnotations = async (req, res) => {
    const questionId = req.params.id;
    // The request body should be the array of annotation objects: [{ start: X, end: Y, tag: Z }]
    const newAnnotations = req.body; 

    // Basic type validation
    if (!Array.isArray(newAnnotations)) {
        return sendErrorResponse(res, 400, 'Request body must be an array of annotation objects.');
    }

    try {
        // Use findByIdAndUpdate to target only the 'annotations' field.
        const updatedQuestion = await Question.findByIdAndUpdate(
            questionId,
            { 
                // $set ensures we completely overwrite the old array with the new one
                $set: { annotations: newAnnotations } 
            },
            // Options: return the new document, run schema validation on the update
            { new: true, runValidators: true } 
        );

        if (!updatedQuestion) {
            return sendErrorResponse(res, 404, 'Question not found for annotation update.');
        }

        // Respond with the newly saved annotations data
        res.status(200).json({ 
            success: true, 
            data: updatedQuestion.annotations,
            message: 'Annotations saved successfully.'
        });

    } catch (error) {
        console.error('Error saving annotations:', error);
        if (error.name === 'CastError') {
             return sendErrorResponse(res, 400, 'Invalid question ID format.');
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            // This will catch schema violations in the annotation objects (e.g., missing 'start' or 'tag')
            return sendErrorResponse(res, 400, "Annotation Validation Error: " + messages.join(', '), error.message);
        }
        sendErrorResponse(res, 500, "Failed to save annotations.", error.message);
    }
};