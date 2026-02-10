// models/CourseSchema.js

import mongoose from 'mongoose';
import { SATGradingScale } from './SATGradingScale.js';
import SAT_CONVERSION_TABLE_ENTRIES from '../utils/SATConversionData.js';

const courseSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    contentType: {
        type: String,
        required: [true, "Course type is required"],
        enum: ['practice_test', 'course_lesson'],
        default: 'course_lesson',
    }, 
    title: {
        type: String,
        required: [true, "Title is Required"],
        trim: true,
        unique: true,
    },
    description: {
        type: String,
        trim: true,
    },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    thumbnail: {
        type: String,
        trim: true
    },
    sections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        trim: true,
        default: 'draft',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, { timestamps: true });

/// --- CRITICAL MIDDLEWARE: Auto-Create Grading Scale ---
courseSchema.post('save', async function (doc, next) {
    // Only attempt if the content type is for a test
    if (doc.contentType === 'practice_test') {
        
        // 1. Safety Check for Conversion Data
        if (!SAT_CONVERSION_TABLE_ENTRIES || SAT_CONVERSION_TABLE_ENTRIES.length === 0) {
            // This is the point of failure. Log it clearly so you know the import failed.
            console.error(`[Course Post-Save] ❌ FATAL: SAT_CONVERSION_TABLE_ENTRIES failed to import or is empty. Check the path and contents of '../utils/SATConversionData.js'.`);
            return next();
        }

        const scalePayload = {
            courseId: doc._id,
            conversionTable: SAT_CONVERSION_TABLE_ENTRIES,
        };

        // 2. Wrap the database operation in try...catch
        try {
            // Use findOneAndUpdate with upsert: true to handle both initial creation and later updates
            await SATGradingScale.findOneAndUpdate(
                { courseId: doc._id },
                { $set: scalePayload },
                { upsert: true, new: true, runValidators: true }
            );
            console.log(`✅ [Course Post-Save] Ensured SAT Grading Scale exists for course: ${doc.title}`);
        } catch (error) {
            // Log the DB failure but allow the course save process to complete
            console.error(`❌ [Course Post-Save] Mongoose DB error while upserting SAT Scale for ${doc.title}.`, error);
        }
    }
    // Always call next() to prevent blocking the rest of the Mongoose save operation
    next();
});

export const Course = mongoose.model("Course", courseSchema);