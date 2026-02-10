import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Basic email validation
    if (!email.trim() || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      // Replace this with your actual API endpoint
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send password reset email.');
      }

      setMessage(data.message || 'We have sent a password reset link to your email address. Please check your inbox, including your spam or junk mail folder.');
      setEmail(''); 
    } catch (error) {

      setError(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <Navbar />
      <div className="mt-20 mb-20 flex justify-center rounded-3xl border border-black bg-white drop-shadow-2xl p-8 max-w-md mx-auto">
        <div className="w-full">
          <h2 className="text-center text-2xl font-bold text-gray-700 mb-6">Forgot Password</h2>
          <p className="text-center text-gray-600 mb-4">
            Enter your email address and we&apos;ll send you a password reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address:
              </label>
              <input
                type="email"
                id="email"
                className={`form w-full ${error ? 'border-red-500' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              className={`w-full py-2 rounded-md font-semibold text-white transition duration-300 ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {message && (
            <div className="mt-6 text-center">
              <p className="text-green-500 text-center mt-4">{message}</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remembered your password? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </section>
  );
};

export default ForgotPassword;
