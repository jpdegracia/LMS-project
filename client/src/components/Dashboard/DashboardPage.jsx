import React, { useContext } from 'react';
import UserContext from '../UserContext/UserContext';


const DashboardPage = () => {
    // Access user data and permission/role helpers from context
    const { user, permissions, roleNames, hasRole, hasPermission } = useContext(UserContext);

    // You can customize the welcome message based on the user's role
    const getWelcomeMessage = () => {
        if (hasRole('admin')) {
            return `Welcome, Admin ${user?.firstName}! Here's your general overview.`;
        }
        if (hasRole('teacher')) {
            return `Welcome, Teacher ${user?.firstName}! Let's check your classes.`;
        }
        if (hasRole('student')) {
            return `Welcome, Student ${user?.firstName}! See your upcoming assignments.`;
        }
        return `Welcome, ${user?.firstName || 'User'}! This is your personalized dashboard.`;
    };

    return (
        <div className="dashboard-page p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{getWelcomeMessage()}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Always visible component for any logged-in user */}
                <div className="p-4 border rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold mb-2">My Profile Summary</h2>
                    <p>Email: {user?.email}</p>
                    <p>Role(s): {roleNames.join(', ') || 'N/A'}</p>
                    <p>Account Status: {user?.isVerified ? 'Verified' : 'Unverified'}</p>
                </div>

                {/* Conditional component based on a specific permission */}
                {hasPermission('view:courses') && (
                    <div className="p-4 border rounded-lg bg-blue-50">
                        <h2 className="text-xl font-semibold mb-2">My Courses</h2>
                        <p>You have access to view courses. Go to the Courses section!</p>
                        {/* In a real app, this would fetch and display actual course data */}
                    </div>
                )}

                {/* Conditional component visible only to Teachers */}
                {hasRole('teacher') && (
                    <div className="p-4 border rounded-lg bg-green-50">
                        <h2 className="text-xl font-semibold mb-2">Gradebook Access</h2>
                        <p>As a teacher, you can manage grades for your students.</p>
                        {/* Link to Grade Management page */}
                    </div>
                )}

                {/* Conditional component visible only to Students */}
                {hasRole('student') && (
                    <div className="p-4 border rounded-lg bg-yellow-50">
                        <h2 className="text-xl font-semibold mb-2">Upcoming Assignments</h2>
                        <p>As a student, here are your next deadlines.</p>
                        {/* List of assignments */}
                    </div>
                )}

                {/* Conditional component visible only to Admins */}
                {hasRole('admin') && (
                    <div className="p-4 border rounded-lg bg-red-50">
                        <h2 className="text-xl font-semibold mb-2">Admin Quick Links</h2>
                        <p>Quick access to user and role management.</p>
                        {/* Links to admin management pages */}
                    </div>
                )}

                {/* More granular permission-based widgets */}
                {hasPermission('create:courses') && (
                    <div className="p-4 border rounded-lg bg-purple-50">
                        <h2 className="text-xl font-semibold mb-2">New Course Creator</h2>
                        <p>Start building your next course module.</p>
                        {/* Button to create a new course */}
                    </div>
                )}
            </div>
            
            {/* You can add more complex logic here */}
            {user?.isVerified === false && (
                <div className="mt-6 p-4 border border-yellow-400 rounded-lg bg-yellow-50 text-yellow-800">
                    <p className="font-semibold">Account Not Verified!</p>
                    <p>Please check your email to verify your account and unlock full features.</p>
                    {/* Add a button to resend verification email if needed */}
                </div>
            )}
        </div>
    );
};

export default DashboardPage;