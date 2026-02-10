import express from 'express';
import { authorizePermission, verifyToken } from "../middleware/authMiddleware.js";
import {
    createRole,
    getAllRoles,
    updateRole,    
    deleteRole,
    getRole,
    addPermissionToRole,
    removePermissionFromRole,
} from '../controllers/role-controller.js'; 


const router = express.Router();


/**
 * @route   POST /roles
 * @desc    Create a new role
 * @access  Private (Requires 'role:create' permission)
 */
router.post('/', verifyToken, authorizePermission('role:create'), createRole);

/**
 * @route   GET /roles
 * @desc    Get all roles
 * @access  Private (Requires 'role:read:all' permission)
 */
router.get('/', verifyToken, authorizePermission('role:read:all'), getAllRoles);

/**
 * @route   GET /roles
 * @desc    Get a single role by ID
 * @access  Private (Requires 'role:read:all' permission)
 */
router.get('/:id', verifyToken, authorizePermission('role:read'), getRole);

/**
 * @route   PUT /roles/:id
 * @desc    Update an existing role's name, description, and assigned permissions
 * @access  Private (Requires 'role:update' permission)
 */
router.put('/:id', verifyToken, authorizePermission('role:update'), updateRole);

/**
 * @route   DELETE /roles/:id
 * @desc    Delete a role
 * @access  Private (Requires 'role:delete' permission)
 */
router.delete('/:id', verifyToken, authorizePermission('role:delete'), deleteRole);

/**
 * @route   POST /roles/:roleId/permissions
 * @desc    Add a permission to a specific role
 * @access  Private (Requires 'role:update' permission)
 */
router.post('/:roleId/permissions', verifyToken, authorizePermission('role:update'), addPermissionToRole);

/**
 * @route   DELETE /roles/:roleId/permissions/:permissionId
 * @desc    delete a permission to a specific role
 * @access  Private (Requires 'role:update' permission)
 */
router.delete('/:roleId/permissions/:permissionId', verifyToken, authorizePermission('role:update'), removePermissionFromRole);



export default router;