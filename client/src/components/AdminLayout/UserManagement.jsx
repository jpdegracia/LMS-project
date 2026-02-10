import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';


const UserManagementPage = () => {
    const { hasPermission } = useContext(UserContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // State for text search
    const [activeRoleFilter, setActiveRoleFilter] = useState('all'); // New state for role filter

    const navigate = useNavigate();

    // States for counters
    const [totalUsersCount, setTotalUsersCount] = useState(0);
    const [teacherCount, setTeacherCount] = useState(0);
    const [studentCount, setStudentCount] = useState(0);
    const [adminCount, setAdminCount] = useState(0); // New: Admin count

    const updateCounts = (usersArray) => {
        setTotalUsersCount(usersArray.length);
        setTeacherCount(usersArray.filter(user => user.role?.name === 'teacher').length);
        setStudentCount(usersArray.filter(user => user.role?.name === 'student').length);
        setAdminCount(usersArray.filter(user => user.role?.name === 'admin').length); // Update admin count
    };

    const fetchUsers = async () => {
        try {
            if (!hasPermission('user:read')) {
                setError("You don't have permission to view users.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/admin/users-management/all-users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch users.');
            }

            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
                updateCounts(data.users); // Update all counts here
            } else {
                throw new Error(data.message || 'Failed to fetch users.');
            }

        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [hasPermission]); // Refetch when permissions change

    const handleDeleteUser = async (userId, userName) => {
        if (!hasPermission('user:delete')) {
            setActionError("You don't have permission to delete users.");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;

        setActionLoading(userId);
        setActionError(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/admin/users-management/delete-user/${userId}`, {
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

            setUsers(prev => {
                const updatedUsers = prev.filter(u => u._id !== userId);
                updateCounts(updatedUsers); // Recalculate counts immediately after state update
                return updatedUsers;
            });
            // Optionally, you might want to clear the role filter if the last user of a type was deleted
            // This is handled by `filteredUsers` logic automatically if the filter produces an empty array.

        } catch (err) {
            console.error(err);
            setActionError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    // Filtered users based on both search term and active role filter
    const filteredUsers = users.filter(user => {
        const matchesSearchTerm = (
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const matchesRoleFilter = (
            activeRoleFilter === 'all' ||
            (user.role?.name && user.role.name.toLowerCase() === activeRoleFilter)
        );

        return matchesSearchTerm && matchesRoleFilter;
    });

    const handleRoleCardClick = (role) => {
        setActiveRoleFilter(role);
        setSearchTerm(''); // Clear text search when applying a role filter
    };

    if (loading) return <div className="p-6 text-center text-lg text-gray-700">Loading users...</div>;
    if (error) return <div className="p-6 text-red-500 text-center text-lg">Error: {error}</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 font-primary uppercase">User Management</h1>
            <p className="text-gray-600 mb-4 font-secondary font-medium">Manage all users in the system.</p>

            {/* Role Counters / Filters - Reordered */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Users - Typically first or last */}
                <div
                    className={`p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ease-in-out
                                ${activeRoleFilter === 'all' ? 'bg-blue-600 text-white border-2 border-blue-800 scale-105' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                    onClick={() => handleRoleCardClick('all')}
                >
                    <h3 className="text-lg font-primary ">Total Users:</h3>
                    <p className="text-2xl font-bold">{totalUsersCount}</p>
                </div>
                {/* Admin Role - Now first after Total */}
                <div
                    className={`p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ease-in-out
                                ${activeRoleFilter === 'admin' ? 'bg-red-600 text-white border-2 border-red-800 scale-105' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                    onClick={() => handleRoleCardClick('admin')}
                >
                    <h3 className="text-lg font-primary">Admins:</h3>
                    <p className="text-2xl font-bold">{adminCount}</p>
                </div>
                {/* Teacher Role - After Admin */}
                <div
                    className={`p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ease-in-out
                                ${activeRoleFilter === 'teacher' ? 'bg-purple-600 text-white border-2 border-purple-800 scale-105' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
                    onClick={() => handleRoleCardClick('teacher')}
                >
                    <h3 className="text-lg font-primary">Teachers:</h3>
                    <p className="text-2xl font-bold">{teacherCount}</p>
                </div>
                {/* Student Role - Last */}
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

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                {hasPermission('user:create') && (
                    <button
                        onClick={() => navigate('/admin/user-management/create')}
                        className="btn-a"
                    >
                        Add New User
                    </button>
                )}
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
                            {filteredUsers.map(u => (
                                <tr key={u._id} className="hover:bg-gray-50">
                                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900">{u.firstName} {u.lastName}</td>
                                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900">{u.role?.name || 'N/A'}</td>
                                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {u.isVerified ? 'Verified' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 whitespace-nowrap text-sm font-medium">
                                        {hasPermission('user:update') && (
                                            <button
                                                onClick={() => navigate(`/admin/user-management/edit/${u._id}`)}
                                                className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50"
                                                disabled={actionLoading === u._id}
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {hasPermission('user:delete') && (
                                            <button
                                                onClick={() => handleDeleteUser(u._id, `${u.firstName} ${u.lastName}`)}
                                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50"
                                                disabled={actionLoading === u._id}
                                            >
                                                {actionLoading === u._id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        )}
                                        {hasPermission('user:changeRole') && (
                                            <button
                                                onClick={() => navigate(`/admin/user-management/change-role/${u._id}`)}
                                                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                                disabled={actionLoading === u._id}
                                            >
                                                Change Role
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
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