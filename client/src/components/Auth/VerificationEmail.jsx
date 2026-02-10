import React, { useState, useEffect, useCallback, useContext } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../Navbar/Navbar'; 
import Footer from '../Footer/Footer'; 
import UserContext from '../UserContext/UserContext';



const VerificationEmail = () => {
    // Destructure directly from useContext(UserContext)
    const { user, loading: userContextLoading, retrieveUserDetails } = useContext(UserContext); 

    const [verificationStatus, setVerificationStatus] = useState('idle'); 
    const [message, setMessage] = useState(''); 
    const [displayEmail, setDisplayEmail] = useState(''); 
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0); 

    // State for password fields
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPasswordForm, setShowPasswordForm] = useState(false); 

    const navigate = useNavigate();
    const { token } = useParams(); 

    // --- Core Verification Logic ---
    const verifyAndSetPassword = useCallback(async (verificationToken, password) => {
        setVerificationStatus('verifying');
        setMessage('Verifying your email and setting your password...');
        setPasswordError(''); // Clear any previous password errors

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/verify-email/${verificationToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: password }),
                credentials: 'include', // Essential for sending/receiving httpOnly cookies
            });

            const data = await response.json(); // Always parse JSON to get message/success

            if (response.ok && data.success) {
                setVerificationStatus('success');
                setMessage(data.message || 'Email verified and password set successfully! Redirecting to login...');
                
                // CRUCIAL: Call retrieveUserDetails to update the global user state
                // This will update user.isVerified and their permissions in the context.
                await retrieveUserDetails(); 

                setTimeout(() => {
                    navigate('/login'); // Redirect to login after a short delay
                }, 3000); // Give user time to read success message
            } else {
                setVerificationStatus('error');
                setMessage(data.message || 'Verification failed. The link might be invalid or expired.');
                
                // If it's an "already verified" message from the backend, handle it gracefully
                if (data.message && data.message.includes("Email is already verified")) {
                    setVerificationStatus('already_verified'); // New status for clarity
                    setMessage(data.message + ' You will be redirected to the login page.');
                    setTimeout(() => {
                        navigate('/login'); // Redirect to login if already verified
                    }, 3000);
                } else {
                    setShowPasswordForm(false); // Hide the form if verification fails (unless already verified)
                }
            }
        } catch (error) {
            console.error('Verification error:', error);
            setVerificationStatus('error');
            setMessage('A network error occurred during verification. Please try again.');
            setShowPasswordForm(false); // Hide the form on network error
        }
    }, [navigate, retrieveUserDetails]); // retrieveUserDetails is a dependency for useCallback

    // --- Effect to trigger initial checks when component mounts or token changes ---
    useEffect(() => {
        // If there's no token in the URL, display error and hide form
        if (!token) {
            setVerificationStatus('error');
            setMessage('No verification token found in the URL. Please use the link sent to your email.');
            setShowPasswordForm(false);
            return; // Exit early
        }

        // If a token IS present, assume we should show the password form.
        // The actual verification happens on form submission.
        setShowPasswordForm(true);
        setVerificationStatus('idle'); // Set to idle, waiting for user action
        setMessage('Please set your new password to verify your email and activate your account.');
    }, [token]);

    // Set the email for display based on user context (if logged in)
    useEffect(() => {
        if (user?.email) { // Access user.email from the context
            setDisplayEmail(user.email);
        }
    }, [user?.email]); // Dependency on user.email

    // Handle resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => {
            setResendCooldown((prev) => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const minutes = Math.floor(resendCooldown / 60);
    const seconds = resendCooldown % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const handleResend = async () => {
        // If user is not logged in (user is null) or their email isn't available, warn them
        if (!user?.email) {
            setResendMessage('To resend, please log in first so we know your email. If you just registered, you may not be logged in yet.');
            return;
        }
        // If user is already verified, no need to resend
        if (user.isVerified) {
             setResendMessage('Your account is already verified.');
             return;
        }

        setResendLoading(true);
        setResendMessage('');
        setMessage(''); // Clear any main verification messages

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }), // Use user.email from context
                credentials: 'include',
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setResendMessage('A new verification link has been sent! Please check your email.');
                setResendCooldown(900); // 15 minutes cooldown (900 seconds)
            } else {
                setResendMessage(data.message || 'Failed to resend verification link.');
            }
        } catch (err) {
            console.error('Error during resending link:', err);
            setResendMessage('An error occurred while resending the link.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleSubmitPassword = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match.');
            return;
        }

        if (newPassword.length < 8) { // Example: minimum 8 characters
            setPasswordError('Password must be at least 8 characters long.');
            return;
        }

        if (token) {
            await verifyAndSetPassword(token, newPassword);
        } else {
            setVerificationStatus('error');
            setMessage('No verification token available to set password.');
        }
    };

    // --- Render Logic ---
    // Show loading spinner if user context is loading or verification is in progress
    if (userContextLoading || verificationStatus === 'verifying') {
        return (
            <section className="min-h-screen flex flex-col justify-center items-center">
                <Navbar />
                <div className="flex-grow flex justify-center items-center">
                    <p className="text-gray-700 text-lg">
                        {verificationStatus === 'verifying' ? 'Verifying your email and setting password...' : 'Loading verification details...'}
                    </p>
                </div>
                <Footer />
            </section>
        );
    }

    return (
        <section>
            <Navbar />
            <div className="mt-20 mb-20 flex justify-center rounded-3xl border border-black bg-white drop-shadow-2xl p-8 max-w-md mx-auto">
                <div className="w-full text-center">
                    <h2 className="text-3xl font-bold text-gray-700 mb-6">Email Verification</h2>

                    {/* Display general messages */}
                    {message && (
                        <p className={`font-semibold mb-4 animate-fade-in-down ${
                            (verificationStatus === 'success' || verificationStatus === 'already_verified') ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {message}
                        </p>
                    )}

                    {/* Show password form if token is present and verification is not completed */}
                    {token && showPasswordForm && verificationStatus !== 'success' && verificationStatus !== 'already_verified' && (
                        <form onSubmit={handleSubmitPassword} className="space-y-4">
                            <p className="text-gray-600">
                                Please set a new password for your account to complete email verification.
                            </p>
                            <div>
                                <label htmlFor="newPassword" className="block text-left text-sm font-medium text-gray-700 mb-1">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    name="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    required
                                    aria-describedby="password-error"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-left text-sm font-medium text-gray-700 mb-1">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    required
                                    aria-describedby="password-error"
                                />
                            </div>
                            {passwordError && (
                                <p id="password-error" className="text-red-500 text-sm text-left">{passwordError}</p>
                            )}
                            <button
                                type="submit"
                                disabled={verificationStatus === 'verifying'}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {verificationStatus === 'verifying' ? 'Setting Password...' : 'Verify Email & Set Password'}
                            </button>
                        </form>
                    )}

                    {/* Instruction if no token (user landed here directly) */}
                    {!token && (
                        <p className="text-gray-600 mb-4">
                            It looks like you've arrived here without a verification link.
                            Please check your email for the verification link we sent.
                            {displayEmail && <br />}
                            {displayEmail && <strong>(Expected email: {displayEmail})</strong>}
                        </p>
                    )}

                    {/* Resend Link Section - only show if there's an error or no token (implies link issue) */}
                    {/* Also show if already_verified so they can login */}
                    {(verificationStatus === 'error' || !token || verificationStatus === 'already_verified') && (
                        <div className="mt-6">
                            <p className="text-gray-700 mb-2">Didn't receive the email or the link expired?</p>
                            <button
                                onClick={handleResend}
                                disabled={resendLoading || resendCooldown > 0 || !user?.email} // Check user.email here
                                className={`text-blue-600 hover:underline focus:outline-none ${
                                    resendLoading || resendCooldown > 0 || !user?.email ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                }`}
                            >
                                {resendLoading
                                    ? 'Sending new link...'
                                    : resendCooldown > 0
                                    ? `Resend available in ${formattedTime}`
                                    : 'Resend Verification Link'}
                            </button>
                            {resendMessage && <p className="mt-2 text-sm text-gray-600">{resendMessage}</p>}
                            {!user?.email && <p className="mt-2 text-sm text-gray-500">To resend, please ensure you are logged in or provide your email.</p>}
                            {/* If already verified, maybe show a login button instead of resend */}
                             {verificationStatus === 'already_verified' && (
                                <button
                                    onClick={() => navigate('/login')}
                                    className="mt-2 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    Go to Login
                                </button>
                            )}
                        </div>
                    )}

                    {/* If verification was successful and user is being redirected */}
                    {verificationStatus === 'success' && (
                        <p className="text-gray-500 mt-4">You will be redirected to the login page shortly.</p>
                    )}
                </div>
            </div>
            <Footer />
        </section>
    );
};

export default VerificationEmail;