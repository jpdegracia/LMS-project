// courseLessonContent-routes.js
import express from 'express';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';
import {
    createLessonContent,
    deleteLessonContent,
    getLessonContentById,
    getLessonContents,
    updateLessonContent,
    uploadImage,
    loadImages,
    uploadVideo,
    uploadAudio,
    uploadFile
} from '../controllers/courseLessonContent-controller.js';
import multer from 'multer';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Existing CRUD Routes (Simplified payload expected now)
router.route('/')
    .post(verifyToken, authorizePermission('lesson_content:create'), createLessonContent)
    .get(verifyToken, authorizePermission('lesson_content:read:all'), getLessonContents);

router.route('/:id')
    .get(verifyToken, authorizePermission('lesson_content:read'), getLessonContentById)
    .put(verifyToken, authorizePermission('lesson_content:update'), updateLessonContent)
    .delete(verifyToken, authorizePermission('lesson_content:delete'), deleteLessonContent);

// Froala-specific Upload Routes (These are still needed for the editor's internal upload buttons)
router.post('/upload-image', verifyToken, authorizePermission('lesson_content:create'), upload.single('file'), uploadImage);
router.get('/load-images', verifyToken, authorizePermission('lesson_content:read'), loadImages);
router.post('/upload-video', verifyToken, authorizePermission('lesson_content:create'), upload.single('file'), uploadVideo);
router.post('/upload-audio', verifyToken, authorizePermission('lesson_content:create'), upload.single('file'), uploadAudio);
router.post('/upload-file', verifyToken, authorizePermission('lesson_content:create'), upload.single('file'), uploadFile);

export default router;