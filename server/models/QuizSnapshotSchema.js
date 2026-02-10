import mongoose from "mongoose";

// --- Sub-schema for Numerical Answer Snapshot ---
// This structure mirrors the numericalAnswer field in the main Question schema
const numericalAnswerSnapshotSchema = new mongoose.Schema({
    answer: {
        type: Number,
        required: true,
    },
    tolerance: {
        type: Number,
        default: 0,
        min: 0,
    },
    _id: false
});

const quizSnapshotSchema = new mongoose.Schema({
    originalQuizModuleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true,
        unique: true,
    },
    originalSectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true,
    },
    quizModuleSettingsSnapshot: {
        title: { 
            type: String, 
            required: true 
        },
        description: { 
            type: String, 
            default: '' 
        },
        maxAttempts: { 
            type: Number, 
            default: -1 
        },
        timeLimitMinutes: { 
            type: Number, 
            default: null 
        },
        passingScorePercentage: { 
            type: Number, 
            default: 0 
        },
        questionShuffle: { 
            type: Boolean, 
            default: false 
        },
        shuffleOptions: { 
            type: Boolean, 
            default: false 
        },
        timerEndBehavior: { 
            type: String, 
            enum: ['auto-submit', 'strict-zero-score'] 
        },
        _id: false 
    },
    questionsSnapshot: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: true
        },
        questionTextRaw: { 
            type: String,
            required: [true, 'Question raw text is required for snapshot.'],
            default: ''
        },
        questionTextHtml: { 
            type: String,
            required: true
        },
        questionContextRaw: { 
            type: String, 
            default: '' 
        },
        questionContextHtml: { 
            type: String, 
            default: '' 
        },
        caseSensitive: {
            type: Boolean,
            default: false, // Default: case-insensitive
        },
        questionType: {
            type: String,
            required: true
        },
        optionsSnapshot: [{
            optionTextHtml: { type: String, required: true },
            isCorrect: { type: Boolean, default: false },
            _id: false
        }],
        
        trueFalseAnswerSnapshot: { 
            type: Boolean
        },
        
        // 🚀 UPDATED: New structure for Short Answer answers
        correctAnswersSnapshot: [{ 
            answer: { type: String, required: true }, // Raw string for auto-grading logic
            answerHtml: { type: String, default: '' }, // Rendered HTML for display
            _id: false
        }],

        // 🚀 NEW FIELD: Numerical Answer Key Snapshot
        numericalAnswerSnapshot: {
            type: numericalAnswerSnapshotSchema,
            default: undefined // Ensures it's only stored for numerical questions
        },
        
        // 🚀 NEW: Flag to determine if this question needs manual review
        requiresManualGradingSnapshot: {
            type: Boolean,
            default: false
        },

        pointsPossibleSnapshot: {
            type: Number,
            min: [0, 'Points possible cannot be negative.'],
            required: true
        },
        feedbackSnapshot: {
            type: String,
            default: ''
        },
        _id: false
    }],

}, { timestamps: true });

export const QuizSnapshot = mongoose.model('QuizSnapshot', quizSnapshotSchema);