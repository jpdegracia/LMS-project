import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setExpired(false);
    setLoading(true);

    if (!password.trim()) {
      setError('Please enter a new password.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      setMessage(data.message || 'Password reset successfully! Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const errorMsg = err.message || 'An unexpected error occurred.';
      setError(errorMsg);

      if (errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('invalid')) {
        setExpired(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <Navbar />
      <div className="mt-20 mb-20 flex justify-center rounded-3xl border border-black bg-white drop-shadow-2xl p-8 max-w-md mx-auto">
        <div className="w-full">
          <h2 className="text-center text-2xl font-bold text-gray-700 mb-6">Reset Your Password</h2>
          <p className="text-center text-gray-600 mb-4">Enter your new password below.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password:
              </label>
              <input
                type="password"
                id="password"
                autoComplete="new-password"
                className={`form w-full ${error ? 'border-red-500' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
                required
                disabled={loading || expired}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password:
              </label>
              <input
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                className={`form w-full ${error ? 'border-red-500' : ''}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={6}
                required
                disabled={loading || expired}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              className={`w-full py-2 rounded-md font-semibold text-white transition duration-300 ${loading || expired ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={loading || expired}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          {message && (
            <div className="mt-6 text-center">
              <p className="text-green-500 text-center mt-4">{message}</p>
            </div>
          )}

          {expired && (
            <div className="mt-6 text-center">
              <p className="text-red-600 mb-4">
                This reset link has expired or is invalid. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Request New Reset Link
              </Link>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-blue-600 hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </section>
  );
};

export default ResetPassword;
