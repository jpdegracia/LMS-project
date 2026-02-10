import React from 'react';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import { IoMdArrowRoundForward } from "react-icons/io";
import { Link } from 'react-router-dom';
import MarqueeCarousel from './MarqueeCarousel';
import classroom from '../../assets/classroom.jpg';
import PracticeExam from './PracticeExam';
import Contact from './Contact';

// Note: backgroundImage array is not used in the style prop directly, but good to keep if used elsewhere.
// const backgroundImage = [classroom];

const Hero = () => {
  return (
    <section className="container">
      <Navbar />

      {/* Background Image Container */}
      <div
        // Adjusted padding for responsiveness:
        // Default (mobile): px-4 py-16 (or py-12/py-20 depending on desired height)
        // sm: (small screens): px-6 py-20
        // md: (medium screens): px-10 py-24
        // lg: (large screens): px-20 py-32 (closer to original desktop padding)
        className="hero flex flex-col items-start justify-center px-4 py-20 sm:px-6 sm:py-24 md:px-10 md:py-28 lg:px-20 lg:py-32 bg-cover bg-center relative mt-1 min-h-[400px] md:min-h-[500px] lg:min-h-[600px]"
        style={{ backgroundImage: `url(${classroom})` }}
      >
        {/* Overlay for contrast */}
        <div className="absolute inset-0 bg-black bg-opacity-40 z-0"></div>

        {/* Content Layer */}
        <div className="relative z-10 text-white gap-2 pl-0 sm:pl-4 md:pl-8 lg:pl-20"> {/* Adjusted left padding */}
          {/* Responsive Heading Sizes */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">Exciting, learning must be</h1>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">Excitement, when new learning applied</h1>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">Excited, when at <span className="text-cyan-400">The Careerlab°</span>!</h1>

          <button>
            <Link
              to="/courses"
              className="btn-b flex items-center gap-2 mt-6 group"
            >
              Get Started
              <IoMdArrowRoundForward className="arrow" />
            </Link>
          </button>
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