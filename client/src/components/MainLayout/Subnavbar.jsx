import React, { useState, useContext, useRef, useEffect } from 'react';
import { FaBars, FaCheckDouble } from 'react-icons/fa';
import { IoNotificationsOutline, IoClose } from 'react-icons/io5'; 
import { Link, useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
import { Megaphone } from 'lucide-react';
import { BsStars } from "react-icons/bs"; 
import GeminiAssistant from '../Ai/AiGeneration'; // Using your provided path

const Subnavbar = ({ setIsSidebarOpen, onLogout }) => {
    const { user, hasPermission, isLoggedIn, hasRole } = useContext(UserContext);
    const [isNotificationsOpenDropDown, setIsNotificationsOpenDropDown] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false); // 🏆 State for AI Chatbox

    const navigate = useNavigate();

    const notificationsRef = useRef(null);
    const profileRef = useRef(null);
    const aiRef = useRef(null); // 🏆 Ref for AI dropdown detection

    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    // --- Notification Logic ---
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

    const fetchNotifications = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/notifications`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                setNotifications(data.data);
                setUnreadCount(data.data.filter(n => !n.isRead).length);
            }
        } catch (err) {
            console.error("Error fetching notifications:", err);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [isLoggedIn]);

    const handleNotificationClick = async (n) => {
        try {
            if (!n.isRead) {
                await fetch(`${BACKEND_URL}/notifications/${n._id}/read`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                fetchNotifications(); 
            }
            if (n.type === 'ANNOUNCEMENT') navigate('/my-learning');
            else if (n.onModel === 'PracticeTestAttempt') navigate(`practice-tests/${n.relatedId}/details`);
            else if (n.onModel === 'QuizAttempt') navigate(`/quiz-attempts/${n.relatedId}`);
            setIsNotificationsOpenDropDown(false);
        } catch (err) {
            console.error("Navigation error:", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/notifications/read-all`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) fetchNotifications();
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    };

    // --- Dropdown Toggle Logic ---
    const toggleNotificationsDropDown = () => {
        setIsNotificationsOpenDropDown(!isNotificationsOpenDropDown);
        setShowNotifications(true);
        setIsProfileOpen(false);
        setIsChatOpen(false); // Close AI when notifications open
    };

    const toggleProfileDropdown = () => {
        setIsProfileOpen(!isProfileOpen);
        setShowProfile(true);
        setIsNotificationsOpenDropDown(false);
        setIsChatOpen(false); // Close AI when profile opens
    };

    const toggleChatboxDropdown = () => {
        setIsChatOpen(!isChatOpen);
        setIsNotificationsOpenDropDown(false);
        setIsProfileOpen(false);
    };

    const handleLogoutClick = () => {
        onLogout();
        setIsProfileOpen(false);
    };

    // Outside Click Handling
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpenDropDown(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
            if (aiRef.current && !aiRef.current.contains(event.target)) {
                setIsChatOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getAvatarSrc = (user) => {
        if (user?.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('http')) {
            return user.avatar;
        }
        return `https://ui-avatars.com/api/?name=${user?.firstName || 'U'}+${user?.lastName || 'U'}&background=fffbeb&color=9ca3af&size=96`;
    };

    return (
        <nav className='bg-slate-900 px-4 py-3 flex flex-col sm:flex-row sm:justify-between items-center gap-y-2 sm:gap-y-0 sticky top-0 z-30 shadow-md'>
            <div className='flex items-center text-xl w-full sm:w-auto justify-between sm:justify-start'>
                <FaBars className='text-gray-400 me-4 cursor-pointer hover:text-white transition-colors' onClick={() => setIsSidebarOpen(prev => !prev)} />
                <img src="https://thecareerlab.ph/wp-content/uploads/2024/01/wordpressLogo.png" alt="logo" className="w-auto h-8 bg-white rounded p-1" />
            </div>

            <div className='flex items-center gap-x-4 relative'>
                {isLoggedIn && (
                    <>
                        {/* 🏆 AI ASSISTANT DROPDOWN */}
                        <div className="relative" ref={aiRef}>
                            <div 
                                className={`relative cursor-pointer p-1.5 rounded-full transition-all duration-300
                                    ${isChatOpen ? 'bg-purple-600 text-white shadow-lg scale-110' : 'text-gray-400 hover:text-purple-400 hover:bg-slate-800'}`} 
                                onClick={toggleChatboxDropdown}
                            >
                                <BsStars className={`text-2xl ${isChatOpen ? 'animate-pulse' : ''}`} />
                                {!isChatOpen && (
                                    <span className="absolute top-0 right-0 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                    </span>
                                )}
                            </div>

                            {isChatOpen && (
                                <div className="absolute right-0 mt-3 w-[350px] sm:w-[450px] z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden relative">
                                        <button 
                                            onClick={() => setIsChatOpen(false)}
                                            className="absolute top-4 right-4 z-50 text-gray-500 hover:text-gray-800 transition-colors"
                                        >
                                            <IoClose size={20} />
                                        </button>
                                        <GeminiAssistant isDropdown={true} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notification Dropdown */}
                        <div className="relative" ref={notificationsRef}>
                            <div className={`relative cursor-pointer p-1 rounded-full transition-all ${isNotificationsOpenDropDown ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`} onClick={toggleNotificationsDropDown}>
                                <IoNotificationsOutline className="text-2xl" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full border border-slate-900">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>

                            {isNotificationsOpenDropDown && (
                                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 shadow-2xl z-50 rounded-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                                    <div className="px-4 py-3 bg-slate-50 border-b flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllAsRead} className="text-[10px] text-white flex items-center rounded border bg-blue-600 py-0.5 px-1.5 border-gray-400 gap-1 font-medium hover:bg-blue-700 cursor-pointer transition-colors">
                                                <FaCheckDouble /> Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => (
                                                <div 
                                                    key={n._id} 
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`px-4 py-4 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${!n.isRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''}`}
                                                >
                                                    <div className="mt-1 flex-shrink-0">
                                                        {n.type === 'ANNOUNCEMENT' ? <Megaphone size={16} className="text-amber-500" /> : <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        {n.title && <div className="text-[11px] font-bold text-blue-600 uppercase mb-0.5 truncate">{n.title}</div>}
                                                        <div className={`text-xs line-clamp-2 ${!n.isRead ? 'font-semibold text-slate-900' : 'text-slate-600'}`} dangerouslySetInnerHTML={{ __html: n.content }} />
                                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 italic">
                                                            <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                                                            {n.sender && <span className="flex items-center gap-1">• by {n.sender.firstName}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-10 text-center text-gray-400 text-xs">No notifications yet</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileRef}>
                            <button className="font-bold py-1 px-3 flex items-center gap-2 cursor-pointer group" onClick={toggleProfileDropdown}>
                                <img
                                    src={getAvatarSrc(user)}
                                    alt={`${user?.firstName} profile`}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-slate-700 group-hover:border-yellow-400 transition-all"
                                />
                                <span className='text-yellow-400 group-hover:text-yellow-300 transition-colors'>{user?.firstName || 'Profile'}</span>
                            </button>
                            {showProfile && (
                                <div className={`absolute right-0 mt-2 w-44 bg-white border border-slate-200 shadow-xl z-50 text-sm rounded-lg overflow-hidden transition-all duration-200 ${isProfileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                                    <ul className="py-1">
                                        <li><Link to="/profile" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-yellow-600">My Profile</Link></li>
                                        <li><Link to="/my-learning" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-yellow-600">My Learnings</Link></li>
                                        {hasPermission('grade:assignments') && (
                                            <li><Link to={hasRole('student') ? "/student/grades" : "/grades"} className="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-yellow-600">Grade</Link></li>
                                        )}
                                        {hasPermission('view:calendar') && (
                                            <li><Link to="/calendar" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-yellow-600">Calendar</Link></li>
                                        )}
                                        {hasPermission('admin:settings') && (
                                            <li><Link to="/admin/settings" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-yellow-600">Admin Settings</Link></li>
                                        )}
                                        <li className="border-t border-slate-100">
                                            <button onClick={handleLogoutClick} className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 transition-colors">Logout</button>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Subnavbar;