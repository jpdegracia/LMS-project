
import mongoose from 'mongoose';
import { Role } from '../models/RoleSchema.js';
import { Permission } from '../models/PermissionSchema.js';
import { User } from '../models/UserSchema.js';

/**
 * @desc    Create a new role
 * @route   POST /admin/roles
 * @access  Private (Requires 'role:create' permission)
 */
export const createRole = async (req, res) => {
    const { name, permissions: permissionIds } = req.body; // Destructure permissions as permissionIds

    // --- 1. Input Validation ---

    // Check 1.1: Role Name Basic Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
        console.warn("Backend createRole: Validation Fail - Role name missing or invalid.");
        return res.status(400).json({ success: false, message: 'ROLE_NAME_REQUIRED' });
    }

    // Check 1.2: Permissions field existence and array type
    if (!permissionIds || !Array.isArray(permissionIds)) {
        console.warn("Backend createRole: Validation Fail - Permissions field is not an array or missing.");
        return res.status(400).json({ success: false, message: 'PERMISSIONS_FIELD_NOT_ARRAY' });
    }

    // Check 1.3: All elements in permissions array are valid ObjectIDs
    const invalidPermissionIds = permissionIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidPermissionIds.length > 0) {
        console.warn("Backend createRole: Validation Fail - Invalid Permission ID format(s) found:", invalidPermissionIds);
        return res.status(400).json({ success: false, message: `INVALID_PERMISSION_ID_FORMATS: ${invalidPermissionIds.join(', ')}` });
    }

    // Check 1.4: Role Name uniqueness (before database interaction)
    const existingRole = await Role.findOne({ name: name.toLowerCase().trim() });
    if (existingRole) {
        console.warn("Backend createRole: Validation Fail - Role name already exists.");
        return res.status(409).json({ success: false, message: 'ROLE_NAME_ALREADY_EXISTS' });
    }
    
    // Check 1.5: Validate if all provided permission IDs actually exist in the Permission collection
    // Only proceed if permissionIds is not empty to avoid unnecessary DB query
    if (permissionIds.length > 0) {
        const existingPermissions = await Permission.find({ _id: { $in: permissionIds } });
        if (existingPermissions.length !== permissionIds.length) {
            const notFoundPermissionIds = permissionIds.filter(id => !existingPermissions.some(ep => ep._id.toString() === id.toString()));
            console.warn("Backend createRole: Validation Fail - Some permissions not found in DB:", notFoundPermissionIds);
            return res.status(400).json({ success: false, message: `PERMISSIONS_NOT_FOUND_IN_DB: ${notFoundPermissionIds.join(', ')}` });
        }
    }


    // --- If all validations pass, proceed with creating the role ---
    try {
        const newRole = new Role({
            name: name.toLowerCase().trim(),
            permissions: permissionIds, // permissionIds are already validated _id strings
        });
        const savedRole = await newRole.save();

        // Populate permissions for the response to the frontend
        const populatedRole = await Role.findById(savedRole._id)
            .populate({
                path: 'permissions',
                select: 'name description category' // Populate relevant permission fields for frontend display
            });

        console.log("Backend createRole: Role created successfully:", populatedRole.name);
        return res.status(201).json({ // Use 201 Created for successful resource creation
            success: true,
            message: 'Role created successfully.',
            role: populatedRole
        });

    } catch (dbError) {
        console.error('Backend createRole: Database error during role creation:', dbError);
        // Handle Mongoose/MongoDB errors more specifically
        if (dbError.code === 11000) { // Duplicate key error (e.g., role name unique constraint)
            console.warn("Backend createRole: Duplicate key error (database conflict).");
            return res.status(409).json({ success: false, message: `ROLE_NAME_ALREADY_EXISTS_DB_CONFLICT` });
        }
        if (dbError instanceof mongoose.Error.ValidationError) { // Mongoose validation errors (e.g., from schema definition)
            const errors = Object.values(dbError.errors).map(err => err.message);
            console.warn("Backend createRole: Mongoose validation error:", errors.join(', '));
            return res.status(400).json({ success: false, message: `MONGOOSE_VALIDATION_FAILED: ${errors.join(', ')}` });
        }
        // Generic server error for unhandled exceptions
        return res.status(500).json({ success: false, message: 'SERVER_ERROR_CREATING_ROLE' });
    }
};

