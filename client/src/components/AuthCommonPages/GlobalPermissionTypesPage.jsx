import React, { useState, useEffect, useContext } from 'react';
import { FaEdit, FaTrashAlt, FaPlusCircle, FaSave, FaTimesCircle, FaSearch } from 'react-icons/fa';
import { IoMdArrowDropdown, IoMdArrowDropup } from 'react-icons/io';
import UserContext from '../UserContext/UserContext';

const GlobalPermissionTypesPage = () => {
    const { hasPermission, loading: contextLoading } = useContext(UserContext);

    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [newPermission, setNewPermission] = useState({ name: '', description: '', category: '' });
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createErrors, setCreateErrors] = useState({});

    const [editingPermissionId, setEditingPermissionId] = useState(null);
    const [editedPermission, setEditedPermission] = useState({ name: '', description: '', category: '' });
    const [editErrors, setEditErrors] = useState({});

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [permissionToDelete, setPermissionToDelete] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    // --- Fetch All Permissions ---
    const fetchPermissions = async () => {
        if (contextLoading) return;

        if (!hasPermission('permission:read:all')) {
            setError("You don't have permission to view all permissions.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to fetch permissions. Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.permissions)) {
                setPermissions(data.permissions);
            } else {
                throw new Error(data.message || 'Failed to fetch permissions: Invalid response structure. Expected "permissions" array.');
            }
        } catch (err) {
            console.error('Error fetching permissions:', err);
            setError(err.response?.data?.message || err.message || 'Network error fetching permissions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!contextLoading) {
            fetchPermissions();
        }
    }, [contextLoading, hasPermission]);

    // --- Helper for clearing messages (already in place) ---
    useEffect(() => {
        if (successMessage || error) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
                setError(null);
            }, 5000); // Messages clear after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [successMessage, error]);

    // --- Create Permission Handlers ---
    const handleNewPermissionChange = (e) => {
        setNewPermission({ ...newPermission, [e.target.name]: e.target.value });
        setCreateErrors({});
    };

    const handleCreatePermission = async (e) => {
        e.preventDefault();
        setCreateErrors({});
        setError(null);
        setSuccessMessage(null);

        if (!newPermission.name.trim()) {
            setCreateErrors({ name: 'Permission name is required.' });
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newPermission),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 409 && errorData.message.includes("already exists")) {
                    setCreateErrors({ name: errorData.message });
                } else {
                    setCreateErrors({ general: errorData.message || `Failed to create permission with status: ${response.status}` });
                }
                return;
            }

            const data = await response.json();
            if (data.success) {
                setSuccessMessage(data.message);
                setNewPermission({ name: '', description: '', category: '' });
                setShowCreateForm(false);
                // Delay fetchPermissions to allow message to show
                setTimeout(() => fetchPermissions(), 1000); // 1-second delay
            } else {
                setCreateErrors({ general: data.message || 'Failed to create permission.' });
            }
        } catch (err) {
            console.error('Error creating permission:', err);
            setCreateErrors({ general: err.response?.data?.message || err.message || 'Network error creating permission.' });
        }
    };

    // --- Edit Permission Handlers ---
    const startEditing = (permission) => {
        setEditingPermissionId(permission._id);
        setEditedPermission({ name: permission.name, description: permission.description, category: permission.category });
        setEditErrors({});
    };

    const handleEditedPermissionChange = (e) => {
        setEditedPermission({ ...editedPermission, [e.target.name]: e.target.value });
        setEditErrors({});
    };

    const saveEditedPermission = async (e) => {
        e.preventDefault();
        setEditErrors({});
        setError(null);
        setSuccessMessage(null);

        if (!editedPermission.name.trim()) {
            setEditErrors({ name: 'Permission name cannot be empty.' });
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions/${editingPermissionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(editedPermission),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 409 && errorData.message.includes("already exists")) {
                    setEditErrors({ name: errorData.message });
                } else {
                    setEditErrors({ general: errorData.message || `Failed to update permission with status: ${response.status}` });
                }
                return;
            }

            const data = await response.json();
            if (data.success) {
                setSuccessMessage(data.message);
                setEditingPermissionId(null);
                // Delay fetchPermissions to allow message to show
                setTimeout(() => fetchPermissions(), 1000); // 1-second delay
            } else {
                setEditErrors({ general: data.message || 'Failed to update permission.' });
            }
        } catch (err) {
            console.error('Error updating permission:', err);
            setEditErrors({ general: err.response?.data?.message || err.message || 'Network error updating permission.' });
        }
    };

    const cancelEditing = () => {
        setEditingPermissionId(null);
        setEditErrors({});
    };

    // --- Delete Permission Handlers ---
    const confirmDelete = (permission) => {
        setPermissionToDelete(permission);
        setShowDeleteConfirm(true);
        setError(null);
        setSuccessMessage(null);
    };

    const handleDeletePermission = async () => {
        setShowDeleteConfirm(false);
        if (!permissionToDelete || !permissionToDelete._id) {
            console.warn("handleDeletePermission: No valid permissionToDelete._id found.");
            setError("Cannot delete: Missing permission ID.");
            return;
        }

        const deleteUrl = `${import.meta.env.VITE_BACKEND_URL}/permissions/${permissionToDelete._id}`;

        // Keep loading true *only* during the API call, not throughout the message display
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 400 && errorData.message.includes("assigned to")) {
                    setError(errorData.message);
                } else {
                    setError(errorData.message || `Failed to delete permission with status: ${response.status}`);
                }
                setLoading(false); // End loading on error immediately
                return;
            }

            const data = await response.json();
            if (data.success) {
                setSuccessMessage(data.message || `Permission "${permissionToDelete.name}" successfully deleted.`);
                // Delay setting loading to false and fetching permissions
                // This allows the success message to be visible for a moment
                setTimeout(() => {
                    setLoading(false); // End loading after delay
                    fetchPermissions(); // Re-fetch permissions to update the list
                }, 1000); // Show message for 1 second before re-fetching
            } else {
                setError(data.message || 'Failed to delete permission.');
                setLoading(false); // End loading on error immediately
            }
        } catch (err) {
            console.error('Error deleting permission:', err);
            setError(err.response?.data?.message || err.message || 'Network error deleting permission.');
            setLoading(false); // End loading on network error immediately
        } finally {
            setPermissionToDelete(null); // Clear permission to delete regardless of outcome
        }
    };

    // --- Filter permissions based on search term ---
    const filteredPermissions = permissions.filter(perm =>
        perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (perm.description && perm.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (perm.category && perm.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- Sorting Logic ---
    const sortedPermissions = [...filteredPermissions].sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';

        if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) {
            return null;
        }
        if (sortConfig.direction === 'ascending') {
            return <IoMdArrowDropup className="ml-1 text-gray-500" />;
        }
        return <IoMdArrowDropdown className="ml-1 text-gray-500" />;
    };

    return (
        <div className="container-2 mx-auto p-6 bg-sky-100">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-primary uppercase text-gray-800">Global Permission Types</h1>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search permissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                    </div>
                </div>
            </div>

            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Success!</strong>
                    <span className="block sm:inline"> {successMessage}</span>
                </div>
            )}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            )}

            {/* Create New Permission Section */}
            {hasPermission('permission:create') && (
                <div className="mb-6">
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="btn-a rounded-lg flex items-center cursor-pointer"
                    >
                        <FaPlusCircle className="mr-2" /> {showCreateForm ? 'Hide Form' : 'Create New Permission'}
                    </button>

                    {showCreateForm && (
                        <form onSubmit={handleCreatePermission} className="mt-4 p-4 border rounded-lg bg-gray-50">
                            <h3 className="text-xl font-semibold mb-3">Add New Permission</h3>
                            {createErrors.general && <p className="text-red-500 text-sm mb-2">{createErrors.general}</p>}
                            <div className="mb-3">
                                <label htmlFor="newName" className="block text-sm font-medium text-gray-700">Name (e.g., user:create):</label>
                                <input
                                    type="text"
                                    id="newName"
                                    name="name"
                                    value={newPermission.name}
                                    onChange={handleNewPermissionChange}
                                    className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${createErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="e.g., user:create"
                                    required
                                />
                                {createErrors.name && <p className="text-red-500 text-xs italic">{createErrors.name}</p>}
                            </div>
                            <div className="mb-3">
                                <label htmlFor="newDescription" className="block text-sm font-medium text-gray-700">Description (Optional):</label>
                                <input
                                    type="text"
                                    id="newDescription"
                                    name="description"
                                    value={newPermission.description}
                                    onChange={handleNewPermissionChange}
                                    className="mt-1 block w-full border rounded-md shadow-sm p-2 border-gray-300"
                                    placeholder="e.g., Allows creation of new user accounts"
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700">Category (Optional):</label>
                                <input
                                    type="text"
                                    id="newCategory"
                                    name="category"
                                    value={newPermission.category}
                                    onChange={handleNewPermissionChange}
                                    className="mt-1 block w-full border rounded-md shadow-sm p-2 border-gray-300"
                                    placeholder="e.g., user_management"
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn-create rounded-lg flex items-center"
                            >
                                <FaSave className="mr-2" /> Add Permission
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Permissions Table */}
            {loading ? (
                <div className="text-center text-gray-600">Loading permissions...</div>
            ) : sortedPermissions.length === 0 && searchTerm === '' ? (
                <div className="text-center text-gray-600">No permissions found.</div>
            ) : sortedPermissions.length === 0 && searchTerm !== '' ? (
                <div className="text-center text-gray-600">No permissions found matching "{searchTerm}".</div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {/* Sortable Name Header */}
                                <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => requestSort('name')}
                                >
                                    <div className="flex items-center">
                                        Name {getSortIndicator('name')}
                                    </div>
                                </th>
                                {/* Sortable Description Header - Updated to ensure truncation */}
                                <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-full max-w-sm"
                                    onClick={() => requestSort('description')}
                                >
                                    <div className="flex items-center">
                                        Description {getSortIndicator('description')}
                                    </div>
                                </th>
                                {/* Sortable Category Header */}
                                <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => requestSort('category')}
                                >
                                    <div className="flex items-center">
                                        Category {getSortIndicator('category')}
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedPermissions.map((permission) => (
                                <tr key={permission._id}>
                                    {editingPermissionId === permission._id ? (
                                        // Edit row
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={editedPermission.name}
                                                    onChange={handleEditedPermissionChange}
                                                    className={`form w-full text-sm ${editErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                                                />
                                                {editErrors.name && <p className="text-red-500 text-xs italic">{editErrors.name}</p>}
                                            </td>
                                            <td className="px-6 py-4 max-w-sm">
                                                <input
                                                    type="text"
                                                    name="description"
                                                    value={editedPermission.description}
                                                    onChange={handleEditedPermissionChange}
                                                    className="form w-full text-sm border-gray-300"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    name="category"
                                                    value={editedPermission.category}
                                                    onChange={handleEditedPermissionChange}
                                                    className="form w-full text-sm border-gray-300"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                                <button
                                                    onClick={saveEditedPermission}
                                                    className="text-green-600 hover:text-green-900 mr-6 text-[18px]"
                                                    title="Save"
                                                >
                                                    <FaSave />
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    className="text-red-600 hover:text-red-900 text-[18px]"
                                                    title="Cancel"
                                                >
                                                    <FaTimesCircle />
                                                </button>
                                                {editErrors.general && <p className="text-red-500 text-xs italic">{editErrors.general}</p>}
                                            </td>
                                        </>
                                    ) : (
                                        // Display row - Description cell updated
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold font-secondary text-blue-600">{permission.name}</div>
                                            </td>
                                            
                                            {/* 👇 UPDATED DESCRIPTION CELL FOR 2-LINE TRUNCATION 👇 */}
                                            <td className="px-6 py-4 max-w-sm overflow-hidden">
                                                <div 
                                                    className="text-sm font-secondary text-gray-900 line-clamp-2"
                                                    title={permission.description}
                                                >
                                                    {permission.description || 'N/A'}
                                                </div>
                                            </td>
                                            {/* 👆 END UPDATED DESCRIPTION CELL 👆 */}

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-secondary text-gray-900">{permission.category}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                                {hasPermission('permission:update') && (
                                                    <button
                                                        onClick={() => startEditing(permission)}
                                                        className="text-indigo-600 hover:text-indigo-900 mr-6 text-[18px]"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                                {hasPermission('permission:delete') && (
                                                    <button
                                                        onClick={() => confirmDelete(permission)}
                                                        className="text-red-600 hover:text-red-900 text-[18px]"
                                                        title="Delete"
                                                    >
                                                        <FaTrashAlt />
                                                    </button>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl text-center">
                        <h3 className="text-xl font-semibold mb-4">Confirm Deletion</h3>
                        <p className="mb-6">Are you sure you want to delete the permission: <strong>{permissionToDelete?.name}</strong>?</p>
                        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setPermissionToDelete(null); setError(null); }}
                                className="btn-cancel rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeletePermission}
                                className="btn-delete rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalPermissionTypesPage;