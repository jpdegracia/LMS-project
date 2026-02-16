import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdSpaceDashboard } from "react-icons/md";
import { Link, useLocation } from 'react-router-dom';
import { PiFilePlusFill } from "react-icons/pi";
import { FaUser, FaServer, FaGraduationCap, FaBook } from "react-icons/fa6";
import { RiAdminLine, RiBookMarkedFill } from "react-icons/ri";
import { AiOutlineCaretDown } from "react-icons/ai";
import { IoHomeOutline, IoBookOutline, IoListOutline } from "react-icons/io5";
import { TiStarFullOutline } from 'react-icons/ti';
import { HiOutlineUserGroup } from 'react-icons/hi';
import { TbBasketCode } from "react-icons/tb";
import UserContext from '../UserContext/UserContext';
import { FaQuestionCircle } from 'react-icons/fa';

const Sidebar = ({ isSidebarOpen, toggleSidebar, onSidebarHoverChange }) => {
    const { user, hasRole, hasPermission } = useContext(UserContext);
    const location = useLocation();

    // Section Toggle States
    const [isLearningOpen, setIsLearningOpen] = useState(true);
    const [isUserSettingOpen, setIsUserSettingOpen] = useState(false);
    const [isCourseContentManagementOpen, setIsCourseContentManagementOpen] = useState(false);

    const [isLocallyHovered, setIsLocallyHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const handleMouseEnter = () => {
        if (!isMobile) {
            setIsLocallyHovered(true);
            onSidebarHoverChange?.(true);
        }
    };

    const handleMouseLeave = () => {
        if (!isMobile) {
            setIsLocallyHovered(false);
            onSidebarHoverChange?.(false);
        }
    };

    const isExpanded = isSidebarOpen || (!isMobile && isLocallyHovered);
    const currentSidebarWidth = isExpanded ? 'w-64' : 'w-20';

    const isActiveLink = (path) => location.pathname.startsWith(path);
    const isMyLearningActive = isActiveLink('/my-learning') || isActiveLink('/courses');

    const getMainDashboardLink = () => {
        if (hasRole('admin')) return '/admin/dashboard';
        if (hasRole('teacher')) return '/teacher/dashboard';
        return '/my-learning';
    };

    const getAvatarSrc = (user) => {
        return user?.avatar || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=0D9488&color=fff`;
    };

    // Permission check for the entire Management block
    const canAccessCourseContentManagementSection = (
        hasPermission('course:update') || hasPermission('course:delete') ||
        hasPermission('module:read:all') || hasPermission('lesson_content:update') ||
        hasPermission('quiz:update') || hasPermission('question:update') ||
        hasPermission('category:read:all') || hasPermission('subject:read:all')
    );

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobile && isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
                        onClick={toggleSidebar}
                    />
                )}
            </AnimatePresence>

            <aside
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`fixed left-0 top-0 h-full z-50 bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col ${currentSidebarWidth}`}
            >
                {/* Header / Logo Area */}
                <div className="h-20 flex items-center px-6 gap-4 overflow-hidden border-b border-slate-800/50">
                    <MdSpaceDashboard className="w-8 h-8 text-cyan-400 shrink-0" />
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.span 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-white font-black tracking-tighter text-lg whitespace-nowrap"
                            >EduGlobal
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-grow overflow-y-auto custom-scrollbar py-6 px-3 space-y-2">
                    
                    {/* Dashboard */}
                    {(hasRole('admin') || hasRole('teacher')) && (
                        <SidebarItem 
                            to={getMainDashboardLink()}
                            icon={<IoHomeOutline />}
                            label="DASHBOARD"
                            active={location.pathname === getMainDashboardLink()}
                            expanded={isExpanded}
                        />
                    )}

                    {/* My Learning */}
                    {hasPermission('course:read') && (
                        <SidebarGroup 
                            icon={<IoBookOutline />}
                            label="MY LEARNING"
                            expanded={isExpanded}
                            isOpen={isLearningOpen}
                            active={isMyLearningActive}
                            onClick={() => setIsLearningOpen(!isLearningOpen)}
                        >
                            <SidebarSubItem to="/my-learning" label="Learning Progress" icon={<RiBookMarkedFill />} />
                            <SidebarSubItem to="/courses" label="All Courses" icon={<FaGraduationCap />} />
                        </SidebarGroup>
                    )}


                    {/* User Settings */}
                    {(hasPermission('user:read:all') || hasPermission('role:read:all')) && (
                        <SidebarGroup 
                            icon={<HiOutlineUserGroup />}
                            label="USER SETTINGS"
                            expanded={isExpanded}
                            isOpen={isUserSettingOpen}
                            active={isActiveLink('/user-management') || isActiveLink('/roles')}
                            onClick={() => setIsUserSettingOpen(!isUserSettingOpen)}
                        >
                            <SidebarSubItem to="/user-management" label="User Management" icon={<FaUser />} />
                            <SidebarSubItem to="/roles" label="Roles Management" icon={<FaServer />} />
                            <SidebarSubItem to="/permissions" label="Permission Types" icon={<TbBasketCode />} />
                        </SidebarGroup>
                    )}

                     {/* Management Section (The restored section) */}
                    {canAccessCourseContentManagementSection && (
                        <SidebarGroup 
                            icon={<RiAdminLine />}
                            label="COURSE CONTENT"
                            expanded={isExpanded}
                            isOpen={isCourseContentManagementOpen}
                            active={isActiveLink('/courses-list') || isActiveLink('/lesson-module')}
                            onClick={() => setIsCourseContentManagementOpen(!isCourseContentManagementOpen)}
                        >
                            {(hasPermission('course:update') || hasPermission('course:delete')) && (
                                <SidebarSubItem to="/courses-list" label="Manage Courses" icon={<FaGraduationCap />} />
                            )}
                            {hasPermission('module:read:all') && (
                                <SidebarSubItem to="/lesson-module-management" label="Lesson Modules" icon={<RiBookMarkedFill />} />
                            )}
                            {(hasPermission('lesson_content:update') || hasPermission('lesson_content:delete')) && (
                                <SidebarSubItem to="/lesson-content-management" label="Content Bank" icon={<PiFilePlusFill />} />
                            )}
                            {(hasPermission('quiz:update') || hasPermission('quiz:read:all')) && (
                                <SidebarSubItem to="/quiz-management" label="Quiz Modules" icon={<IoListOutline />} />
                            )}
                            {(hasPermission('question:update') || hasPermission('question:delete')) && (
                                <SidebarSubItem to="/question-bank-management" label="Question Bank" icon={<FaQuestionCircle />} />
                            )}
                            {(hasPermission('category:update') || hasPermission('category:read:all')) && (
                                <SidebarSubItem to="/category-management" label="Categories" icon={<TiStarFullOutline />} />
                            )}
                            {(hasPermission('subject:update') || hasPermission('subject:read:all')) && (
                                <SidebarSubItem to="/subject-management" label="Subjects" icon={<FaBook />} />
                            )}
                        </SidebarGroup>
                    )}

                </nav>

                {/* Profile Card */}
                <div className="p-4 border-t border-slate-800">
                    <div className={`flex items-center gap-3 p-2 rounded-2xl bg-slate-800/50 backdrop-blur-md transition-all duration-300 ${!isExpanded ? 'justify-center' : ''}`}>
                        <img 
                            src={getAvatarSrc(user)} 
                            className="w-10 h-10 rounded-xl border-2 border-cyan-500/20 object-cover" 
                            alt="Avatar" 
                        />
                        {isExpanded && (
                            <div className="overflow-hidden">
                                <p className="text-white text-sm font-bold truncate">{user?.firstName} {user?.lastName}</p>
                                <p className="text-slate-500 text-[10px] uppercase tracking-widest">{user?.roleName || 'Student'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

/* --- Sub-Components for Cleanliness --- */

const SidebarItem = ({ to, icon, label, active, expanded }) => (
    <Link to={to} className={`
        group flex items-center gap-4 p-3 rounded-xl transition-all duration-200
        ${active ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
        ${!expanded ? 'justify-center' : ''}
    `}>
        <span className={`text-xl ${active ? 'text-slate-950' : 'group-hover:text-cyan-400'}`}>{icon}</span>
        {expanded && <span className="whitespace-nowrap font-bold tracking-tight">{label}</span>}
    </Link>
);

const SidebarGroup = ({ icon, label, expanded, isOpen, active, onClick, children }) => (
    <div className="space-y-1">
        <button onClick={onClick} className={`
            w-full group flex items-center justify-between p-3 rounded-xl transition-all duration-200
            ${active && !isOpen ? 'text-cyan-400 bg-slate-800/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
            ${!expanded ? 'justify-center' : ''}
        `}>
            <div className="flex items-center gap-4">
                <span className={`text-xl ${active ? 'text-cyan-400' : 'group-hover:text-cyan-400'}`}>{icon}</span>
                {expanded && <span className="font-bold tracking-tight whitespace-nowrap">{label}</span>}
            </div>
            {expanded && (
                <AiOutlineCaretDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
            )}
        </button>
        {expanded && (
            <motion.div 
                initial={false}
                animate={isOpen ? "open" : "closed"}
                variants={{
                    open: { height: "auto", opacity: 1, display: "block", transition: { duration: 0.3 } },
                    closed: { height: 0, opacity: 0, transitionEnd: { display: "none" }, transition: { duration: 0.2 } }
                }}
                className="ml-6 space-y-1 overflow-hidden"
            >
                {children}
            </motion.div>
        )}
    </div>
);

const SidebarSubItem = ({ to, label, icon }) => {
    const location = useLocation();
    const active = location.pathname === to;
    return (
        <Link to={to} className={`
            flex items-center gap-3 p-2.5 rounded-lg text-sm transition-all
            ${active ? 'text-cyan-400 bg-cyan-400/5 font-bold' : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}
        `}>
            <span className="text-lg">{icon}</span>
            <span className="whitespace-nowrap">{label}</span>
        </Link>
    );
};

export default Sidebar;