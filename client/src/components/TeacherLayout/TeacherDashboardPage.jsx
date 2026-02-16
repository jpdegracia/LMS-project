import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    FaChalkboardTeacher, 
    FaClipboardCheck, 
    FaUserGraduate, 
    FaBookOpen
} from 'react-icons/fa';
import { PiStudentFill } from 'react-icons/pi';
import { HiOutlineLightningBolt, HiOutlineChevronRight } from 'react-icons/hi';
import UserContext from '../UserContext/UserContext';

const TeacherDashboardPage = () => {
    const { user, roleNames, hasPermission } = useContext(UserContext);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1,
            transition: { type: "spring", stiffness: 400, damping: 30 }
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10">
            {/* Header Section */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-10"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-2 w-10 bg-emerald-500 rounded-full" />
                    <span className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Faculty Hub</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter">
                    Teacher Dashboard<span className="text-cyan-400">°</span>
                </h1>
                <p className="text-slate-400 mt-2">
                    Welcome, <span className="text-white font-bold">{user?.firstName || 'Educator'}</span>. Your classes are ready for review.
                </p>
            </motion.div>

            {/* Verification Alert */}
            {user?.isVerified === false && (
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-8 p-4 border border-amber-500/30 rounded-2xl bg-amber-500/10 text-amber-200 flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <HiOutlineLightningBolt className="text-2xl animate-pulse text-amber-400" />
                        <p className="text-sm font-medium">Your faculty account is unverified. Some administrative tools may be restricted.</p>
                    </div>
                    <button className="text-xs font-bold uppercase tracking-tighter border-b border-amber-400 hover:text-white transition-colors">Resend Link</button>
                </motion.div>
            )}

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {/* 1. Profile Summary */}
                <motion.div variants={cardVariants} className="p-6 rounded-[2.5rem] bg-slate-900/60 border border-slate-800 backdrop-blur-xl group">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all duration-300">
                            <FaBookOpen className="text-xl" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Profile & Role</h2>
                    </div>
                    <div className="space-y-3 mb-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Active Email</span>
                            <span className="text-sm text-slate-200 truncate">{user?.email}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Designation</span>
                            <span className="text-sm text-emerald-400 font-bold">{roleNames.join(' & ') || 'Teacher'}</span>
                        </div>
                    </div>
                    <Link to="/profile" className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all">
                        Edit Full Profile <HiOutlineChevronRight />
                    </Link>
                </motion.div>

                {/* 2. My Students */}
                {hasPermission('user:read:all') && (
                    <TeacherLinkCard 
                        to="/user-management"
                        variants={cardVariants}
                        icon={<PiStudentFill />}
                        title="My Students"
                        description="Monitor individual progress, view test history, and manage student enrollment."
                        accent="emerald"
                    />
                )}

                {/* 3. Course Creator */}
                {hasPermission('course:create') && (
                    <TeacherLinkCard 
                        to="/courses-list"
                        variants={cardVariants}
                        icon={<FaChalkboardTeacher />}
                        title="Course Builder"
                        description="Draft new learning modules, upload resources, and structure curricula."
                        accent="purple"
                    />
                )}

                {/* 4. Gradebook */}
                {hasPermission('grade:assignments') && (
                    <TeacherLinkCard 
                        to="/grades"
                        variants={cardVariants}
                        icon={<FaClipboardCheck />}
                        title="Gradebook"
                        description="Review submissions, provide feedback, and finalize student scores."
                        accent="amber"
                    />
                )}
            </motion.div>
        </div>
    );
};

/* --- Reusable Teacher Card --- */
const TeacherLinkCard = ({ to, icon, title, description, accent, variants }) => {
    const accentStyles = {
        emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20 group-hover:bg-emerald-400 group-hover:text-slate-950",
        purple: "text-purple-400 bg-purple-400/10 border-purple-400/20 group-hover:bg-purple-400 group-hover:text-slate-950",
        amber: "text-amber-400 bg-amber-400/10 border-amber-400/20 group-hover:bg-amber-400 group-hover:text-slate-950",
    };

    return (
        <motion.div variants={variants} whileHover={{ y: -5 }}>
            <Link to={to} className="block group p-8 h-full rounded-[2.5rem] bg-slate-900/40 border border-slate-800 backdrop-blur-xl transition-all duration-300 hover:border-slate-600 shadow-xl relative overflow-hidden">
                <div className={`w-14 h-14 flex items-center justify-center rounded-2xl mb-6 transition-all duration-300 border ${accentStyles[accent]}`}>
                    <span className="text-2xl">{icon}</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight mb-2 group-hover:text-cyan-400 transition-colors">
                    {title}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                    {description}
                </p>
            </Link>
        </motion.div>
    );
};

export default TeacherDashboardPage;