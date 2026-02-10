import mongoose from 'mongoose';
import { rangyAnnotationsSchema } from './RangyAnnotationSchema.js';

// ====================================================================
// --- Numerical Answer Schema (Sub-Schema) ---
// (Remains unchanged for question structure)
// ====================================================================
const numericalAnswerSchema = new mongoose.Schema({
    answer: {
        type: Number,
        required: [true, 'Numerical answer value is required.'],
    },
    tolerance: {
        type: Number,
        default: 0, // Absolute tolerance (e.g., +/- 0.01)
        min: 0,
    },
    _id: false
});

const questionSchema = new mongoose.Schema(
    {
        questionTitle: {
            type: String,
            required: [true, 'Question Title is required'],
        },
        questionTextRaw: {
            type: String,
            required: [true, 'Question text is required.'],
            trim: true,
            minlength: [5, 'Question text must be at least 5 characters long.']
        },
        questionTextHtml: {
            type: String, // Server-rendered HTML output
            required: [true, 'Question rendered HTML is required.'],
        },
        questionType: {
            type: String,
            required: [true, 'Question type is required.'],
            enum: {
                values: ['multipleChoice', 'trueFalse', 'shortAnswer', 'numerical', 'essay'], 
                message: 'Invalid question type. Must be one of: multipleChoice, trueFalse, shortAnswer, numerical, essay.'
            },
        },
        questionContext: {
            type: String,
            trim: true,
            default: '',
            // minLength: [10, 'Question Context must be at least 5 characters long.']
        },
        questionContextHtml: { 
            type: String, 
            default: '',
        },
        // Field for Multiple Choices answers
        options: [ // Array of options, primarily for 'multipleChoice'
            {
                optionTextRaw: { 
                    type: String,
                    required: [true, 'Option text is required.'],
                    trim: true,
                    minlength: [1, 'Option text cannot be empty.']
                },
                optionTextHtml: { 
                    type: String,
                    required: [true, 'Option rendered HTML is required.'],
                },
                isCorrect: {
                    type: Boolean,
                    default: false,
                },
                _id: false 
            },
        ],
        // Field for trueFalse answers
        trueFalseAnswer: {
            type: Boolean,
        },
        // Field for Short Answer / Text-based answers
        correctAnswers: { // Array of acceptable string answers
            type: [
                {
                    answer: {
                        type: String,
                        required: true,
                        trim: true,
                        minlength: [1, 'Answer text cannot be empty.']
                    },
                    answerHtml: { 
                        type: String, 
                        default: ''
                    },
                    _id: false 
                }
            ],
            default: undefined 
        },
        caseSensitive: {
            type: Boolean,
            default: false,
            description: 'If true, auto-grading requires exact casing for shortAnswer/essay answers.'
        },
        // ✅ NEW FIELD: For Numerical Answers
        numericalAnswer: {
            type: numericalAnswerSchema,
            default: undefined
        },
        // Field for manual grading (Used for 'shortAnswer' and 'essay')
        requiresManualGrading: {
            type: Boolean,
            default: false, 
        },
        feedback: { 
            type: String,
            trim: true,
            default: '',
        },
        difficulty: {
            type: String,
            enum: {
                values: ['easy', 'medium', 'hard'],
                message: 'Invalid difficulty. Must be one of: easy, medium, hard.'
            },
            default: 'medium',
        },
        tags: [ 
            {
                type: String,
                trim: true,
            },
        ],
        subject: { 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject', 
            required: [true, 'Question subject is required.']
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            trim: true,
            default: 'draft',
        },
        createdBy: { 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true 
        },
    },
    {
        timestamps: true, 
    }
);

questionSchema.index({ questionTextRaw: 'text', 'options.optionTextRaw': 'text' });

