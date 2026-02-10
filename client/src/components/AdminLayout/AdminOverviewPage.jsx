import React, { useContext } from 'react';
import { Link } from 'react-router-dom';


// You might also want to import icons for the quick links
import { FaUsers, FaUserShield, FaCog, FaChartBar } from 'react-icons/fa'; // Example icons
import UserContext from '../UserContext/UserContext';
import { FaFileCirclePlus } from 'react-icons/fa6';

const AdminOverviewPage = () => {
    // Access user data and permission/role helpers from context
    const { user, hasPermission, hasRole, permissions } = useContext(UserContext);



    return (
        <div className="admin-overview-page p-6 bg-white rounded-lg shadow-md min-h-[calc(100vh-160px)]"> {/* Adjust min-height as needed */}
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
                Admin Dashboard Overview
            </h1>
            <p className="text-gray-600 mb-8">
                Welcome, {user?.firstName || 'Admin'}! This is your central hub for managing the application.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Always visible quick summary */}
                <div className="p-4 border rounded-lg bg-blue-50">
                    <h2 className="text-xl font-semibold mb-2">System Status</h2>
                    <p>Users: <span className="font-bold">...</span></p> {/* Replace with actual data later */}
                    <p>Roles: <span className="font-bold">...</span></p>
                    <p>Permissions: <span className="font-bold">...</span></p>
                    <p>Last Activity: <span className="font-bold">...</span></p>
                </div>

                {/* Conditional Quick Links / Widgets based on Permissions */}

                {/* User Management */}
                {hasPermission('user:read:all') && (
                    <Link to="/user-management" className="block p-4 border rounded-lg bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
                        <FaUsers className="text-4xl text-green-700 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">User Management</h2>
                        <p className="text-gray-700">View, create, edit, and delete user accounts.</p>
                    </Link>
                )}

                {/* Role Management */}
                {hasPermission('role:read:all') && (
                    <Link to="/roles" className="block p-4 border rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer">
                        <FaUserShield className="text-4xl text-purple-700 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Role Management</h2>
                        <p className="text-gray-700">Define and manage user roles and their permissions.</p>
                    </Link>
                )}

                {/* Permission Types Management */}
                {hasPermission('permission:read:all') && (
                    <Link to="/permissions" className="block p-4 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer">
                        <FaCog className="text-4xl text-yellow-700 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Permission Types</h2>
                        <p className="text-gray-700">Manage the global list of permission types.</p>
                    </Link>
                )}

                {/* Grade Management */}
                {hasPermission('grade:assignments') && (
                    <Link to="/grades" className="block p-4 border rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors cursor-pointer">
                        <FaChartBar className="text-4xl text-teal-700 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Grade Management</h2>
                        <p className="text-gray-700">Oversee and update student grades.</p>
                    </Link>
                )}

                {/* Create Course/Module */}
                {hasPermission('course:read:all') && (
                    <Link to="/courses-list" className="block p-4 border rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer">
                        <FaFileCirclePlus className="text-4xl text-orange-700 mb-3" /> {/* From Fa6 */}
                        <h2 className="text-xl font-semibold mb-2">Course Management</h2>
                        <p className="text-gray-700">Manage Courses in building a new learning module.</p>
                    </Link>
                )}

                {/* Add more conditional widgets/links as needed */}
            </div>
        </div>
    );
};

export default AdminOverviewPage;