import React, { useState, useContext, useEffect } from 'react';
import { MdSpaceDashboard } from "react-icons/md";
import { Link, useLocation } from 'react-router-dom';
import { PiFilePlusFill } from "react-icons/pi";
import { FaUser, FaServer } from "react-icons/fa6";
import { RiAdminLine, RiBookMarkedFill } from "react-icons/ri";
import { AiOutlineCaretDown, AiOutlineCaretUp } from "react-icons/ai";
import { IoHomeOutline, IoBookOutline, IoListOutline } from "react-icons/io5";
import { TiStarFullOutline } from 'react-icons/ti';
import { HiOutlineUserGroup } from 'react-icons/hi';
import { TbBasketCode } from "react-icons/tb";
import { FaGraduationCap, FaQuestionCircle, FaBook } from "react-icons/fa";
import UserContext from '../UserContext/UserContext';

const Sidebar = ({ isSidebarOpen, toggleSidebar, onSidebarHoverChange }) => {
    const { user, hasRole, hasPermission } = useContext(UserContext);
    const location = useLocation();

    const [isLearningOpen, setIsLearningOpen] = useState(true);
    const [isUserSettingOpen, setIsUserSettingOpen] = useState(true);
    const [isCourseContentManagementOpen, setIsCourseContentManagementOpen] = useState(true);

    const toggleLearning = () => setIsLearningOpen(!isLearningOpen);
    const toggleUserSetting = () => setIsUserSettingOpen(!isUserSettingOpen);
    const toggleCourseContentManagement = () => setIsCourseContentManagementOpen(!isCourseContentManagementOpen);

    const getMainDashboardLink = () => {
        if (hasRole('admin')) return '/admin/dashboard';
        if (hasRole('teacher')) return '/teacher/dashboard';
        // 🚨 IMPORTANT: Change the student dashboard link here to the new target
        if (hasRole('student')) return '/my-learning'; 
        return '/dashboard';
    };

    const getMainDashboardTitle = () => {
        if (hasRole('admin')) return 'Admin Dashboard';
        if (hasRole('teacher')) return 'Teacher Dashboard';
        if (hasRole('student')) return 'Student Dashboard'; // Updated title for clarity
        return 'Dashboard';
    };

    // ... (rest of the state and helper functions remain the same)

    const canAccessCourseContentManagementSection = (
        hasPermission('course:update') || hasPermission('course:delete') ||
        hasPermission('lesson_content:update') || hasPermission('lesson_content:delete') ||
        hasPermission('question:update') || hasPermission('question:delete') ||
        hasPermission('category:update') || hasPermission('category:delete') || hasPermission('category:read:all') ||
        hasPermission('subject:update') || hasPermission('subject:delete') || hasPermission('subject:read:all') ||
        hasPermission('quiz:update') || hasPermission('quiz:read:all') || hasPermission('quiz:create') ||
        hasPermission('module:read:all') || hasPermission('module:update') || hasPermission('module:delete')
    );

    const canAccessUserSettingSection = (
        hasPermission('user:read:all') ||
        hasPermission('user:delete') ||
        hasPermission('role:update') || hasPermission('role:delete') || hasPermission('role:read:all') ||
        hasPermission('permission:update') || hasPermission('permission:delete') || hasPermission('permission:read:all')
    );

    const [isLocallyHovered, setIsLocallyHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);

        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const handleMouseEnter = () => {
        if (!isMobile) {
            setIsLocallyHovered(true);
            if (onSidebarHoverChange) {
                onSidebarHoverChange(true);
            }
        }
    };

    const handleMouseLeave = () => {
        if (!isMobile) {
            setIsLocallyHovered(false);
            if (onSidebarHoverChange) {
                onSidebarHoverChange(false);
            }
        }
    };

    const currentSidebarWidth = (isSidebarOpen || isLocallyHovered) ? 'w-64' : 'w-20';
    const currentPadding = (isSidebarOpen || isLocallyHovered) ? 'px-3' : 'px-2';
    const shouldShowTextAndCaret = isSidebarOpen || (!isMobile && isLocallyHovered);
    const baseLiClasses = 'relative py-2 rounded-lg text-sm font-bold tracking-wide transition-colors duration-200 cursor-pointer';
    const baseLinkClasses = `flex items-center gap-4 w-full h-full p-2 rounded-lg ${!shouldShowTextAndCaret ? 'justify-center' : ''}`;
    const iconClasses = 'w-5 h-5 flex-shrink-0';
    const subLinkClasses = `flex items-center gap-3 w-full h-full p-2 rounded-lg text-sm ${!shouldShowTextAndCaret ? 'justify-center' : ''}`;
    const subIconClasses = 'w-4 h-4 flex-shrink-0';

    // 🚨 UPDATED: Check for active state in the MY LEARNING section
    const isActiveLink = (path) => {
        if (path === getMainDashboardLink() && location.pathname === getMainDashboardLink()) return true;
        if (path === '/') return location.pathname === path;
        return location.pathname.startsWith(path);
    };
    
    // Helper to check if the 'MY LEARNING' section should be highlighted/open
    const isMyLearningActive = isActiveLink('/my-learning') || isActiveLink('/courses');


    const getToggleItemClasses = (isOpen, pathPrefix) => {
        // Use isMyLearningActive only for the MY LEARNING section toggle button
        const isActive = pathPrefix === '/my-learning' ? isMyLearningActive : isActiveLink(pathPrefix);
        const itemPaddingClass = shouldShowTextAndCaret ? 'px-3' : 'px-2';
        return `${baseLiClasses} ${itemPaddingClass} group text-gray-200 hover:bg-slate-700 hover:text-white ${isOpen || isActive ? 'bg-slate-700 text-white' : ''} ${!shouldShowTextAndCaret ? 'tooltip tooltip-right' : ''}`;
    };

    const getSubmenuLinkClasses = (path) => {
        const isActive = location.pathname === path; // Check for exact match for sub-links
        return `${subLinkClasses} text-gray-400 hover:text-white hover:bg-slate-800 ${isActive ? 'bg-slate-800 text-white' : ''}`;
    };

    const getIconColorClasses = (isItemActive, isToggleOpen, defaultColorClass, hoverColorClass) => {
        return `${defaultColorClass} group-hover:${hoverColorClass} ${isItemActive || isToggleOpen ? hoverColorClass : ''}`;
    };

    // Helper function to determine the avatar source
    const getAvatarSrc = (user) => {
        if (user?.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('http')) {
            return user.avatar;
        }
        return `https://ui-avatars.com/api/?name=${user?.firstName || 'U'}+${user?.lastName || 'U'}&background=random&color=fff&size=96`;
    };

    // Determine if the user is Admin or Teacher (requires Dashboard link)
    const isAdminOrTeacher = hasRole('admin') || hasRole('teacher');
    
    // Determine if the user is a student (uses the /my-learning link as dashboard)
    const isStudent = hasRole('student');

    return (
        <>
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            <section
                className={`
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0
                    ${currentSidebarWidth} ${currentPadding}
                    bg-slate-900 fixed h-full py-2 transition-all duration-300 z-20 flex flex-col
                    ${isMobile ? 'inset-y-0 left-0' : ''}
                `}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className={`my-1 mb-1 ${!shouldShowTextAndCaret ? 'flex justify-center' : ''}`}>
                    <h1 className={`text-lg text-gray-50 font-bold uppercase m-2 flex items-center gap-x-4 font-primary
                                    ${!shouldShowTextAndCaret ? 'justify-center' : ''}`}>
                        <MdSpaceDashboard className='w-8 h-8 text-yellow-400' />
                        {shouldShowTextAndCaret && getMainDashboardTitle()}
                    </h1>
                </div>
                <hr className='border-slate-700' />

                <ul className={`my-2 ${shouldShowTextAndCaret ? 'mx-3' : 'mx-0'} font-secondary space-y-2 flex-grow`}>
                    
                    {/* DASHBOARD LINK - ONLY SHOWN for Admin/Teacher */}
                    {isAdminOrTeacher && (
                        <li className={`${getToggleItemClasses(false, getMainDashboardLink())}`}
                            data-tip={!shouldShowTextAndCaret ? "Dashboard" : ""}>
                            <Link to={getMainDashboardLink()} className={baseLinkClasses} onClick={isMobile ? toggleSidebar : undefined}>
                                <IoHomeOutline className={`${iconClasses} ${getIconColorClasses(isActiveLink(getMainDashboardLink()), false, 'text-gray-400', 'text-yellow-300')}`} />
                                {shouldShowTextAndCaret && "DASHBOARD"}
                            </Link>
                        </li>
                    )}

                    {/* MY LEARNING SECTION - Shows if the user has 'course:read' permission (Students and Admins/Teachers who need to see it) */}
                    {hasPermission('course:read') && (
                        <>
                            {/* The Parent Toggle remains a button */}
                            <li className={getToggleItemClasses(isLearningOpen, '/my-learning')} onClick={toggleLearning}
                                data-tip={!shouldShowTextAndCaret ? "My Learning" : ""}>
                                <div className='flex items-center justify-between w-full'>
                                    <div className={`flex items-center gap-4 ${!shouldShowTextAndCaret ? 'justify-center w-full' : ''}`}>
                                        <IoBookOutline className={`${iconClasses} ${getIconColorClasses(isMyLearningActive, isLearningOpen, 'text-gray-400', 'text-yellow-300')}`} />
                                        {shouldShowTextAndCaret && <span>MY LEARNING</span>}
                                    </div>
                                    {shouldShowTextAndCaret && <AiOutlineCaretUp className={`text-gray-400 group-hover:text-yellow-300 ${isLearningOpen ? 'rotate-0' : 'rotate-180'}`} />}
                                </div>
                            </li>
                            {isLearningOpen && shouldShowTextAndCaret && (
                                <ul className='ml-6 mt-2 space-y-1'>
                                    {/* 🏆 NEW LINK: My Progress / Student Dashboard */}
                                    <li>
                                        <Link to='/my-learning' className={getSubmenuLinkClasses('/my-learning')} onClick={isMobile ? toggleSidebar : undefined}>
                                            <RiBookMarkedFill className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/my-learning'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                            My Learning Progress
                                        </Link>
                                    </li>
                                    
                                    {/* EXISTING LINK: All Courses (Now a sibling under the parent) */}
                                    {hasPermission('course:read:all') && ( // Use the correct permission if different from 'course:read'
                                        <li>
                                            <Link to='/courses' className={getSubmenuLinkClasses('/courses')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <FaGraduationCap className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/courses'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                All Courses
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </>
                    )}

                    {/* USER SETTING SECTION - Shows if the user has ANY of the required User/Role/Permission permissions */}
                    {canAccessUserSettingSection && (
                        <>
                            <li className={getToggleItemClasses(isUserSettingOpen, '/user-management')} onClick={toggleUserSetting}
                                data-tip={!shouldShowTextAndCaret ? "User Setting" : ""}>
                                <div className='flex items-center justify-between w-full'>
                                    <div className={`flex items-center gap-4 ${!shouldShowTextAndCaret ? 'justify-center w-full' : ''}`}>
                                        <HiOutlineUserGroup className={`${iconClasses} ${getIconColorClasses(isActiveLink('/user-management'), isUserSettingOpen, 'text-gray-400', 'text-yellow-300')}`} />
                                        {shouldShowTextAndCaret && <span>USER SETTING</span>}
                                    </div>
                                    {shouldShowTextAndCaret && <AiOutlineCaretUp className={`text-gray-400 group-hover:text-yellow-300 ${isUserSettingOpen ? 'rotate-0' : 'rotate-180'}`} />}
                                </div>
                            </li>
                            {isUserSettingOpen && shouldShowTextAndCaret && (
                                <ul className='ml-6 mt-2 space-y-1'>
                                    {hasPermission('user:read:all') && (
                                        <li>
                                            <Link to='/user-management' className={getSubmenuLinkClasses('/user-management')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <FaUser className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/user-management'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                User Management
                                            </Link>
                                        </li>
                                    )}
                                    {hasPermission('role:read:all') && (
                                        <li>
                                            <Link to='/roles' className={getSubmenuLinkClasses('/roles')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <FaServer className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/roles'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                Roles Management
                                            </Link>
                                        </li>
                                    )}
                                    {hasPermission('permission:read:all') && (
                                        <li>
                                            <Link to='/permissions' className={getSubmenuLinkClasses('/permissions')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <TbBasketCode className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/permissions'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                Permission Types
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </>
                    )}

                    {/* COURSE CONTENT MANAGEMENT SECTION - Shows if the user has ANY of the required Course Content permissions */}
                    {canAccessCourseContentManagementSection && (
                        <>
                            <li className={getToggleItemClasses(isCourseContentManagementOpen, '/courses-list')} onClick={toggleCourseContentManagement}
                                data-tip={!shouldShowTextAndCaret ? "Course Content" : ""}>
                                <div className='flex items-center justify-between w-full'>
                                    <div className={`flex items-center gap-4 ${!shouldShowTextAndCaret ? 'justify-center w-full' : ''}`}>
                                        <RiAdminLine className={`${iconClasses} ${getIconColorClasses(isActiveLink('/courses-list'), isCourseContentManagementOpen, 'text-gray-400', 'text-yellow-300')}`} />
                                        {shouldShowTextAndCaret && <span>COURSE CONTENT</span>}
                                    </div>
                                    {shouldShowTextAndCaret && <AiOutlineCaretUp className={`text-gray-400 group-hover:text-yellow-300 ${isCourseContentManagementOpen ? 'rotate-0' : 'rotate-180'}`} />}
                                </div>
                            </li>
                            {isCourseContentManagementOpen && shouldShowTextAndCaret && (
                                <ul className='ml-6 mt-2 space-y-1'>
                                    {(hasPermission('course:update') || hasPermission('course:delete')) && (
                                        <li>
                                            <Link to='/courses-list' className={getSubmenuLinkClasses('/courses-list')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <FaGraduationCap className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/courses-list'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                Manage All Courses
                                            </Link>
                                        </li>
                                    )}
                                    {(hasPermission('module:read:all')) && (
                                        <li>
                                            <Link to='/lesson-module-management' className={getSubmenuLinkClasses('/lesson-module-management')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <RiBookMarkedFill className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/lesson-module-management'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                Lesson Module Management
                                            </Link>
                                        </li>
                                    )}
                                    {(hasPermission('lesson_content:update') || hasPermission('lesson_content:delete') || hasPermission('lesson_content:read:all')) && (
                                        <li>
                                            <Link to='/lesson-content-management' className={getSubmenuLinkClasses('/lesson-content-management')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <PiFilePlusFill className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/lesson-content-management'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                Lesson Content Bank
                                            </Link>
                                        </li>
                                    )}
                                    {(hasPermission('quiz:update') || hasPermission('quiz:read:all') || hasPermission('quiz:create')) && (
                                        <li>
                                            <Link to='/quiz-management' className={getSubmenuLinkClasses('/quiz-management')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <IoListOutline className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/quiz-management'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                Quiz Module Management
                                            </Link>
                                        </li>
                                    )}
                                    {(hasPermission('question:update') || hasPermission('question:delete') || hasPermission('question:read:all')) && (
                                        <li>
                                            <Link to='/question-bank-management' className={getSubmenuLinkClasses('/question-bank-management')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <FaQuestionCircle className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/question-bank-management'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                Question Bank
                                            </Link>
                                        </li>
                                    )}
                                    {(hasPermission('category:update') || hasPermission('category:delete') || hasPermission('category:read:all')) && (
                                        <li>
                                            <Link to='/category-management' className={getSubmenuLinkClasses('/category-management')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <TiStarFullOutline className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/category-management'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                Categories
                                            </Link>
                                        </li>
                                    )}
                                    {(hasPermission('subject:update') || hasPermission('subject:delete') || hasPermission('subject:read:all')) && (
                                        <li>
                                            <Link to='/subject-management' className={getSubmenuLinkClasses('/subject-management')} onClick={isMobile ? toggleSidebar : undefined}>
                                                <FaBook className={`${subIconClasses} ${getIconColorClasses(isActiveLink('/subject-management'), false, 'text-gray-400', 'text-yellow-300')}`} />
                                                Subjects
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </>
                    )}
                </ul>

                {/* USER PROFILE CARD */}
                {user && (
                    <div className={`mt-auto mb-4 p-3 rounded-lg bg-slate-800 text-gray-200 transition-all duration-300
                                    ${shouldShowTextAndCaret ? 'text-left' : 'text-center'}`}>
                        {shouldShowTextAndCaret ? (
                            <>
                                <p className="font-semibold text-sm">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </>
                        ) : (
                            <div className="flex justify-center items-center h-full">
                                <img
                                    src={getAvatarSrc(user)}
                                    alt={`${user?.firstName}'s avatar`}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-yellow-300"
                                />
                            </div>
                        )}
                    </div>
                )}
            </section>
        </>
    );
};

export default Sidebar;