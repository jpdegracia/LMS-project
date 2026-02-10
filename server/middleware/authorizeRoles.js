const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User authentication missing or Role not Found'});
        } 
        if (!roles.includes(req.user.role.name)) {
            // Correctly access the name property of the role object
            return res.status(403).json({ 
                success: false, 
                message: `Forbidden: You do not have the required role to access this resource. Your role is ${req.user.role.name}.` 
            });
        }
        next();
    }
}

export default authorizeRoles;