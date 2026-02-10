import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';


/**
 * ProtectedRoute Component
 *
 * This component acts as a wrapper around routes that require authentication and/or specific roles/permissions.
 * It checks the user's status from UserContext and redirects them if they don't meet the requirements.
 *
 * @param {object} props - The component props.
 * @param {string[]} [props.allowedRoles] - An optional array of role names (e.g., ['admin', 'teacher']).
 * @param {string} [props.requiredPermission] - An optional single permission string (e.g., 'user:read').
 * @param {React.ElementType} [props.element] - The actual component to render if authorized (for leaf routes).
 * If 'element' is provided, ProtectedRoute will render it. Otherwise, it will render <Outlet /> for nested routes.
 */
// Added 'element: Component' to destructuring, allowing it to be renamed for JSX use
const ProtectedRoutes = ({ allowedRoles, requiredPermission, element: Component }) => {
    const { user, loading, isLoggedIn, hasRole, hasPermission } = useContext(UserContext);

    // 1. Show a loading indicator while the authentication status is being determined.
    if (loading) {
        return <div>Loading authentication...</div>;
    }

    // 2. If the user is not logged in, redirect them to the login page.
    if (!user || !isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    // 3. Check for role-based authorization if 'allowedRoles' are specified.
    if (allowedRoles && allowedRoles.length > 0) {
        const userHasAllowedRole = allowedRoles.some(role => hasRole(role));
        if (!userHasAllowedRole) {
            console.warn(`ProtectedRoute: Access Denied. User lacks allowed role. User roles: [${user.roles?.map(r => r.name).join(', ')}], Allowed roles: [${allowedRoles.join(', ')}]`);
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // 4. Check for permission-based authorization if 'requiredPermission' is specified.
    if (requiredPermission) {
        if (!hasPermission(requiredPermission)) {
            console.warn(`ProtectedRoute: Access Denied. User lacks required permission: "${requiredPermission}". User permissions: [${user.permissions ? user.permissions.join(', ') : 'N/A'}]`);
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // 5. If all checks pass:
    //    If a specific 'Component' was passed via the 'element' prop, render that Component.
    //    Otherwise, render <Outlet /> for nested routes.
    return Component ? <Component /> : <Outlet />;
};

export default ProtectedRoutes;