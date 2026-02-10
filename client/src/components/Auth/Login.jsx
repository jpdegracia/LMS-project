import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner'; // Import Sonner
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

    // Redirection logic for users already logged in
    useEffect(() => {
        if (isLoggedIn && !loading) {
            if (hasRole('admin')) {
                navigate('/admin/dashboard', { replace: true });
            } else if (hasRole('teacher')) {
                navigate('/teacher/dashboard', { replace: true });
            } else if (hasRole('student')) {
                navigate('/courses', { replace: true });
            } else {
                navigate('/dashboard', { replace: true }); 
            }
        }
    }, [isLoggedIn, loading, hasRole, navigate]);

    useEffect(() => {
        setIsActive(email !== '' && password !== '');
    }, [email, password]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Validation Toast
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            toast.error('Please enter a valid email address.');
            return;
        }

        setSubmitting(true);
        
        // 2. The Login Promise
        // We use toast.promise to handle the loading, success, and error states automatically
        const loginPromise = login(email, password);

        toast.promise(loginPromise, {
            loading: 'Authenticating...',
            success: (loginSuccess) => {
                if (loginSuccess) {
                    return 'Welcome back!';
                } else {
                    // This handles cases where login() returns false instead of throwing
                    throw new Error("Login failed"); 
                }
            },
            error: (err) => {
                // Determine the error message based on your context logic
                if (contextError?.toLowerCase().includes('not verified')) {
                    return 'Your email is not verified. Please check your inbox.';
                }
                if (contextError?.toLowerCase().includes('invalid credentials')) {
                    return 'Incorrect email or password.';
                }
                return contextError || 'An error occurred during login.';
            },
        });

        const loginSuccess = await loginPromise;
        setSubmitting(false);

        // 3. Post-Login Redirection
        if (loginSuccess) { 
            if (hasRole('admin')) {
                navigate('/admin/dashboard', { replace: true });
            } else if (hasRole('teacher')) {
                navigate('/teacher/dashboard', { replace: true });
            } else if (hasRole('student')) {
                navigate('/courses', { replace: true });
            } 
        }
    };

    return (
        <section className="min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-grow flex items-center justify-center py-10 px-4">
                <div className="rounded-3xl border border-black bg-white drop-shadow-2xl p-8 max-w-lg w-full">
                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                        <h2 className="text-center text-3xl form-secondary font-bold text-gray-700">Welcome Back!</h2>

                        {/* Note: I removed the contextError <p> tag here because 
                            the toast now handles the error display globally. */}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium form-secondary text-gray-700 mb-1">
                                Email: <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium form-secondary text-gray-700 mb-1">
                                Password: <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        )}
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-start">
                            <Link to="/forgot-password" className="text-sm form-secondary text-blue-700 hover:text-blue-900">
                                Forgot Password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className={`mt-4 w-full text-white rounded-2xl py-2 font-semibold transition duration-300 cursor-pointer ${
                                isActive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                            }`}
                            disabled={!isActive || submitting || loading}
                        >
                            {submitting || loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </section>
    );
};

export default Login;