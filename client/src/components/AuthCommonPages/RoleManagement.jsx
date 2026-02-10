import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';


const RoleManagementPage = () => {
    const { hasPermission, loading: contextLoading } = useContext(UserContext); // Access hasPermission and contextLoading
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true); // Loading state for initial data fetch
    const [error, setError] = useState(null); // General error message state
    const [actionLoading, setActionLoading] = useState(null); // For delete/update button loading state
    const [actionError, setActionError] = useState(null); // For delete/update action errors
    const navigate = useNavigate();

    const [openAccordionId, setOpenAccordionId] = useState(null);

    const toggleAccordion = (roleId) => {
        setOpenAccordionId(prevId => (prevId === roleId ? null : roleId));
    };

    const fetchRoles = async () => {
        if (contextLoading) return;

        if (!hasPermission('role:read:all')) { // Correct permission name
            setError("You don't have permission to view roles.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setActionError(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Unexpected response content type: ${contentType || 'none'}. Expected JSON.`);
            }

            const data = await response.json(); // This line parses JSON

            if (!response.ok || !data.success) { // Check both HTTP status and backend success flag
                const msg = data?.message || `Failed to fetch roles. Status: ${response.status}`;
                throw new Error(msg);
            }

            // --- CORRECTED DATA PARSING FOR ROLES ---
            // Backend returns: { success: true, count: N, roles: [...] }
            if (data.success && Array.isArray(data.roles)) {
                setRoles(data.roles);
            } else {
                // If success is true but 'roles' array is missing/invalid
                throw new Error(data.message || 'Failed to fetch roles: Invalid response structure. Expected a "roles" array.');
            }
            // --- END CORRECTED DATA PARSING ---

        } catch (err) {
            console.error('RoleManagementPage: Fetch roles error:', err);
            setError(err.message || 'Network error fetching roles.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch roles when component mounts or permissions/context loading status changes
    useEffect(() => {
        if (!contextLoading) { // Only fetch if context has finished loading
            fetchRoles();
        }
    }, [contextLoading, hasPermission]); // Depend on contextLoading and hasPermission

    const handleDeleteRole = async (roleId, roleName) => {
        if (!hasPermission('role:delete')) { // Correct permission name
            setActionError("You don't have permission to delete roles.");
            return;
        }

        // Prevent deletion of 'admin' role
        if (roleName.toLowerCase() === 'admin') { // Case-insensitive check
            setActionError("The 'admin' role cannot be deleted.");
            return;
        }

        // IMPORTANT: Do NOT use window.confirm() in Canvas environment.
        // Replace with a custom modal confirmation in a real application.
        if (!window.confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) return;

        setActionLoading(roleId); // Set loading state for the specific role being deleted
        setActionError(null); // Clear previous action-specific errors

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/${roleId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            const contentType = response.headers.get("content-type");
            let data = null;
            if (contentType?.includes("application/json")) {
                data = await response.json();
            }

            if (!response.ok) { // Check HTTP status first
                const msg = data?.message || `Failed to delete role. Status: ${response.status}`;
                throw new Error(msg);
            }

            // Backend returns { success: true, message: "Role deleted successfully." }
            if (data?.success) { // Check backend success flag
                setRoles(prev => prev.filter(r => r._id !== roleId)); // Remove deleted role from state
                if (openAccordionId === roleId) {
                    setOpenAccordionId(null); // Close accordion if deleted
                }
            } else {
                throw new Error(data?.message || 'Failed to delete role: Backend reported failure.');
            }
        } catch (err) {
            console.error('RoleManagementPage: Delete role error:', err);
            setActionError(err.message);
        } finally {
            setActionLoading(null); // Clear loading state
        }
    };

    // Render loading/error states for the component itself
    if (loading) return <div className="p-6 text-center text-lg text-gray-700">Loading roles...</div>;
    // Display specific permission error if present
    if (error && error.includes("permission")) return <div className="p-6 text-red-500 text-center text-lg">{error}</div>;
    // Display other general errors
    if (error) return <div className="p-6 text-red-500 text-center text-lg">Error: {error}</div>;


    return (
        <div className="container-2 mx-auto p-6 bg-sky-100">
            <h1 className="text-3xl font-primary font-bold uppercase mb-6 text-gray-800">Role Management</h1>
            <p className="text-gray-600 font-secondary mb-4">Manage system roles and their permissions.</p>

            {actionError && ( // Display action-specific error (e.g., from delete)
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{actionError}</span>
                </div>
            )}

            <div className="flex gap-4 mb-4">
                {hasPermission('role:create') && ( // Correct permission name
                    <button
                        onClick={() => navigate('/roles/create')}
                        className="btn-a"
                    >
                        Add New Role
                    </button>
                )}
                {/* Button to navigate to the separate All Permissions Definitions page */}
                {hasPermission('permission:read:all') && ( // Correct permission name
                    <button
                        onClick={() => navigate('/permissions')} 
                        className="btn-b"
                    >
                        View All Permissions Definitions
                    </button>
                )}
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
                            {roles.map(role => {
                                const isRoleAdmin = role.name.toLowerCase() === 'admin';
                                // isDisabled for Edit and Delete buttons (true if admin role or action is loading)
                                const isDisabledForRoleActions = isRoleAdmin || actionLoading === role._id;
                                // isDisabled for Manage Permissions button (true only if action is loading)
                                const isDisabledForManagePermissions = actionLoading === role._id;

                                return (
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
                                                        style={{ maxHeight: openAccordionId === role._id ? 'none' : '0' }} // Ensures smooth animation with dynamic height
                                                    >
                                                        <ul className="list-disc list-inside max-h-48 overflow-y-auto pr-2"> {/* Added max-h and overflow-y-auto */}
                                                            {role.permissions
                                                                .slice() // Create a shallow copy to avoid mutating the original array
                                                                .sort((a, b) => a.name.localeCompare(b.name)) // Sort permissions by name
                                                                .map((perm, index) => (
                                                                    <li key={index} className="py-0.5">{perm.name}</li>
                                                                ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 italic">No specific permissions</span>
                                            )}
                                        </td>
                                        {/* --- End Accordion Permissions Cell --- */}
                                        <td className="py-4 px-6 whitespace-nowrap text-sm font-medium flex gap-1">
                                            {/* View Button - Always allow viewing if hasPermission('role:read') */}
                                            {hasPermission('role:read') && (
                                                <button
                                                    onClick={() => navigate(`/roles/view/${role._id}`)}
                                                    className={`btn-view capitalize text-white font-bold py-2 px-4 rounded mr-2 ${actionLoading === role._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={actionLoading === role._id}
                                                >
                                                    View
                                                </button>
                                            )}
                                            {/* Edit Button - Disabled if it's the 'admin' role or action is loading */}
                                            {hasPermission('role:update') && (
                                                <button
                                                    onClick={() => navigate(`/roles/edit/${role._id}`)}
                                                    className={`btn-edit capitalize text-white font-bold py-2 px-4 rounded mr-2 ${isDisabledForRoleActions ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={isDisabledForRoleActions}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            {/* Delete Button - Disabled if it's the 'admin' role or action is loading */}
                                            {hasPermission('role:delete') && (
                                                <button
                                                    onClick={() => handleDeleteRole(role._id, role.name)}
                                                    className={`btn-delete capitalize text-white font-bold py-2 px-4 rounded mr-2 ${isDisabledForRoleActions ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={isDisabledForRoleActions}
                                                >
                                                    {actionLoading === role._id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            )}
                                            {/* {hasPermission('role:update') && ( // Still requires role:update permission
                                                <button
                                                    onClick={() => navigate(`/roles/permissions/${role._id}`)}
                                                    className={`btn-change capitalize text-white font-bold py-2 px-4 rounded ${isDisabledForManagePermissions ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={isDisabledForManagePermissions}
                                                >
                                                    Manage Permissions
                                                </button>
                                            )} */}
                                        </td>
                                    </tr>
                                );
                            })}
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
