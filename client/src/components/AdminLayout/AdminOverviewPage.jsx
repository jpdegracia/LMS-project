import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    FaUsers, 
    FaUserShield, 
    FaCog, 
    FaChartBar, 
    FaShieldAlt, 
} from 'react-icons/fa';
import { FaFileCirclePlus } from 'react-icons/fa6';
import UserContext from '../UserContext/UserContext';

const AdminOverviewPage = () => {
    const { user, hasPermission } = useContext(UserContext);

    // Animation Variants for a staggered entrance
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
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
                    <div className="h-2 w-10 bg-cyan-500 rounded-full" />
                    <span className="text-cyan-400 font-bold uppercase tracking-widest text-xs">Command Center</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter">
                    Admin Overview
                </h1>
                <p className="text-slate-400 mt-2">
                    Welcome back, <span className="text-white font-bold">{user?.firstName || 'Admin'}</span>. System modules are operational.
                </p>
            </motion.div>

            {/* Main Content Grid */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {/* 1. System Status - Always Visible */}
                <motion.div 
                    variants={cardVariants}
                    className="p-6 rounded-[2rem] bg-slate-900/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden"
                >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                            <FaShieldAlt className="text-2xl" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">System Status</h2>
                    </div>
                    <div className="space-y-4">
                        <StatusRow label="Total Users" value="Active" color="text-emerald-400" />
                        <StatusRow label="Database" value="Linked" color="text-cyan-400" />
                        <StatusRow label="Security" value="Encrypted" color="text-blue-400" />
                    </div>
                </motion.div>

                {/* 2. User Management */}
                {hasPermission('user:read:all') && (
                    <AdminLinkCard 
                        to="/user-management"
                        variants={cardVariants}
                        icon={<FaUsers />}
                        title="User Management"
                        description="Manage credentials, view profiles, and handle account deletions."
                        accent="emerald"
                    />
                )}

                {/* 3. Role Management */}
                {hasPermission('role:read:all') && (
                    <AdminLinkCard 
                        to="/roles"
                        variants={cardVariants}
                        icon={<FaUserShield />}
                        title="Role Management"
                        description="Configure specific access levels and role-based permissions."
                        accent="purple"
                    />
                )}

                {/* 4. Permission Types */}
                {hasPermission('permission:read:all') && (
                    <AdminLinkCard 
                        to="/permissions"
                        variants={cardVariants}
                        icon={<FaCog />}
                        title="Permission Logic"
                        description="Fine-tune the global permission tree and system rules."
                        accent="yellow"
                    />
                )}

                {/* 5. Grade Management */}
                {hasPermission('grade:assignments') && (
                    <AdminLinkCard 
                        to="/grades"
                        variants={cardVariants}
                        icon={<FaChartBar />}
                        title="Academic Oversight"
                        description="Monitor student progress and verify automated grading."
                        accent="cyan"
                    />
                )}

                {/* 6. Course Management */}
                {hasPermission('course:read:all') && (
                    <AdminLinkCard 
                        to="/courses-list"
                        variants={cardVariants}
                        icon={<FaFileCirclePlus />}
                        title="Course Architecture"
                        description="Structure modules and verify content bank integrity."
                        accent="orange"
                    />
                )}
            </motion.div>
        </div>
    );
};

/* --- Sub-Components for Premium UI --- */

const AdminLinkCard = ({ to, icon, title, description, accent, variants }) => {
    const accents = {
        emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400 hover:text-slate-950",
        purple: "text-purple-400 bg-purple-400/10 border-purple-400/20 hover:bg-purple-400 hover:text-slate-950",
        yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20 hover:bg-yellow-400 hover:text-slate-950",
        cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20 hover:bg-cyan-400 hover:text-slate-950",
        orange: "text-orange-400 bg-orange-400/10 border-orange-400/20 hover:bg-orange-400 hover:text-slate-950",
    };

    return (
        <motion.div variants={variants} whileHover={{ y: -5 }}>
            <Link to={to} className="block group p-8 h-full rounded-[2.5rem] bg-slate-900/40 border border-slate-800 backdrop-blur-xl transition-all duration-300 hover:border-slate-600 shadow-xl relative overflow-hidden">
                {/* Hover Glow Effect */}
                <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-current`} />
                
                <div className={`w-14 h-14 flex items-center justify-center rounded-2xl mb-6 transition-all duration-300 border ${accents[accent]}`}>
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

const StatusRow = ({ label, value, color }) => (
    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <span className={`text-xs font-black uppercase ${color}`}>{value}</span>
    </div>
);

export default AdminOverviewPage;