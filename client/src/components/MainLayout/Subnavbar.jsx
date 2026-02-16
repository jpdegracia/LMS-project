import React, { useState, useContext, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaCheckDouble } from 'react-icons/fa';
import { IoNotificationsOutline, IoClose, IoLogOutOutline, IoSettingsOutline } from 'react-icons/io5'; 
import { Link, useNavigate } from 'react-router-dom';
import { Megaphone, User, BookOpen, Calendar, ShieldCheck } from 'lucide-react';
import { BsStars } from "react-icons/bs"; 
import UserContext from '../UserContext/UserContext';
import GeminiAssistant from '../Ai/AiGeneration';
import eduGlobal_2 from '../../assets/eduGlobal_2.jpg';

const Subnavbar = ({ setIsSidebarOpen, onLogout }) => {
    const { user, hasPermission, isLoggedIn, hasRole } = useContext(UserContext);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const navigate = useNavigate();
    const notificationsRef = useRef(null);
    const profileRef = useRef(null);
    const aiRef = useRef(null);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

    // Fetch Logic (Simplified for brevity, keep your original logic here)
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


    // Dropdown Variants
    const dropdownVariants = {
        hidden: { opacity: 0, y: 10, scale: 0.95 },
        visible: { 
            opacity: 1, y: 0, scale: 1,
            transition: { type: "spring", stiffness: 400, damping: 30 } 
        },
        exit: { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.2 } }
    };

    const getAvatarSrc = (user) => {
        return user?.avatar || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=0D9488&color=fff`;
    };

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

    return (
        <nav className='bg-slate-900 px-6 py-3 flex justify-between items-center sticky top-0 z-40 border-b border-slate-800 shadow-xl'>
            
            {/* Left: Sidebar Toggle & Logo */}
            <div className='flex items-center gap-4'>
                <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSidebarOpen(prev => !prev)}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                    <FaBars className='text-xl' />
                </motion.button>
                <Link to="/dashboard">
                    <img 
                        src={eduGlobal_2}
                        alt="logo" 
                        className="h-8 w-auto brightness-110" 
                    />
                </Link>
            </div>

            {/* Right: Actions */}
            <div className='flex items-center gap-3'>
                {isLoggedIn && (
                    <>
                        {/* 🏆 AI ASSISTANT */}
                        <div className="relative" ref={aiRef}>
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setIsChatOpen(!isChatOpen); setIsNotificationsOpen(false); setIsProfileOpen(false); }}
                                className={`relative p-2.5 rounded-xl transition-all border cursor-pointer ${
                                    isChatOpen 
                                    ? 'bg-purple-600 border-purple-400 text-white' 
                                    : 'bg-slate-800 border-slate-700 text-purple-400 hover:border-purple-500/50'
                                }`}
                            >
                                <BsStars className={`text-xl ${isChatOpen ? 'animate-pulse' : ''}`} />
                                {!isChatOpen && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500 border-2 border-slate-900"></span>
                                    </span>
                                )}
                            </motion.button>

                            <AnimatePresence>
                                {isChatOpen && (
                                    <motion.div 
                                        variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
                                        className="absolute right-0 mt-4 w-[380px] sm:w-[500px] z-50 origin-top-right shadow-2xl"
                                    >
                                        <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden relative">
                                            <button onClick={() => setIsChatOpen(false)} className="absolute top-4 right-4 z-[60] text-slate-400 hover:text-white transition-colors">
                                                <IoClose size={24} />
                                            </button>
                                            <div className="max-h-[80vh] overflow-y-auto">
                                                <GeminiAssistant isDropdown={true} />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* NOTIFICATIONS */}
                        <div className="relative" ref={notificationsRef}>
                            <button 
                                onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); setIsChatOpen(false); }}
                                className={`p-2.5 rounded-xl transition-all border cursor-pointer ${
                                    isNotificationsOpen ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <IoNotificationsOutline className="text-xl" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-slate-900 cursor-pointer">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotificationsOpen && (
                                    <motion.div 
                                        variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
                                        className="absolute right-0 mt-4 w-80 bg-slate-800 border border-slate-700 shadow-2xl z-50 rounded-2xl overflow-hidden origin-top-right"
                                    >
                                        <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                                            <h3 className="font-bold text-white text-sm">Activity</h3>
                                            <button onClick={markAllAsRead} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-tighter cursor-pointer underline-offset-2">
                                                Mark All Read
                                            </button>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto custom-scrollbar bg-slate-900">
                                            {notifications.length > 0 ? (
                                                notifications.map((n) => (
                                                    <NotificationItem key={n._id} n={n} onClick={handleNotificationClick} />
                                                ))
                                            ) : (
                                                <div className="p-10 text-center text-slate-500 text-xs italic">No new alerts</div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* PROFILE */}
                        <div className="relative" ref={profileRef}>
                            <button 
                                onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); setIsChatOpen(false); }}
                                className="flex items-center gap-2 pl-1 pr-3 py-1 bg-slate-800 border border-slate-700 rounded-full hover:border-slate-500 transition-all group cursor-pointer"
                            >
                                <img src={getAvatarSrc(user)} alt="avatar" className="w-8 h-8 rounded-full border border-slate-600" />
                                <span className='text-sm font-bold text-slate-200 group-hover:text-white hidden sm:inline'>{user?.firstName}</span>
                            </button>

                            <AnimatePresence>
                                {isProfileOpen && (
                                    <motion.div 
                                        variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
                                        className="absolute right-0 mt-4 w-56 bg-slate-800 border border-slate-700 shadow-2xl z-50 rounded-2xl overflow-hidden origin-top-right"
                                    >
                                        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                                            <p className="text-white font-bold text-sm truncate">{user?.firstName} {user?.lastName}</p>
                                            <p className="text-slate-500 text-[10px] uppercase tracking-widest">{user?.roleName || 'Member'}</p>
                                        </div>
                                        <ul className="p-2">
                                            <ProfileLink to="/profile" icon={<User size={14}/>} label="My Profile" />
                                            <ProfileLink to="/my-learning" icon={<BookOpen size={14}/>} label="My Learning" />
                                            {hasPermission('view:calendar') && <ProfileLink to="/calendar" icon={<Calendar size={14}/>} label="Schedule" />}
                                            {hasPermission('admin:settings') && <ProfileLink to="/admin/settings" icon={<ShieldCheck size={14}/>} label="Admin Panel" />}
                                            <li className="mt-2 pt-2 border-t border-slate-700">
                                                <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-medium">
                                                    <IoLogOutOutline size={18} /> Logout
                                                </button>
                                            </li>
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
};

// Sub-components for cleaner code
const ProfileLink = ({ to, icon, label }) => (
    <li>
        <Link to={to} className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-all text-sm font-medium">
            <span className="text-slate-500">{icon}</span> {label}
        </Link>
    </li>
);

const NotificationItem = ({ n, onClick }) => (
    <div 
        onClick={() => onClick(n)}
        className={`px-4 py-4 border-b border-slate-800 hover:bg-slate-800 transition-colors flex gap-3 ${!n.isRead ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500' : ''}`}
    >
        <div className="shrink-0 pt-1">
            {n.type === 'ANNOUNCEMENT' ? <Megaphone size={14} className="text-amber-400" /> : <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1" />}
        </div>
        <div className="flex-grow min-w-0">
            <p className={`text-xs ${!n.isRead ? 'text-white font-bold' : 'text-slate-400'}`} dangerouslySetInnerHTML={{ __html: n.content }} />
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">{new Date(n.createdAt).toLocaleDateString()}</p>
        </div>
    </div>
);

export default Subnavbar;