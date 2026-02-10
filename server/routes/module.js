//src/routes/module.js
import express from 'express';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';
import { 
    deleteModule, 
    getModuleById, 
    updateModule, 
    getAllModules, 
    createStandaloneModule,
    reorderQuizQuestions,
    createModule, // New module creation for nested route
    getModulesBySectionId, // Get modules within a section
} from '../controllers/courseModule-controller.js';
import { 
    updateModuleOrderInSection, // Reordering module controller
    unlinkModuleFromSection, // Unlinking module controller
} from '../controllers/courseSection-controller.js';

const router = express.Router({ mergeParams: true });

// --- Top-Level Module Routes ---
// Base path: /modules
router.route('/')
    .get(verifyToken, authorizePermission('module:read:all'), getAllModules)
    .post(verifyToken, authorizePermission('module:create'), createStandaloneModule); // For creating new standalone modules

router.route('/:id')
    .get(verifyToken, authorizePermission('module:read'), getModuleById)
    .put(verifyToken, authorizePermission('module:update'), updateModule)
    .delete(verifyToken, authorizePermission('module:delete'), deleteModule);

router.route('/:quizId/questions/reorder')
    .patch(verifyToken, authorizePermission('quiz:update'), reorderQuizQuestions);


// --- Nested Module Routes ---
// Base path: /sections/:sectionId/modules
// (Note: The main router will handle the /sections/:sectionId part)

// Routes for creating and retrieving modules within a specific section
router.route('/by-section/:sectionId')
    .post(verifyToken, authorizePermission('module:create'), createModule)
    .get(verifyToken, authorizePermission('module:read:all'), getModulesBySectionId);

// Routes for specific modules within a section's context
router.route('/by-section/:sectionId/:id')
    .put(verifyToken, authorizePermission('module:update'), updateModule)
    .delete(verifyToken, authorizePermission('module:delete'), unlinkModuleFromSection);

// Route for adding multiple existing modules to a section


// Route for reordering modules within a section
router.route('/by-section/:sectionId/reorder-modules')
    .put(verifyToken, authorizePermission('module:update'), updateModuleOrderInSection);

export default router;