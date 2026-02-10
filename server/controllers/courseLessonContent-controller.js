// courseLessonContent-controller.js
import { LessonContent } from '../models/LessonContentSchema.js';
import { LessonModule } from '../models/ModuleSchema.js';
import { Module } from '../models/ModuleSchema.js';
// import { Category } from '../models/CategorySchema.js'; // REMOVED: No longer needed, replace with Subject
import { Subject } from '../models/SubjectSchema.js'; // ADDED: Import Subject model for validation/population
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Assume a base URL where your uploaded files are served
const FILE_BASE_URL = `${process.env.BACKEND_URL}/uploads`;


const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[API Error] Status: ${statusCode}, Message: ${message}`, errorDetails);
    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};

// @desc    Create new lesson content
// @route   POST /lesson-content
export const createLessonContent = async (req, res) => {
    console.log("[LessonContent Controller] POST /lesson-content");
    console.log("[LessonContent Controller] Request Body (simplified):", req.body);

    try {
        const { title, description, subject, contentHtml } = req.body; // CHANGED: from category to subject

        // Basic validation
        if (!title || !contentHtml) { 
            return sendErrorResponse(res, 400, 'Title and HTML content are required.');
        }

        // Validate Subject ID (REQUIRED in schema)
        if (!subject) {
            return sendErrorResponse(res, 400, 'Subject ID is required.'); // Explicit check for required field
        }
        
        // Validate Subject ID
        const existingSubject = await Subject.findById(subject); // CHANGED: Category to Subject
        if (!existingSubject) {
            return sendErrorResponse(res, 400, 'Invalid subject ID provided.'); // CHANGED: category to subject
        }
        
        const lessonContent = new LessonContent({
            title,
            description: description || '', 
            subject: subject, // CHANGED: from category to subject
            contentHtml 
        });

        const createdContent = await lessonContent.save();
        console.log("[LessonContent Controller] Lesson content created:", createdContent._id);

        res.status(201).json({ success: true, message: 'Lesson content created successfully.', data: createdContent });
    } catch (error) {
        console.error("[LessonContent Controller] Error in createLessonContent:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponse(res, 400, messages.join(', '), error.message);
        }
        sendErrorResponse(res, 500, "Failed to create lesson content.", error.message);
    }
};

// @desc    Get all lesson content (from content bank)
// @route   GET /lesson-content
export const getLessonContents = async (req, res) => {
    try {
        const contents = await LessonContent.find({})
            .populate('subject', 'name') // CHANGED: from category to subject
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: contents.length, data: contents });
    } catch (error) {
        sendErrorResponse(res, 500, "Failed to retrieve lesson content.", error.message);
    }
};

// @desc    Get single lesson content by ID
// @route   GET /lesson-content/:id
export const getLessonContentById = async (req, res) => {
    try {
        const content = await LessonContent.findById(req.params.id)
            .populate('subject', 'name'); // CHANGED: from category to subject

        if (!content) {
            return sendErrorResponse(res, 404, 'Lesson content not found.');
        }
        res.status(200).json({ success: true, data: content });
    } catch (error) {
        console.error("[LessonContent Controller] Error in getLessonContentById:", error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid content ID format.', error.message);
        }
        sendErrorResponse(res, 500, "Failed to retrieve lesson content.", error.message);
    }
};

// @desc    Update lesson content
// @route   PUT /lesson-content/:id
export const updateLessonContent = async (req, res) => {
    console.log(`[LessonContent Controller] PUT /lesson-content/${req.params.id}`);
    console.log("[LessonContent Controller] Request Body (simplified):", req.body);

    try {
        const { title, description, subject, contentHtml } = req.body; // CHANGED: from category to subject

        const content = await LessonContent.findById(req.params.id);

        if (!content) {
            console.log("[LessonContent Controller] Lesson content not found for update:", req.params.id);
            return sendErrorResponse(res, 404, 'Lesson content not found.');
        }
        console.log("[LessonContent Controller] Found lesson content for update:", content._id);

        // Update basic fields
        content.title = title !== undefined ? title : content.title;
        content.description = description !== undefined ? description : content.description;
        content.contentHtml = contentHtml !== undefined ? contentHtml : content.contentHtml; 

        // Handle subject update with validation
        if (subject !== undefined) { // CHANGED: category to subject
            // The schema says 'subject' is required, so we should disallow null/empty string,
            // or Mongoose validation will fail on save if it's required.
            if (subject === null || subject === "") {
                return sendErrorResponse(res, 400, 'Subject ID is required and cannot be empty.');
            } else {
                const existingSubject = await Subject.findById(subject); // CHANGED: Category to Subject
                if (!existingSubject) {
                    return sendErrorResponse(res, 400, 'Invalid subject ID provided.'); // CHANGED: category to subject
                }
                content.subject = subject; // CHANGED: category to subject
            }
        }
        content.markModified('subject'); // CHANGED: category to subject

        // Validation for required fields
        if (!content.title || !content.contentHtml || !content.subject) { // Check subject too
            return sendErrorResponse(res, 400, 'Title, Subject, and HTML content are required.');
        }

        const updatedContent = await content.save();
        console.log("[LessonContent Controller] Lesson content updated in DB:", updatedContent._id);

        res.status(200).json({ success: true, message: 'Lesson content updated successfully.', data: updatedContent });
    } catch (error) {
        console.error("[LessonContent Controller] Error in updateLessonContent:", error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid content ID format or invalid subject ID.', error.message); // CHANGED: category to subject
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return sendErrorResponse(res, 400, messages.join(', '), error.message);
        }
        sendErrorResponse(res, 500, "Failed to update lesson content.", error.message);
    }
};

// ... (deleteLessonContent and Froala handlers remain the same) ...

// @desc    Delete lesson content
// @route   DELETE /lesson-content/:id
export const deleteLessonContent = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        
        const contentId = req.params.id;

        // 1. Check if this LessonContent is referenced by any LessonModule
        const isReferenced = await LessonModule.exists({ contents: contentId }).session(session);

        if (isReferenced) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 409, 'This lesson content is in use by one or more lesson modules and cannot be deleted.');
        }

        // 2. If not referenced, proceed with deletion
        const deletedContent = await LessonContent.findByIdAndDelete(contentId, { session });
        
        if (!deletedContent) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 404, 'Lesson content not found.');
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: 'Lesson content deleted successfully.', data: deletedContent });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        console.error("Error in deleteLessonContent:", error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid lesson content ID format.');
        }
        sendErrorResponse(res, 500, 'Failed to delete lesson content.', error.message);
    }
};

// --- NEW FROALA UPLOAD HANDLERS (These remain the same as before) ---

// Helper function to save file to disk (for demonstration)
const saveFileToDisk = (file) => {
    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, file.buffer); // Write buffer to disk
    return `${FILE_BASE_URL}/${filename}`;
};

// @desc    Upload Image for Froala Editor
// @route   POST /lesson-content/upload-image
export const uploadImage = async (req, res) => {
    if (!req.file) {
        return sendErrorResponse(res, 400, 'No image file uploaded.');
    }
    try {
        const fileUrl = saveFileToDisk(req.file);
        res.status(200).json({ link: fileUrl });
    } catch (error) {
        console.error("[Froala Upload] Error uploading image:", error);
        sendErrorResponse(res, 500, 'Failed to upload image.', error.message);
    }
};

// @desc    Load Images for Froala Image Manager
// @route   GET /lesson-content/load-images
export const loadImages = async (req, res) => {
    try {
        const files = fs.readdirSync(UPLOADS_DIR);
        const images = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => ({
                url: `${FILE_BASE_URL}/${file}`,
                thumb: `${FILE_BASE_URL}/${file}`,
                name: file
            }));
        res.status(200).json(images);
    } catch (error) {
        console.error("[Froala Upload] Error loading images for manager:", error);
        sendErrorResponse(res, 500, 'Failed to load images.', error.message);
    }
};


// @desc    Upload Video for Froala Editor
// @route   POST /lesson-content/upload-video
export const uploadVideo = async (req, res) => {
    if (!req.file) {
        return sendErrorResponse(res, 400, 'No video file uploaded.');
    }
    try {
        const fileUrl = saveFileToDisk(req.file);
        res.status(200).json({ link: fileUrl });
    } catch (error) {
        console.error("[Froala Upload] Error uploading video:", error);
        sendErrorResponse(res, 500, 'Failed to upload video.', error.message);
    }
};

// @desc    Upload Audio for Froala Editor
// @route   POST /lesson-content/upload-audio
export const uploadAudio = async (req, res) => {
    if (!req.file) {
        return sendErrorResponse(res, 400, 'No audio file uploaded.');
    }
    try {
        const fileUrl = saveFileToDisk(req.file);
        res.status(200).json({ link: fileUrl });
    } catch (error) {
        console.error("[Froala Upload] Error uploading audio:", error);
        sendErrorResponse(res, 500, 'Failed to upload audio.', error.message);
    }
};

// @desc    Upload Generic File/Document for Froala Editor
// @route   POST /lesson-content/upload-file
export const uploadFile = async (req, res) => {
    if (!req.file) {
        return sendErrorResponse(res, 400, 'No file uploaded.');
    }
    try {
        const fileUrl = saveFileToDisk(req.file);
        res.status(200).json({ link: fileUrl });
    } catch (error) {
        console.error("[Froala Upload] Error uploading file:", error);
        sendErrorResponse(res, 500, 'Failed to upload file.', error.message);
    }
};