import React, { useState, useContext } from 'react';
import { MdSpaceDashboard, MdScore } from "react-icons/md";
import { Link } from 'react-router-dom';
import { PiPlusCircleFill } from "react-icons/pi";
import { GrInProgress, GrDocumentPerformance } from "react-icons/gr";
import { FaFileCirclePlus } from "react-icons/fa6";
import { RiAdminLine } from "react-icons/ri";
import { AiOutlineCaretDown, AiOutlineCaretUp } from "react-icons/ai";
import { IoMdSettings } from "react-icons/io";
import { FaUser } from "react-icons/fa";
import { RiBookMarkedFill } from "react-icons/ri";
import { TiStarFullOutline } from "react-icons/ti";
import { FaServer } from "react-icons/fa";
import { PiFilePlusFill } from "react-icons/pi";
import { IoHomeOutline } from "react-icons/io5";
import { IoBookOutline } from "react-icons/io5";
import { TbBulbFilled } from "react-icons/tb"; // Corrected: Reverted to original import path

import UserContext from '../UserContext/UserContext';


const Sidebar = ({ isSidebarOpen, role }) => {
    const { hasRole, hasPermission } = useContext(UserContext);

    const [isLearningOpen, setIsLearningOpen] = useState(false);
    const [isAdministrationOpen, setIsAdministrationOpen] = useState(false);

    const toggleLearning = () => {
        setIsLearningOpen(!isLearningOpen);
    };

    const toggleAdministration = () => {
        setIsAdministrationOpen(!isAdministrationOpen);
    };

    return (
        <section className={`w-64 bg-sky-400 fixed h-full px-3 py-2 transition-transform duration-300 z-20 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className='my-2 mb-4'>
                <h1 className='text-2xl text-slate-900 font-bold uppercase m-3 flex items-center gap-2'>
                    <MdSpaceDashboard className='w-8 h-8' />
                    Dashboard
                </h1>
            </div>
            <hr className='border-slate-800' />

            <ul className='my-7 text-slate-900 font-bold mx-3'>
                <li className='sidebar-main-text-1'>
                    <Link to='/home' className='px-3 flex items-center gap-4'>
                        <IoHomeOutline className='w-5 h-5' />
                        HOME
                    </Link>
                </li>
                <li className='sidebar-main-text-1 cursor-pointer' onClick={toggleLearning}>
                    <div className='px-3 flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                            <IoBookOutline className='w-5 h-5' />
                            <Link to='/my-learning' className='no-underline'>MY LEARNING</Link>
                        </div>
                        {isLearningOpen ? <AiOutlineCaretUp /> : <AiOutlineCaretDown />}
                    </div>
                </li>
                {isLearningOpen && (
                    <ul className='ml-6 mt-2'>
                        {/* Create Module: Requires 'create_courses' permission or 'admin' role */}
                        {(hasRole('admin') || hasPermission('create_courses')) && (
                            <li className='sidebar-main-text-2'>
                                <Link to='/create-module' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                    <PiFilePlusFill className='w-4 h-4' />
                                    Create Module
                                </Link>
                            </li>
                        )}
                        {/* Create Exam: Requires 'create_courses' permission (or similar) */}
                        {(hasRole('admin') || hasPermission('create_courses')) && (
                            <li className='sidebar-main-text-2'>
                                <Link to='/create-exam' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                    <FaFileCirclePlus className='w-4 h-4' />
                                    Create Exam
                                </Link>
                            </li>
                        )}
                        {/* Student-specific learning items */}
                        {hasRole('student') && (
                            <>
                                <li className='sidebar-main-text-2'>
                                    <Link to='/practice-exam' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                        <TbBulbFilled className='w-4 h-4' />
                                        Practice Exam
                                    </Link>
                                </li>
                                <li className='sidebar-main-text-2'>
                                    <Link to='/module/in-progress' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                        <PiPlusCircleFill className='w-4 h-4' />
                                        In Progress
                                    </Link>
                                </li>
                                <li className='sidebar-main-text-2'>
                                    <Link to='/module/completed' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                        <GrInProgress className='w-4 h-4' />
                                        Completed
                                    </Link>
                                </li>
                                <li className='sidebar-main-text-2'>
                                    <Link to='/module/score' className='px-3 flex items-center gap-4 text-sm'>
                                        <MdScore className='w-4 h-4' />
                                        Score
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                )}

                <li className='sidebar-main-text-1'>
                    <Link to='/performance' className='px-3 flex items-center gap-4'>
                        <GrDocumentPerformance className='w-5 h-5' />
                        PERFORMANCE
                    </Link>
                </li>

                {/* Administration Section: Accessible if user has ANY admin-related permission (e.g., user:read) */}
                {
                    (hasRole('admin') || hasPermission('user:read') || hasPermission('role:read')) && (
                        <>
                            <li className='sidebar-main-text-1 cursor-pointer' onClick={toggleAdministration}>
                                <div className='px-3 flex items-center justify-between'>
                                    <div className='flex items-center gap-4'>
                                        <RiAdminLine className='w-5 h-5' />
                                        ADMINISTRATION
                                    </div>
                                    {isAdministrationOpen ? <AiOutlineCaretUp /> : <AiOutlineCaretDown />}
                                </div>
                            </li>
                            {isAdministrationOpen && (
                                <ul className='ml-6 mt-2'>
                                    {/* General Settings - if they can view any admin settings */}
                                    {(hasPermission('user:read') || hasPermission('role:read')) && ( // Example, adjust as needed
                                        <li className='sidebar-main-text-2'>
                                            <Link to='/admin/settings' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                                <IoMdSettings className='w-4 h-4' />
                                                General Settings
                                            </Link>
                                        </li>
                                    )}
                                    {/* User Management */}
                                    {hasPermission('user:read') && (
                                        <li className='sidebar-main-text-2'>
                                            <Link to='/admin/users' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                                <FaUser className='w-4 h-4' />
                                                User Management
                                            </Link>
                                        </li>
                                    )}
                                    {/* Roles Management */}
                                    {hasPermission('role:read') && (
                                        <li className='sidebar-main-text-2'>
                                            <Link to='/admin/roles' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                                <RiBookMarkedFill className='w-4 h-4' />
                                                Roles Management
                                            </Link>
                                        </li>
                                    )}
                                    {/* Grade Management: hasPermission('grade_assignments') from teacher role */}
                                    {hasPermission('grade_assignments') && (
                                        <li className='sidebar-main-text-2'>
                                            <Link to='/admin/grades' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                                <TiStarFullOutline className='w-4 h-4' />
                                                Grade Management
                                            </Link>
                                        </li>
                                    )}
                                    {/* Server Settings: needs a specific permission like 'server:manage' (you'll define this) */}
                                    {hasPermission('server:manage') && ( // Example permission
                                        <li className='sidebar-main-text-2'>
                                            <Link to='/admin/server' className='px-3 py-1 flex items-center gap-4 text-sm'>
                                                <FaServer className='w-4 h-4' />
                                                Server Settings
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </>
                    )
                }
            </ul>
        </section>
    );
};

export default Sidebar;