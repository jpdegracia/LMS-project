import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagramSquare } from 'react-icons/fa';
import { FaLinkedin } from 'react-icons/fa6';

const Footer = () => {
  return (
    <section className="bg-slate-900 flex justify-center items-center py-10">
      <footer className="site-footer text-white w-full max-w-6xl px-4">
        <div className="footer-container flex flex-wrap justify-between">
          <div className="footer-section mb-6 w-full sm:w-1/3">
            <h3 className="text-xl font-semibold font-secondary mb-2">About Us</h3>
            <p className="text-sm font-secondary">
              We are exceptional people nurturing exceptional people.
            </p>
          </div>

          <div className="footer-section mb-6 w-full sm:w-1/3">
            <h3 className="text-xl font-semibold mb-2">Links</h3>
            <ul className="text-sm space-y-2">
              <li><Link to="/" className="hover:text-gray-300 font-secondary">Home</Link></li>
              <li><Link to="/services-nav" className="hover:text-gray-300 font-secondary">Services</Link></li>
              <li><Link to="/contact-nav" className="hover:text-gray-300 font-secondary">Contact</Link></li>
            </ul>
          </div>

          <div className="footer-section mb-6 w-full sm:w-1/3">
            <h3 className="text-xl font-semibold mb-3 font-secondary">Follow Us:</h3>
            <div className="flex gap-4 mt-2 text-2xl">
              <a
                href="https://thecareerlab.ph/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-500"
              >
                <FaFacebook />
              </a>
              <a
                href="https://www.instagram.com/the_careerlab/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-pink-500"
              >
                <FaInstagramSquare />
              </a>
              <a
                href="https://www.linkedin.com/company/the-careerlab%C2%B0/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-300"
              >
                <FaLinkedin />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom border-t border-gray-700 mt-6 pt-4 text-center text-sm font-secondary text-gray-400">
          <p>&copy; The Careerlab°. All rights reserved.</p>
        </div>
      </footer>
    </section>
  );
};

export default Footer;
