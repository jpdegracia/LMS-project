import mongoose from "mongoose";

// Base schema for a module - common fields for all module types
const BaseModuleSchema = new mongoose.Schema({
    moduleType: {
        type: String,
        required: [true, "Module type is required"],
        enum: ['lesson', 'quiz'], // 'test' has been removed
        default: 'lesson'
    },
    title: {
        type: String,
        required: [true, "Module title is required"],
        trim: true,
        minlength: [3, 'Module title must be at least 3 characters long.']
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    section: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: false
    },
    order: {
        type: Number,
        required: [true, 'Module order is required.'],
        default: 1,
        min: [1, 'Order must be at least 1.']
    },
}, {
    timestamps: true,
    discriminatorKey: 'moduleType',
});

// This is correct, it registers the base model
const Module = mongoose.model('Module', BaseModuleSchema);

// --- Discriminator for Lesson Modules ---
const LessonModuleSchema = new mongoose.Schema({
    progressBar: {
        type: Boolean,
        default: false,
    },
    contents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LessonContent',
        required: true
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
    },
});

export const LessonModule = Module.discriminator('lesson', LessonModuleSchema);

// --- Discriminator for Quiz Modules ---
const QuizModuleSchema = new mongoose.Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    questionsPerPage: {
        type: Number,
        default: 1,
        min: [1, 'Questions per page must be at least 1'],
        max: [10, 'Questions per page cannot exceed 10'],
    },
    questionNavigation: {
        type: String,
        enum: ['sequence', 'free'],
        default: 'sequence',
    },
    questionShuffle: {
        type: Boolean,
        default: false,
    },
    shuffleOptions: {
        type: Boolean,
        default: false,
    },
    // --- NEW: SAT Grouping Settings ---
    satSettings: {
        isSAT: { type: Boolean, default: false },
        strands: [{
            strandName: { 
                type: String, 
                trim: true,
                // Required only if isSAT is true (handled in frontend/pre-save)
            },
            shuffleStrandQuestions: { 
                type: Boolean, 
                default: false 
            },
            questions: [
                {
                    question: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Question',
                        required: true
                    },
                    points: { 
                        type: Number, 
                        default: 1,
                        min: [0, 'Points cannot be negative']
                    }
                }
            ]
        }]
    },
    questions: [
        {
            question: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Question',
                required: true
            },
            points: {
                type: Number,
                required: [true, "Question points are required"],
                default: 1,
                min: [0, 'Points cannot be negative']
            }
        }
    ],
    maxAttempts: {
        type: Number,
        default: -1,
        min: [-1, 'Max attempts cannot be less than -1'],
    },
    timeLimitMinutes: {
        type: Number,
        default: null,
        min: [0, 'Time limit cannot be negative'],
    },
    passingScorePercentage: {
        type: Number,
        min: [0, 'Passing score cannot be negative'],
        max: [100, 'Passing score cannot exceed 100'],
        default: 0,
    },
    availableFrom: {
        type: Date,
        default: null,
    },
    availableUntil: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
    },
    direction: {
        type: String,
        trim: true,
        default: '',
        maxLength: [5000, 'Direction cannot be more than 1000 characters long.']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    timerEndBehavior: {
        type: String,
        enum: ['auto-submit', 'strict-zero-score'],
        default: 'auto-submit', 
    },
});

export const QuizModule = Module.discriminator('quiz', QuizModuleSchema);

// Export the base model for top-level queries if needed
export { Module };