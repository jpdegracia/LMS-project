import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext';


const UpdateUserRolePage = () => { // Renamed from UpdateRolePage for clarity matching file name
    const { userId } = useParams(); // Get user ID from URL
    const navigate = useNavigate();
    const { hasPermission, loading: contextLoading } = useContext(UserContext); // Access hasPermission and contextLoading

    const [selectedRole, setSelectedRole] = useState(''); // Stores the ID of the selected new role
    const [user, setUser] = useState(null); // Stores the user data being edited
    const [loading, setLoading] = useState(true); // Initial loading for initial data fetches (user + roles)
    const [submitting, setSubmitting] = useState(false); // Loading for form submission
    const [error, setError] = useState(null); // General error message state
    const [successMessage, setSuccessMessage] = useState(null); // Success message state
    const [submitError, setSubmitError] = useState(null);

    const [roles, setRoles] = useState([]); // Stores all available roles

    // --- Effect to fetch all available roles and the specific user's data ---
    useEffect(() => {
        const fetchRequiredData = async () => {
            // Only attempt to fetch if the context loading is done
            if (contextLoading) return;

            // Permission check: User must have user:assign:roles to perform this action
            if (!hasPermission('user:assign:roles')) { // Correct permission name
                const noPermissionError = "You don't have permission to change user roles.";
                setError(noPermissionError);
                setLoading(false); // Stop loading if no permission
                return;
            }

            setLoading(true); // Start loading for this component's data
            setError(null); // Clear previous errors
            setSuccessMessage(null); // Clear success messages on new fetch

            try {
                // Fetch all available roles using native fetch
                const rolesResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Important for sending httpOnly cookies
                });

                // --- DEBUG LOGS FOR ROLES FETCH ---


                if (!rolesResponse.ok) {
                    let errorDetails = `Failed to fetch available roles. Status: ${rolesResponse.status}`;
                    try { errorDetails = (await rolesResponse.json())?.message || errorDetails; } catch { /* json parse failed */ }
                    throw new Error(errorDetails);
                }
                const rolesData = await rolesResponse.json();

                if (rolesData.success && Array.isArray(rolesData.roles)) {
                    setRoles(rolesData.roles);
                } else {
                    throw new Error(rolesData.message || "Invalid roles data format received from server.");
                }


                // Fetch specific user data
                const userResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${userId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });


                if (!userResponse.ok) {
                    let errorDetails = `Failed to fetch user data. Status: ${userResponse.status}`;
                    try { errorDetails = (await userResponse.json())?.message || errorDetails; } catch { /* json parse failed */ }
                    throw new Error(errorDetails);
                }
                const userData = await userResponse.json();

                if (userData.success && userData.user) {
                    setUser(userData.user);
                    // Set initial selected role. If user has multiple, pick the first one, or leave blank
                    if (userData.user.roles && userData.user.roles.length > 0) {
                        setSelectedRole(userData.user.roles[0]._id); // Select the ID of the first role
                    } else {
                        setSelectedRole(''); // No role assigned initially
                    }
                } else {
                    throw new Error(userData.message || 'User not found.');
                }

            } catch (err) {
                console.error('UpdateUserRolePage fetch error:', err);
                setError(err.message || 'Network error fetching data for user role update.');
            } finally {
                setLoading(false); // End loading regardless of success or error
            }
        };

        if (!contextLoading) { // Only fetch if context has finished loading
            fetchRequiredData();
        }
    }, [userId, hasPermission, contextLoading]); // Depend on userId, hasPermission, and contextLoading


    // --- Effect to clear success/error messages after a delay ---
    useEffect(() => {
        if (successMessage || error) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, error]);


    const handleRoleChange = (e) => {
        setSelectedRole(e.target.value);
        setError(null); // Clear error when role changes
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!hasPermission('user:assign:roles')) { // Correct permission name
            setSubmitError("You don't have permission to change user roles.");
            return;
        }

        // Validate that a role has been selected
        if (!selectedRole) {
            setSubmitError("Please select a role.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        setSuccessMessage(null);

        try {
            // Corrected payload: Backend expects roleIds as an array of ObjectIDs
            const payload = { roleIds: [selectedRole] }; // Sending the ID of the selected role

            // Corrected backend endpoint for updating user's roles using native fetch
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${userId}/roles`, {
                method: 'PUT', // Use PUT method for update
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorDetails = `Failed to update user role. Status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetails = errorData.message || errorDetails;
                } catch { /* json parse failed */ }
                throw new Error(errorDetails);
            }

            const data = await response.json();
            if (data.success) {
                setSuccessMessage('User role updated successfully!');
                setTimeout(() => {
                    navigate('/user-management'); // Redirect after success
                }, 2000);
            } else {
                throw new Error(data.message || 'Failed to update user role.');
            }
        } catch (err) {
            console.error('Update user role error:', err);
            setSubmitError(err.message || 'An unexpected network error occurred during role update.');
        } finally {
            setSubmitting(false);
        }
    };


    if (loading) return <div className="p-6 text-center text-lg text-gray-700">Loading data...</div>;
    // Display error if initial fetch failed (e.g., permission error or role not found)
    if (error && error.includes("permission")) return <div className="p-6 text-red-500 text-center text-lg">{error}</div>;
    // Display other general errors if present
    if (error) return <div className="p-6 text-red-500 text-center text-lg">Error: {error}</div>;
    // Check if user data is available (this should be true if not in loading/error state)
    if (!user) return <div className="p-6 text-red-500 text-center text-lg">User not found.</div>;
    // Check if roles are available to populate the dropdown
    if (roles.length === 0) return <div className="p-6 text-gray-500 text-center text-lg">No roles available to assign.</div>;


    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Change User Role</h1>
            <p className="text-gray-600 mb-4">
                Change the role for user: <span className="font-semibold">{user.firstName} {user.lastName} ({user.email})</span>
            </p>

            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{successMessage}</span>
                </div>
            )}

            {submitError && ( // Display general error message
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{submitError}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto">
                {/* Current Role Display */}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Current Role(s):</label>
                    <p className="text-gray-900">{user.roles?.map(role => role.name).join(', ') || 'N/A'}</p>
                </div>

                {/* Select New Role */}
                <div className="mb-6">
                    <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2 ">Select New Role:</label>
                    <select
                        id="role"
                        name="role"
                        value={selectedRole}
                        onChange={handleRoleChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                    >
                        <option value="">Select a role</option>
                        {roles.map(role => (
                            <option key={role._id} value={role._id}>{role.name}</option>
                        ))}
                    </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/user-management')}
                        className="btn-cancel"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-create"
                        disabled={submitting}
                    >
                        {submitting ? 'Updating Role...' : 'Update Role'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UpdateUserRolePage;