import jwt from "jsonwebtoken";
import { User } from '../models/User.js'; 

export const verifyToken = async (req, res, next) => {
    const token = req.cookies.token; 
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized - no token provided" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.userId) { 
            return res.status(401).json({ success: false, message: "Unauthorized - invalid token payload" });
        }

        const user = await User.findById(decoded.userId).select('-password').populate({
            path: 'role',
            select: 'name permissions' 
        });

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized - User not found" });
        }


        req.user = {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,  
            isVerified: user.isVerified, 
            role: { 
                _id: user.role ? user.role._id : null,
                name: user.role ? user.role.name : null,
                permissions: user.role ? user.role.permissions : []
            },

            permissions: user.role ? user.role.permissions : []
            
        };


        next();
    } catch (error) {
        console.log("Error in verifyToken", error); // Keep this for server-side debugging
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: "Invalid Token: Please log in again." });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: "Token Expired: Please log in again." });
        }
        return res.status(500).json({ success: false, message: "Server Error during token verification" });
    }
};