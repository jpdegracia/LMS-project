import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import { IoMdArrowRoundForward } from "react-icons/io";
import { Link } from 'react-router-dom';
import MarqueeCarousel from './MarqueeCarousel';
import classroom from '../../assets/classroom.jpg';
import PracticeExam from './PracticeExam';
import Contact from './Contact';

const Hero = () => {
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.3, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <section className="min-h-screen bg-slate-900 overflow-x-hidden">
      <Navbar />

      <div className="relative w-full min-h-[85vh] flex items-center justify-center lg:justify-start">
        
        {/* Background Image with Parallax-like feel */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ 
            backgroundImage: `url(${classroom})`,
            filter: 'brightness(0.6)' 
          }}
        >
          {/* Gradient Overlay for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent"></div>
        </div>

        {/* Content Layer */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-16"
        >
          <div className="max-w-3xl">
            {/* Tagline */}
            <motion.span 
              variants={itemVariants}
              className="inline-block py-1 px-3 mb-6 text-sm font-semibold tracking-wider text-cyan-400 uppercase border border-cyan-400/30 rounded-full bg-cyan-400/10"
            >
              Transform Your Future
            </motion.span>

            {/* Main Headings */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight">
                Exciting, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">learning</span> must be
              </h1>
              <h2 className="text-2xl md:text-4xl text-slate-300 font-light italic">
                Excitement, when new learning applied
              </h2>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white">
                Excited, when at <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">Edu Global!</span>
              </h1>
            </motion.div>

            {/* CTA Section */}
            <motion.div variants={itemVariants} className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/courses"
                className="btn-b group flex items-center gap-3 px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-xl"
              >
                Get Started
                <IoMdArrowRoundForward className="text-xl group-hover:translate-x-2 transition-transform" />
              </Link>
              
              <Link
                to="/about-us"
                className="px-8 py-4 border border-white/30 text-white font-medium rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                Learn More
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Floating Decorative Element (Desktop Only) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="hidden lg:block absolute right-20 top-1/2 -translate-y-1/2 w-80 h-80 border-2 border-cyan-500/20 rounded-full animate-pulse"
        />
      </div>

      {/* Main Page Flow */}
      <div className="bg-slate-800">
        <MarqueeCarousel />
        <div className="py-20 px-6">
           <PracticeExam />
        </div>
        <Contact />
        <Footer />
      </div>
    </section>
  );
};

export default Hero;