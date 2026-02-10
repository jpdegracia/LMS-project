// src/models/EnrollmentSchema.js
import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
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
    enrollmentDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['enrolled', 'in-progress', 'completed', 'dropped'],
        default: 'enrolled'
    },
    progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    grade: {
        type: Number,
        min: 0,
        default: null
    },
    lastAccessedAt: { // <-- Add this new field
        type: Date,
        default: null
    },
    // --- CONSOLIDATED PROGRESS FIELDS ---
    completedModules: [{
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Module',
            required: true
        },
        lessonSnapshotId: { // Only for lesson modules
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LessonSnapshot'
        },
        completionDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        _id: false
    }],
    completedContentIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'LessonContent',
        default: []
    },
    quizAttempts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizAttempt',
    }],
    practiceTestAttempts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PracticeTestAttempt',
    }]
    
}, { timestamps: true });

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);