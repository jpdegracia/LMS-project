import express from "express";
import {
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    resendVerificationCode,
    verifyEmailByToken,
    getMyDetails,
    getAllUsersPublicView,
} from "../controllers/auth-controller.js"; 
import { verifyToken, authorizePermission, authorizeAnyPermission } from "../middleware/authMiddleware.js";




const router = express.Router();

// --- Public Authentication Routes (No token or authorization needed for these) ---
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout); // Logout typically invalidates the token, so no auth check needed here

// --- Public Password/Email Verification Routes (No token or authorization needed for these) ---
router.post('/verify-email/:token', verifyEmailByToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/resend-verification', resendVerificationCode);



// Get user's own details
// Only needs authentication (verifyToken) to identify the user
router.get('/details', verifyToken, getMyDetails);


router.put('/update-profile', verifyToken, authorizePermission('user:update'), updateProfile);

router.get('/all-users', verifyToken, authorizeAnyPermission('user:read:all'), getAllUsersPublicView);

export default router;