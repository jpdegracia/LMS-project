import { User } from '../models/UserSchema.js';
import { Role } from '../models/RoleSchema.js'; 
import { Permission } from '../models/PermissionSchema.js'; 
import crypto from 'node:crypto';
import { generateTokenAndSetCookies } from '../utils/generateTokenAndSetCookie.js'; 
import {
    sendPasswordResetEmail,
    sendResetSuccessEmail,
    sendVerificationEmail,
    sendWelcomeEmail
} from '../mailtrap/email.js';

// Helper function to resolve all effective permissions for a user
const getUserEffectivePermissions = async (userId) => {
    const user = await User.findById(userId)
        .populate({
            path: 'roles',
            populate: {
                path: 'permissions',
                model: 'Permission',
                select: 'name'
            },
            select: 'name permissions'
        })
        .lean();

    if (!user) return new Set();

    const effectivePermissions = new Set();

    if (user.roles && user.roles.length > 0) {
        user.roles.forEach(role => {
            if (role.permissions) {
                role.permissions.forEach(permission => {
                    effectivePermissions.add(permission.name);
                });
            }
        });
    }

    return effectivePermissions;
};


/**
 * @desc    Register a new user
 * @route   POST /users/register
 * @access  Public
 */
export const register = async (req, res) => {
    const {
        email,
        password,
        roleName,
        firstName,
        lastName,
        IDnumber,
        bio, // Added bio to registration
        avatar, // Added avatar to registration
    } = req.body;

    try {
        // --- 1. Input Validation ---
        if (!email || !password || !firstName || !lastName || !roleName) {
            return res.status(400).json({ success: false, message: "Email, password, first name, last name, and role are required." });
        }
        if (!email.includes("@") || !email.includes(".")) {
            return res.status(400).json({ success: false, message: "Invalid email address format." });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
        }

        // --- 2. Check for Existing User ---
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "Email already exists. If this is your email, please login or reset your password." });
        }

        // --- 3. Validate and Find Role(s) ---
        const rolesToAssign = [];
        const requestedRoleName = roleName.toLowerCase();
        
        if (requestedRoleName !== 'student' && requestedRoleName !== 'teacher' && requestedRoleName !== 'user') {
            return res.status(403).json({ success: false, message: "You cannot register with the specified role. Please choose 'student', 'teacher', or 'user'." });
        }

        const roleDoc = await Role.findOne({ name: requestedRoleName });
        if (!roleDoc) {
            return res.status(400).json({
                success: false,
                message: `Role '${roleName}' not found. Please provide a valid role (e.g., student, teacher, user).`,
            });
        }
        rolesToAssign.push(roleDoc._id);

        // --- 4. Generate Email Verification Token and Expiration ---
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // --- 5. Create New User Document ---
        const newUser = new User({
            email,
            password,
            firstName,
            lastName,
            IDnumber,
            bio, // Added bio
            avatar, // Added avatar
            roles: rolesToAssign,
            isVerified: false,
            verificationToken,
            verificationTokenExpiresAt,
        });

        const savedUser = await newUser.save();

        // --- 6. Send Email Verification Link ---
        try {
            await sendVerificationEmail(
                savedUser.email,
                savedUser.firstName,
                savedUser.verificationToken
            );
            console.log(`Verification email sent to ${savedUser.email}`);
        } catch (emailError) {
            console.error(`Failed to send verification email to ${savedUser.email} during registration:`, emailError);
        }

        // --- 7. Prepare User Data for Response ---
        const populatedUser = await User.findById(savedUser._id)
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({
                path: 'roles',
                select: 'name permissions'
            });

        // --- 8. Send Success Response ---
        res.status(201).json({
            success: true,
            message: "User registered successfully! Please check your email for a verification link.",
            user: {
                _id: populatedUser._id,
                email: populatedUser.email,
                firstName: populatedUser.firstName,
                lastName: populatedUser.lastName,
                IDnumber: populatedUser.IDnumber,
                bio: populatedUser.bio, // Added bio
                avatar: populatedUser.avatar, // Added avatar
                roles: populatedUser.roles,
                isVerified: populatedUser.isVerified,
            },
        });

    } catch (error) {
        console.error("Error during registration:", error);
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "This email is already registered." });
        }
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: `Validation failed: ${errors.join(', ')}` });
        }
        res.status(500).json({ success: false, message: "Registration failed due to a server error. Please try again later." });
    }
};

/**
 * @desc    Verify user's email address
 * @route   POST /users/verify-email/:token
 * @access  Public
 */
export const verifyEmailByToken = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: "Verification token is missing from the URL." });
    }
    if (!newPassword) {
        return res.status(400).json({ success: false, message: "New password is required." });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
    }

    try {
        const now = new Date();
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpiresAt: { $gt: now },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification link. Please request a new one.",
                email: null,
            });
        }

        if (user.isVerified) {
            return res.status(200).json({
                success: true,
                message: "Email is already verified. You can now log in.",
                user: { email: user.email, firstName: user.firstName, lastName: user.lastName },
            });
        }

        user.password = newPassword;
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();

        await sendWelcomeEmail(user.email, user.firstName || user.email);

        const populatedUser = await User.findById(user._id)
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({
                path: 'roles',
                select: 'name'
            });


        return res.status(200).json({
            success: true,
            message: "Email verified and password set successfully. You can now log in.",
            user: populatedUser,
        });

    } catch (error) {
        console.error("Error verifying email by token and setting password:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while verifying email link or setting password. Please try again.",
        });
    }
};

