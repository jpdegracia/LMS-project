import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMail, HiChevronRight, HiOutlineArrowNarrowLeft } from 'react-icons/hi';
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

    if (!email.trim() || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send link.');

      setMessage('Reset link sent! Please check your inbox and spam folder.');
      setEmail(''); 
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center py-20 px-4 relative">
        {/* Background Glow */}
        <div className="absolute w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl z-10"
        >
          <div className="mb-8">
            <Link to="/login" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-sm mb-6 group">
              <HiOutlineArrowNarrowLeft className="group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
            <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Reset Password</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Enter your email and we'll send you a recovery link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Using the container with the manual 'group' class for Tailwind v4 */}
            <div className="form-input-container group">
              <label className="form-label">Email Address</label>
              <div className="relative">
                <HiOutlineMail className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`form-input shadow-inner ${error ? 'border-red-500/50 focus:border-red-500' : ''}`}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {(error || message) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-xl text-center text-xs font-bold border ${
                    error ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                  }`}
                >
                  {error || message}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                loading 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 cursor-pointer'
              }`}
            >
              {loading ? 'Sending...' : (
                <>
                  Send Reset Link <HiChevronRight className="text-xl" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </main>

      <Footer />
    </section>
  );
};

export default ForgotPassword;