import mongoose from 'mongoose';
import { User } from '../models/UserSchema.js';
import { Role } from '../models/RoleSchema.js';
import { sendVerificationEmail, sendWelcomeEmail } from "../mailtrap/email.js";

const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`Error ${statusCode}: ${message}`, errorDetails);
    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};

/**
 * @desc    Create a new user (for admin use)
 * @route   POST /users
 * @access  Private (Requires 'user:create' permission)
 */
export const createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, IDnumber, roleNames, bio, avatar } = req.body;

        // --- 1. Input Validation ---
        if (!firstName || !lastName || !email || !password) {
            return sendErrorResponse(res, 400, 'Please provide first name, last name, email, and password.');
        }
        if (!email.includes("@") || !email.includes(".")) {
            return sendErrorResponse(res, 400, "Invalid email address format.");
        }
        if (password.length < 8) {
            return sendErrorResponse(res, 400, "Password must be at least 8 characters long.");
        }
        if (!roleNames || !Array.isArray(roleNames) || roleNames.length === 0) {
            return sendErrorResponse(res, 400, 'At least one role name is required for user creation.');
        }

        // --- 2. Check if User Already Exists ---
        const userExists = await User.findOne({ email });
        if (userExists) {
            return sendErrorResponse(res, 409, 'A user with that email already exists.');
        }

        // --- 3. Validate and Assign Roles ---
        const roleDocs = await Role.find({ name: { $in: roleNames.map(name => name.toLowerCase()) } });
        if (roleDocs.length !== roleNames.length) {
            const foundRoleNames = roleDocs.map(role => role.name);
            const notFoundRoleNames = roleNames.filter(name => !foundRoleNames.includes(name.toLowerCase()));
            return sendErrorResponse(res, 400, `One or more roles not found: ${notFoundRoleNames.join(', ')}. Please provide valid role names.`);
        }
        const assignedRoleIds = roleDocs.map(role => role._id);

        // --- 4. Generate Email Verification Token and Expiration ---
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // --- 5. Create New User Document ---
        const newUser = new User({
            firstName,
            lastName,
            email,
            password,
            IDnumber,
            bio,
            avatar,
            roles: assignedRoleIds,
            isVerified: false,
            verificationToken,
            verificationTokenExpiresAt
        });
        const savedUser = await newUser.save();

        // --- 6. Send Verification Email Asynchronously with error handling ---
        try {
            await sendVerificationEmail(savedUser.email, savedUser.firstName, savedUser.verificationToken);
            console.log(`Verification email sent to ${savedUser.email} by admin.`);
        } catch (emailError) {
            console.error(`Failed to send verification email to ${savedUser.email} during admin user creation:`, emailError);
        }

        // --- 7. Populate User Data for Response ---
        const populatedNewUser = await User.findById(savedUser._id)
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({
                path: 'roles',
                select: 'name permissions',
                populate: {
                    path: 'permissions',
                    model: 'Permission',
                    select: 'name'
                }
            });

        if (!populatedNewUser) {
            return sendErrorResponse(res, 500, 'Failed to retrieve newly created user for response.');
        }

        res.status(201).json({
            success: true,
            message: 'User created successfully. A verification email has been sent to the user.',
            user: populatedNewUser
        });

    } catch (error) {
        console.error('Error creating user:', error);
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.values(error.errors).map(err => err.message);
            return sendErrorResponse(res, 400, `Validation failed: ${errors.join(', ')}`);
        }
        if (error.code === 11000) {
            return sendErrorResponse(res, 409, 'A user with this email already exists.');
        }
        sendErrorResponse(res, 500, 'Server error while creating user. Please try again later.');
    }
};

/**
 * @desc    Get all users (for admin panel)
 * @route   GET /api/admin/users
 * @access  Private (Requires 'user:read:all' permission)
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({
                path: 'roles',
                select: 'name',
            });

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Error getting all users:', error);
        sendErrorResponse(res, 500, 'Server error while fetching users.');
    }
};

/**
 * @desc    Get a single user by ID (for admin view)
 * @route   GET /users/:id
 * @access  Private (Requires 'user:read' permission)
 */
export const getUser = async (req, res) => {
    try {
        const { id: userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return sendErrorResponse(res, 400, 'Invalid User ID format.');
        }

        const user = await User.findById(userId)
            // CORRECTED: The .select() statement no longer mixes inclusion and exclusion.
            // All other fields will be included by default since no other fields are listed.
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({
                path: 'roles',
                select: 'name permissions',
                populate: {
                    path: 'permissions',
                    model: 'Permission',
                    select: 'name description'
                }
            });

        if (!user) {
            return sendErrorResponse(res, 404, 'User not found.');
        }

        // Add this console.log to check the data before sending to frontend
        console.log('Backend response data:', user); 

        res.status(200).json({ success: true, user });

    } catch (error) {
        console.error("Error fetching user by ID:", error);
        sendErrorResponse(res, 500, 'Server error fetching user data.');
    }
};

