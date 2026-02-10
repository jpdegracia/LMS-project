import mongoose from 'mongoose';

const practiceTestAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    sectionIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true
    }],
    quizAttempts: [{ // References all individual quiz attempts
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizAttempt'
    }],
    quizSnapshots: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizSnapshot',
        required: true,
    }],
    overallScore: {
        type: Number,
        default: 0
    },
    overallTotalPoints: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['in-progress', 'submitted', 'graded'],
        default: 'in-progress'
    },
    attemptNumber: { // <-- New field to store the attempt count
        type: Number,
        required: true,
        default: 1, // First attempt is always 1
        min: 1
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        default: null
    },
    lastActiveQuizModuleId: { // To track where the user left off
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        default: null
    },
    // --- NEW FIELD: Structured SAT Score Details ---
    satScoreDetails: {
        type: {
            // Raw scores (number of correct questions from linked QuizAttempts)
            rawScoreReadingWriting: { type: Number, min: 0, default: 0 },
            rawScoreMath: { type: Number, min: 0, default: 0 },
            
            // Scaled 200-800 section scores (Range is stored)
            scaledScoreReadingWriting: { 
                lower: { type: Number, min: 200, default: 200 },
                upper: { type: Number, max: 800, default: 200 }
            },
            scaledScoreMath: {
                lower: { type: Number, min: 200, default: 200 },
                upper: { type: Number, max: 800, default: 200 }
            },
            // Final 400-1600 total score (Range is stored)
            totalSatScore: { 
                lower: { type: Number, min: 400, default: 400 },
                upper: { type: Number, max: 1600, default: 400 }
            },
            // Reference to the conversion scale used (for audit trail)
            gradingScaleId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'SATGradingScale',
                default: null
            },
        },
        default: null // Will be populated upon 'submitted' status
    },
    // This array provides the clean, sorted data needed by your PracticeTestScorecard component.
    sectionScores: [{
        id: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Section', 
            required: true 
        },
        score: { 
            type: Number, 
            default: 0 
        }, // Scaled Section Score (Midpoint of range)
        _id: false
    }],
}, { timestamps: true });

practiceTestAttemptSchema.index({ userId: 1, sectionIds: 1 }, { unique: false });

export const PracticeTestAttempt = mongoose.model('PracticeTestAttempt', practiceTestAttemptSchema);