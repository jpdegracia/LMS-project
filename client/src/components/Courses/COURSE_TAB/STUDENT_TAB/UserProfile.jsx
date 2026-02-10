import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, IdCard, XCircle, Loader2, Briefcase, ArrowLeft } from 'lucide-react';
import UserContext from '../../../UserContext/UserContext';

const UserProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, loading: userContextLoading, hasPermission } = useContext(UserContext);

    const [viewedUser, setViewedUser] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState(null);
    
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const fetchUserProfile = useCallback(async () => {
        setProfileLoading(true);
        setProfileError(null);
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }
        if (!hasPermission('user:read')) {
            setProfileError("You don't have permission to view user profiles.");
            setProfileLoading(false);
            return;
        }
        try {
            const response = await fetch(`${BACKEND_URL}/users/${userId}`, { credentials: 'include', });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch user profile.');
            }
            const data = await response.json();
            setViewedUser(data.user);
        } catch (err) {
            setProfileError(err.message || 'An unexpected error occurred.');
        } finally {
            setProfileLoading(false);
        }
    }, [userId, isLoggedIn, navigate, hasPermission, BACKEND_URL]);

    useEffect(() => {
        if (!userContextLoading && userId) {
            fetchUserProfile();
        } else if (!userContextLoading && !userId) {
            setProfileError("User ID is missing from the URL.");
            setProfileLoading(false);
        }
    }, [userContextLoading, userId, fetchUserProfile]);

    const handleBackClick = () => {
        navigate(-1); // Navigates back to the previous page
    };

    const avatarSrc = viewedUser?.avatar && viewedUser.avatar.startsWith('http')
        ? viewedUser.avatar
        : `https://ui-avatars.com/api/?name=${viewedUser?.firstName || 'U'}+${viewedUser?.lastName || 'U'}&background=random&color=fff&size=96`;

    if (profileLoading || userContextLoading) {
        return (<section className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></section>);
    }
    if (profileError) {
        return (<div className="text-center py-10 bg-gray-50 min-h-screen"><p className="text-xl text-red-600 mb-4">{profileError}</p><button onClick={() => navigate(-1)} className="btn-a">Go Back</button></div>);
    }
    if (!viewedUser) {
        return (<div className="text-center py-10 bg-gray-50 min-h-screen"><p className="text-xl text-gray-700 mb-4">User not found.</p><button onClick={() => navigate(-1)} className="btn-a">Go Back</button></div>);
    }

    return (
        <section className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl w-full bg-white p-8 rounded-lg shadow-xl">
            {/* Back Button */}
                <div className="mb-8">
                    <button onClick={handleBackClick} className="btn-b flex items-center">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                    </button>
                </div>

                <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">{`${viewedUser.firstName}'s Profile`}</h1>
                
                <div className="flex justify-center mb-8">
                    <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-indigo-200 shadow-md">
                        <img src={avatarSrc} alt="User Avatar" className="object-cover w-full h-full" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-500">First Name</label>
                        <p className="mt-1 text-lg text-gray-900">{viewedUser.firstName || 'N/A'}</p>
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-500">Last Name</label>
                        <p className="mt-1 text-lg text-gray-900">{viewedUser.lastName || 'N/A'}</p>
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-500">Email</label>
                        <p className="mt-1 text-lg text-gray-900">{viewedUser.email || 'N/A'}</p>
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-500">ID Number</label>
                        <p className="mt-1 text-lg text-gray-900">{viewedUser.IDnumber || 'N/A'}</p>
                    </div>
                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-gray-500">About Me:</label>
                        <p className="mt-1 text-lg text-gray-900 leading-relaxed whitespace-pre-wrap">{viewedUser.bio || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default UserProfile;