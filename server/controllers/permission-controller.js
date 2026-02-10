import mongoose from 'mongoose';
import { Permission } from '../models/PermissionSchema.js';
import { Role } from '../models/RoleSchema.js';

/**
 * @desc    Create a new global permission type
 * @route   POST /admin/permissions
 * @access  Private (Requires 'permission:create' permission)
 */
export const createPermission = async (req, res) => {
    // Declare session outside try-catch to ensure it's accessible in finally block
    let session;
    try {
        const { name, description, category } = req.body;

        // --- 1. Input Validation ---
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Permission name is required and must be a non-empty string.' });
        }

        // Ensure name is stored in lowercase for consistency as per schema
        const normalizedName = name.toLowerCase().trim();

        // --- Start Mongoose Session and Transaction ---
        session = await mongoose.startSession();
        session.startTransaction();

        // --- 2. Check if Permission Name Already Exists (within transaction) ---
        const existingPermission = await Permission.findOne({ name: normalizedName }).session(session);
        if (existingPermission) {
            await session.abortTransaction(); // Abort if permission already exists
            return res.status(409).json({ success: false, message: `Permission with name '${name}' already exists.` });
        }

        // --- 3. Create New Permission Document (within transaction) ---
        const newPermission = new Permission({
            name: normalizedName,
            description: description || '', // Use default if not provided
            category: category || '',      // Use default if not provided
        });
        const savedPermission = await newPermission.save({ session }); // Pass session to save

        // --- 4. Find the 'admin' role and assign the new permission (within transaction) ---
        const adminRole = await Role.findOne({ name: 'admin' }).session(session);

        if (adminRole) {
            // Add the new Permission's _id to the admin role's permissions array
            // Using .addToSet ensures no duplicate permission IDs are added.
            adminRole.permissions.addToSet(savedPermission._id);
            await adminRole.save({ session }); // Pass session to save
            console.log(`New permission '${savedPermission.name}' automatically added to 'admin' role.`);
        } else {
            // This is a critical warning. The 'admin' role should ideally exist.
            // You might want to log this to an error tracking system or alert an admin.
            console.warn("Admin role not found. New permission was created but could not be assigned to admin.");
        }

        // --- Commit the transaction if all operations succeed ---
        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Permission created successfully and assigned to admin (if admin role exists).',
            permission: savedPermission
        });

    } catch (error) {
        // --- Abort transaction if any error occurs ---
        if (session) {
            await session.abortTransaction();
        }
        console.error('Error creating permission:', error);

        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: `Validation failed: ${errors.join(', ')}` });
        }
        // Handle MongoDB duplicate key error (code 11000) for uniqueness constraint
        // This catch is technically redundant now due to explicit findOne check, but good for robustness
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'A permission with that name already exists.' });
        }
        res.status(500).json({ success: false, message: 'Server error while creating permission. Please try again later.' });
    } finally {
        // --- End the session ---
        if (session) {
            session.endSession();
        }
    }
};

/**
 * @desc    Get all defined permission types in the system
 * @route   GET /admin/permissions
 * @access  Private (Requires 'permission:read:all' permission)
 */
export const getAllPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find({}); // Fetch all permissions

        res.status(200).json({
            success: true,
            count: permissions.length,
            permissions
        });
    } catch (error) {
        console.error('Error getting all permissions:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching permissions.' });
    }
};

/**
 * @desc    Get a single permission by ID
 * @route   GET /admin/permissions/:id
 * @access  Private (Requires 'permission:read' permission)
 */
export const getPermission = async (req, res) => {
    try {
        const { id: permissionId } = req.params; // Extract permission ID from URL parameters

        // --- 1. Input Validation ---
        // Validate if the provided ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(permissionId)) {
            return res.status(400).json({ success: false, message: 'Invalid Permission ID format.' });
        }

        // --- 2. Find the Permission ---
        const permission = await Permission.findById(permissionId);

        // --- 3. Handle Not Found ---
        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found.' });
        }

        // --- 4. Send Success Response ---
        res.status(200).json({ success: true, permission });

    } catch (error) {
        console.error("Error fetching permission by ID:", error);
        // Handle potential server errors
        res.status(500).json({ success: false, message: 'Server error fetching permission data.' });
    }
};

/**
 * @desc    Update an existing global permission type's metadata
 * @route   PUT /admin/permissions/:id
 * @access  Private (Requires 'permission:update' permission)
 */
export const updatePermission = async (req, res) => {
    try {
        const { id: permissionId } = req.params;
        const { name, description, category } = req.body;

        // --- 1. Input Validation ---
        if (!mongoose.Types.ObjectId.isValid(permissionId)) {
            return res.status(400).json({ success: false, message: 'Invalid Permission ID format.' });
        }
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Permission name is required and must be a non-empty string.' });
        }

        const normalizedName = name.toLowerCase().trim();

        // --- 2. Check if the updated name already exists for *another* permission ---
        const existingPermissionWithName = await Permission.findOne({ name: normalizedName, _id: { $ne: permissionId } });
        if (existingPermissionWithName) {
            return res.status(409).json({ success: false, message: `Permission with name '${name}' already exists for another entry.` });
        }

        // --- 3. Update the Permission Document ---
        const updatedPermission = await Permission.findByIdAndUpdate(
            permissionId,
            {
                name: normalizedName,
                description: description,
                category: category,
            },
            { new: true, runValidators: true } // `new: true` returns the updated doc, `runValidators` ensures schema validation
        );

        if (!updatedPermission) {
            return res.status(404).json({ success: false, message: 'Permission not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Permission updated successfully.',
            permission: updatedPermission
        });

    } catch (error) {
        console.error('Error updating permission:', error);
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: `Validation failed: ${errors.join(', ')}` });
        }
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'A permission with that name already exists.' });
        }
        res.status(500).json({ success: false, message: 'Server error while updating permission.' });
    }
};

/**
 * @desc    Delete a global permission type
 * @route   DELETE /admin/permissions/:id
 * @access  Private (Requires 'permission:delete' permission)
 */
export const deletePermission = async (req, res) => {
    try {
        const { id: permissionId } = req.params;

        // --- 1. Input Validation ---
        if (!mongoose.Types.ObjectId.isValid(permissionId)) {
            return res.status(400).json({ success: false, message: 'Invalid Permission ID format.' });
        }

        const permissionToDelete = await Permission.findById(permissionId);

        if (!permissionToDelete) {
            return res.status(404).json({ success: false, message: 'Permission not found.' });
        }

        // --- CRITICAL: Prevent deletion if any role has this permission assigned (Option 1) ---
        // Also, specifically prevent deletion if it's the 'admin' role's permission
        const rolesWithPermission = await Role.find({ permissions: permissionId });
        const isAssignedToAdmin = rolesWithPermission.some(role => role.name === 'admin');

        if (isAssignedToAdmin) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete permission '${permissionToDelete.name}'. It is assigned to the 'admin' role and cannot be removed directly.`
            });
        }

        if (rolesWithPermission.length > 0) {
            const roleNames = rolesWithPermission.map(role => role.name).join(', ');
            return res.status(400).json({
                success: false,
                message: `Cannot delete permission '${permissionToDelete.name}'. It is currently assigned to role(s): ${roleNames}. Please remove it from all roles first.`
            });
        }


        // --- 2. Delete the Permission Document ---
        await permissionToDelete.deleteOne();

        res.status(200).json({ success: true, message: 'Permission deleted successfully.' });
    } catch (error) {
        console.error('Error deleting permission:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting permission.' });
    }
};