/**
 * @desc    Login path
 * @route   POST /users/login
 * @access  Public
 */
export const login = async (req, res) => {
    const { email, password } = req.body;
    console.log("👉 DEBUG: Login started for:", email);

    try {
        console.log("👉 DEBUG: Attempting User.findOne...");
        const user = await User.findOne({ email }).select('+password').populate({
            path: 'roles',
            populate: {
                path: 'permissions',
                model: 'Permission',
                select: 'name'
            },
            select: 'name permissions'
        });
        console.log("👉 DEBUG: User.findOne completed. User found?", !!user);

        if (!user) {
            console.log("👉 DEBUG: User not found.");
            return res.status(400).json({ success: false, message: "Invalid credentials." });
        }

        console.log("👉 DEBUG: Verifying password...");
        const isPasswordValid = await user.comparePassword(password);
        console.log("👉 DEBUG: Password valid?", isPasswordValid);

        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid credentials." });
        }

        if (!user.isVerified) {
            console.log("👉 DEBUG: User not verified.");
            return res.status(403).json({ success: false, message: "Please verify your email address before logging in." });
        }

        // ... Permission logic (usually fast) ...
        console.log("👉 DEBUG: Processing permissions...");
        const effectivePermissionsSet = new Set();
        const userRoleNames = new Set();
        if (user.roles && user.roles.length > 0) {
            user.roles.forEach(role => {
                userRoleNames.add(role.name);
                if (role.permissions) {
                    role.permissions.forEach(permission => effectivePermissionsSet.add(permission.name));
                }
            });
        }
        const effectivePermissionsArray = Array.from(effectivePermissionsSet);
        const userRoleNamesArray = Array.from(userRoleNames);

        console.log("👉 DEBUG: Calling generateTokenAndSetCookies...");
        generateTokenAndSetCookies(
            res,
            user._id,
            userRoleNamesArray,
            effectivePermissionsArray
        );
        console.log("👉 DEBUG: Token generated.");

        console.log("👉 DEBUG: Sending final JSON response...");
        const userForResponse = await User.findById(user._id)
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({ path: 'roles', select: 'name' })
            .lean();

        res.status(200).json({
            success: true,
            message: "Logged in successfully.",
            user: userForResponse,
            permissions: effectivePermissionsArray
        });
        console.log("✅ DEBUG: Response sent successfully.");

    } catch (error) {
        console.error("❌ DEBUG: Error in login:", error);
        res.status(500).json({ success: false, message: "Server error during login: " + error.message });
    }
};

/**
 * @desc    Logout path
 * @route   POST /users/logout
 * @access  Public
 */
export const logout = async (req, res) => {
    res.clearCookie("token", {
        secure: true,
        sameSite: 'None',
        httpOnly: true,
    });
    res.status(200).json({ success: true, message: "Logged out Successfully" });
};

/**
 * @desc    Forgot Password controller
 * @route   POST /users/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ success: true, message: "If a user with that email exists, a password reset link has been sent." });
        }

        const resetToken = crypto.randomBytes(20).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await user.save();

        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        await sendPasswordResetEmail(user.email, resetUrl);

        res.status(200).json({ success: true, message: "Password reset link sent to your email. Please check your inbox (and spam/junk folder)." });

    } catch (error) {
        console.error("Error in forgotPassword:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Reset Password controller
 * @route   POST /users/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ success: false, message: "New password is required and must be at least 8 characters long." });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: Date.now() },
        }).select('+password');

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;
        await user.save();

        await sendResetSuccessEmail(user.email, user.firstName || user.email);

        const populatedUser = await User.findById(user._id)
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({
                path: 'roles',
                select: 'name'
            });


        return res.status(200).json({
            success: true,
            message: "Password reset successful. You can now log in.",
            user: populatedUser,
        });

    } catch (error) {
        console.error("Error in resetPassword:", error);
        res.status(500).json({ success: false, message: "Server error resetting password." });
    }
};

/**
 * @desc    Get details of the currently authenticated user
 * @route   GET /users/details
 * @access  Private (Requires authentication)
 */
