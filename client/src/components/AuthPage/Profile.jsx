import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Mail, Key, Lock, Eye, EyeOff, Edit3, Save, 
    IdCard, XCircle, Loader2, RotateCcw, Camera, ShieldCheck, AlignLeft, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';

const Profile = () => {
    const { user, isLoggedIn, loading: userContextLoading } = useContext(UserContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', IDnumber: '', role: '', bio: '', avatar: '',
    });

    const [isEditing, setIsEditing] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    useEffect(() => {
        if (user?.id) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                IDnumber: user.IDnumber || '',
                role: user.roles?.[0]?.name || 'Student',
                bio: user.bio || '',
                avatar: user.avatar || '',
            });
        } else if (!userContextLoading && !isLoggedIn) {
            navigate('/login', { replace: true });
        }
    }, [user, userContextLoading, isLoggedIn, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // --- THE FIX IS HERE ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileError(null);
        setUpdateSuccess(false);

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/update-profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include',
            });

            const data = await res.json();

            if (res.ok && data.success !== false) {
                // 1. Trigger success message
                setUpdateSuccess(true);
                // 2. Exit edit mode automatically
                setIsEditing(false); 
                // 3. Optional: Clear success message after 3 seconds
                setTimeout(() => setUpdateSuccess(false), 3000);
            } else {
                setProfileError(data.message || "Failed to update profile.");
            }
        } catch (error) {
            setProfileError("A network error occurred. Please try again.");
        } finally {
            setProfileLoading(false);
        }
    };

    return (
        <section className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                
                {/* Header & Role Badge */}
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-black text-white tracking-tighter">My Profile<span className="text-cyan-400">°</span></h1>
                            <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center gap-2">
                                <ShieldCheck size={14} className="text-cyan-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{formData.role}</span>
                            </div>
                        </div>
                        <p className="text-slate-400">Manage your identity and bio.</p>
                    </div>

                    {/* Success Alert - Pops up next to the title */}
                    <AnimatePresence>
                        {updateSuccess && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold shadow-lg"
                            >
                                <CheckCircle2 size={18} /> Profile Updated!
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!isEditing && (
                        <motion.button 
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setIsEditing(true)}
                            className="bg-white text-slate-950 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-cyan-400 transition-colors cursor-pointer"
                        >
                            <Edit3 size={18} /> Edit Profile
                        </motion.button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8">
                    
                    {/* Top Section: Identity Row */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl"
                    >
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="relative group">
                                <img 
                                    src={formData.avatar || `https://ui-avatars.com/api/?name=${formData.firstName}+${formData.lastName}&background=0D9488&color=fff&size=200`} 
                                    className="w-32 h-32 rounded-[2rem] object-cover border-4 border-slate-800 shadow-2xl" 
                                    alt="Avatar" 
                                />
                                {isEditing && (
                                    <div className="absolute inset-0 bg-slate-950/60 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <Camera size={24} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                <div className="form-input-container group">
                                    <label className="form-label">First Name</label>
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} disabled={!isEditing} className={`form-input shadow-inner ${!isEditing ? 'opacity-50 bg-slate-800 border-transparent text-slate-400' : ''}`} />
                                </div>
                                <div className="form-input-container group">
                                    <label className="form-label">Last Name</label>
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} disabled={!isEditing} className={`form-input shadow-inner ${!isEditing ? 'opacity-50 bg-slate-800 border-transparent text-slate-400' : ''}`} />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Description Section */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-xl"
                    >
                        <div className="form-input-container group">
                            <div className="flex items-center gap-2 mb-4">
                                <AlignLeft size={18} className="text-cyan-400" />
                                <label className="form-label !mb-0 text-white text-sm">About Me</label>
                            </div>
                            <textarea 
                                name="bio" 
                                rows="8" 
                                value={formData.bio} 
                                onChange={handleChange} 
                                disabled={!isEditing} 
                                className={`w-full bg-white border border-slate-300 rounded-3xl p-6 text-slate-900 font-medium placeholder:text-slate-400 shadow-inner outline-none transition-all focus:ring-4 focus:ring-cyan-500/20 leading-relaxed ${!isEditing ? 'opacity-50 bg-slate-800 border-transparent text-slate-400' : ''}`} 
                                placeholder="Describe your academic background..." 
                            />
                        </div>

                        {/* ID and Email (Muted/Locked) */}
                        <div className="mt-10 pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex items-center gap-4 text-slate-400 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                                <IdCard className="text-cyan-500/50" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Identity Number</p>
                                    <p className="text-sm font-mono">{formData.IDnumber || 'NOT ASSIGNED'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-slate-400 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                                <Mail className="text-cyan-500/50" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Login Email</p>
                                    <p className="text-sm font-mono">{formData.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Error Handling */}
                        <AnimatePresence>
                            {profileError && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold text-center">
                                    {profileError}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action Buttons */}
                        {isEditing && (
                            <div className="flex justify-end gap-4 mt-10">
                                <button type="button" onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white transition-colors cursor-pointer">
                                    <XCircle size={18} /> Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={profileLoading}
                                    className="bg-emerald-500 text-slate-950 px-10 py-3 rounded-xl font-black uppercase tracking-tighter flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {profileLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
                                    {profileLoading ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </form>
            </div>
        </section>
    );
};

export default Profile;