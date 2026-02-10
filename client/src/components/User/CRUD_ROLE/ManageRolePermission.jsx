import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext';

// Import icons for UI
import { AiOutlineCaretDown, AiOutlineCaretUp } from "react-icons/ai";
import { IoMdArrowRoundBack } from 'react-icons/io';
// FaSave, FaTimesCircle are for form buttons, not directly used here but good to have
// FaPlusCircle, FaEdit, FaTrashAlt for other CRUD pages

const ManageRolePermissionPage = () => { // Renamed from PermissionPage
    const { roleId } = useParams(); // Get the role ID from the URL
    const navigate = useNavigate();
    const { hasPermission, loading: contextLoading } = useContext(UserContext); // Access hasPermission and contextLoading

    const [role, setRole] = useState(null); // Stores the current role's data
    const [selectedPermissions, setSelectedPermissions] = useState([]); // Stores permission _ids currently assigned/selected for THIS role

    // State to store dynamically fetched grouped permissions (by category)
    // Format: { category1: [{_id, name, description, category}, ...], category2: [...] }
    const [groupedAvailablePermissions, setGroupedAvailablePermissions] = useState({});

    // State for accordion: tracks which permission group is open
    const [openPermissionGroup, setOpenPermissionGroup] = useState(null);

    const [loading, setLoading] = useState(true); // Initial loading for fetches
    const [error, setError] = useState(null); // Error for initial fetches
    const [isSubmitting, setIsSubmitting] = useState(false); // Loading for save/toggle actions
    const [submitError, setSubmitError] = useState(null); // Error for save/toggle actions
    const [submitSuccess, setSubmitSuccess] = useState(null); // Success for save/toggle actions


    // --- Effect to fetch role data and all available permissions ---
    useEffect(() => {
        const fetchRoleAndPermissions = async () => {
            if (contextLoading) return; // Wait for context to finish loading

            // Permission check: User must have role:update to manage permissions for a role
            if (!hasPermission('role:update')) { // Correct permission name
                const noPermissionError = "You don't have permission to manage role permissions.";
                setError(noPermissionError);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setSubmitError(null);
            setSubmitSuccess(null);

            try {
                // --- 1. Fetch all available global permissions (types) ---
                const permissionsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                if (!permissionsResponse.ok) {
                    const errorData = await permissionsResponse.json();
                    throw new Error(errorData.message || `Failed to fetch available permissions. Status: ${permissionsResponse.status}`);
                }
                const permissionsData = await permissionsResponse.json();

                if (!permissionsData.success || !Array.isArray(permissionsData.permissions)) {
                    throw new Error(permissionsData.message || 'Failed to fetch permissions: Invalid response structure. Expected "permissions" array.');
                }
                
                // Group permissions by category for display
                const grouped = {};
                permissionsData.permissions.forEach(perm => {
                    const category = perm.category || 'Uncategorized'; // Default category if not set
                    if (!grouped[category]) {
                        grouped[category] = [];
                    }
                    grouped[category].push(perm); // Store the full permission object
                });
                setGroupedAvailablePermissions(grouped);


                // --- 2. Fetch the specific role's current data (and its assigned permissions) ---
                const roleResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/${roleId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                if (!roleResponse.ok) {
                    const errorData = await roleResponse.json();
                    throw new Error(errorData.message || `Failed to fetch role data. Status: ${roleResponse.status}`);
                }
                const roleData = await roleResponse.json();

                if (!roleData.success || !roleData.role) {
                    throw new Error(roleData.message || 'Failed to fetch role data: Invalid response structure. Expected "role" object.');
                }

                setRole(roleData.role); // Set the full role object
                // Initialize selectedPermissions with _id's of currently assigned permissions
                // The backend provides populated permissions (objects), so map them to _id strings
                setSelectedPermissions(roleData.role.permissions.map(p => p._id) || []); 

            } catch (err) {
                console.error("Error fetching role and permissions for management:", err);
                setError(err.message || 'Network error fetching data for role permission management.');
            } finally {
                setLoading(false);
            }
        };

        if (!contextLoading) { // Only fetch if context has finished loading
            fetchRoleAndPermissions();
        }
    }, [roleId, hasPermission, contextLoading]); // Re-run if roleId, hasPermission, or contextLoading changes

    // --- Effect to clear success/error messages after a delay ---
    useEffect(() => {
        if (submitSuccess || submitError) {
            const timer = setTimeout(() => {
                setSubmitSuccess(null);
                setSubmitError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [submitSuccess, submitError]);


    // Handler for toggling a permission group accordion
    const togglePermissionGroup = (groupName) => {
        setOpenPermissionGroup(prevGroup => (prevGroup === groupName ? null : groupName));
    };

    // --- Handler for toggling the selection of a single permission ---
    // This will send an API call to add/remove the permission from the role
    const handlePermissionToggle = async (permissionObj, isCurrentlySelected) => {
        setIsSubmitting(true); // Indicate submission for this action
        setSubmitError(null);
        setSubmitSuccess(null);

        if (!hasPermission('role:update')) { // Double-check permission before API call
            setSubmitError("You don't have permission to update roles.");
            setIsSubmitting(false);
            return;
        }

        const method = isCurrentlySelected ? 'DELETE' : 'POST';
        const url = isCurrentlySelected
            ? `${import.meta.env.VITE_BACKEND_URL}/roles/${roleId}/permissions/${permissionObj._id}` // DELETE URL
            : `${import.meta.env.VITE_BACKEND_URL}/roles/${roleId}/permissions`; // POST URL
        const body = isCurrentlySelected ? null : JSON.stringify({ permissionId: permissionObj._id }); // Body for POST

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: body,
            });

            if (!response.ok) {
                const errorData = await response.json(); // Backend sends JSON even for errors
                throw new Error(errorData.message || `Failed to ${isCurrentlySelected ? 'remove' : 'add'} permission. Status: ${response.status}`);
            }

            const data = await response.json(); // Expected: { success: true, message: "...", role: {...} }

            if (data.success && data.role) { // Backend should return updated role object
                setSubmitSuccess(`Permission '${permissionObj.name}' ${isCurrentlySelected ? 'removed' : 'added'} successfully.`);
                // Update local state with the backend's confirmed permissions (IDs)
                setSelectedPermissions(data.role.permissions.map(p => p._id)); 
            } else {
                throw new Error(data.message || `Failed to ${isCurrentlySelected ? 'remove' : 'add'} permission: Backend reported failure.`);
            }

        } catch (err) {
            console.error(`Error toggling permission ${permissionObj.name}:`, err);
            setSubmitError(err.response?.data?.message || err.message || `Network error toggling permission '${permissionObj.name}'.`);
        } finally {
            setIsSubmitting(false); // End submission
        }
    };


    // Handler for selecting/deselecting all permissions in a group
    const handleToggleGroup = async (groupName, permissionsInGroup) => {
        setIsSubmitting(true); // Indicate submission for this batch action
        setSubmitError(null);
        setSubmitSuccess(null);

        if (!hasPermission('role:update')) { // Correct permission name
            setSubmitError("You don't have permission to update roles.");
            setIsSubmitting(false);
            return;
        }

        // --- Calculate the DESIRED FINAL STATE of permissions ---
        let finalSelectedPermissionIds = [...selectedPermissions]; // Start with current selected state

        const newPermissionIdsInGroup = permissionsInGroup.map(p => p._id); // Get IDs of permissions in this specific group
        const currentGroupSelectedCount = finalSelectedPermissionIds.filter(id =>
            newPermissionIdsInGroup.includes(id)
        ).length;

        const isSelectingAll = currentGroupSelectedCount !== newPermissionIdsInGroup.length; // True if we need to select all, False if deselect all

        if (isSelectingAll) {
            // We want to select all in this group: Add all IDs from this group to the set
            finalSelectedPermissionIds = [...new Set([...finalSelectedPermissionIds, ...newPermissionIdsInGroup])];
        } else {
            // We want to deselect all in this group: Remove all IDs from this group from the set
            finalSelectedPermissionIds = finalSelectedPermissionIds.filter(id => !newPermissionIdsInGroup.includes(id));
        }
        // ----------------------------------------------------


        try {
            // --- Send a SINGLE PUT request to update the entire role's permissions ---
            // This leverages your existing updateRole backend endpoint.
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/${roleId}`, {
                method: 'PUT', // Use PUT for full replacement of permissions
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: role.name, // Keep the current role name (UpdateRole backend expects it)
                    permissions: finalSelectedPermissionIds, // Send the calculated final list of permissions
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to update role group. Status: ${response.status}`);
            }

            const data = await response.json(); // Expected: { success: true, message: "...", role: {...} }

            if (data.success && data.role) { // Backend should return the updated role object
                setSubmitSuccess(`Permissions in group "${groupName}" updated successfully.`);
                // Update frontend state with the confirmed permissions from the backend response
                setSelectedPermissions(data.role.permissions.map(p => p._id));
                setRole(data.role); // Important: Update the local role state (includes updated __v)
            } else {
                throw new Error(data.message || `Failed to update permissions in group "${groupName}": Backend reported failure.`);
            }

        } catch (err) {
            console.error('Error toggling group permissions:', err);
            setSubmitError(err.message || `Network error updating permissions in group "${groupName}".`);
        } finally {
            setIsSubmitting(false); // End submission
        }
    };


    // Conditional rendering for initial loading and error states
    if (loading) return <div className="p-6 text-center text-lg text-gray-700">Loading role and permissions data...</div>;
    // Display specific permission error for initial fetch if present
    if (error && error.includes("permission")) return <div className="p-6 text-red-500 text-center text-lg">{error}</div>;
    // Display other general errors from initial fetch
    if (error) return <div className="p-6 text-red-500 text-center text-lg">Error: {error}</div>;
    if (!role) return <div className="p-6 text-red-500 text-center text-lg">Role not found.</div>; // If roleId is invalid or user not found

    // Get sorted group names for rendering the permission accordion
    const groupNames = Object.keys(groupedAvailablePermissions).sort();

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold mb-6 font-primary uppercase text-gray-800">
                Manage Permissions for Role: {role?.name}
            </h1>
            <p className="text-gray-600 font-secondary mb-4">
                Select or deselect permissions for this role. Changes are applied immediately.
            </p>

            {submitError && ( // Display submission error
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline font-secondary">{submitError}</span>
                </div>
            )}
            {submitSuccess && ( // Display submission success message
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline font-secondary">{submitSuccess}</span>
                </div>
            )}

            <div className="mb-6">
                <button
                    type="button"
                    onClick={() => navigate('/roles')}
                    className="btn-b flex gap-2"
                    disabled={isSubmitting} // Disable button during submission
                > 
                <IoMdArrowRoundBack className="arrow" />
                    Back to Role List 
                </button>
            </div>

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
                                        disabled={isSubmitting} // Disable button during submission
                                    >
                                        {/* Check if all permissions in this group are currently selected */}
                                        {selectedPermissions.filter(id => groupedAvailablePermissions[groupName].some(p => p._id === id)).length === groupedAvailablePermissions[groupName].length && groupedAvailablePermissions[groupName].length > 0
                                            ? 'Deselect All in Group' : 'Select All in Group'}
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
                                        .sort((a, b) => a.name.localeCompare(b.name)) // Sort permissions alphabetically by name
                                        .map(permission => ( // 'permission' is the full permission object { _id, name, description, ... }
                                            <label key={permission._id} className="flex items-center space-x-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-5 w-5 text-blue-600"
                                                    checked={selectedPermissions.includes(permission._id)} // Check by permission._id
                                                    onChange={() => handlePermissionToggle(permission, selectedPermissions.includes(permission._id))} // Pass permission object AND its current status
                                                    disabled={isSubmitting} // Disable checkbox during submission
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
    );
};

export default ManageRolePermissionPage;