import { Question } from '../models/QuestionSchema.js';
import { User } from '../models/UserSchema.js';
import { Subject } from '../models/SubjectSchema.js';

// Helper function for consistent error handling
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`Error ${statusCode}: ${message}`, errorDetails);
    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};

// @desc    Create a new subject
// @route   POST /subjects
// @access  Private (admin/teacher)
export const createSubject = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!req.user || !req.user._id) {
            return sendErrorResponse(res, 401, "Unauthorized: User information missing from request.");
        }
        
        const subject = new Subject({
            name,
            description,
            createdBy: req.user._id
        });

        const createdSubject = await subject.save();
        res.status(201).json({ success: true, data: createdSubject });
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            return sendErrorResponse(res, 400, "A subject with this name already exists.", error.message);
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponse(res, 400, "Validation Error: " + messages.join(', '), error.message);
        }
        sendErrorResponse(res, 500, "Failed to create subject.", error.message);
    }
};

// @desc    Get all subjects
// @route   GET /subjects
// @access  Public
export const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({});
        res.status(200).json({ success: true, data: subjects });
    } catch (error) {
        sendErrorResponse(res, 500, "Failed to retrieve subjects.", error.message);
    }
};

// @desc    Get a single subject by ID
// @route   GET /subjects/:id
// @access  Public
export const getSubjectById = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);

        if (!subject) {
            return sendErrorResponse(res, 404, 'Subject not found.');
        }

        res.status(200).json({ success: true, data: subject });
    } catch (error) {
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid subject ID format.', error.message);
        }
        sendErrorResponse(res, 500, "Failed to retrieve subject.", error.message);
    }
};

// @desc    Update an existing subject
// @route   PUT /subjects/:id
// @access  Private (admin/teacher)
export const updateSubject = async (req, res) => {
    try {
        const { name, description } = req.body;

        const subject = await Subject.findById(req.params.id);

        if (!subject) {
            return sendErrorResponse(res, 404, 'Subject not found.');
        }
        
        // Update fields only if provided
        subject.name = name !== undefined ? name : subject.name;
        subject.description = description !== undefined ? description : subject.description;

        const updatedSubject = await subject.save();
        res.status(200).json({ success: true, data: updatedSubject });
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            return sendErrorResponse(res, 400, "A subject with this name already exists.", error.message);
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponse(res, 400, "Validation Error: " + messages.join(', '), error.message);
        }
        sendErrorResponse(res, 500, "Failed to update subject.", error.message);
    }
};

// @desc    Delete a subject
// @route   DELETE /subjects/:id
// @access  Private (admin/teacher)
export const deleteSubject = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);

        if (!subject) {
            return sendErrorResponse(res, 404, 'Subject not found.');
        }
        
        // Check if any questions are associated with this subject
        const questionsCount = await Question.countDocuments({ subject: subject._id });
        if (questionsCount > 0) {
            return sendErrorResponse(res, 409, `This subject cannot be deleted because it is associated with ${questionsCount} question(s).`);
        }

        await subject.deleteOne();
        res.status(200).json({ success: true, message: 'Subject deleted successfully.' });
    } catch (error) {
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid subject ID format.', error.message);
        }
        sendErrorResponse(res, 500, "Failed to delete subject.", error.message);
    }
};