/**
 * @desc    Get all roles
 * @route   GET /admin/roles
 * @access  Private (Requires 'role:read:all' permission)
 */
export const getAllRoles = async (req, res) => {
    try {
        const roles = await Role.find({})
            .populate({
                path: 'permissions',
                select: 'name description' // Only need name and description for list view
            });

        res.status(200).json({
            success: true,
            count: roles.length,
            roles
        });
    } catch (error) {
        console.error('Error getting all roles:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching roles.' });
    }
};

/**
 * @desc    Get a single role by ID
 * @route   GET /roles/:id
 * @access  Private (Requires 'role:read' permission)
 */
export const getRole = async (req, res) => {
    try {
        const { id: roleId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roleId)) {
            return res.status(400).json({ success: false, message: 'Invalid Role ID format.' });
        }

        const role = await Role.findById(roleId)
            .populate({
                path: 'permissions',
                select: 'name description category'
            });

        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }

        res.status(200).json({ success: true, role });

    } catch (error) {
        console.error("Error fetching role by ID:", error);
        res.status(500).json({ success: false, message: 'Server error fetching role data.' });
    }
};

/**
 * @desc    Update a role's name and permissions
 * @route   PUT /admin/roles/:id
 * @access  Private (Requires 'role:update' permission)
 */
export const updateRole = async (req, res) => { // This is updateRole
    const { name, permissions: permissionIds } = req.body; // Destructure permissions as permissionIds
    const { id: roleId } = req.params; // Get roleId from params



    // --- 1. Input Validation ---

    // Check 1.1: Role Name Basic Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
        console.warn("Backend updateRole: Validation Fail - Role name missing or invalid.");
        return res.status(400).json({ success: false, message: 'ROLE_NAME_REQUIRED' });
    }

    // Check 1.2: Permissions field existence and array type
    if (!permissionIds || !Array.isArray(permissionIds)) {
        console.warn("Backend updateRole: Validation Fail - Permissions field is not an array or missing. Value:", permissionIds);
        return res.status(400).json({ success: false, message: 'PERMISSIONS_FIELD_NOT_ARRAY' }); // <-- THIS MESSAGE IS THE ONE WE WERE TRACKING
    }

    // Check 1.3: All elements in permissions array are valid ObjectIDs
    const invalidPermissionIds = permissionIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidPermissionIds.length > 0) {
        console.warn("Backend updateRole: Validation Fail - Invalid Permission ID format(s) found:", invalidPermissionIds);
        return res.status(400).json({ success: false, message: `INVALID_PERMISSION_ID_FORMATS: ${invalidPermissionIds.join(', ')}` });
    }

    // Check 1.4: Role Name uniqueness (for other roles, during update)
    // Find a role with the same new name but a different ID
    const existingRoleWithName = await Role.findOne({ name: name.toLowerCase().trim(), _id: { $ne: roleId } }); 
    if (existingRoleWithName) {
        console.warn("Backend updateRole: Validation Fail - Role name already exists for another role.");
        return res.status(409).json({ success: false, message: 'ROLE_NAME_ALREADY_EXISTS' });
    }

    // Check 1.5: Validate if all provided permission IDs actually exist in the Permission collection
    if (permissionIds.length > 0) { // Only check if array is not empty
        const existingPermissions = await Permission.find({ _id: { $in: permissionIds } });
        if (existingPermissions.length !== permissionIds.length) {
            const notFoundPermissionIds = permissionIds.filter(id => !existingPermissions.some(ep => ep._id.toString() === id.toString()));
            console.warn("Backend updateRole: Validation Fail - Some permissions not found in DB:", notFoundPermissionIds);
            return res.status(400).json({ success: false, message: `PERMISSIONS_NOT_FOUND_IN_DB: ${notFoundPermissionIds.join(', ')}` });
        }
    }


    // --- If all validations pass, proceed with updating the role ---
    try {
        // Find and update the role by its ID
        const updatedRole = await Role.findByIdAndUpdate(
            roleId, // Use roleId from params
            { name: name.toLowerCase().trim(), permissions: permissionIds },
            { new: true, runValidators: true } // `new: true` returns the updated doc, `runValidators` runs schema validators
        ).populate({
            path: 'permissions',
            select: 'name description category' // Populate for frontend response
        });

        if (!updatedRole) {
            console.warn("Backend updateRole: Role not found for update.");
            return res.status(404).json({ success: false, message: 'ROLE_NOT_FOUND' });
        }

        console.log("Backend updateRole: Role updated successfully:", updatedRole.name);
        res.status(200).json({ // Use 200 OK for successful update
            success: true,
            message: 'Role updated successfully.',
            role: updatedRole
        });

    } catch (dbError) {
        console.error('Backend updateRole: Database error during role update:', dbError);
        // Handle Mongoose/MongoDB errors more specifically
        if (dbError.code === 11000) { // Duplicate key error (e.g., role name unique constraint)
            console.warn("Backend updateRole: Duplicate key error (database conflict during update).");
            return res.status(409).json({ success: false, message: `ROLE_NAME_ALREADY_EXISTS_DB_CONFLICT` });
        }
        if (dbError instanceof mongoose.Error.ValidationError) { // Mongoose validation errors (e.g., from schema definition)
            const errors = Object.values(dbError.errors).map(err => err.message);
            console.warn("Backend updateRole: Mongoose validation error:", errors.join(', '));
            return res.status(400).json({ success: false, message: `MONGOOSE_VALIDATION_FAILED: ${errors.join(', ')}` });
        }
        // Generic server error for unhandled exceptions
        return res.status(500).json({ success: false, message: 'SERVER_ERROR_UPDATING_ROLE' });
    }
};

