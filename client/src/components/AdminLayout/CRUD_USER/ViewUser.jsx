import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext';
import { User, Mail, IdCard, CheckSquare, XSquare, ArrowLeft, Loader2, Italic } from 'lucide-react';

const ViewUserPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!hasPermission('user:read')) {
                const noPermissionError = "You don't have permission to view this user's details.";
                setError(noPermissionError);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`${BACKEND_URL}/users/${userId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });

                if (!response.ok) {
                    let errorDetails = 'Unknown error fetching user data.';
                    try {
                        const errorData = await response.json();
                        errorDetails = errorData.message || errorDetails;
                    } catch (jsonErr) {
                        errorDetails = `Failed to parse error response. Status: ${response.status}.`;
                    }
                    throw new Error(errorDetails);
                }

                const data = await response.json();
                
                if (data.success && data.user) {
                    setUserData(data.user);
                } else {
                    throw new Error(data.message || 'User not found or backend reported failure.');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId, hasPermission, BACKEND_URL]);

    const handleBackClick = () => {
        navigate('/user-management');
    };
    
    // Function to get avatar URL, providing a fallback
    const getAvatarSrc = (user) => {
        if (user?.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('http')) {
            return user.avatar;
        }
        return `https://ui-avatars.com/api/?name=${user?.firstName || 'U'}+${user?.lastName || 'U'}&background=random&color=fff&size=96`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 text-gray-700">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                <p className="mt-4">Loading user data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 text-red-700">
                <h2 className="text-3xl font-bold mb-4">Error</h2>
                <p className="text-lg text-center">{error}</p>
                <button
                    onClick={handleBackClick}
                    className="mt-6 inline-flex items-center justify-center py-2 px-5 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Go Back to User List
                </button>
            </div>
        );
    }
    
    if (!userData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 text-gray-700">
                <p className="text-lg">User data could not be loaded.</p>
            </div>
        );
    }

    const avatarSrc = getAvatarSrc(userData);

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

            <div className="max-w-4xl w-full bg-white p-8 rounded-lg shadow-xl animate-fade-in mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={handleBackClick}
                        className="btn-b flex items-center"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back
                    </button>
                    <h1 className="text-2xl font-medium font-primary text-gray-900 tracking-tight text-center flex-grow">
                        User Profile
                    </h1>
                    <div className="w-16"></div> 
                </div>

                <div className="flex flex-col items-center mb-8">
                    {/* This is the code that displays the avatar */}
                    <img 
                        src={avatarSrc}
                        alt={`${userData?.firstName}'s avatar`} 
                        className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 mb-4 shadow-md"
                    />
                    <h2 className="text-3xl font-bold text-gray-900 mb-1 capitalize">
                        {userData.firstName} {userData.lastName}
                    </h2>
                    <p className='font-medium font-secondary text-base text-gray-600'>(ID: {userId})</p>
                </div>
                <hr className="my-6 border-gray-200" />
                <div className="flex flex-col md:flex-row md:space-x-8 space-y-6 md:space-y-0">
                    <div className="flex-1 space-y-4">
                        {/* First Name */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                <User className="w-4 h-4 mr-1 text-blue-500" /> First Name
                            </label>
                            <p className="text-lg text-gray-900 font-semibold">{userData.firstName || 'N/A'}</p>
                        </div>
                        {/* Last Name */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                <User className="w-4 h-4 mr-1 text-blue-500" /> Last Name
                            </label>
                            <p className="text-lg text-gray-900 font-semibold">{userData.lastName || 'N/A'}</p>
                        </div>
                        {/* Email */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                <Mail className="w-4 h-4 mr-1 text-blue-500" /> Email
                            </label>
                            <p className="text-lg text-gray-900 font-semibold">{userData.email || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex-1 space-y-4">
                        {/* ID Number */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                <IdCard className="w-4 h-4 mr-1 text-blue-500" /> ID Number
                            </label>
                            <p className="text-lg text-gray-900 font-semibold">{userData.IDnumber || 'N/A'}</p>
                        </div>
                        {/* Is Verified */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                Is Verified
                            </label>
                            <p className="text-lg text-gray-900 flex items-center font-semibold">
                                {userData.isVerified ? (
                                    <>
                                        <CheckSquare className="inline text-green-500 mr-2" /> Yes
                                    </>
                                ) : (
                                    <>
                                        <XSquare className="inline text-red-500 mr-2" /> No
                                    </>
                                )}
                            </p>
                        </div>
                        {/* Role */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                Role
                            </label>
                            <p className="text-lg text-gray-900 capitalize font-semibold">
                                {userData.roles && userData.roles.length > 0 ? userData.roles[0].name : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
                {/* This is the code that displays the bio */}
                {userData.bio && (
                    <div className="mt-8">
                        <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                            <Italic className="w-4 h-4 mr-1 text-blue-500" /> Bio
                        </label>
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                            {userData.bio}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ViewUserPage;