// ====================================================================
// Custom Validation: Enforce question structure based on questionType
// ====================================================================
questionSchema.pre('save', function(next) {
    const doc = this;

    // --- 1. Validation for Multiple Choice (MC) ---
    if (doc.questionType === 'multipleChoice') {
        const correctOptions = doc.options.filter(option => option.isCorrect);
        if (doc.options.length < 2) {
            return next(new Error('Multiple choice questions must have at least 2 options.'));
        }
        if (correctOptions.length === 0) {
            return next(new Error('Multiple choice questions must have at least one correct option.'));
        }
        // MC is ALWAYS auto-graded
        if (doc.requiresManualGrading === true) {
            return next(new Error('Multiple choice questions are always auto-graded and cannot require manual grading.'));
        }

    // --- 2. Validation for True/False (T/F) ---
    } else if (doc.questionType === 'trueFalse') {
        
        // T/F is ALWAYS auto-graded
        if (doc.requiresManualGrading === true) {
            return next(new Error('True/False questions are always auto-graded and cannot require manual grading.'));
        }
        // Must have a boolean answer
        if (typeof doc.trueFalseAnswer !== 'boolean') {
            return next(new Error('True/False questions require a boolean value for "trueFalseAnswer".'));
        }
    
    // --- 3. Validation for Short Answer (SA) ---
    // This now covers the logic for your former 'fillInTheBlank' as well.
    } else if (doc.questionType === 'shortAnswer') {
        
        const isAutoGraded = doc.requiresManualGrading === false;
        
        // If auto-graded, the text answer key is required.
        if (isAutoGraded && (!doc.correctAnswers || doc.correctAnswers.length === 0 || !doc.correctAnswers.every(ans => ans.answer && ans.answer.length > 0))) {
            return next(new Error('Short Answer questions require at least one entry in "correctAnswers" unless "requiresManualGrading" is set to true.'));
        }

        // Fill-in-the-Blank logic check (if you choose to use a placeholder like [BLANK])
        const blankRegex = /\[BLANK\]/gi; 
        const blankCount = (doc.questionTextRaw.match(blankRegex) || []).length;
        
        if (blankCount > 0 && isAutoGraded) {
             // If there are blanks, enforce answer count consistency
            if (blankCount !== doc.correctAnswers.length) {
                return next(new Error(`Short Answer question has ${blankCount} blanks. It requires exactly ${blankCount} primary answer(s) for auto-grading.`));
            }
        } else if (blankCount === 0 && isAutoGraded) {
            // A simple short answer doesn't need to check answer count against blanks,
            // but it still needs at least one answer string.
        }

    // --- 4. Validation for Numerical (NUM) ---
    } else if (doc.questionType === 'numerical') {
        
        // Numerical is ALWAYS auto-graded
        if (doc.requiresManualGrading === true) {
            return next(new Error('Numerical questions are always auto-graded and cannot require manual grading.'));
        }

        // Must have a valid numerical answer object
        if (!doc.numericalAnswer || typeof doc.numericalAnswer.answer !== 'number' || typeof doc.numericalAnswer.tolerance !== 'number' || doc.numericalAnswer.tolerance < 0) {
             return next(new Error('Numerical questions require a valid "numericalAnswer" object with an "answer" (number) and "tolerance" (>= 0).'));
        }

    // --- 5. Validation for Essay (ESSAY) ---
    } else if (doc.questionType === 'essay') {
        // Essay questions should always be manually graded
        if (doc.requiresManualGrading === false) {
            doc.requiresManualGrading = true; // Auto-set to true if not specified
        }
        // Essay questions should not have auto-grading answers
        if (doc.correctAnswers && doc.correctAnswers.length > 0) {
            return next(new Error('Essay questions should not use the "correctAnswers" field.'));
        }
    } else {
        return next(new Error('Invalid or missing questionType.'));
    }

    // --- 6. Clean up unused fields based on questionType (General Cleanup) ---
    if (doc.questionType !== 'multipleChoice') {
        doc.options = undefined;
    }
    if (doc.questionType !== 'trueFalse') {
        doc.trueFalseAnswer = undefined;
    }
    if (doc.questionType !== 'shortAnswer') {
        doc.correctAnswers = undefined;
    }
    if (doc.questionType !== 'numerical') {
        doc.numericalAnswer = undefined;
    }
    if (doc.questionType === 'multipleChoice' || doc.questionType === 'trueFalse' || doc.questionType === 'numerical') {
        // These types are auto-graded and shouldn't use the text-based answer field
        doc.correctAnswers = undefined; 
    }
    
    next();
});

export const Question = mongoose.model("Question", questionSchema);