/**
 * @desc    Delete a role
 * @route   DELETE /admin/roles/:id
 * @access  Private (Requires 'role:delete' permission)
 */
export const deleteRole = async (req, res) => {
    try {
        const { id: roleId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(roleId)) {
            return res.status(400).json({ success: false, message: 'Invalid Role ID format.' });
        }

        const role = await Role.findById(roleId);

        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }

        // --- CRITICAL CONSIDERATION: Handle users who have this role ---
        // You MUST decide how to handle users currently assigned to this role before deleting it.
        // Options:
        // 1. Prevent deletion if any user is assigned:
        const usersWithRole = await User.countDocuments({ roles: roleId });
        if (usersWithRole > 0) {
            return res.status(400).json({ success: false, message: `Cannot delete role '${role.name}'. ${usersWithRole} user(s) are currently assigned to this role.` });
        }
        // 2. Reassign users to a default role (e.g., 'user' or 'guest'):
        //    await User.updateMany({ roles: roleId }, { $pull: { roles: roleId }, $push: { roles: defaultUserRoleId } });
        // 3. Remove the role from users' arrays (leaving them potentially role-less, which might break auth):
        //    await User.updateMany({ roles: roleId }, { $pull: { roles: roleId } });
        // Choose the option that fits your application's logic. Option 1 is safest for a strict RBAC.

        await role.deleteOne(); // Or findByIdAndDelete(roleId)

        res.status(200).json({ success: true, message: 'Role deleted successfully.' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting role.' });
    }
};


/**
 * @desc    Add a permission to a role
 * @route   POST /admin/roles/:roleId/permissions
 * @access  Private (Requires 'role:update' permission)
 */
export const addPermissionToRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissionId } = req.body; // Expects the _id of the permission

        // --- 1. Input Validation ---
        if (!mongoose.Types.ObjectId.isValid(roleId)) {
            console.warn("Backend addPermissionToRole: Validation Fail - Invalid Role ID format.");
            return res.status(400).json({ success: false, message: 'Invalid Role ID format.' });
        }
        if (!mongoose.Types.ObjectId.isValid(permissionId)) {
            console.warn("Backend addPermissionToRole: Validation Fail - Invalid Permission ID format.");
            return res.status(400).json({ success: false, message: 'Invalid Permission ID format.' });
        }

        // --- 2. Check Existence ---
        const role = await Role.findById(roleId);
        if (!role) {
            console.warn("Backend addPermissionToRole: Validation Fail - Role not found.");
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }

        const permission = await Permission.findById(permissionId);
        if (!permission) {
            console.warn("Backend addPermissionToRole: Validation Fail - Permission not found in global list.");
            return res.status(404).json({ success: false, message: 'Permission not found.' });
        }

        // --- 3. Prevent Duplicates ---
        // Ensure to convert ObjectIds to strings for accurate comparison
        if (role.permissions.map(p => p.toString()).includes(permissionId.toString())) {
            console.warn("Backend addPermissionToRole: Validation Fail - Permission already assigned to this role.");
            return res.status(400).json({ success: false, message: 'Permission already assigned to this role.' });
        }

        // --- 4. Add Permission ---
        role.permissions.push(permissionId);
        await role.save();
        console.log(`Backend addPermissionToRole: Permission ${permission.name} added to role ${role.name}.`);


        // --- 5. Populate Role for Response (with updated permissions) ---
        // It's important to send back the populated role so the frontend can update its state
        const populatedRole = await Role.findById(roleId)
            .populate({
                path: 'permissions',
                select: 'name description category' // Select relevant fields for frontend display
            });

        res.status(200).json({
            success: true,
            message: 'Permission added to role successfully.',
            role: populatedRole // Send back the updated, populated role
        });
    } catch (error) {
        console.error('Backend addPermissionToRole: Error adding permission to role:', error);
        res.status(500).json({ success: false, message: 'Server error adding permission to role.' });
    }
};


