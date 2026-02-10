import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext';


const CreateRolePage = () => {
    const { hasPermission } = useContext(UserContext);
    const navigate = useNavigate();

    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState([]); // Stores permission _ids for submission

    // State to store dynamically fetched grouped permissions (by category)
    // Format: { category1: [{_id, name, description}, ...], category2: [...] }
    const [groupedAvailablePermissions, setGroupedAvailablePermissions] = useState({});

    // State to map permission names to their IDs for easy lookup during submission
    const [permissionNameToIdMap, setPermissionNameToIdMap] = useState(new Map());

    // State for accordion: tracks which permission group is open
    const [openPermissionGroup, setOpenPermissionGroup] = useState(null);

    const [loading, setLoading] = useState(true); // Initial loading for fetching permissions
    const [error, setError] = useState(null); // Error for initial fetch
    const [isSubmitting, setIsSubmitting] = useState(false); // Loading for form submission
    const [submitError, setSubmitError] = useState(null); // Error for form submission
    const [submitSuccess, setSubmitSuccess] = useState(false); // Success for form submission


    // Effect to check user permissions and fetch all available permissions from the backend
    useEffect(() => {
        const fetchAndSetPermissions = async () => {
            // Permission check: User must have role:create (to create a role) to access this page
            if (!hasPermission('role:create')) {
                setError("You don't have permission to create roles.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setSubmitError(null); // Clear previous submission errors on fetch
            setSubmitSuccess(false); // Clear previous submission success on fetch

            try {
                // Fetch all global permissions (types) from your backend endpoint
                // Backend endpoint is /admin/permissions
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions`, {
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to fetch available permissions. Status: ${response.status}`);
                }

                const data = await response.json();

                if (!data.success || !Array.isArray(data.permissions)) {
                    throw new Error(data.message || 'Failed to fetch permissions: Invalid response structure. Expected "permissions" array.');
                }

                const permissionsArray = data.permissions; // This is an array of permission objects: [{_id, name, description, category}]

                // --- Group permissions by category and build name-to-ID map ---
                const grouped = {};
                const nameIdMap = new Map();
                permissionsArray.forEach(perm => {
                    const category = perm.category || 'Uncategorized'; // Default category if not set
                    if (!grouped[category]) {
                        grouped[category] = [];
                    }
                    grouped[category].push(perm); // Store the full permission object
                    nameIdMap.set(perm.name, perm._id); // Map name to ID
                });

                setGroupedAvailablePermissions(grouped);
                setPermissionNameToIdMap(nameIdMap);

            } catch (err) {
                console.error("Error fetching all available permissions:", err);
                setError(err.message || 'Network error fetching available permissions.');
            } finally {
                setLoading(false);
            }
        };

        fetchAndSetPermissions();
    }, [hasPermission]); // Re-fetch if permission context changes


    // Handler for updating the role name input field
    const handleNameChange = (e) => {
        setRoleName(e.target.value);
        setSubmitError(null); // Clear error on input change
    };

    // Handler for toggling the selection of a permission
    const handlePermissionToggle = (permissionObj) => { // Now receives the full permission object
        setSelectedPermissions(prevPermissions => {
            const isSelected = prevPermissions.includes(permissionObj._id); // Check by ID
            if (isSelected) {
                return prevPermissions.filter(id => id !== permissionObj._id);
            } else {
                return [...prevPermissions, permissionObj._id];
            }
        });
    };

    // Handler for toggling a permission group accordion
    const togglePermissionGroup = (groupName) => {
        setOpenPermissionGroup(prevGroup => (prevGroup === groupName ? null : groupName));
    };

    // Handler for selecting/deselecting all permissions in a group
    const handleToggleGroup = (groupName, permissionsInGroup) => { // permissionsInGroup are now objects
        const currentGroupPermissionIds = selectedPermissions.filter(id =>
            permissionsInGroup.some(p => p._id === id)
        );

        if (currentGroupPermissionIds.length === permissionsInGroup.length) {
            // All permissions in this group are already selected, so deselect all
            setSelectedPermissions(prev => prev.filter(id => !permissionsInGroup.some(p => p._id === id)));
        } else {
            // Select all permissions in this group
            const newPermissionIds = permissionsInGroup.map(p => p._id);
            setSelectedPermissions(prev => [...new Set([...prev, ...newPermissionIds])]);
        }
    };


    // Handler for form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!hasPermission('role:create')) {
            setSubmitError("You don't have permission to create roles.");
            return;
        }

        if (!roleName.trim()) {
            setSubmitError('Role name cannot be empty.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        try {
            // --- IMPORTANT: Convert selected permission IDs to string format if backend expects that ---
            // Your backend expects an array of ObjectIDs. selectedPermissions already holds ObjectIDs.
            // If your backend expected strings (e.g., permission names), you'd use permissionNameToIdMap.
            // But since it expects IDs, selectedPermissions is good directly.
            const permissionsToSubmit = selectedPermissions; // This array should hold the _id strings.


            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: roleName.trim().toLowerCase(), // Ensure consistency with backend
                    permissions: permissionsToSubmit, // Send the array of selected permission IDs
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                // More specific error handling based on backend messages
                if (response.status === 409 && data.message.includes("already exists")) {
                    setSubmitError(`Role with name '${roleName.trim()}' already exists.`);
                } else if (data.message.includes("permissions") && data.message.includes("not found")) {
                    setSubmitError("One or more selected permissions are invalid or do not exist.");
                } else {
                    setSubmitError(data.message || 'Failed to create role.');
                }
                return; // Exit if there was an error
            }

            setSubmitSuccess(true);
            setRoleName(''); // Clear form fields
            setSelectedPermissions([]); // Clear selected permissions

            setTimeout(() => {
                setSubmitSuccess(false);
                navigate('/roles'); // Redirect to role list after success
            }, 2000); // 2-second delay

        } catch (err) {
            console.error('Error creating role:', err);
            setSubmitError('An unexpected network error occurred during role creation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Conditional rendering based on initial fetch status
    if (loading) return <div className="p-6 text-center text-lg text-gray-700">Loading available permissions...</div>;
    if (error) return <div className="p-6 text-red-500 text-center text-lg">Error: {error}</div>;

    // Get sorted group names for rendering
    const groupNames = Object.keys(groupedAvailablePermissions).sort();

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold mb-6 font-primary uppercase text-gray-800">Create New Role</h1>
            <p className="text-gray-600 font-secondary mb-4">Define a new system role and assign its permissions.</p>

            {submitError && ( // Display submission error
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{submitError}</span>
                </div>
            )}
            {submitSuccess && ( // Display submission success message
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">Role created successfully!</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Role Name Input Field */}
                <div className="mb-6">
                    <label htmlFor="roleName" className="block font-secondary text-gray-700 text-sm font-bold mb-2">
                        Role Name:
                    </label>
                    <input
                        type="text"
                        id="roleName"
                        name="roleName"
                        className="shadow appearance-none bg-gray-100 border rounded w-1/2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={roleName}
                        onChange={handleNameChange}
                        placeholder="e.g., Editor, Manager, Support"
                        required
                        disabled={isSubmitting} // Disable input during submission
                    />
                </div>

                {/* Permissions Selection Grid with Groups and Accordions */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold font-secondary mb-3 text-gray-800">Assign Permissions:</h2>
                    {groupNames.length === 0 ? (
                        <p className="text-gray-500 font-secondary">No permission groups available. Please configure permissions in the backend.</p>
                    ) : (
                        <div className="space-y-4"> {/* Space between groups */}
                            {groupNames.map(groupName => (
                                <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        type="button" // Important to prevent form submission
                                        onClick={() => togglePermissionGroup(groupName)}
                                        className="flex justify-between items-center w-full p-4 bg-gray-50 hover:bg-gray-100 focus:outline-none font-secondary text-gray-800"
                                    >
                                        <span>{groupName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span> {/* Format group name */}
                                        <svg
                                            className={`w-5 h-5 transition-transform ${openPermissionGroup === groupName ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </button>

                                    {/* Select All/Deselect All button for the group */}
                                    {openPermissionGroup === groupName && (
                                        <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                                            <button
                                                type="button" // Prevent form submission
                                                onClick={() => handleToggleGroup(groupName, groupedAvailablePermissions[groupName])}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none"
                                            >
                                                {/* Check if all permissions in this group are currently selected */}
                                                {selectedPermissions.filter(id => groupedAvailablePermissions[groupName].some(p => p._id === id)).length === groupedAvailablePermissions[groupName].length && groupedAvailablePermissions[groupName].length > 0
                                                    ? 'Deselect All' : 'Select All'}
                                            </button>
                                        </div>
                                    )}

                                    <div
                                        className={`
                                            transition-all duration-300 ease-in-out overflow-hidden
                                            ${openPermissionGroup === groupName ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                                        `}
                                    >
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white">
                                            {groupedAvailablePermissions[groupName]
                                                .slice() // Create copy to sort
                                                .sort((a, b) => a.name.localeCompare(b.name)) // Sort permissions alphabetically by name
                                                .map(permission => ( // 'permission' is the full permission object { _id, name, description, ... }
                                                    <label key={permission._id} className="flex items-center space-x-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="form-checkbox h-5 w-5 text-blue-600"
                                                            checked={selectedPermissions.includes(permission._id)} // Check by permission._id
                                                            onChange={() => handlePermissionToggle(permission)} // Pass the full permission object
                                                            disabled={isSubmitting}
                                                        />
                                                        <span className="text-gray-800 text-sm">{permission.name}</span> {/* Display permission name */}
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons: Cancel and Create Role */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => navigate('/roles')}
                        disabled={isSubmitting}
                        className="btn-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-create"
                    >
                        {isSubmitting ? 'Creating Role...' : 'Create Role'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateRolePage;