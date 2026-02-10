import express from 'express';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';
import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from '../controllers/courseCategory-controller.js';


const router = express.Router();

// Routes for handling the entire category collection
router.route('/')
    .get(verifyToken, authorizePermission('category:read:all'), getCategories)   // GET /categories
    .post(verifyToken, authorizePermission('category:create'), createCategory); // POST /categories

// Routes for handling a specific category by its ID
router.route('/:id')
    .get(verifyToken, authorizePermission('category:read'), getCategoryById)       // GET /categories/:id
    .put(verifyToken, authorizePermission('category:update'), updateCategory)     // PUT /categories/:id
    .delete(verifyToken, authorizePermission('category:delete'), deleteCategory); // DELETE /categories/:id

export default router;