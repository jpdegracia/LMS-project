import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
// Importing specific icons for clarity:
import { TiUserAdd } from 'react-icons/ti'; // Generic Add User
import { FaUserTie, FaUserGraduate } from 'react-icons/fa'; // FaUserTie for teacher, FaUserGraduate for student


const UserManagementPage = () => {
    const { hasPermission, loading: contextLoading, user: currentUser } = useContext(UserContext); // Destructure 'user' from context

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true); // Loading state for this component's data fetch
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // For delete/update button loading state
    const [actionError, setActionError] = useState(null); // For delete/update action errors
    const [searchTerm, setSearchTerm] = useState('');
    const [activeRoleFilter, setActiveRoleFilter] = useState('all');

    const navigate = useNavigate();

    // States for user role counters
    const [totalUsersCount, setTotalUsersCount] = useState(0);
    const [teacherCount, setTeacherCount] = useState(0);
    const [studentCount, setStudentCount] = useState(0);
    const [adminCount, setAdminCount] = useState(0);

    // Helper to update counts based on a filtered user array
    const updateCounts = (usersArray) => {
        setTotalUsersCount(usersArray.length);
        // Ensure user.roles is an array and check if it includes the role name
        setTeacherCount(usersArray.filter(user => user.roles && user.roles.some(role => role.name === 'teacher')).length);
        setStudentCount(usersArray.filter(user => user.roles && user.roles.some(role => role.name === 'student')).length);
        setAdminCount(usersArray.filter(user => user.roles && user.roles.some(role => role.name === 'admin')).length);
    };

    const fetchUsers = async () => {
        // Only attempt to fetch if the context loading is done
        if (contextLoading) return;

        // Correct permission check for reading all users
        if (!hasPermission('user:read:all')) { // Permission to read ALL users
            setError("You don't have permission to view all users.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Using direct fetch as per your UserProvider setup
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Important for sending httpOnly cookies
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch users.');
            }

            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
                updateCounts(data.users); // Update all counts
            } else {
                throw new Error(data.message || 'Failed to fetch users.');
            }

        } catch (err) {
            console.error('Fetch users error:', err);
            setError(err.response?.data?.message || err.message || 'Network error fetching users.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch users when component mounts or relevant context states change
    useEffect(() => {
        // Only fetch if contextLoading is false (auth state is known)
        // This prevents multiple fetches or fetches before permissions are ready
        if (!contextLoading) {
            fetchUsers();
        }
    }, [contextLoading, hasPermission]); // Depend on contextLoading and hasPermission

    const handleDeleteUser = async (userId, userName, userRoles) => { // Added userRoles parameter
        if (!hasPermission('user:delete')) { // Permission to delete users
            setActionError("You don't have permission to delete users.");
            return;
        }

        // --- NEW: Check if the user is an admin ---
        const isAdmin = userRoles && userRoles.some(role => role.name === 'admin');
        if (isAdmin) {
            setActionError("Admin users cannot be deleted.");
            return;
        }
        // --- END NEW ---

        if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;

        setActionLoading(userId); // Set loading state for the specific user being deleted
        setActionError(null); // Clear previous action-specific errors

        try {
            // Using direct fetch for delete request
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete user.');
            }

            // Update local state by filtering out the deleted user
            setUsers(prev => {
                const updatedUsers = prev.filter(u => u._id !== userId);
                updateCounts(updatedUsers); // Recalculate counts immediately
                return updatedUsers;
            });
            // Optionally, add a success message here if desired
        } catch (err) {
            console.error('Delete user error:', err);
            setActionError(err.response?.data?.message || err.message || 'Failed to delete user.');
        } finally {
            setActionLoading(null); // Clear loading state
        }
    };

    // Filtered users based on both search term and active role filter
    const filteredUsers = users.filter(user => {
        // Ensure user.roles is an array and safely get role names
        // Handles users with multiple roles.
        const userRoleNames = user.roles ? user.roles.map(role => role.name.toLowerCase()) : [];

        const matchesSearchTerm = (
            user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            // Check if any of the user's role names match the search term
            userRoleNames.some(name => name.includes(searchTerm.toLowerCase()))
        );

        const matchesRoleFilter = (
            activeRoleFilter === 'all' ||
            // Check if any of the user's role names match the active filter
            userRoleNames.includes(activeRoleFilter)
        );

        return matchesSearchTerm && matchesRoleFilter;
    });

    const handleRoleCardClick = (role) => {
        setActiveRoleFilter(role);
        setSearchTerm(''); // Clear text search when applying a role filter
    };

    // Determine if the current logged-in user is an admin
    const isCurrentUserAdmin = currentUser && currentUser.roles && currentUser.roles.some(role => role.name === 'admin');

    // Render loading/error states for the component itself
    if (loading) return <div className="p-6 text-center text-lg text-gray-700">Loading users...</div>;
    // Only display specific permission error if no other general error
    if (error && error.includes("permission")) return <div className="p-6 text-red-500 text-center text-lg">{error}</div>;


    return (
        <div className="container-2 mx-auto p-6 bg-sky-100">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 font-primary uppercase">User Management</h1>
            <p className="text-gray-600 mb-4 font-secondary font-medium">Manage all users in the system.</p>

            {/* Role Counters / Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div
                    className={`p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ease-in-out
                                ${activeRoleFilter === 'all' ? 'bg-blue-600 text-white border-2 border-blue-800 scale-105' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                    onClick={() => handleRoleCardClick('all')}
                >
                    <h3 className="text-lg font-primary ">Total Users:</h3>
                    <p className="text-2xl font-bold">{totalUsersCount}</p>
                </div>
                <div
                    className={`p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ease-in-out
                                ${activeRoleFilter === 'admin' ? 'bg-red-600 text-white border-2 border-red-800 scale-105' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                    onClick={() => handleRoleCardClick('admin')}
                >
                    <h3 className="text-lg font-primary">Admins:</h3>
                    <p className="text-2xl font-bold">{adminCount}</p>
                </div>
                <div
                    className={`p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ease-in-out
                                ${activeRoleFilter === 'teacher' ? 'bg-purple-600 text-white border-2 border-purple-800 scale-105' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
                    onClick={() => handleRoleCardClick('teacher')}
                >
                    <h3 className="text-lg font-primary">Teachers:</h3>
                    <p className="text-2xl font-bold">{teacherCount}</p>
                </div>
                <div
                    className={`p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ease-in-out
                                ${activeRoleFilter === 'student' ? 'bg-green-600 text-white border-2 border-green-800 scale-105' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                    onClick={() => handleRoleCardClick('student')}
                >
                    <h3 className="text-lg font-primary">Students:</h3>
                    <p className="text-2xl font-bold">{studentCount}</p>
                </div>
            </div>

            {actionError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{actionError}</span>
                </div>
            )}
            {error && !error.includes("permission") && ( /* Display other errors not related to initial permission check */
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {/* --- User Creation Buttons and Search Bar --- */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex flex-wrap gap-4"> {/* Container for the three "Add User" buttons */}
                    {hasPermission('user:create') && (
                        <>
                            {/* Generic Add New User Button */}
                            <button
                                onClick={() => navigate('/user-management/create/admin')} // Route for generic user creation
                                className="btn-a flex items-center text-white"
                            >
                                <TiUserAdd className='mr-2 text-xl' /> Add New User
                            </button>

                            {/* Add New Teacher Button */}
                            <button
                                onClick={() => navigate('/user-management/create/teacher')} // Route for teacher creation
                                className="btn-a flex items-center bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <FaUserTie className='mr-2 text-xl' /> Add New Teacher
                            </button>

                            {/* Add New Student Button */}
                            <button
                                onClick={() => navigate('/user-management/create/student')} // Route for student creation
                                className="btn-a flex items-center bg-green-600 hover:bg-green-700 text-white"
                            >
                                <FaUserGraduate className='mr-2 text-xl' /> Add New Student
                            </button>
                        </>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search users by name, email, or role..."
                        className="pl-10 pr-4 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-transparent bg-white w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* --- User Table --- */}
            {filteredUsers.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Role</th>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map(u => {
                                // Determine if the current user in the row is an admin
                                const isUserInRowAdmin = u.roles && u.roles.some(role => role.name === 'admin');

                                // Determine if the buttons should be disabled for this row
                                // Buttons are enabled if the current logged-in user is an admin,
                                // OR if the user in the row is NOT an admin AND the current user has the specific permission.
                                const disableButtons = actionLoading === u._id || (!isCurrentUserAdmin && isUserInRowAdmin);

                                return (
                                    <tr key={u._id} className="hover:bg-gray-50">
                                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900">{u.firstName} {u.lastName}</td>
                                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900">
                                            {/* Display all roles a user has, comma separated */}
                                            {u.roles?.map(role => role.name).join(', ') || 'N/A'}
                                        </td>
                                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {u.isVerified ? 'Verified' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 whitespace-nowrap text-sm font-medium flex gap-1">

                                            {hasPermission('user:read') && (
                                                <button
                                                    onClick={() => navigate(`/user-management/view/${u._id}`)}
                                                    className="btn-view capitalize text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50"
                                                    disabled={actionLoading === u._id || (!isCurrentUserAdmin && isUserInRowAdmin)} // Disable if action loading or if not admin and row user is admin
                                                >
                                                    View
                                                </button>
                                            )}
                                            {hasPermission('user:update') && (
                                                <button
                                                    onClick={() => navigate(`/user-management/edit/${u._id}`)}
                                                    className="btn-edit capitalize text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50"
                                                    disabled={actionLoading === u._id || (!isCurrentUserAdmin && isUserInRowAdmin)} // Disable if action loading or if not admin and row user is admin
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            {hasPermission('user:delete') && (
                                                <button
                                                    onClick={() => handleDeleteUser(u._id, `${u.firstName} ${u.lastName}`, u.roles)}
                                                    className={`btn-delete capitalize text-white font-bold py-2 px-4 rounded mr-2 ${isUserInRowAdmin ? 'opacity-50 cursor-not-allowed' : ''}`} // Add opacity for visual feedback
                                                    disabled={actionLoading === u._id || isUserInRowAdmin} // Always disable delete if user is admin, regardless of current user's role
                                                >
                                                    {actionLoading === u._id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            )}
                                            {hasPermission('user:assign:roles') && (
                                                <button
                                                    onClick={() => navigate(`/user-management/change-role/${u._id}`)}
                                                    className="btn-change capitalize text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                                    disabled={actionLoading === u._id || (!isCurrentUserAdmin && isUserInRowAdmin)} // Disable if action loading or if not admin and row user is admin
                                                >
                                                    Change Role
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="mt-4 text-gray-600 p-4 bg-white rounded-lg shadow-sm">
                    {users.length > 0 && searchTerm ? (
                        <>No users found matching "{searchTerm}". <br/><button onClick={() => setSearchTerm('')} className="text-blue-500 hover:underline">Clear text search</button></>
                    ) : activeRoleFilter !== 'all' ? (
                        <>No {activeRoleFilter} users found. <br/><button onClick={() => setActiveRoleFilter('all')} className="text-blue-500 hover:underline">Show all users</button></>
                    ) : (
                        <>No users found. <br/> <button onClick={fetchUsers} className="text-blue-500 hover:underline">Click to retry fetching users.</button></>
                    )}
                </p>
            )}
        </div>
    );
};

export default UserManagementPage;