const permissionGroups = {
    manage_users: [
        'user:read',
        'user:create',
        'user:update',
        'user:delete',
        'user:changeRole',
    ],
    manage_roles: [
        'role:create',
        'role:read',
        'role:updatePermission',
        'role:delete',
    ],
    // Add more groups as needed
};

const rolePermissions = {
    admin: ['manage_users', 'manage_roles', 'admin:settings', 'server:manage', 'grade_assignments'],
    student: ['view_courses', 'submit_assignments'],
    teacher: ['create_courses', 'grade_assignments', 'view_students'],
    editor: ['user:read']
};

export { permissionGroups, rolePermissions };
