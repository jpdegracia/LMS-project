import express from 'express';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';
import {
    createSection,
    getSectionsByCourseId,
    getSectionById,
    updateSection,
    getAllSections,
    updateModuleOrderInSection,
    unlinkModuleFromSection,
    addMultipleExistingModulesToSection,
    deleteSectionAndUnlinkModules 
} from '../controllers/courseSection-controller.js';

const router = express.Router();

router.route('/')
    .get(verifyToken, authorizePermission('section:read:all'), getAllSections);

// This is the key change: The standard DELETE route now calls the correct controller.
router.route('/:sectionId')
    .get(verifyToken, authorizePermission('section:read'), getSectionById)
    .put(verifyToken, authorizePermission('section:update'), updateSection)
    .delete(verifyToken, authorizePermission('section:delete'), deleteSectionAndUnlinkModules);

router.route('/by-course/:courseId')
    .post(verifyToken, authorizePermission('section:create'), createSection)
    .get(verifyToken, authorizePermission('section:read:all'), getSectionsByCourseId);

router.route('/:sectionId/add-existing-modules')
    .post(verifyToken, authorizePermission('section:create'), addMultipleExistingModulesToSection);


router.route('/:sectionId/modules/reorder-modules')
    .put(verifyToken, authorizePermission('module:update'), updateModuleOrderInSection);

router.route('/:sectionId/modules/:id')
    .delete(verifyToken, authorizePermission('module:delete'), unlinkModuleFromSection);

// You can safely remove this duplicate route now, as the standard DELETE route is fixed.
// router.route('/:sectionId/unlink-and-delete').delete(verifyToken, authorizePermission('section:delete'), deleteSectionAndUnlinkModules);

export default router;