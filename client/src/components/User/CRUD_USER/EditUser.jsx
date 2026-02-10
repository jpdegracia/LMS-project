import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext';


const EditUserPage = () => {
    const { userId } = useParams(); // Get user ID from URL
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext); // Access hasPermission

    // State for form data, including IDnumber
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        IDnumber: '', // Added IDnumber to state for display/edit
        isVerified: false,
    });
    const [loading, setLoading] = useState(true); // Loading state for initial data fetch
    const [submitting, setSubmitting] = useState(false); // Loading state for form submission
    const [error, setError] = useState(null); // General error message state
    const [successMessage, setSuccessMessage] = useState(null); // Success message state

    // --- Effect to fetch user data on component mount or userId/permissions change ---
    useEffect(() => {
        const fetchUserData = async () => {
            console.log("fetchUserData: Starting user data fetch for ID:", userId);
            // Permission check: User must have user:read permission to view user details
            if (!hasPermission('user:read')) {
                const noPermissionError = "You don't have permission to view this user's details.";
                console.warn("fetchUserData: Permission denied:", noPermissionError);
                setError(noPermissionError);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null); // Clear previous errors

                // Corrected backend endpoint for fetching a single user by ID
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${userId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });

                console.log("fetchUserData: Response status:", response.status);

                if (!response.ok) {
                    let errorDetails = 'Unknown error fetching user data.';
                    try {
                        const errorData = await response.json();
                        errorDetails = errorData.message || errorDetails;
                    } catch (jsonErr) {
                        console.error("fetchUserData: Error parsing non-OK response as JSON:", jsonErr);
                        errorDetails = `Failed to parse error response. Status: ${response.status}.`;
                    }
                    throw new Error(errorDetails);
                }

                const data = await response.json();
                console.log("fetchUserData: Parsed data:", data);

                if (data.success && data.user) {
                    // Populate form data from fetched user data
                    setFormData({
                        firstName: data.user.firstName || '',
                        lastName: data.user.lastName || '',
                        email: data.user.email || '',
                        IDnumber: data.user.IDnumber || '', // Set IDnumber from fetched data
                        isVerified: data.user.isVerified,
                    });
                    console.log("fetchUserData: User data successfully set to form.");
                } else {
                    console.log("fetchUserData: Backend reported success: false or user not found. Message:", data.message);
                    throw new Error(data.message || 'User not found or backend reported failure.');
                }
            } catch (err) {
                console.error('fetchUserData: Caught error:', err.message);
                setError(err.message);
            } finally {
                setLoading(false);
                console.log("fetchUserData: Finished user data fetch.");
            }
        };

        fetchUserData();
    }, [userId, hasPermission]); // Re-fetch if userId or hasPermission status changes

    // --- Effect to clear success/error messages after a delay ---
    useEffect(() => {
        if (successMessage || error) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
                setError(null);
            }, 5000); // Clear messages after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [successMessage, error]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        // Clear any specific error related to this field when it's edited
        setError(null); // Clear general error on change
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Permission check: User must have user:update permission to submit changes
        if (!hasPermission('user:update')) {
            setError("You don't have permission to update users.");
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { firstName, lastName, email, IDnumber, isVerified } = formData;
            // Send only the fields intended for update. Password is not included.
            const dataToSend = { firstName, lastName, email, IDnumber: IDnumber || undefined, isVerified }; // Send IDnumber

            // Corrected backend endpoint for updating a user by ID
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${userId}`, {
                method: 'PUT', // Use PUT method for update
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                let errorDetails = 'Failed to update user.';
                try {
                    const errorData = await response.json();
                    // Specific error mapping for common backend messages
                    if (response.status === 409 && errorData.message.includes("email already exists")) {
                        errorDetails = "This email is already in use by another user.";
                    } else {
                        errorDetails = errorData.message || errorDetails;
                    }
                } catch (jsonErr) {
                    console.error("handleSubmit: Error parsing non-OK response as JSON:", jsonErr);
                    errorDetails = `Failed to parse error response. Status: ${response.status}.`;
                }
                throw new Error(errorDetails);
            }

            const data = await response.json();
            if (data.success) {
                setSuccessMessage('User updated successfully!');
                setTimeout(() => {
                    navigate('/user-management'); // Redirect to user list after success
                }, 2000); // 2-second delay for success message to be seen
            } else {
                throw new Error(data.message || 'Failed to update user.');
            }
        } catch (err) {
            console.error('Update user error:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-6 text-center">Loading user data...</div>;
    // Display error, but allow form to be visible unless it's a permission error
    if (error && error.includes("permission") && !submitting) return <div className="p-6 text-red-500 text-center">Error: {error}</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 font-primary uppercase text-gray-800">Edit User</h1>
            <p className="text-gray-600 mb-6 font-secondary font-medium">Edit the details of user ID: {userId}</p>

            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{successMessage}</span>
                </div>
            )}

            {error && !error.includes("permission") && ( // Display error if not a permission error
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto">
                {/* First Name Field */}
                <div className="mb-4">
                    <label htmlFor="firstName" className="block text-gray-700 text-sm font-bold mb-2">First Name:</label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                    />
                </div>
                {/* Last Name Field */}
                <div className="mb-4">
                    <label htmlFor="lastName" className="block text-gray-700 text-sm font-bold mb-2">Last Name:</label>
                    <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                    />
                </div>
                {/* Email Field */}
                <div className="mb-4">
                    <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                    />
                </div>
                {/* ID Number Field (if applicable) */}
                <div className="mb-4">
                    <label htmlFor="IDnumber" className="block text-gray-700 text-sm font-bold mb-2">ID Number:</label>
                    <input
                        type="text"
                        id="IDnumber"
                        name="IDnumber"
                        value={formData.IDnumber}
                        onChange={handleChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="Optional"
                    />
                </div>
                {/* Is Verified Checkbox */}
                <div className="mb-6 flex items-center">
                    <input
                        type="checkbox"
                        id="isVerified"
                        name="isVerified"
                        checked={formData.isVerified}
                        onChange={handleChange}
                        className="mr-2 leading-tight"
                    />
                    <label htmlFor="isVerified" className="text-sm text-gray-700">Is Verified</label>
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
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditUserPage;