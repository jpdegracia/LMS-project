// src/routes/course.js
import express from 'express';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';
import { getCourseById, createCourse, updateCourse, deleteCourse, getCourses } from '../controllers/course-controller.js';


const router = express.Router();

router.route('/')
    .get(verifyToken, authorizePermission('course:read:all'), getCourses)
    .post(verifyToken, authorizePermission('course:create'), createCourse);

router.route('/:id')
    .get(verifyToken, authorizePermission('course:read'), getCourseById)
    .put(verifyToken, authorizePermission('course:update'), updateCourse)
    .delete(verifyToken, authorizePermission('course:delete'), deleteCourse);


export default router;