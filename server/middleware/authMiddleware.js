import jwt from "jsonwebtoken";
import { User } from '../models/UserSchema.js'; 

export const verifyToken = async (req, res, next) => {
    // --- ADD THESE LOGS HERE ---
    // console.log('--- Inside verifyToken ---');
    // console.log('Request URL:', req.originalUrl);
    // console.log('Request Method:', req.method);
    // console.log('Incoming Headers:', req.headers); // Log all incoming headers
    // console.log('Cookies received by backend (req.cookies):', req.cookies);

    let token = req.cookies.token;

    // console.log('Token extracted from cookies:', token);
    // console.log('Authorization header:', req.headers.authorization);
    // // --- END ADDED LOGS ---

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        console.log('Token extracted from Authorization header (fallback):', token);
    }

    if (!token) {
        console.log('No token found in cookies or Authorization header. Sending 401.');
        return res.status(401).json({ success: false, message: "Unauthorized - No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log('Token decoded successfully:', decoded); // Log decoded payload

        if (!decoded || !decoded.userId) {
            // console.log('Invalid token payload: missing userId.');
            return res.status(401).json({ success: false, message: "Unauthorized - Invalid token payload." });
        }

        const user = await User.findById(decoded.userId)
            .select('-password -__v -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt')
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

        if (!user) {
            // console.log('User not found for ID:', decoded.userId);
            return res.status(401).json({ success: false, message: "Unauthorized - User not found." });
        }

        const userEffectivePermissions = new Set();
        const userRoleNames = new Set();

        if (user.roles && user.roles.length > 0) {
            user.roles.forEach(role => {
                userRoleNames.add(role.name);
                if (role.permissions) {
                    role.permissions.forEach(permission => {
                        userEffectivePermissions.add(permission.name);
                    });
                }
            });
        }

        req.user = {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            IDnumber: user.IDnumber,
            isVerified: user.isVerified,
            permissions: Array.from(userEffectivePermissions),
            roleNames: Array.from(userRoleNames),
        };
        // console.log('User attached to request:', req.user._id);
        next();

    } catch (error) {
        console.error("Error in verifyToken:", error.name, error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: "Invalid Token: Please log in again." });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: "Token Expired: Please log in again." });
        }
        return res.status(500).json({ success: false, message: "Server Error during token verification." });
    }
};

export const authorizePermission = (requiredPermission) => {
    return (req, res, next) => {
        // console.log(`--- Inside authorizePermission for: ${requiredPermission} ---`);
        // console.log('req.user available in authorizePermission:', req.user); // Check what's in req.user here

        if (!req.user || !req.user.permissions || !Array.isArray(req.user.permissions)) {
            console.warn('authorizePermission: Missing or invalid req.user.permissions. Sending 403.');
            // This branch would return "Forbidden: User permissions not loaded or invalid."
            return res.status(403).json({ success: false, message: "Forbidden: User permissions not loaded or invalid." });
        }

        if (req.user.permissions.includes(requiredPermission)) {
            // console.log(`authorizePermission: User HAS '${requiredPermission}'. Calling next().`);
            next();
        } else {
            console.warn(`authorizePermission: User LACKS '${requiredPermission}'. Sending 403.`);
            // This branch would return "Forbidden: You do not have the necessary permission..."
            return res.status(403).json({ success: false, message: `Forbidden: You do not have the necessary permission to perform this action. Required: '${requiredPermission}'.` });
        }
    };
};

export const authorizeRole = (requiredRoleName) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roleNames || !Array.isArray(req.user.roleNames)) {
            return res.status(403).json({ success: false, message: "Forbidden: User roles not loaded or invalid." });
        }

        if (req.user.roleNames.includes(requiredRoleName)) {
            next();
        } else {
            return res.status(403).json({ success: false, message: `Forbidden: You do not have the required role (${requiredRoleName}).` });
        }
    };
    
};

export const authorizeAnyPermission = (requiredPermissionsArray) => {
    return (req, res, next) => {
        // Your debug logs will show req.user here.
        // If it's NULL, the problem is verifyToken.
        if (!req.user || !req.user.permissions || !Array.isArray(req.user.permissions)) {
            console.warn('Backend authorizeAnyPermission: Forbidden - req.user or permissions are invalid.');
            return res.status(403).json({ success: false, message: "Forbidden: User permissions not loaded or invalid." });
        }
        const userHasAnyRequiredPermission = requiredPermissionsArray.some(perm => req.user.permissions.includes(perm));
        if (userHasAnyRequiredPermission) {
            next();
        } else {
            console.warn(`Backend authorizeAnyPermission: Forbidden - User lacks required permissions. Required: [${requiredPermissionsArray.join(', ')}]`);
            res.status(403).json({ success: false, message: `Forbidden: You do not have any of the required permissions to perform this action. Required: [${requiredPermissionsArray.join(', ')}]` });
        }
    };
};