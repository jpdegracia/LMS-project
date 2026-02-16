import { motion, AnimatePresence } from 'framer-motion';
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';

// Added setOpen prop to close menu on click
const ResponsiveMenu = ({ open, setOpen }) => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser({ isLoggedIn: false, isAdmin: false });
    setOpen(false); // Close menu
    navigate('/login');
  };

  // Helper to close menu when a link is clicked
  const closeMenu = () => setOpen(false);

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className='absolute top-20 left-0 w-full h-screen z-50 bg-slate-800/95 backdrop-blur-sm'
        >
          <div className='bg-gray-100 py-8 m-5 rounded-3xl shadow-2xl'>
            <ul className='flex flex-col justify-center items-center gap-6'>
              
              {/* PUBLIC LINKS - Should usually show for everyone */}
              <li><Link onClick={closeMenu} to='/home' className='text-xl font-semibold text-slate-800 hover:text-yellow-600'>HOME</Link></li>
              <li><Link onClick={closeMenu} to='/about-us' className='text-xl font-semibold text-slate-800 hover:text-yellow-600'>ABOUT US</Link></li>
              <li><Link onClick={closeMenu} to='/practice-exam' className='text-xl font-semibold text-slate-800 hover:text-yellow-600'>PRACTICE EXAM</Link></li>
              <li><Link onClick={closeMenu} to='/contact' className='text-xl font-semibold text-slate-800 hover:text-yellow-600'>CONTACT</Link></li>

              <hr className="w-1/2 border-gray-300" />

              {/* AUTH SPECIFIC LINKS */}
              {user.isLoggedIn ? (
                <>
                  {user.isAdmin ? (
                    <li><Link onClick={closeMenu} to='/admin' className='text-blue-600 font-bold'>DASHBOARD</Link></li>
                  ) : (
                    <li><Link onClick={closeMenu} to='/profile' className='text-blue-600 font-bold'>PROFILE</Link></li>
                  )}
                  <li><Link onClick={closeMenu} to='/courses' className='text-slate-800 font-bold'>COURSES</Link></li>
                  <li>
                    <button 
                      onClick={handleLogout}
                      className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <div className="flex flex-col gap-4 w-full px-10">
                  <Link onClick={closeMenu} to='/login' className='text-center py-2 border border-slate-800 rounded-xl'>Login</Link>
                  <Link onClick={closeMenu} to='/register' className='text-center py-2 bg-yellow-500 rounded-xl font-bold'>Sign Up</Link>
                </div>
              )}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResponsiveMenu;