// models/SATGradingScale.js

import mongoose from 'mongoose';

const scaleEntrySchema = new mongoose.Schema({
    raw_score: { 
        type: Number, 
        required: true, 
        min: 0, 
        index: true 
    },
    
    // --- UPDATED FIELDS FOR SINGLE SCORE ---
    reading_writing_score: { 
        type: Number, 
        required: true, 
        min: 200,
        max: 800 // Added max validator based on SAT score limits
    },
    // The math score will be null for raw_scores above 44 (the max for that section)
    math_score: { 
        type: Number, 
        required: false, // Make this false since it will be 'null' for high raw_scores
        min: 200,
        max: 800 
    },
    // --- The old fields (lower/upper) are removed ---
    
}, { _id: false });

const satGradingScaleSchema = new mongoose.Schema({
    // Optional: Reference the course/test it applies to
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null,
        unique: true,
    },
    // The actual conversion table data
    conversionTable: {
        type: [scaleEntrySchema],
        required: true
    }
}, { timestamps: true });

export const SATGradingScale = mongoose.model('SATGradingScale', satGradingScaleSchema);