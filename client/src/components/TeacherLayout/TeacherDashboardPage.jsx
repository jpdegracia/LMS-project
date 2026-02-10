import React, { useContext } from 'react';
import { Link } from 'react-router-dom';


// Example icons for quick links (install if you haven't: npm install react-icons)
import { FaChalkboardTeacher, FaClipboardCheck, FaUsersCog, FaUserGraduate } from 'react-icons/fa';
import UserContext from '../UserContext/UserContext';
import { PiStudentFill } from 'react-icons/pi';

const TeacherDashboardPage = () => {
    // Access user data and permission/role helpers from context
    const { user, permissions, roleNames, hasRole, hasPermission } = useContext(UserContext);

    return (
        <div className="teacher-dashboard-page p-6 bg-white rounded-lg shadow-md min-h-[calc(100vh-160px)]"> {/* Adjust min-height as needed */}
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
                Teacher Dashboard Overview
            </h1>
            <p className="text-gray-600 mb-8">
                Welcome, {user?.firstName || 'Teacher'}! Here's your central hub for managing your courses and students.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Always visible quick summary */}
                <div className="p-4 border rounded-lg bg-blue-50">
                    <h2 className="text-xl font-semibold mb-2">My Profile & Role</h2>
                    <p>Email: {user?.email}</p>
                    <p>Role(s): {roleNames.join(', ') || 'N/A'}</p>
                    <p>Account Status: {user?.isVerified ? 'Verified' : 'Unverified'}</p>
                    {/* Link to full profile */}
                    <Link to="/profile" className="text-blue-600 hover:underline mt-2 inline-block">View Full Profile</Link>
                </div>

                {/* Conditional Widget: My Courses (requires user:read:all permission) */}
                {hasPermission('user:read:all') && ( // Permission to view students
                    <Link to="/user-management" className="block p-4 border rounded-lg bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
                        <PiStudentFill className="text-4xl text-green-700 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">My Students</h2>
                        <p className="text-gray-700">Access and manage your assigned students.</p>
                        {/* In a real app, this would show actual assigned courses */}
                    </Link>
                )}

                {/* Conditional Widget: Create New Course/Module (requires create:courses permission) */}
                {hasPermission('course:create') && (
                    <Link to="/courses-list" className="block p-4 border rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer">
                        <FaChalkboardTeacher className="text-4xl text-purple-700 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Create New Course</h2>
                        <p className="text-gray-700">Develop new learning modules and curricula.</p>
                    </Link>
                )}

                {/* Conditional Widget: Grade Assignments (requires grade:assignments permission) */}
                {hasPermission('grade:assignments') && (
                    <Link to="/grades" className="block p-4 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer">
                        <FaClipboardCheck className="text-4xl text-yellow-700 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Grade Assignments</h2>
                        <p className="text-gray-700">Review and submit grades for student assignments.</p>
                    </Link>
                )}
                
                
                {/* Message if account is not verified */}
                {user?.isVerified === false && (
                    <div className="md:col-span-full p-4 border border-yellow-400 rounded-lg bg-yellow-50 text-yellow-800">
                        <p className="font-semibold">Account Not Verified!</p>
                        <p>Please check your email to verify your account and unlock full features.</p>
                        {/* Add a button to resend verification email if needed */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherDashboardPage;