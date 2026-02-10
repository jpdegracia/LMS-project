import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
import PermissionPage from './RolePermissions';

const RoleManagementPage = () => {
    const { hasPermission } = useContext(UserContext);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [actionError, setActionError] = useState(null);
    const navigate = useNavigate();

    const [openAccordionId, setOpenAccordionId] = useState(null);

    const toggleAccordion = (roleId) => {
        setOpenAccordionId(prevId => (prevId === roleId ? null : roleId));
    };

    const fetchRoles = async () => {
        try {
            if (!hasPermission('role:read')) {
                setError("You don't have permission to view roles.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setActionError(null);

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/admin/roles`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            const contentType = response.headers.get('content-type');
            let data = null;

            if (contentType?.includes('application/json')) {
                data = await response.json();
            }

            if (!response.ok) {
                const msg = data?.message || `Failed to fetch roles. Status: ${response.status}`;
                throw new Error(msg);
            }

            if (data?.status !== 'success' || !data?.data?.roles || !Array.isArray(data.data.roles)) {
                const msg = data?.message || 'Failed to fetch roles: Invalid response structure. Expected status: "success" and data.roles array.';
                throw new Error(msg);
            }

            setRoles(data.data.roles);
        } catch (err) {
            console.error('RoleManagementPage: Fetch roles error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, [hasPermission]);

    const handleDeleteRole = async (roleId, roleName) => {
        if (!hasPermission('role:delete')) {
            setActionError("You don't have permission to delete roles.");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete the role "${roleName}"?`)) return;

        setActionLoading(roleId);
        setActionError(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/admin/roles/${roleId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            const contentType = response.headers.get("content-type");
            let data = null;

            if (contentType?.includes("application/json")) {
                data = await response.json();
            }

            if (!response.ok) {
                const msg = data?.message || `Failed to delete role. Status: ${response.status}`;
                throw new Error(msg);
            }

            if (data?.status !== 'success') {
                throw new Error(data?.message || 'Failed to delete role: Backend reported failure.');
            }

            setRoles(prev => prev.filter(r => r._id !== roleId));
            if (openAccordionId === roleId) {
                setOpenAccordionId(null);
            }
        } catch (err) {
            console.error('RoleManagementPage: Delete role error:', err);
            setActionError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="p-6 text-center">Loading roles...</div>;
    if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-primary font-bold uppercase mb-6 text-gray-800">Role Management</h1>
            <p className="text-gray-600 font-secondary mb-4">Manage system roles and their permissions.</p>

            {actionError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{actionError}</span>
                </div>
            )}

            <div className="flex gap-4 mb-4"> {/* Added a flex container for buttons */}
                {hasPermission('role:create') && (
                    <button
                        onClick={() => navigate('/admin/roles/create')}
                        className="btn-a cursor-pointer"
                    >
                        Add New Role
                    </button>
                )}
                {/* Button to navigate to the separate All Permissions page */}
                <button
                    onClick={() => navigate('/admin/roles/all-permissions')}
                    className="btn-b"
                >
                    View All Permissions Definitions
                </button>
            </div>

            {roles.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Role Name</th>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Permissions</th>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {roles.map(role => (
                                <tr key={role._id} className="hover:bg-gray-50">
                                    <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-gray-900">{role.name}</td>
                                    {/* --- Accordion Permissions Cell --- */}
                                    <td className="py-4 px-6 text-sm text-gray-900">
                                        {role.permissions && role.permissions.length > 0 ? (
                                            <div>
                                                <button
                                                    onClick={() => toggleAccordion(role._id)}
                                                    className="flex items-center text-blue-600 hover:text-blue-800 focus:outline-none"
                                                >
                                                    {openAccordionId === role._id ? 'Hide Permissions' : 'View Permissions'}
                                                    <svg
                                                        className={`w-4 h-4 ml-2 transition-transform transform ${
                                                            openAccordionId === role._id ? 'rotate-180' : ''
                                                        }`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                                    </svg>
                                                </button>
                                                <div
                                                    className={`
                                                        mt-2 p-2 bg-gray-100 rounded-md shadow-inner text-xs text-gray-700
                                                        transition-all duration-[500ms] ease-in-out overflow-hidden
                                                        ${openAccordionId === role._id ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}
                                                    `}
                                                >
                                                    <ul className="list-disc list-inside">
                                                        {/* --- MODIFICATION HERE: Sort permissions before mapping --- */}
                                                        {role.permissions
                                                            .slice() // Create a shallow copy to avoid mutating the original array in state
                                                            .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
                                                            .map((perm, index) => (
                                                                <li key={index} className="py-0.5">{perm}</li>
                                                            ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 italic">No specific permissions</span>
                                        )}
                                    </td>
                                    {/* --- End Accordion Permissions Cell --- */}
                                    <td className="py-4 px-6 whitespace-nowrap text-sm font-medium">
                                        {hasPermission('role:updatePermission') && (
                                            <button
                                                onClick={() => navigate(`/admin/roles/edit/${role._id}`)}
                                                className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50 cursor-pointer"
                                                disabled={actionLoading === role._id}
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {hasPermission('role:delete') && (
                                            <button
                                                onClick={() => handleDeleteRole(role._id, role.name)}
                                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                                disabled={actionLoading === role._id}
                                            >
                                                {actionLoading === role._id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="mt-4 text-gray-600 p-4 bg-white rounded-lg shadow-sm">No roles found.</p>
            )}
        </div>
    );
};

export default RoleManagementPage;