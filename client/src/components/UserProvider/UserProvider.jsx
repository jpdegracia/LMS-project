import React, { useEffect, useState, createContext } from 'react';
import UserContext from '../UserContext/UserContext';


const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState([]); // State for flattened permissions
    const [roleNames, setRoleNames] = useState([]);     // State for role names
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Helper to clear user state
    const unsetUser = () => {
        setUser(null);
        setPermissions([]);
        setRoleNames([]);
        setIsLoggedIn(false);
    };

    // Logout function
    const logout = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });

            if (res.ok) {
                unsetUser();
                return true;
            } else {
                const errorData = await res.json();
                unsetUser();
                setError(errorData.message || 'Logout failed on server.');
                return false;
            }
        } catch (err) {
            console.error('Network error during logout:', err);
            unsetUser();
            setError('Network error during logout.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Function to retrieve user details (used on app load and after login)
    const retrieveUserDetails = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/details`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const errorData = await res.json();
                unsetUser();
                return { success: false, isVerified: false, error: errorData.message || res.statusText };
            }

            const data = await res.json();

            if (data.success && data.user && data.user._id) {
                // Here, we take the roleNames from the API response
                // and add them directly to the user object we set in state.
                setUser({
                    id: data.user._id,
                    email: data.user.email,
                    firstName: data.user.firstName,
                    lastName: data.user.lastName,
                    IDnumber: data.user.IDnumber,
                    isVerified: data.user.isVerified,
                    avatar: data.user.avatar,
                    bio: data.user.bio,
                    roles: data.user.roles || [],
                    // Now, we add the roleNames property from the backend response
                    roleNames: data.user.roleNames || [],
                });
                
                // We also update the separate permissions and roleNames states
                setPermissions(data.permissions || []);
                setRoleNames(data.user.roleNames || []);
                setIsLoggedIn(data.user.isVerified);
                
                return { success: true, isVerified: data.user.isVerified };
            } else {
                unsetUser();
                return { success: false, isVerified: false };
            }
        } catch (err) {
            unsetUser();
            return { success: false, isVerified: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // ... (useEffect for initial retrieveUserDetails, and console.log in render)

    // Login function
    const login = async (email, password) => {
        setLoading(true);
        setError(null);
        setIsLoggedIn(false);

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                const userDetailsResult = await retrieveUserDetails();
                if (userDetailsResult.success) {
                    return userDetailsResult.isVerified;
                } else {
                    setError(userDetailsResult.error || "Failed to retrieve user details after successful login.");
                    unsetUser();
                    return false;
                }
            } else {
                const errorMessage = data.message || `Login failed with status ${res.status}. Please check your credentials.`;
                setError(errorMessage);
                unsetUser();
                return false;
            }
        } catch (err) {
            console.error('Network error during login:', err);
            const errorMessage = 'Failed to connect to the server or an unexpected error occurred during login.';
            setError(errorMessage);
            unsetUser();
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Helper function to check if user has a specific role
    const hasRole = (roleName) => {
        // Corrected check to use the new user.roleNames property
        return isLoggedIn && user?.isVerified && user?.roleNames?.includes(roleName) || false;
    };

    // Helper function to check if user has a specific permission
    const hasPermission = (permissionName) => {
        return isLoggedIn && user?.isVerified && Array.isArray(permissions) && permissions.includes(permissionName) || false;
    };

    // Effect to run once on component mount to check initial authentication status
    useEffect(() => {
        retrieveUserDetails();
    }, []); // Empty dependency array means this runs only once on mount

    return (
        <UserContext.Provider
            value={{
                user,
                permissions, // Expose permissions array
                roleNames,  // Expose roleNames array
                isLoggedIn,
                loading,
                error,
                login,
                logout,
                unsetUser,
                hasPermission,
                hasRole,
                retrieveUserDetails,
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

export default UserProvider;