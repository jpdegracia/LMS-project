import jwt from "jsonwebtoken";

export function generateTokenAndSetCookies(res, userId, userRoleNames, effectivePermissionsArray) {

    const token = jwt.sign({
        userId,
        roles: userRoleNames, 
        permissions: effectivePermissionsArray, 
    }, process.env.JWT_SECRET, {
        expiresIn: "7d", 
    });

    res.cookie("token", token, { 
        httpOnly: true,
        secure: true,         // Always true in production
        sameSite: "None",     // Enable cross-origin cookie
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return token;
};
