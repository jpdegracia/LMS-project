import express from 'express';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';
import { createSubject, deleteSubject, getSubjectById, getSubjects, updateSubject } from '../controllers/subject-controller.js';


const router = express.Router();

router.route('/')
    .get(verifyToken, authorizePermission('subject:read:all'), getSubjects)
    .post(verifyToken, authorizePermission('subject:create'), createSubject);

router.route('/:id')
    .get(verifyToken, authorizePermission('subject:read'), getSubjectById)
    .put(verifyToken, authorizePermission('subject:update'), updateSubject)
    .delete(verifyToken, authorizePermission('subject:delete'), deleteSubject);

export default router;