import React, { useState } from 'react';
import { MdMenu, MdClose } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import eduGblobal_2 from '../../assets/eduGlobal_2.jpg';
import ResponsiveMenu from './ResponsiveMenu';

const Navbar = () => {
  const [open, setOpen] = useState(false);

  // Parent container animation for the links
  const navContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Links appear one after another
      },
    },
  };

  const itemVariants = {
    hidden: { y: -10, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <>
      <nav className="flex flex-col bg-slate-800 sticky top-0 z-50 shadow-md">
        <div className="w-full mx-auto flex justify-between items-center">
          
          {/* Logo with a slight slide-in */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="title-head py-3 ml-6"
          >
            <Link to="/home">
              <img
                src={eduGblobal_2}
                alt="the eduGlobal logo"
                className="h-12 w-30 bg-white"
              />
            </Link>
          </motion.div>

          {/* Main nav links for desktop */}
          <div className="hidden md:block">
            <motion.ul 
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
              className="title-text flex gap-8"
            >
              {['HOME', 'ABOUT US', 'PRACTICE EXAM', 'CONTACT'].map((item) => (
                <motion.li key={item} variants={itemVariants}>
                  <Link 
                    to={`/${item.toLowerCase().replace(' ', '-')}`} 
                    className="text-title a hover:text-yellow-500 transition-colors duration-300"
                  >
                    {item}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* Auth buttons - Retaining your original classes */}
          <div className="flex items-center gap-4 mr-13">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login">
                <button className="btn-a cursor-pointer">Login</button>
              </Link>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/register">
                <button className="btn-b cursor-pointer">Sign Up</button>
              </Link>
            </motion.div>
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden px-4" onClick={() => setOpen((prev) => !prev)}>
            {open ? (
              <MdClose className="text-3xl text-white cursor-pointer" />
            ) : (
              <MdMenu className="text-3xl text-white cursor-pointer" />
            )}
          </div>
        </div>
      </nav>

      {/* Animated Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute w-full z-40"
          >
            <ResponsiveMenu open={open} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;