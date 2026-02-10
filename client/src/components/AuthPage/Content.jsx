import React, { useContext } from 'react'; // Import useContext
import { Routes, Route, Navigate } from 'react-router-dom'; // Import Navigate
import Subnavbar from '../Navbar/Subnavbar';
import Home from '../AuthPage/Home';
import Profile from '../AuthPage/Profile';
import Courses from '../Courses/Courses';
import LogoutPage from '../Auth/Logout';
import Exam from './Exam'; // Assuming this is an admin/teacher specific page
import Module from './Module'; // Assuming this is an admin/teacher specific page
import MyLearning from './MyLearning';
import PracticeExamPage from './Practice-exam';
import ResetPassword from '../Auth/ResetPassword';

// Import UserContext and ProtectedRoute
import UserContext from '../UserContext/UserContext';

// Re-define ProtectedRoute here or ensure it's imported if in a separate file
// For this example, I'll assume it's defined within this file for clarity.
// In a real app, export it from `utils/ProtectedRoute.js` and import it here.
const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
    const { user, loading, hasRole, hasPermission } = useContext(UserContext);

    if (loading) {
        return <div>Loading content...</div>; // Or a spinner specific to content loading
    }

    // This component is only rendered if isLoggedIn is true in App.js,
    // but we can add a redundant check here for robustness or if Content is used differently.
    if (!user.isLoggedIn) {
        return <Navigate to="/login" replace />; // Should not happen if App.js is set up correctly
    }

    // Check role if specified
    if (allowedRoles && allowedRoles.length > 0) {
        const userHasAllowedRole = allowedRoles.some(role => hasRole(role));
        if (!userHasAllowedRole) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // Check permission if specified
    if (requiredPermission) {
        if (!hasPermission(requiredPermission)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
};


const Content = ({ isSidebarOpen, setIsSidebarOpen, onLogout }) => { // onLogout is passed from App.js
    // No need to deconstruct user/hasRole here if only using ProtectedRoute
    return (
        <div
            className={`flex-1 overflow-y-auto transition-all duration-300 ${
                isSidebarOpen ? 'ml-64' : 'ml-0'
            }`}
        >
            <Subnavbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} onLogout={onLogout} />
            <div className="p-4">
                <Routes>
                    {/* Public routes for logged-in users (anyone logged in can access) */}
                    <Route path="/home" element={<Home />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/my-learning" element={<MyLearning />} />
                    <Route path="/practice-exam" element={<PracticeExamPage />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                    <Route path="/logout" element={<LogoutPage />} /> {/* This should ideally trigger the logout handler */}

                    {/* Protected Routes by Role */}
                    {/* Admin/Teacher routes for creating modules and exams */}
                    <Route
                        path="/create-module"
                        element={
                            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                                <Module />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/create-exam"
                        element={
                            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                                <Exam />
                            </ProtectedRoute>
                        }
                    />
                    {/* Example of an admin-only route for user management */}
                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                {/* Replace with your UserManagementComponent */}
                                <div>Admin User Management Page</div>
                            </ProtectedRoute>
                        }
                    />
                     {/* Example of a route requiring a specific permission */}
                    <Route
                        path="/manage-grades"
                        element={
                            <ProtectedRoute requiredPermission="manage_grades">
                                {/* Replace with your GradeManagementComponent */}
                                <div>Grade Management Page</div>
                            </ProtectedRoute>
                        }
                    />


                    {/* Fallback for any unknown routes within the authenticated section */}
                    <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
            </div>
        </div>
    );
};

export default Content;