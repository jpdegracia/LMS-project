// LessonContentSchema.js
import mongoose from 'mongoose';

const lessonContentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: { 
        type: String,
        trim: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    contentHtml: {
        type: String,
        required: true 
    },

}, { timestamps: true });

export const LessonContent = mongoose.model("LessonContent", lessonContentSchema);