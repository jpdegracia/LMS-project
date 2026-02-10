import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    // Role is fixed to 'student' and not user-selectable
    const [roleName, setRoleName] = useState('student'); // Default and fixed to 'student'
    const [showPassword, setShowPassword] = useState(false);

    const [errors, setErrors] = useState({});
    const [emailSentMessage, setEmailSentMessage] = useState('');
    const [registrationAttempted, setRegistrationAttempted] = useState(false);

    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        setIsActive(firstName.trim() !== '' && lastName.trim() !== '' && email.trim() !== '' && password.length >= 8);
    }, [firstName, lastName, email, password]);

    useEffect(() => {
        if (user?.id) {
            navigate('/dashboard');
        }
    }, [user?.id, navigate]);

    useEffect(() => {
        if (registrationAttempted) {
            const timer = setTimeout(() => {
                setEmailSentMessage('');
                setErrors({});
                setRegistrationAttempted(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [registrationAttempted]);


    const validateForm = () => {
        let isValid = true;
        const newErrors = {};

        if (!firstName.trim()) {
            newErrors.firstName = 'First Name is required.';
            isValid = false;
        }
        if (!lastName.trim()) {
            newErrors.lastName = 'Last Name is required.';
            isValid = false;
        }
        if (!email.trim()) {
            newErrors.email = 'Email is required.';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Invalid email address';
            isValid = false;
        }

        if (!password) {
            newErrors.password = 'Password is required.';
            isValid = false;
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
            isValid = false;
        }

        // Role validation check: Ensure it's not empty (which it won't be since it's hardcoded)
        if (!roleName.trim()) {
            newErrors.roleName = 'Role is required.'; 
            isValid = false;
        } 
        // No need for 'student', 'teacher', 'admin' check here since it's fixed.
        // The backend will enforce what's allowed.

        setErrors(newErrors);
        return isValid;
    };

    const registerUser = async (e) => {
        e.preventDefault();
        setRegistrationAttempted(true);
        setEmailSentMessage('');
        setErrors({});

        if (!validateForm()) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password,
                    IDnumber,
                    roleName: roleName.toLowerCase(), // Always send 'student'
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setEmailSentMessage(`An email has been sent to ${email} to verify your account. Please check your inbox and spam folder.`);
                setFirstName('');
                setLastName('');
                setEmail('');
                setPassword('');
                setIDnumber('');
                setRoleName('student'); // Reset to default student role (redundant but harmless)

            } else {
                setEmailSentMessage('');
                if (data.message) {
                    if (data.message.includes("Email already exists")) {
                        setErrors(prevErrors => ({ ...prevErrors, email: data.message }));
                    } else if (data.message.includes("Password must be at least 8 characters long")) {
                        setErrors(prevErrors => ({ ...prevErrors, password: data.message }));
                    } else if (data.message.includes("Role")) { // Catch backend role errors
                        setErrors(prevErrors => ({ ...prevErrors, roleName: data.message }));
                    } else {
                        setErrors(prevErrors => ({ ...prevErrors, general: data.message }));
                    }
                } else {
                    setErrors({ general: 'Registration failed. Please try again.' });
                }
            }
        } catch (error) {
            console.error('Error during registration:', error);
            setEmailSentMessage('');
            setErrors({ general: 'A network error occurred. Please try again later.' });
        }
    };

    return (
        <section>
            <Navbar />

            <div className="mt-20 mb-20 flex justify-center rounded-3xl border border-black bg-white drop-shadow-2xl p-8 max-w-xl mx-auto">
                <form onSubmit={registerUser} className="w-full space-y-6">
                    <h2 className="text-center text-3xl form-secondary font-bold text-gray-700">Sign up with email</h2>
                    <p className="text-center font-normal form-secondary text-gray-700">
                        Learn on your own time from top universities and businesses.
                    </p>

                    {errors.general && <p className="text-red-500 text-center">{errors.general}</p>}
                    {emailSentMessage && (
                        <p className="text-green-600 text-center font-semibold animate-fade-in-down">
                            {emailSentMessage}
                        </p>
                    )}

                    {/* First Name */}
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-medium form-secondary text-gray-700 mb-1">
                            First Name: <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Enter your first name"
                            className={`form ${errors.firstName ? 'border-red-500' : ''}`}
                            required
                        />
                        {errors.firstName && <p className="text-red-500 text-xs italic">{errors.firstName}</p>}
                    </div>

                    {/* Last Name */}
                    <div>
                        <label htmlFor="lastName" className="block text-sm font-medium form-secondary text-gray-700 mb-1">
                            Last Name: <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Enter your last name"
                            className={`form ${errors.lastName ? 'border-red-500' : ''}`}
                            required
                        />
                        {errors.lastName && <p className="text-red-500 text-xs italic">{errors.lastName}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium form-secondary text-gray-700 mb-1">
                            Email: <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="sample@mail.com"
                            className={`form ${errors.email ? 'border-red-500' : ''}`}
                            required
                        />
                        {errors.email && <p className="text-red-500 text-xs italic">{errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium form-secondary text-gray-700 mb-1">
                            Password: <span className="text-red-500">*</span>
                        </label>
                        <p className="text-sm text-gray-300 form-secondary mb-1">Minimum of 8 characters</p>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Create password"
                                className={`form ${errors.password ? 'border-red-500' : ''} pr-10`}
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
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    ) : (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                    )}
                                </svg>
                            </div>
                        </div>
                        {errors.password && <p className="text-red-500 text-xs italic">{errors.password}</p>}
                    </div>

                    {/* ID Number - Keep as optional, potentially disabled */}
                    <div>
                        <label htmlFor="IDnumber" className="block text-sm font-medium form-secondary text-gray-700 mb-1">
                            ID Number:
                        </label>
                        <input
                            type="text"
                            id="IDnumber"
                            value={IDnumber}
                            onChange={(e) => setIDnumber(e.target.value)}
                            placeholder="Enter your ID number (optional)"
                            className="form"
                            // disabled // Keep disabled if you don't want users to fill it
                        />
                        {errors.IDnumber && <p className="text-red-500 text-xs italic">{errors.IDnumber}</p>}
                    </div>

                    {/* Role Display - Fixed to Student */}
                    <div>
                        <label htmlFor="roleName" className="block text-sm font-medium form-secondary text-gray-700 mb-1">
                            Role: <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="roleName"
                            value="Student" // Fixed value display
                            className={`form ${errors.roleName ? 'border-red-500' : ''}`}
                            disabled // Make it read-only
                            required // Still required for form submission
                        />
                        {errors.roleName && <p className="text-red-500 text-xs italic">{errors.roleName}</p>}
                    </div>

                    <button
                        type="submit"
                        className={`mt-4 w-full text-white rounded-2xl py-2 font-semibold transition duration-300 ${
                            isActive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!isActive}
                    >
                        Agree & Join
                    </button>

                    <div className="mt-4 text-sm text-gray-700">
                        <label className="inline-flex items-start space-x-2">
                            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" required/>
                            <span>
                                By signing up, you agree to our{' '}
                                <Link to="#" className="form-secondary text-blue-700 underline hover:text-blue-900">Terms of Use</Link> and{' '}
                                <Link to="#" className="form-secondary text-blue-700 underline hover:text-blue-900">Privacy Policy</Link>.
                            </span>
                        </label>
                    </div>

                    <div className="text-center mt-6">
                        <p className="text-[18px] form-secondary">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-700 form-secondary underline hover:text-blue-900 font-bold ml-1">
                                Login
                            </Link>
                        </p>
                    </div>
                </form>
            </div>

            <Footer />
        </section>
    );
};

export default Register;