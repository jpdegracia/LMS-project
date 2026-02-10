/** 
 * @param {string | string[]} requiredPermissions - A single permission string (e.g., 'user:delete')
 * @returns {function} An Express middleware function.
 */

const authorizePermissions = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions || !Array.isArray(req.user.permissions)) {
            return res.status(403).json({ success: false, message: 'Access Denied: User permissions not found or invalid on request.' });
        }

        const userPermissions = req.user.permissions;
        const permissionsToCheck = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

        const hasPermission = permissionsToCheck.some(permission =>
            userPermissions.includes(permission)
        );

        if (hasPermission) {
            next(); 
        } else {
            // Log for debugging (optional, can be removed in production):
             console.warn(`Access Denied for user ${req.user.email} (ID: ${req.user._id}).
             Required permissions: [${permissionsToCheck.join(', ')}], User permissions: [${userPermissions.join(', ')}]`);
            return res.status(403).json({
                success: false,
                message: 'Access Denied: You do not have the necessary permissions for this action.'
            });
        }
        
    };
};

export default authorizePermissions;