export const getMyDetails = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).json({ success: false, message: "User not found from authentication token." });
        }

        const userDetails = await User.findById(req.user._id)
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({
                path: 'roles',
                select: 'name permissions',
                populate: {
                    path: 'permissions',
                    model: 'Permission',
                    select: 'name description'
                }
            })
            .lean();

        if (!userDetails) {
            return res.status(404).json({ success: false, message: "User details not found." });
        }

        const currentEffectivePermissions = new Set();
        if (userDetails.roles) {
            userDetails.roles.forEach(role => {
                if (role.permissions) {
                    role.permissions.forEach(permission => currentEffectivePermissions.add(permission.name));
                }
            });
        }
        const effectivePermissionsArray = Array.from(currentEffectivePermissions);

        // --- THE CRUCIAL CHANGE ---
        // Map the populated roles to a simple array of role names
        const userRoleNames = userDetails.roles.map(role => role.name);

        res.status(200).json({
            success: true,
            user: {
                _id: userDetails._id,
                email: userDetails.email,
                firstName: userDetails.firstName,
                lastName: userDetails.lastName,
                IDnumber: userDetails.IDnumber,
                bio: userDetails.bio,
                avatar: userDetails.avatar,
                isVerified: userDetails.isVerified,
                roles: userDetails.roles,
                // Add the new roleNames property here
                roleNames: userRoleNames,
            },
            permissions: effectivePermissionsArray
        });
    } catch (error) {
        console.error("Error in getMyDetails controller:", error);
        res.status(500).json({ success: false, message: "Server error retrieving user details." });
    }
};

/**
 * @desc    Get details of all authenticated user
 * @route   GET /users/getAllUsersPublicView
 * @access  Public
 */
export const getAllUsersPublicView = async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({ path: 'roles', select: 'name' });
        res.status(200).json({ success: true, count: users.length, users });
    } catch (error) {
        console.error('Error getting all users (Public View):', error);
        res.status(500).json({ success: false, message: 'Server error while fetching users.' });
    }
};

/**
 * @desc    Update User Profile Details (for the authenticated user themselves)
 * @route   PUT /users/update-profile
 * @access  Private (Requires authentication and 'edit_own_profile' permission)
 */
export const updateProfile = async (req, res) => {
    try {
        const userIdFromToken = req.user._id;
        const userToUpdate = await User.findById(userIdFromToken).select('+password');

        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const { email, firstName, lastName, bio, avatar, oldPassword, newPassword } = req.body;

        let passwordUpdated = false;

        // --- Password Update Logic ---
        if (newPassword) {
            if (!oldPassword) {
                return res.status(400).json({ success: false, message: "Current password is required to update password." });
            }
            const isPasswordValid = await userToUpdate.comparePassword(oldPassword);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, message: "Current password does not match." });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
            }
            if (newPassword === oldPassword) {
                return res.status(400).json({ success: false, message: "New password cannot be the same as the old password." });
            }
            userToUpdate.password = newPassword;
            passwordUpdated = true;
        }

        // --- Email Update Logic ---
        if (email !== undefined && email.toLowerCase() !== userToUpdate.email.toLowerCase()) {
            if (!email.includes("@")) {
                return res.status(400).json({ success: false, message: "Invalid email address format." });
            }
            const existingEmailUser = await User.findOne({ email: email.toLowerCase() });
            if (existingEmailUser && String(existingEmailUser._id) !== String(userToUpdate._id)) {
                return res.status(409).json({ success: false, message: "Email is already taken by another user." });
            }
            userToUpdate.email = email.toLowerCase();
        }

        // --- Other Profile Field Updates ---
        if (firstName !== undefined) {
            userToUpdate.firstName = firstName;
        }
        if (lastName !== undefined) {
            userToUpdate.lastName = lastName;
        }
        if (bio !== undefined) {
            userToUpdate.bio = bio;
        }
        if (avatar !== undefined) {
            userToUpdate.avatar = avatar;
        }

        const updatedUserDocument = await userToUpdate.save();

        if (passwordUpdated) {
            try {
                console.log(`Password reset success email (simulated) sent to ${userToUpdate.email}`);
            } catch (emailError) {
                console.error("Backend: Error sending password reset success email:", emailError.message);
            }
        }

        const finalUserResponse = await User.findById(updatedUserDocument._id)
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
            .populate({
                path: 'roles',
                select: 'name'
            })
            .lean();

        if (!finalUserResponse) {
            console.error("Backend: Failed to find updated user for final response.");
            return res.status(500).json({ success: false, message: "Could not retrieve updated user details." });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: finalUserResponse,
        });

    } catch (error) {
        console.error("Backend: CRITICAL ERROR in updateProfile:", error);

        if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
            return res.status(409).json({ success: false, message: "The email you provided is already in use." });
        }
        if (error.name === 'ValidationError') {
            console.error("Backend: Validation Error Details:", error.errors);
            let validationMessages = Object.values(error.errors).map(err => err.message).join('; ');
            return res.status(400).json({ success: false, message: `Validation Error: ${validationMessages}` });
        }
        res.status(500).json({ success: false, message: "Server error while updating profile." });
    }
};

/**
 * @desc    Resend verification code to unverified user
 * @route   POST /users/resend-verification
 * @access  Public
 */
export const resendVerificationCode = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required." });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: "Email is already verified." });
        }

        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        user.verificationToken = verificationToken;
        user.verificationTokenExpiresAt = verificationTokenExpiresAt;
        await user.save();

        await sendVerificationEmail(user.email, user.firstName, verificationToken);

        return res.status(200).json({
            success: true,
            message: "Verification code resent successfully.",
        });
    } catch (error) {
        console.error("Error in resendVerificationCode:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};