import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { HiOutlineMail, HiOutlineLockClosed, HiEye, HiEyeOff, HiChevronRight } from 'react-icons/hi';
import Footer from '../Footer/Footer';
import Navbar from '../Navbar/Navbar';
import UserContext from '../UserContext/UserContext';

const Login = () => {
    const { login, error: contextError, isLoggedIn, loading, hasRole } = useContext(UserContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    // Redirection Logic
    useEffect(() => {
        if (isLoggedIn && !loading) {
            if (hasRole('admin')) navigate('/admin/dashboard', { replace: true });
            else if (hasRole('teacher')) navigate('/teacher/dashboard', { replace: true });
            else if (hasRole('student')) navigate('/courses', { replace: true });
            else navigate('/dashboard', { replace: true });
        }
    }, [isLoggedIn, loading, hasRole, navigate]);

    useEffect(() => {
        setIsActive(email !== '' && password !== '');
    }, [email, password]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (email && !/\S+@\S+\.\S+/.test(email)) {
            toast.error('Please enter a valid email address.');
            return;
        }

        setSubmitting(true);
        const loginPromise = login(email, password);

        toast.promise(loginPromise, {
            loading: 'Authenticating...',
            success: (success) => success ? 'Welcome back!' : 'Login failed',
            error: (err) => {
                if (contextError?.toLowerCase().includes('not verified')) return 'Email not verified.';
                if (contextError?.toLowerCase().includes('invalid credentials')) return 'Incorrect email or password.';
                return contextError || 'Login error.';
            },
        });

        await loginPromise;
        setSubmitting(false);
    };

    return (
        <section className="min-h-screen bg-slate-950 flex flex-col overflow-hidden">
            <Navbar />
            
            <main className="flex-grow flex items-center justify-center py-20 px-4 relative">
                {/* Background Glow Effect */}
                <div className="absolute w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl z-10"
                >
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-2">
                            Welcome Back
                        </h2>
                        <p className="text-slate-400 text-sm font-medium">Log in to your account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-2">
                        {/* Email Field */}
                        <div className="form-input-container">
                            <label className="form-label">Email Address</label>
                            <div className="relative">
                                <HiOutlineMail className="input-icon" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input shadow-inner"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="form-input-container">
                            <div className="flex justify-between items-center mb-1">
                                <label className="form-label !mb-0">Password</label>
                                <Link to="/forgot-password" size="sm" className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider">
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <HiOutlineLockClosed className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input shadow-inner !pr-14"
                                    placeholder="••••••••"
                                    required
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-600 transition-colors cursor-pointer"
                                >
                                    {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Login Button */}
                        <motion.button
                            whileHover={isActive ? { scale: 1.02 } : {}}
                            whileTap={isActive ? { scale: 0.98 } : {}}
                            type="submit"
                            disabled={!isActive || submitting || loading}
                            className={`w-full py-4 mt-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                                isActive && !submitting && !loading
                                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 cursor-pointer' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed '
                            }`}
                        >
                            {submitting || loading ? 'Authenticating...' : (
                                <>
                                    Login <HiChevronRight className="text-xl" />
                                </>
                            )}
                        </motion.button>

                        <div className="text-center pt-8 mt-4 border-t border-slate-800">
                            <p className="text-slate-400 text-sm">
                                New to EduGlobal?
                                <Link to="/register" className="text-cyan-400 font-bold ml-2 hover:underline">
                                    Create an account
                                </Link>
                            </p>
                        </div>
                    </form>
                </motion.div>
            </main>

            <Footer />
        </section>
    );
};

export default Login;