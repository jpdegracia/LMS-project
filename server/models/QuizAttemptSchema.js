import mongoose from "mongoose";
// Note: We only import mongoose here; the annotation schema definition is separate.
// import { rangyAnnotationsSchema } from "./RangyAnnotationSchema.js"; 

const quizAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required for a quiz attempt.'],
        index: true
    },
    quizModuleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: [true, 'Quiz Module ID is required for a quiz attempt.'],
        index: true
    },
    enrollmentId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment',
        required: [true, 'Enrollment ID is required to link this attempt.'],
        index: true
    },
    practiceTestAttemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PracticeTestAttempt',
        default: null
    },
    quizSnapshotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizSnapshot',
        required: true,
    },
    shuffledQuestionOrder: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    questionsAttemptedDetails: [{
        questionId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Question', 
            required: true 
        },
        
        questionType: { 
            type: String,
            required: true, 
            enum: ['multipleChoice', 'trueFalse', 'shortAnswer', 'numerical', 'essay'] 
        },
        
        userTextAnswer: { 
            type: String, 
            default: '' 
        },
        userNumericalAnswer: { 
            type: Number,
            default: null 
        },
        userBooleanAnswer: { 
            type: Boolean,
            default: null 
        },

        isCorrect: { 
            type: Boolean, 
            default: false 
        },
        pointsAwarded: { 
            type: Number, 
            min: [0, 'Points awarded cannot be negative.'], 
            default: 0 
        },
        
        requiresManualReview: { 
            type: Boolean,
            default: false 
        },
        isManuallyGraded: { 
            type: Boolean,
            default: false 
        },
        teacherReviewerId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', 
            default: null
        },
        teacherNotes: { 
            type: String, 
            default: ''
        },
        isMarkedForReview: { 
            type: Boolean, 
            default: false 
        },
        _id: false
    }],
    
    // 🛑 CRITICAL FIX: Use Mixed directly for annotations (dynamic Question ID keys)
    annotations: {
        type: mongoose.Schema.Types.Mixed, // Replaces type: rangyAnnotationsSchema
        default: {}
    },
    
    startTime: {
        type: Date,
        required: false,
        default: null,
    },
    endTime: {
        type: Date,
        default: null
    },
    score: {
        type: Number,
        min: [0, 'Score cannot be negative.'],
        default: 0
    },
    totalPointsPossible: {
        type: Number,
        min: [0, 'Total points possible cannot be negative.'],
        required: true
    },
    passed: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['in-progress', 'submitted', 'partially-graded', 'graded'],
        default: 'in-progress'
    },
    lastActiveQuestionIndex: {
        type: Number,
        min: 0,
        default: 0,
    },
    remainingTime: {
        type: Number,
        default: null,
        min: 0,
    },
    
}, { timestamps: true, minimize: false });

quizAttemptSchema.index({ userId: 1, quizModuleId: 1, startTime: 1 }, { unique: true, partialFilterExpression: { startTime: { $ne: null } } });

export const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);