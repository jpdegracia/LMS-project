import React from 'react';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import { IoMdArrowRoundForward } from "react-icons/io";
import { Link } from 'react-router-dom';
import MarqueeCarousel from './MarqueeCarousel';
import classroom from '../../assets/classroom.jpg';
import PracticeExam from './PracticeExam';
import Contact from './Contact';

const backgroundImage = [classroom];

const Hero = () => {
  return (
    <section className="container">
      <Navbar />

      {/* Background Image Container */}
      <div
        className="hero flex flex-col items-start justify-center px-20 py-20 bg-cover bg-center relative  mt-1"
        style={{ backgroundImage: `url(${classroom})` }}
      >
        {/* Overlay for contrast (optional) */}
        <div className="absolute inset-0 bg-black bg-opacity-40 z-0"></div>

        {/* Content Layer */}
        <div className="relative z-10 text-white gap-2 pl-20">
          <h1 className="h1">Exciting, learning must be</h1>
          <h1 className="h1">Excitement, when new learning applied</h1>
          <h1 className="h1">Excited, when at <span className="text-cyan-400">The Careerlab°</span>!</h1>

          <button><Link
            to="/courses"
            className="btn-b flex items-center gap-2 mt-6 group"
          >
            Get Started
            <IoMdArrowRoundForward className="arrow" />
          </Link></button>  
        </div>
      </div>

      <MarqueeCarousel />
      <PracticeExam />
      <Contact />
      <Footer />
    </section>
  );
};

export default Hero;
