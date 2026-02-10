import { User } from "../models/User.js"; 
import { Role } from "../models/RoleSchema.js";   
import bcrypt from "bcryptjs";
import mongoose from 'mongoose'; 
import { sendVerificationEmail } from "../mailtrap/email.js";

/**
 * @desc    Create a new user (for admin use)
 * @route   POST /admin/users-management/create-user
 * @access  Private (Requires 'user:create' permission)
 */
export const createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, roleName } = req.body;

        // --- 1. Input Validation ---
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide first name, last name, email, and password.' });
        }
        // Basic email format check
        if (!email.includes("@") || !email.includes(".")) {
            return res.status(400).json({ success: false, message: "Invalid email address format." });
        }
        // Password length validation
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
        }

        // --- 2. Check if User Already Exists ---
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ success: false, message: 'A user with that email already exists.' });
        }

        // --- 3. Determine and Validate Role ---
        let assignedRole = null;
        let roleFound = false;

        if (roleName) {
            const foundRole = await Role.findOne({ name: roleName.toLowerCase() });
            if (foundRole) {
                assignedRole = foundRole._id;
                roleFound = true;
            } else {
                console.warn(`Admin tried to assign role '${roleName}' which was not found. Attempting to assign default 'student' role.`);
                // Do NOT return an error yet, try to assign default.
            }
        }

        // If no valid roleName was provided or found, assign the default 'student' role
        if (!roleFound) {
            const defaultStudentRole = await Role.findOne({ name: 'student' });
            if (defaultStudentRole) {
                assignedRole = defaultStudentRole._id;
            } else {
                console.error("Critical Error: Default 'student' role not found in the database. Please seed it.");
                return res.status(500).json({ success: false, message: "Server configuration error: Default 'student' role is missing." });
            }
        }

        // --- 4. Hash Password ---
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password here!

        // --- 5. Generate Email Verification Token and Expiration ---
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

        // --- 6. Create New User Document ---
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword, // Store the HASHED password
            isVerified: false,
            role: assignedRole,
            verificationToken,
            verificationTokenExpiresAt
        });

        // --- 7. Send Verification Email Asynchronously ---
        // It's generally good to `await` this, especially if you want to catch email sending errors
        // before responding to the client, or if you want to ensure the token is sent for the client
        // to then verify.
        await sendVerificationEmail(newUser.email, newUser.firstName, newUser.verificationToken);

        // --- 8. Populate User Data for Response ---
        // Select specific fields for the response, excluding password and __v
        const populatedNewUser = await User.findById(newUser._id).select('-password -__v').populate({
            path: 'role',
            select: 'name' // Only need name for response
        });

        // This check is good, though `findById` typically returns null if not found,
        // rather than throwing an error for a valid _id.
        if (!populatedNewUser) {
            return res.status(500).json({ success: false, message: 'Failed to retrieve newly created user for response.' });
        }

        // --- 9. Send Success Response ---
        res.status(201).json({
            success: true,
            message: 'User created successfully. A verification email has been sent to the user.',
            user: { // Send only essential details of the *newly created* user
                _id: populatedNewUser._id,
                firstName: populatedNewUser.firstName,
                lastName: populatedNewUser.lastName,
                isVerified: populatedNewUser.isVerified,
                email: populatedNewUser.email,
                role: populatedNewUser.role, // This will be the populated role object { _id, name }
            }
        });

    } catch (error) {
        console.error('Error creating user:', error); // Log the full error for debugging

        // --- Error Handling Refinement ---
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: `Validation failed: ${errors.join(', ')}` });
        }
        if (error.code === 11000) { // MongoDB duplicate key error
            return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
        }
        // Generic server error
        res.status(500).json({ success: false, message: 'Server error while creating user. Please try again later.' });
    }
};

/**
 * @desc Get a single user by ID
 * @route GET /api/admin/users-management/user/:id
 * @access Private (Admin only, requires user:read permission)
 */
export const getUser = async (req, res) => {
    try {
        const { id: userId } = req.params; // Extract user ID from URL parameters

        // Find the user by ID and populate the 'role' field.
        // '.populate('role')' assumes your User schema has a 'role' field
        // that references your Role model. This will replace the role ID
        // with the actual role document, allowing you to access role.name.
        const user = await User.findById(userId).populate('role');

        if (!user) {
            // If no user is found with the given ID
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // If user is found, send it in the response
        res.status(200).json({ success: true, user });

    } catch (error) {
        // Handle potential errors during database query or other server issues
        console.error("Error fetching user by ID:", error);
        // Send a 500 Internal Server Error response
        res.status(500).json({ success: false, message: 'Server error fetching user data.' });
    }
};

/**
 * @desc    Get all users
 * @route   GET /admin/users-management/all-users
 * @access  Private (Requires 'user:read' permission)
 */
export const getAllUser = async (req, res) => {
    try {
        // FIX: Populate the 'role' field so frontend can display role.name
        const users = await User.find({}).select('-password').populate({
            path: 'role',
            select: 'name' // Only need the name for display in the list
        });

        res.status(200).json({
            success: true,
            count: users.length,
            users // This 'users' array will now have populated 'role' objects
        });
    } catch (error) {
        console.error('Error getting all users:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching users.' });
    }
};

