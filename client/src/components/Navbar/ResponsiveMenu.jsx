import { motion, AnimatePresence } from 'framer-motion';
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';

const ResponsiveMenu = ({ open }) => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser({ isLoggedIn: false, isAdmin: false });
    navigate('/login');
  };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className='absolute top-20 left-0 w-full h-screen z-20'
        >
          <div className='title-text bg-gray-200 py-8 m-5 items-center justify-center rounded-4xl'>
            <ul className='flex flex-col justify-center items-center gap-5'>

              {!user.isLoggedIn && (
                <>
                  <li><Link to='/' className='text-title a'>HOME</Link></li>
                  <li><Link to='/about' className='text-title a'>ABOUT US</Link></li>
                  <li><Link to='/services-nav' className='text-title a'>PRACTICE EXAM</Link></li>
                  <li><Link to='/contact-nav' className='text-title a'>CONTACT</Link></li>

                </>
              )}

              {user.isLoggedIn && user.isAdmin && (
                <>
                <li><Link to='/admin' className='text-title a'>Dashboard</Link></li>
                <li><Link to='/courses' className='text-title a'>Courses</Link></li>
                </>
              )}

              {user.isLoggedIn && !user.isAdmin && (
                <>
                <li><Link to='/profile' className='text-title a'>Profile</Link></li>
                <li><Link to='/courses' className='text-title a'>Courses</Link></li>
                </>
              )}

            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResponsiveMenu;
