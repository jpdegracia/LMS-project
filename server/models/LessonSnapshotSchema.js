// src/models/LessonSnapshot.js
import mongoose from "mongoose";

const lessonSnapshotSchema = new mongoose.Schema({
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
    },
    moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true,
        index: true
    },
    snapshotDate: {
        type: Date,
        default: Date.now
    },
    // The core of the snapshot: a copy of the lesson's content at completion time
    contentsSnapshot: [{
        contentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LessonContent',
            required: true
        },
        title: { type: String, required: true },
        contentType: { type: String, required: true },
        // A unique hash of the content to quickly check for changes
        contentHash: { type: String, required: true }, 
        _id: false
    }],
    status: {
        type: String,
        enum: ['completed', 'updated-version'],
        default: 'completed'
    },
    // You could also add a note about content changes if needed
    changeNote: {
        type: String
    }
}, { timestamps: true });

lessonSnapshotSchema.index({ userId: 1, moduleId: 1 });

export const LessonSnapshot = mongoose.model('LessonSnapshot', lessonSnapshotSchema);