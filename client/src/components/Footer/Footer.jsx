import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaFacebook, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { HiArrowRight } from 'react-icons/hi';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { id: 1, icon: <FaFacebook />, url: "https://thecareerlab.ph/", color: "hover:text-blue-500" },
    { id: 2, icon: <FaInstagram />, url: "https://www.instagram.com/the_careerlab/", color: "hover:text-pink-500" },
    { id: 3, icon: <FaLinkedinIn />, url: "https://www.linkedin.com/company/the-careerlab%C2%B0/", color: "hover:text-cyan-400" },
  ];

  return (
    <footer className="bg-slate-900 border-t border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Section */}
          <div className="col-span-1 lg:col-span-1">
            <h3 className="text-2xl font-bold text-white mb-4 tracking-tighter">
              EduGlobal
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Exceptional people nurturing exceptional people. We bridge the gap between education and your professional future.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -5, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`text-slate-400 text-xl transition-colors duration-300 ${social.color}`}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Platform</h4>
            <ul className="space-y-4">
              {['Home', 'About Us', 'Practice Exam'].map((link) => (
                <li key={link}>
                  <Link 
                    to={link === 'Home' ? '/' : `/${link.toLowerCase().replace(' ', '-')}`} 
                    className="text-slate-400 hover:text-cyan-400 text-sm transition-colors flex items-center group"
                  >
                    <HiArrowRight className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 mr-2 text-xs" />
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Support</h4>
            <ul className="space-y-4">
              {['Contact', 'Privacy Policy', 'Terms of Service'].map((link) => (
                <li key={link}>
                  <Link 
                    to="/contact-nav" 
                    className="text-slate-400 hover:text-cyan-400 text-sm transition-colors"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter/CTA */}
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
            <h4 className="text-white font-bold text-sm mb-4">Start your journey today.</h4>
            <p className="text-slate-400 text-xs mb-4">Join our community and get the latest updates on career opportunities.</p>
            <Link to="/register">
              <button className="btn-b w-full !py-3 !text-xs">Join Now</button>
            </Link>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs font-secondary">
            &copy; {currentYear} EduGlobal. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-slate-500 uppercase tracking-widest">
            <span>Designed for Excellence</span>
            <span className="text-slate-800">|</span>
            <span>Est. 2025</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;