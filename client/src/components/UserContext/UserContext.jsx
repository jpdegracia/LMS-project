import { createContext } from 'react';

// Define the shape of the context's value, mirroring what UserProvider makes available
const UserContext = createContext({
    // user will hold basic info + populated roles (including their permissions)
    user: null, 
    // permissions will hold the flattened array of ALL effective permission names (e.g., ['user:create', 'role:update'])
    permissions: [], 
    // roleNames will hold the array of role names (e.g., ['admin', 'teacher'])
    roleNames: [],
    loading: true, // Indicates if user data is currently being loaded
    error: null, // Stores any error messages
    login: () => Promise.resolve(false), // Function to handle user login
    logout: () => Promise.resolve(false), // Function to handle user logout
    hasPermission: () => false, // Helper function to check specific permissions
    hasRole: () => false, // Helper function to check specific roles
    retrieveUserDetails: () => Promise.resolve(false), // Function to refresh user details
    isLoggedIn: false, // Indicates if the user is logged in and verified
    unsetUser: () => {}, // Function to clear user state manually
});

export default UserContext;