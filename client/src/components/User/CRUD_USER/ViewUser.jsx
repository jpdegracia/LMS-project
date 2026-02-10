import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext';
import { ArrowLeft, Loader2 } from 'lucide-react';

const ViewUserPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { hasPermission, loading: userContextLoading, isLoggedIn } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUserData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!isLoggedIn) {
                navigate('/login');
                return;
            }
            if (!hasPermission('user:read')) {
                throw new Error("You don't have permission to view this user's details.");
            }

            const response = await fetch(`${BACKEND_URL}/users/${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to fetch user data. Status: ${response.status}`);
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
    }, [userId, hasPermission, BACKEND_URL, isLoggedIn, navigate]);

    useEffect(() => {
        if (!userContextLoading && userId) {
            fetchUserData();
        } else if (!userContextLoading && !userId) {
            setError("User ID is missing from the URL.");
            setLoading(false);
        }
    }, [userContextLoading, userId, fetchUserData]);

    const handleBackClick = () => {
        navigate('/user-management');
    };
    
    const getAvatarSrc = (user) => {
        if (user?.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('http')) {
            return user.avatar;
        }
        return `https://ui-avatars.com/api/?name=${user?.firstName || 'U'}+${user?.lastName || 'U'}&background=random&color=fff&size=96`;
    };

    if (loading || userContextLoading) {
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
            <div className="max-w-4xl w-full bg-white p-12 rounded-lg shadow-xl animate-fade-in">
                {/* Back Button */}
                <div className="mb-8">
                    <button onClick={handleBackClick} className="btn-b flex items-center">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                    </button>
                </div>

                {/* Profile Header */}
                <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center tracking-tight">
                    {`${userData.firstName}'s Profile`}
                </h1>

                {/* Avatar */}
                <div className="flex justify-center mb-10">
                    <img 
                        src={avatarSrc}
                        alt={`${userData?.firstName}'s avatar`} 
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-md"
                    />
                </div>

                {/* User Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    {/* First Name */}
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">First Name</p>
                        <p className="text-lg font-semibold text-gray-900">{userData.firstName || 'N/A'}</p>
                    </div>
                    {/* Last Name */}
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Last Name</p>
                        <p className="text-lg font-semibold text-gray-900">{userData.lastName || 'N/A'}</p>
                    </div>
                    {/* Email */}
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                        <p className="text-lg font-semibold text-gray-900">{userData.email || 'N/A'}</p>
                    </div>
                    {/* ID Number */}
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">ID Number</p>
                        <p className="text-lg font-semibold text-gray-900">{userData.IDnumber || 'N/A'}</p>
                    </div>
                </div>

                {/* About Me / Bio Section */}
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">About Me:</p>
                    <div className="bg-gray-50 p-6 rounded-md">
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {userData.bio || 'This user has not provided a bio yet.'}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ViewUserPage;