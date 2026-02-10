import React, { useState, useEffect, useContext } from 'react';
// Importing icons from lucide-react for a more aesthetic look
import { User, Mail, Key, Lock, Eye, EyeOff, Edit, Save, IdCard, XCircle, Loader2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';


// Main ProfilePage component
const Profile = () => {
    // Access user context for global user state and actions
    const { user, isLoggedIn, loading: userContextLoading, retrieveUserDetails: userContextRetrieveUserDetails, unsetUser } = useContext(UserContext);
    const navigate = useNavigate();

    // State variables for user data and form inputs (local to this component for editing)
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        IDnumber: '',
        role: '',
        bio: '',
        avatar: '', // Add avatar field here
    });

    // State variables for password change fields
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setConfirmNewPasswordVisibility] = useState(false);

    // State for UI logic (editing mode, loading, errors, success messages)
    const [isEditing, setIsEditing] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    // Effect to initialize form data when user context data changes
    useEffect(() => {
        if (user && user.id) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                IDnumber: user.IDnumber || '',
                role: user.roles && user.roles.length > 0 ? user.roles[0].name : '',
                bio: user.bio || '',
                avatar: user.avatar || '', // Initialize avatar from user context
            });
        } else if (!userContextLoading && !isLoggedIn) {
            // If user is not logged in and context is done loading, redirect to login
            navigate('/login', { replace: true });
        }
    }, [user, userContextLoading, isLoggedIn, navigate]);

    // Handler for general form field changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'IDnumber' || name === 'role') {
            return; // Do not update state for these fields
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Handler for password field changes
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        if (name === 'oldPassword') setOldPassword(value);
        else if (name === 'newPassword') setNewPassword(value);
        else if (name === 'confirmNewPassword') setConfirmNewPassword(value);
    };

    // Function to clear password fields and hide them
    const clearPasswordFields = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPasswordFields(false);
        setShowNewPassword(false);
        setConfirmNewPasswordVisibility(false);
    };

    // Handler for form submission (profile update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileError(null);
        setUpdateSuccess(false);

        // Construct the payload for the update request
        const updatePayload = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            bio: formData.bio,
            avatar: formData.avatar, // Add avatar to the payload
        };

        // Add password fields to payload if user intends to change password
        if (showPasswordFields) {
            if (!oldPassword || !newPassword || !confirmNewPassword) {
                setProfileError('All password fields are required to change password.');
                setProfileLoading(false);
                return;
            }
            if (newPassword !== confirmNewPassword) {
                setProfileError('New password and confirm password do not match.');
                setProfileLoading(false);
                return;
            }
            if (newPassword.length < 8) {
                setProfileError('New password must be at least 8 characters long.');
                setProfileLoading(false);
                return;
            }
            if (newPassword === oldPassword) {
                setProfileError('New password cannot be the same as the old password.');
                setProfileLoading(false);
                return;
            }

            updatePayload.oldPassword = oldPassword;
            updatePayload.newPassword = newPassword;
            updatePayload.confirmNewPassword = confirmNewPassword;
        }

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/update-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    // No 'Authorization' header needed here for cookie-based auth
                },
                body: JSON.stringify(updatePayload),
                credentials: 'include', // Essential for sending HTTP-only cookies
            });

            const data = await res.json();

            if (res.ok && data.success !== false) {
                clearPasswordFields();
                setUpdateSuccess(true);
                setIsEditing(false); // Exit editing mode on successful update
                setProfileLoading(false);

            } else {
                const errorMessage = data.message || `Failed to update profile: Status ${res.status}`;
                setProfileError(errorMessage);
                setProfileLoading(false);
            }
        } catch (error) {
            console.error('An unexpected error occurred while updating profile:', error);
            setProfileError('An unexpected error occurred while updating profile. Please try again.');
            setProfileLoading(false);
        }
    };

    // Handler for entering edit mode
    const handleEditClick = () => {
        setIsEditing(true);
        setProfileError(null);
        setUpdateSuccess(false); // Clear any old success message when entering edit mode
    };

    // Handler for canceling edit mode
    const handleCancelClick = () => {
        setIsEditing(false);
        setProfileError(null);
        setUpdateSuccess(false); // Clear success message on cancel
        clearPasswordFields();
        // Revert form data to the current user context data
        if (user && user.id) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                IDnumber: user.IDnumber || '',
                role: user.roles && user.roles.length > 0 ? user.roles[0].name : '',
                bio: user.bio || '',
                avatar: user.avatar || '', // Revert avatar to current user context value
            });
        }
    };

    // Handler for manually reloading profile data
    const handleReloadProfileClick = async () => {
        setProfileError(null);
        setProfileLoading(true);

        const MIN_LOADING_TIME = 500; // Minimum time to show loading spinner
        const startTime = Date.now();

        try {
            if (userContextRetrieveUserDetails) {
                await userContextRetrieveUserDetails();
            }
        } catch (err) {
            console.error("Error reloading profile:", err);
            setProfileError("Failed to reload profile. Please ensure you are logged in and your connection is stable.");
        } finally {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = MIN_LOADING_TIME - elapsedTime;

            if (remainingTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }

            setProfileLoading(false);
        }
    };

    // Combine loading states
    const overallLoading = userContextLoading;

    // Get the avatar source URL
    const avatarSrc = formData.avatar && formData.avatar.startsWith('http')
        ? formData.avatar
        : `https://ui-avatars.com/api/?name=${formData.firstName || 'U'}+${formData.lastName || 'U'}&background=random&color=fff&size=96`;

    return (
        <section className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <style>
                {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          .font-inter {
            font-family: 'Inter', sans-serif;
          }
          .animate-fade-in {
            animation: fadeIn 0.5s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
            </style>

            <div className="max-w-4xl w-full bg-white p-8 rounded-lg shadow-xl">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">
                    My Profile
                </h1>

                {/* Error Message Display */}
                {profileError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between" role="alert">
                        <span>{profileError}</span>
                        <button
                            onClick={handleReloadProfileClick}
                            className="ml-4 bg-blue-600 text-white font-semibold px-3 py-1 rounded hover:bg-blue-700 transition duration-200 flex items-center space-x-1"
                            disabled={overallLoading}
                        >
                            {overallLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            <span className="ml-1">{overallLoading ? 'Reloading...' : 'Reload Profile'}</span>
                        </button>
                    </div>
                )}

                {/* Success Message Display - MOVED TO HERE SO IT'S ALWAYS RENDERED */}
                {updateSuccess && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 animate-fade-in" role="status">
                        Success! Your profile has been updated.
                    </div>
                )}

                {/* Loading State for initial fetch or manual reload */}
                {overallLoading ? (
                    <div className="text-center py-10">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                        <p className="mt-4 text-gray-700">Loading profile...</p>
                    </div>
                ) : !isLoggedIn ? (
                    // Not logged in state
                    <div className="text-center py-10 text-gray-700 font-medium">
                        <p>Please log in to view your profile.</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-4 bg-blue-600 text-white font-semibold px-5 py-2 rounded hover:bg-blue-700 transition duration-200"
                        >
                            Go to Login
                        </button>
                    </div>
                ) : (
                    // Profile content (view or edit mode)
                    <>
                        <div className="flex justify-center mb-8">
                            <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-indigo-200 shadow-md">
                                <img
                                    src={avatarSrc}
                                    alt="User Avatar"
                                    className="object-cover w-full h-full"
                                />
                            </div>
                        </div>

                        {isEditing ? (
                            // Edit Mode Form
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* First Name */}
                                <div className="col-span-1">
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                        First Name:
                                    </label>
                                    <div className="flex items-center border border-gray-300 rounded-md shadow-sm focus-within:border-indigo-500 focus-within:ring-indigo-500">
                                        <User className="w-5 h-5 text-gray-400 ml-3" />
                                        <input
                                            type="text"
                                            id="firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            required
                                            className="block w-full p-2 bg-transparent outline-none rounded-r-md sm:text-sm"
                                            placeholder="Enter your first name"
                                        />
                                    </div>
                                </div>

                                {/* Last Name */}
                                <div className="col-span-1">
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name:
                                    </label>
                                    <div className="flex items-center border border-gray-300 rounded-md shadow-sm focus-within:border-indigo-500 focus-within:ring-indigo-500">
                                        <User className="w-5 h-5 text-gray-400 ml-3" />
                                        <input
                                            type="text"
                                            id="lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            required
                                            className="block w-full p-2 bg-transparent outline-none rounded-r-md sm:text-sm"
                                            placeholder="Enter your last name"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="col-span-1">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email:
                                    </label>
                                    <div className="flex items-center border border-gray-300 rounded-md shadow-sm focus-within:border-indigo-500 focus-within:ring-indigo-500">
                                        <Mail className="w-5 h-5 text-gray-400 ml-3" />
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="block w-full p-2 bg-transparent outline-none rounded-r-md sm:text-sm"
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                </div>

                                {/* ID Number */}
                                <div className="col-span-1">
                                    <label htmlFor="IDnumber" className="block text-sm font-medium text-gray-700 mb-1">
                                        ID Number:
                                    </label>
                                    <div className="flex items-center border bg-gray-100 border-gray-300 rounded-md shadow-sm focus-within:border-indigo-500 focus-within:ring-indigo-500">
                                        <IdCard className="w-5 h-5 text-gray-400 ml-3 " />
                                        <input
                                            type="text"
                                            id="IDnumber"
                                            name="IDnumber"
                                            value={formData.IDnumber}
                                            onChange={handleChange}
                                            className="block w-full p-2 border-gray-300 bg-gray-100 outline-none rounded-r-md sm:text-sm"
                                            placeholder="Enter your ID Number"
                                            disabled
                                        />
                                    </div>
                                </div>
                                
                                {/* Avatar URL */}
                                <div className="col-span-full">
                                    <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">
                                        Avatar URL:
                                    </label>
                                    <div className="flex items-center border border-gray-300 rounded-md shadow-sm focus-within:border-indigo-500 focus-within:ring-indigo-500">
                                        <User className="w-5 h-5 text-gray-400 ml-3" />
                                        <input
                                            type="url"
                                            id="avatar"
                                            name="avatar"
                                            value={formData.avatar}
                                            onChange={handleChange}
                                            className="block w-full p-2 bg-transparent outline-none rounded-r-md sm:text-sm"
                                            placeholder="Paste image URL here"
                                        />
                                    </div>
                                </div>


                                {/* Bio Textarea */}
                                <div className="col-span-full">
                                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                                        About Me:
                                    </label>
                                    <textarea
                                        id="bio"
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        rows="4"
                                        className="block w-full p-2 border border-gray-300 rounded-md shadow-sm resize-none focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        placeholder="Tell us a little about yourself..."
                                    ></textarea>
                                </div>

                                {/* Role Display (Non-editable in edit mode) */}
                                <div className="col-span-full">
                                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                        Role:
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange} // Handler will ignore
                                        className="block w-full border-gray-300 rounded-md capitalize shadow-sm sm:text-sm p-2 bg-gray-100 cursor-not-allowed"
                                        disabled // Ensures it's not editable
                                    >
                                        {/* Only display the current role, don't allow selection of others */}
                                        {formData.role ? (
                                            <option value={formData.role}>{formData.role}</option>
                                        ) : (
                                            <option value="" disabled>Loading Role...</option>
                                        )}
                                    </select>
                                </div>

                                {/* Password Change Section Toggle */}
                                <div className="col-span-full mt-4">
                                    <label className="flex items-center text-gray-700">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                                            checked={showPasswordFields}
                                            onChange={() => setShowPasswordFields(!showPasswordFields)}
                                        />
                                        <span className="ml-2 text-base font-medium">Change Password</span>
                                    </label>
                                </div>

                                {/* Password Fields (Conditionally Rendered) */}
                                {showPasswordFields && (
                                    <div className="col-span-full space-y-4 mt-6 animate-fade-in">
                                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Update Password</h3>

                                        {/* Current Password */}
                                        <div className="relative">
                                            <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                                Current Password:
                                            </label>
                                            <div className="flex items-center border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                                                <Key className="w-5 h-5 text-gray-400 ml-3" />
                                                <input
                                                    type="password" // Always password type for security
                                                    id="oldPassword"
                                                    name="oldPassword"
                                                    value={oldPassword}
                                                    onChange={handlePasswordChange}
                                                    required={showPasswordFields}
                                                    className="flex-1 block w-full p-2 bg-transparent outline-none rounded-r-md sm:text-sm"
                                                    placeholder="Enter current password"
                                                />
                                            </div>
                                        </div>

                                        {/* New Password */}
                                        <div className="relative">
                                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                                New Password:
                                            </label>
                                            <div className="flex items-center border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                                                <Lock className="w-5 h-5 text-gray-400 ml-3" />
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    id="newPassword"
                                                    name="newPassword"
                                                    value={newPassword}
                                                    onChange={handlePasswordChange}
                                                    required={showPasswordFields}
                                                    className="flex-1 block w-full p-2 bg-transparent outline-none"
                                                    placeholder="Enter new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="p-2 text-gray-500 hover:text-gray-700 transition duration-200 ease-in-out focus:outline-none"
                                                >
                                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Confirm New Password */}
                                        <div className="relative">
                                            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                                Confirm New Password:
                                            </label>
                                            <div className="flex items-center border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                                                <Lock className="w-5 h-5 text-gray-400 ml-3" />
                                                <input
                                                    type={showConfirmNewPassword ? 'text' : 'password'}
                                                    id="confirmNewPassword"
                                                    name="confirmNewPassword"
                                                    value={confirmNewPassword}
                                                    onChange={handlePasswordChange}
                                                    required={showPasswordFields}
                                                    className="flex-1 block w-full p-2 bg-transparent outline-none"
                                                    placeholder="Confirm new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmNewPasswordVisibility(!showConfirmNewPassword)}
                                                    className="p-2 text-gray-500 hover:text-gray-700 transition duration-200 ease-in-out focus:outline-none"
                                                >
                                                    {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons for Edit Mode */}
                                <div className="col-span-full flex justify-end gap-4 mt-8">
                                    <button
                                        type="button"
                                        onClick={handleCancelClick}
                                        className="inline-flex items-center justify-center py-2 px-5 border gap-2 btn-cancel"
                                        disabled={profileLoading}
                                    >
                                        <XCircle className="w-5 h-5" />
                                        <span>Cancel</span>
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center justify-center py-2 px-5 border gap-2 border-transparent btn-create"
                                        disabled={profileLoading}
                                    >
                                        {profileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{profileLoading ? 'Saving...' : 'Save Changes'}</span>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            // View Mode Display
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Display fields for viewing */}
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-500">First Name</label>
                                    <p className="mt-1 text-lg text-gray-900">{formData.firstName || 'N/A'}</p>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-500">Last Name</label>
                                    <p className="mt-1 text-lg text-gray-900">{formData.lastName || 'N/A'}</p>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-500">Email</label>
                                    <p className="mt-1 text-lg text-gray-900">{formData.email || 'N/A'}</p>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-500">ID Number</label>
                                    <p className="mt-1 text-lg text-gray-900">{formData.IDnumber || 'N/A'}</p>
                                </div>

                                {/* Bio Display */}
                                <div className="col-span-full">
                                    <label className="block text-sm font-medium text-gray-500">About Me:</label>
                                    <p className="mt-1 text-lg text-gray-900 leading-relaxed whitespace-pre-wrap">{formData.bio || 'N/A'}</p>
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-sm font-medium text-gray-500">Role</label>
                                    <p className="mt-1 text-lg text-gray-900">{formData.role || 'N/A'}</p>
                                </div>

                                {/* Edit Profile Button for View Mode */}
                                <div className="col-span-full flex justify-end mt-6">
                                    <button
                                        onClick={handleEditClick}
                                        className="inline-flex justify-center py-2 px-5 border border-transparent btn-a">
                                        Edit Profile
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default Profile;