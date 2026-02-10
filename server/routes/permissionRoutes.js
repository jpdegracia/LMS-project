import express from 'express';
import { authorizePermission, verifyToken } from '../middleware/authMiddleware.js';
import { createPermission, deletePermission, getAllPermissions, getPermission, updatePermission } from '../controllers/permission-controller.js';

const router = express.Router();

router.get('/', verifyToken, authorizePermission('permission:read:all'), getAllPermissions); 
router.post('/', verifyToken, authorizePermission('permission:create'), createPermission);
router.get('/:id', verifyToken, authorizePermission('permission:read'), getPermission);    
router.put('/:id', verifyToken, authorizePermission('permission:update'), updatePermission); 
router.delete('/:id', verifyToken, authorizePermission('permission:delete'), deletePermission); 

export default router;