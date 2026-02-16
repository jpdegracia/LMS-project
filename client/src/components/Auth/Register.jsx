import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlineBadgeCheck, HiEye, HiEyeOff } from 'react-icons/hi';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import UserContext from '../UserContext/UserContext';

const Register = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [IDnumber, setIDnumber] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [emailSentMessage, setEmailSentMessage] = useState('');
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        setIsActive(firstName.trim() !== '' && lastName.trim() !== '' && email.trim() !== '' && password.length >= 8);
    }, [firstName, lastName, email, password]);

    useEffect(() => {
        if (user?.id) navigate('/dashboard');
    }, [user?.id, navigate]);

    const registerUser = async (e) => {
        e.preventDefault();
        setErrors({});
        setEmailSentMessage('');

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password, IDnumber, roleName: 'student' }),
            });

            const data = await response.json();
            if (response.ok && data.success) {
                setEmailSentMessage(`Verification email sent to ${email}.`);
                // Clear fields
                setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setIDnumber('');
            } else {
                setErrors({ general: data.message || 'Registration failed.' });
            }
        } catch (error) {
            setErrors({ general: 'Network error. Please try again.' });
        }
    };

    return (
        <section className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            
            <main className="flex-grow flex items-center justify-center py-20 px-4">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 md:p-12 rounded-[2.5rem] shadow-2xl"
                >
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-2">Join the Guru</h2>
                        <p className="text-slate-400">Exceptional people nurturing exceptional people.</p>
                    </div>

                    <form onSubmit={registerUser} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 ml-1">First Name</label>
                                <div className="relative">
                                    <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                    <input 
                                        type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                        className="form-input !pl-12" placeholder="First Name" required 
                                    />
                                </div>
                            </div>
                            {/* Last Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 ml-1">Last Name</label>
                                <div className="relative">
                                    <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                    <input 
                                        type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                                        className="form-input !pl-12" placeholder="Last Name" required 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">Email Address</label>
                            <div className="relative">
                                <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                <input 
                                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="form-input !pl-12" placeholder="jane@example.com" required 
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">Password (8+ characters)</label>
                            <div className="relative">
                                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                                <input 
                                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="form-input !pl-12 !pr-12" placeholder="••••••••" required 
                                />
                                <button 
                                    type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <HiEyeOff /> : <HiEye />}
                                </button>
                            </div>
                        </div>

                        {/* Role (Read Only) */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">Account Type</label>
                            <div className="relative">
                                <HiOutlineBadgeCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 text-lg" />
                                <input 
                                    type="text" value="Student" disabled 
                                    className="form-input !pl-12 bg-slate-900/80 border-cyan-500/30 text-cyan-400 font-bold" 
                                />
                            </div>
                        </div>

                        {/* Error/Success Messages */}
                        <AnimatePresence>
                            {(errors.general || emailSentMessage) && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`text-center text-sm font-bold p-3 rounded-xl ${errors.general ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}
                                >
                                    {errors.general || emailSentMessage}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            whileHover={isActive ? { scale: 1.02 } : {}}
                            whileTap={isActive ? { scale: 0.98 } : {}}
                            type="submit"
                            disabled={!isActive}
                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${isActive ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                        >
                            Agree & Join
                        </motion.button>

                        <p className="text-center text-slate-500 text-xs px-8 leading-relaxed">
                            By joining, you agree to our <Link to="#" className="text-slate-300 underline">Terms of Use</Link> and <Link to="#" className="text-slate-300 underline">Privacy Policy</Link>.
                        </p>

                        <div className="text-center border-t border-slate-700/50 pt-6">
                            <p className="text-slate-400">
                                Already have an account? 
                                <Link to="/login" className="text-cyan-400 font-bold ml-2 hover:underline">Login</Link>
                            </p>
                        </div>
                    </form>
                </motion.div>
            </main>

            <Footer />
        </section>
    );
};

export default Register;