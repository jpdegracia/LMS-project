import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
    // Name of the subject (e.g., 'Physics', 'History')
    name: {
        type: String,
        required: [true, 'Subject name is required.'],
        unique: true, // Ensures no duplicate subject names
        trim: true,
        minlength: [3, 'Subject name must be at least 3 characters long.']
    },
    // Optional description for the subject
    description: {
        type: String,
        trim: true,
        default: ''
    },
    // Reference to the user who created this subject
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Create a text index for efficient searching
subjectSchema.index({ name: 'text' });

export const Subject = mongoose.model("Subject", subjectSchema);