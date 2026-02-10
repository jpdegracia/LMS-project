import React, { useState } from 'react';
import { MdMenu } from 'react-icons/md';
import ResponsiveMenu from './ResponsiveMenu';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="flex flex-col bg-slate-800">
        <div className="w-full mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="title-head py-3 ml-6">
            <img
              src="https://thecareerlab.ph/wp-content/uploads/2024/01/wordpressLogo.png"
              alt="the careerlab logo"
              className="title-pic"
            />
          </div>

          {/* Main nav links for desktop */}
          <div className="hidden md:block">
            <ul className="title-text flex gap-8">
              <li><Link to="/home" className="text-title a hover:text-yellow-500">HOME</Link></li>
              <li><Link to="/about" className="text-title a hover:text-yellow-500">ABOUT US</Link></li>
              <li><Link to="/services-nav" className="text-title a hover:text-yellow-500">PRACTICE EXAM</Link></li>
              <li><Link to="/contact-nav" className="text-title a hover:text-yellow-500">CONTACT</Link></li>
            </ul>
          </div>

          {/* Auth buttons only */}
          <div className="flex items-center gap-4 mr-13">
            <Link to="/login">
              <button className="btn-a cursor-pointer">Login</button>
            </Link>
            <Link to="/register">
              <button className="btn-b cursor-pointer">Sign Up</button>
            </Link>
          </div>

          {/* Mobile menu toggle (optional if no menu content) */}
          <div className="md:hidden" onClick={() => setOpen(prev => !prev)}>
            <MdMenu className="text-2xl text-slate-800" />
          </div>
        </div>
      </nav>

      {/* Mobile responsive menu (can be removed if unused) */}
      <ResponsiveMenu open={open} />
    </>
  );
};

export default Navbar;