/**
 * @desc    Update a user's details
 * @route   PUT /admin/users-management/update-user/:id
 * @access  Private (Requires 'user:update' permission)
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Add isVerified to the destructuring of req.body
        const { firstName, lastName, email, roleName, isVerified } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid User ID format.' });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Update fields if provided
        if (firstName !== undefined) {
            user.firstName = firstName;
        }
        if (lastName !== undefined) {
            user.lastName = lastName;
        }
        if (email !== undefined) {
            // Only check for email existence if the email is actually changing
            if (email !== user.email) {
                const emailExists = await User.findOne({ email, _id: { $ne: id } });
                if (emailExists) {
                    return res.status(409).json({ success: false, message: 'User with that email already exists.' });
                }
            }
            user.email = email;
        }

        // Add isVerified update logic
        // Check for undefined to allow setting to false
        if (isVerified !== undefined) {
            // If setting to true, and user was not verified, clear token and send welcome email
            if (isVerified === true && user.isVerified === false) {
                user.verificationToken = undefined;
                user.verificationTokenExpiresAt = undefined;
                // Optionally send a welcome email if this is the first time they are verified
                // Make sure `sendWelcomeEmail` is imported and available
                // await sendWelcomeEmail(user.email, user.firstName || user.email);
            }
            // If setting to false, and user was verified, you might want to generate a new token
            // and send a verification email again, but this depends on your business logic.
            // For now, just set the status.
            user.isVerified = isVerified;
        }


        // Role update logic
        if (roleName !== undefined) {
            const foundRole = await Role.findOne({ name: roleName.toLowerCase() });

            if (foundRole) {
                user.role = foundRole._id;
            } else {
                return res.status(400).json({ success: false, message: `Role '${roleName}' not found. User role not updated.` });
            }
        }

        await user.save();

        // Populate the user for the response
        const populatedUser = await User.findById(user._id).select('-password').populate({
            path: 'role',
            select: 'name permissions' // Include permissions in the populated role for the response
        });

        if (!populatedUser) {
            return res.status(500).json({ success: false, message: 'Failed to retrieve populated user after update.' });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: {
                _id: populatedUser._id,
                firstName: populatedUser.firstName,
                lastName: populatedUser.lastName,
                email: populatedUser.email,
                isVerified: populatedUser.isVerified, // Include isVerified in the response
                role: populatedUser.role, // This will be the populated role object
                permissions: populatedUser.role ? populatedUser.role.permissions : []
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: errors.join(', ') });
        }
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
        }
        res.status(500).json({ success: false, message: 'Server error while updating user.' });
    }
};

/**
 * @desc    Delete a user
 * @route   DELETE /admin/users-management/delete-user/:id
 * @access  Private (Requires 'user:delete' permission)
 */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // Get ID from URL parameter

        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid User ID format.' });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await user.deleteOne();

        res.status(200).json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting user.' });
    }
};

/**
 * @desc    Update a user's roles (dedicated endpoint for role changes)
 * @route   PUT /admin/users-management/update-role/:id
 * @access  Private (Requires 'user:changeRole' permission)
 */
export const updateRole = async (req, res) => {
    try {
        const { id } = req.params; 
        const { roleName } = req.body; 

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid User ID format.' });
        }

        if (!roleName || typeof roleName !== 'string' || roleName.trim() === '') {
            return res.status(400).json({ success: false, message: 'A valid roleName (string) is required to update the user\'s role.' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const newRoleDoc = await Role.findOne({ name: roleName.toLowerCase() });
        if (!newRoleDoc) {
            return res.status(400).json({ success: false, message: `Role '${roleName}' not found. Please provide a valid role name.` });
        }

        user.role = newRoleDoc._id; // Assign the new role ObjectId

        await user.save();

        const populatedUser = await User.findById(user._id).select('-password').populate({
            path: 'role',
            select: 'name permissions' // Populate permissions for the response
        });

        if (!populatedUser) {
            return res.status(500).json({ success: false, message: 'Failed to retrieve populated user after role update.' });
        }

        res.status(200).json({
            success: true,
            message: `User role updated to '${populatedUser.role.name}' successfully`,
            user: {
                _id: populatedUser._id,
                firstName: populatedUser.firstName, 
                lastName: populatedUser.lastName, 
                email: populatedUser.email, 
                role: populatedUser.role, // Full populated role object
                // Add permissions at root level of user object in response for frontend UserProvider convenience
                permissions: populatedUser.role ? populatedUser.role.permissions : []
            }
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: errors.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error while updating user role.' });
    }
};

