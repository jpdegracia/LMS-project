import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext';


const EditRolePage = () => {
    const { hasPermission } = useContext(UserContext);
    const navigate = useNavigate();
    const { id: roleId } = useParams(); // Get the role ID from the URL parameters

    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState([]); // Stores permission _ids for submission

    // State to store dynamically fetched grouped permissions (by category)
    // Format: { category1: [{_id, name, description, category}, ...], category2: [...] }
    const [groupedAvailablePermissions, setGroupedAvailablePermissions] = useState({});

    // State to map permission names to their IDs (useful if you ever switch to names for submission)
    const [permissionNameToIdMap, setPermissionNameToIdMap] = useState(new Map()); // Added Map

    const [openPermissionGroup, setOpenPermissionGroup] = useState(null); // Accordion state

    const [loading, setLoading] = useState(true); // Initial loading for fetching role and permissions
    const [error, setError] = useState(null); // Error for initial fetch
    const [isSubmitting, setIsSubmitting] = useState(false); // Loading for form submission
    const [submitError, setSubmitError] = useState(null); // Error for form submission
    const [submitSuccess, setSubmitSuccess] = useState(false); // Success for form submission


    // Effect to fetch role data and all available permissions on component mount
    useEffect(() => {
        const fetchRoleAndPermissions = async () => {
            // Check user permission to update roles
            if (!hasPermission('role:update')) { // CORRECTED PERMISSION: 'role:update'
                const noPermissionError = "You don't have permission to edit roles.";
                setError(noPermissionError);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setSubmitError(null); // Clear submission errors on new fetch
            setSubmitSuccess(false); // Clear submission success on new fetch

            try {
                // --- 1. Fetch all available permissions (for checkboxes) ---
                // Corrected endpoint to /admin/permissions
                const permissionsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions`, { 
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                
                if (!permissionsResponse.ok) {
                    const errorData = await permissionsResponse.json();
                    throw new Error(errorData.message || `Failed to fetch available permissions. Status: ${permissionsResponse.status}`);
                }
                // Parse response here correctly
                const permissionsData = await permissionsResponse.json(); 

                if (!permissionsData.success || !Array.isArray(permissionsData.permissions)) {
                    throw new Error(permissionsData.message || 'Failed to fetch permissions: Invalid response structure. Expected "permissions" array.');
                }

                // Group permissions by category and build name-to-ID map
                const grouped = {};
                const nameIdMap = new Map();
                permissionsData.permissions.forEach(perm => {
                    const category = perm.category || 'Uncategorized';
                    if (!grouped[category]) {
                        grouped[category] = [];
                    }
                    grouped[category].push(perm); // Store the full permission object
                    nameIdMap.set(perm.name, perm._id);
                });
                setGroupedAvailablePermissions(grouped);
                setPermissionNameToIdMap(nameIdMap);


                // --- 2. Fetch the specific role's current data ---
                // Correct endpoint: /admin/roles/:id
                const roleResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/${roleId}`, { 
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                if (!roleResponse.ok) {
                    const errorData = await roleResponse.json();
                    throw new Error(errorData.message || `Failed to fetch role data. Status: ${roleResponse.status}`);
                }
                // Parse response here correctly
                const roleData = await roleResponse.json();

                // Backend returns { success: true, role: { ... } } for single role
                if (!roleData.success || !roleData.role) { // CORRECTED: Check data.success and data.role
                    throw new Error(roleData.message || 'Failed to fetch role data: Invalid response structure. Expected "role" object.');
                }

                // Set form fields with fetched role data
                setRoleName(roleData.role.name); // CORRECTED: Access role directly from data.role
                // Initialize selectedPermissions with _id's of currently assigned permissions
                // CORRECTED: Map populated permissions (objects) to just their _id strings
                setSelectedPermissions(roleData.role.permissions.map(p => p._id) || []); 

            } catch (err) {
                console.error("Error fetching role or permissions:", err);
                setError(err.message || 'Network error fetching data for role editing.');
            } finally {
                setLoading(false);
            }
        };

        fetchRoleAndPermissions();
    }, [roleId, hasPermission]); // Re-run if roleId or user permissions change


    // --- Effect to clear success/error messages after a delay ---
    useEffect(() => {
        if (submitSuccess || submitError) {
            const timer = setTimeout(() => {
                setSubmitSuccess(false);
                setSubmitError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [submitSuccess, submitError]);


    // Handler for updating the role name input field
    const handleNameChange = (e) => {
        setRoleName(e.target.value);
        setSubmitError(null); // Clear error on input change
    };

    // Handler for toggling the selection of a permission
    // Receives the full permission object from the map function
    const handlePermissionToggle = (permissionObj) => {
        setSelectedPermissions(prevPermissions => {
            const isSelected = prevPermissions.includes(permissionObj._id); // Check by permission ID
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
    // permissionsInGroup is an array of full permission objects
    const handleToggleGroup = (groupName, permissionsInGroup) => {
        const newPermissionIdsInGroup = permissionsInGroup.map(p => p._id); // Get IDs from objects
        const currentGroupSelectedCount = selectedPermissions.filter(id =>
            newPermissionIdsInGroup.includes(id)
        ).length;

        if (currentGroupSelectedCount === newPermissionIdsInGroup.length && newPermissionIdsInGroup.length > 0) {
            // All permissions in this group are currently selected, so deselect all
            setSelectedPermissions(prev => prev.filter(id => !newPermissionIdsInGroup.includes(id)));
        } else {
            // Select all permissions in this group
            setSelectedPermissions(prev => [...new Set([...prev, ...newPermissionIdsInGroup])]);
        }
    };


    // Handler for form submission (updating the role)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!hasPermission('role:update')) { // Correct permission name
            setSubmitError("You don't have permission to update roles.");
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
            // Send the updated role name and the array of selected permission IDs
            const payload = {
                name: roleName.trim().toLowerCase(), // Ensure consistency with backend
                permissions: selectedPermissions, // selectedPermissions should already hold the _id strings.
            };


            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/${roleId}`, {
                method: 'PUT', // Use PUT method for full update
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            // Check for both HTTP success (response.ok) and backend's status flag (data.success)
            if (!response.ok || !data.success) { // Note: Backend returns data.success, not data.status
                // More specific error handling based on backend messages
                if (response.status === 409 && data.message.includes("already exists")) {
                    setSubmitError(`Role with name '${roleName.trim()}' already exists.`);
                } else if (data.message.includes("permissions") && data.message.includes("not found")) {
                    setSubmitError("One or more selected permissions are invalid or do not exist.");
                } else {
                    setSubmitError(data.message || `Failed to update role. Status: ${response.status}`);
                }
                return; 
            }

            setSubmitSuccess(true);
            
            setTimeout(() => {
                setSubmitSuccess(false);
                navigate('/roles'); 
            }, 2000);

        } catch (err) {
            console.error('Error updating role:', err);
            setSubmitError(err.message || 'An unexpected network error occurred during role update.');
        } finally {
            setIsSubmitting(false);
        }
    };
    // Conditional rendering for initial loading and error states
    if (loading) return <div className="p-6 text-center text-lg text-gray-700">Loading role data and permissions...</div>;
    // Display error if initial fetch failed (e.g., permission error or role not found)
    if (error) return <div className="p-6 text-red-500 text-center text-lg">Error: {error}</div>;

    // Get sorted group names for rendering (only if groupedAvailablePermissions is populated)
    const groupNames = Object.keys(groupedAvailablePermissions).sort();

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold mb-6 font-primary uppercase text-gray-800">Edit Role: {roleName}</h1>
            <p className="text-gray-600 font-secondary mb-4">Modify the role's name and its assigned permissions.</p>

            {submitError && ( // Display submission error
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline font-secondary">{submitError}</span>
                </div>
            )}
            {submitSuccess && ( // Display submission success message
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline font-secondary">Role updated successfully!</span>
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
                        className="shadow appearance-none border bg-gray-100 rounded w-1/2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={roleName}
                        onChange={handleNameChange}
                        placeholder="e.g., Editor, Manager, Support"
                        required
                        disabled={isSubmitting} // Disable input during submission
                    />
                </div>

                {/* Permissions Selection Grid with Groups and Accordions */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-3 font-secondary text-gray-800">Assign Permissions:</h2>
                    {groupNames.length === 0 ? (
                        <p className="text-gray-500 font-secondary">No permission groups available. Please configure permissions in the backend.</p>
                    ) : (
                        <div className="space-y-4">
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
                                                .slice()
                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                .map(permission => (
                                                    <label key={permission._id} className="flex items-center space-x-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="form-checkbox h-5 w-5 text-blue-600"
                                                            checked={selectedPermissions.includes(permission._id)}
                                                            onChange={() => handlePermissionToggle(permission)}
                                                            disabled={isSubmitting}
                                                        />
                                                        <span className="text-gray-800 text-sm">{permission.name}</span>
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons: Cancel and Update Role */}
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
                        {isSubmitting ? 'Updating Role...' : 'Update Role'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditRolePage;