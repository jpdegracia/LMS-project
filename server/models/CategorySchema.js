import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: { // e.g., "Mathematics", "Science", "History", "Programming"
        type: String,
        required: [true, 'Category name is required.'],
        unique: true, // Ensures category names are unique
        trim: true,
        minlength: [2, 'Category name must be at least 2 characters long.']
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
}, { timestamps: true });

export const Category = mongoose.model("Category", categorySchema);