/**
 * @desc    Remove a permission from a role
 * @route   DELETE /admin/roles/:roleId/permissions/:permissionId
 * @access  Private (Requires 'role:update' permission)
 */
export const removePermissionFromRole = async (req, res) => {
    try {
        const { roleId, permissionId } = req.params; // Get both IDs from params

        // --- 1. Input Validation ---
        if (!mongoose.Types.ObjectId.isValid(roleId)) {
            console.warn("Backend removePermissionFromRole: Validation Fail - Invalid Role ID format.");
            return res.status(400).json({ success: false, message: 'Invalid Role ID format.' });
        }
        if (!mongoose.Types.ObjectId.isValid(permissionId)) {
            console.warn("Backend removePermissionFromRole: Validation Fail - Invalid Permission ID format.");
            return res.status(400).json({ success: false, message: 'Invalid Permission ID format.' });
        }

        // --- 2. Check Existence ---
        const role = await Role.findById(roleId);
        if (!role) {
            console.warn("Backend removePermissionFromRole: Validation Fail - Role not found.");
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }

        // Optional: Check if the permission itself exists in the Permission collection.
        // It's good for clarity, but not strictly necessary if you're only removing by ID that you know exists.
        const permissionExists = await Permission.findById(permissionId);
        if (!permissionExists) {
            console.warn("Backend removePermissionFromRole: Validation Fail - Permission to remove not found in global list.");
            return res.status(404).json({ success: false, message: 'Permission not found in global list.' });
        }


        // --- 3. Remove Permission ---
        const initialLength = role.permissions.length;
        // Filter out the permission. Using .toString() is crucial when comparing ObjectIds.
        role.permissions = role.permissions.filter(
            (perm) => perm.toString() !== permissionId.toString()
        );

        if (role.permissions.length === initialLength) {
            // If length hasn't changed, it means the permission was not found in the role's array
            console.warn(`Backend removePermissionFromRole: Validation Fail - Permission ${permissionId} not found on role ${role.name}.`);
            return res.status(400).json({ success: false, message: 'Permission not found on this role.' });
        }

        await role.save();
        console.log(`Backend removePermissionFromRole: Permission ${permissionExists.name} removed from role ${role.name}.`);


        // --- 4. Populate Role for Response (with updated permissions) ---
        // It's important to send back the populated role so the frontend can update its state
        const populatedRole = await Role.findById(roleId)
            .populate({
                path: 'permissions',
                select: 'name description category'
            });

        res.status(200).json({
            success: true,
            message: 'Permission removed from role successfully.',
            role: populatedRole // Send back the updated, populated role
        });
    } catch (error) {
        console.error('Backend removePermissionFromRole: Error removing permission from role:', error);
        res.status(500).json({ success: false, message: 'Server error removing permission from role.' });
    }
};