/**
 * @desc    Update a user's details (admin perspective)
 * @route   PUT /users/:id
 * @access  Private (Requires 'user:update' permission)
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, IDnumber, isVerified, bio, avatar } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendErrorResponse(res, 400, 'Invalid User ID format.');
        }

        const user = await User.findById(id);

        if (!user) {
            return sendErrorResponse(res, 404, 'User not found.');
        }

        if (firstName !== undefined) {
            user.firstName = firstName;
        }
        if (lastName !== undefined) {
            user.lastName = lastName;
        }
        if (email !== undefined && email.toLowerCase() !== user.email.toLowerCase()) {
            const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
            if (emailExists) {
                return sendErrorResponse(res, 409, 'User with that email already exists.');
            }
            user.email = email.toLowerCase();
        }
        if (IDnumber !== undefined) {
            user.IDnumber = IDnumber;
        }
        if (bio !== undefined) {
            user.bio = bio;
        }
        if (avatar !== undefined) {
            user.avatar = avatar;
        }

        if (isVerified !== undefined) {
            if (isVerified === true && user.isVerified === false) {
                user.verificationToken = undefined;
                user.verificationTokenExpiresAt = undefined;
            }
            user.isVerified = isVerified;
        }

        await user.save();

        const populatedUser = await User.findById(user._id)
            // CORRECTED: The .select() statement no longer mixes inclusion and exclusion.
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({
                path: 'roles',
                select: 'name'
            });

        if (!populatedUser) {
            return sendErrorResponse(res, 500, 'Failed to retrieve populated user after update.');
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: populatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.values(error.errors).map(err => err.message);
            return sendErrorResponse(res, 400, errors.join(', '));
        }
        if (error.code === 11000) {
            return sendErrorResponse(res, 409, 'A user with this email already exists.');
        }
        sendErrorResponse(res, 500, 'Server error while updating user.');
    }
};

/**
 * @desc    Delete a user
 * @route   DELETE /users/:id
 * @access  Private (Requires 'user:delete' permission)
 */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendErrorResponse(res, 400, 'Invalid User ID format.');
        }

        const user = await User.findById(id);

        if (!user) {
            return sendErrorResponse(res, 404, 'User not found.');
        }

        await user.deleteOne();

        res.status(200).json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        sendErrorResponse(res, 500, 'Server error while deleting user.');
    }
};

/* --- FUNCTIONS FOR ADMIN-LEVEL USER ROLE ASSIGNMENT --- */

/**
 * @desc    Update a user's roles (admin function)
 * @route   PUT /users/:userId/roles
 * @access  Private (Requires 'user:assignRoles' permission)
 *
 * This function specifically handles assigning an array of new roles to a user.
 */
export const assignUserRoles = async (req, res) => {
    const { userId } = req.params;
    const { roleIds } = req.body; // Expects an array of Role ObjectIds

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return sendErrorResponse(res, 400, 'Invalid User ID format.');
    }
    if (!Array.isArray(roleIds)) {
        return sendErrorResponse(res, 400, "Role IDs must be an array.");
    }
    if (roleIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        return sendErrorResponse(res, 400, 'One or more provided role IDs are invalid format.');
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return sendErrorResponse(res, 404, "User not found.");
        }

        const existingRoles = await Role.find({ _id: { $in: roleIds } });
        if (existingRoles.length !== roleIds.length) {
            const invalidIds = roleIds.filter(id => !existingRoles.some(er => er._id.toString() === id.toString()));
            return sendErrorResponse(res, 400, `One or more provided role IDs do not exist: ${invalidIds.join(', ')}`);
        }

        user.roles = roleIds;
        await user.save();

        const updatedUser = await User.findById(userId)
            .select('-password -__v')
            .populate({ path: 'roles', select: 'name' });

        res.status(200).json({
            success: true,
            message: "User roles updated successfully.",
            user: updatedUser,
        });

    } catch (error) {
        console.error("Error updating user roles:", error);
        sendErrorResponse(res, 500, "Server error updating user roles.");
    }
};


/**
 * @desc    Get a list of all users with the 'teacher' role
 * @route   GET /users/teachers
 * @access  Private (Requires 'user_read:teachers' permission)
 */
export const getTeachers = async (req, res) => {
    try {
        // Find the Role document for 'teacher' to get its _id
        const teacherRole = await Role.findOne({ name: 'teacher' });

        if (!teacherRole) {
            console.warn('Backend getTeachers: Teacher role not found in the database.');
            return res.status(404).json({ success: false, message: 'Teacher role not found.' });
        }

        // Find all users that have this role's ObjectId in their 'roles' array
        const teachers = await User.find({ roles: teacherRole._id })
            .select('firstName lastName email bio avatar')
            .lean(); // Use .lean() for performance

        if (teachers.length === 0) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }
        
        res.status(200).json({ success: true, count: teachers.length, data: teachers });
    } catch (error) {
        console.error('Error in getTeachers:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve teachers.', error: error.message });
    }
};

export const getAllStudents = async (req, res) => {
    try {
        // Find the Role document for 'teacher' to get its _id
        const studentRole = await Role.findOne({ name: 'student' });

        if (!studentRole) {
            console.warn('Backend getStudents: Student role not found in the database.');
            return res.status(404).json({ success: false, message: 'Student role not found.' });
        }

        // Find all users that have this role's ObjectId in their 'roles' array
        const students = await User.find({ roles: studentRole._id })
            .select('firstName lastName email bio avatar')
            .lean(); // Use .lean() for performance

        if (students.length === 0) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }
        
        res.status(200).json({ success: true, count: students.length, data: students });
    } catch (error) {
        console.error('Error in getStudents:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve students.', error: error.message });
    };
}