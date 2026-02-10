import React, { useState } from 'react';
import Footer from '../Footer/Footer';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Navbar from '../Navbar/Navbar';

const Courses = () => {
  const [isSATOpen, setIsSATOpen] = useState(false);
  const [isTOEFLOpen, setIsTOEFLOpen] = useState(false);
  const [isIELTSOpen, setIsIELTSOpen] = useState(false);
  const [isAPOpen, setIsAPOpen] = useState(false);

  const toggleSAT = () => {
    setIsSATOpen(!isSATOpen);
  };

  const toggleTOEFL = () => {
    setIsTOEFLOpen(!isTOEFLOpen);
  };

  const toggleIELTS = () => {
    setIsIELTSOpen(!isIELTSOpen);
  };

  const toggleAP = () => {
    setIsAPOpen(!isAPOpen);
  };

  const collapseAll = () => {
    setIsSATOpen(false);
    setIsTOEFLOpen(false);
    setIsIELTSOpen(false);
    setIsAPOpen(false);
  };

  return (

    <section className="container mx-auto px-8 max-w-7xl mt-10"> {/* Adjusted max-w here */} 
        <Navbar />
      <div className="mb-10 p-6 flex flex-col items-center"> {/* Center the content */}
        <div className="flex justify-between items-center mb-6 w-full"> {/* Header takes full width */}
          <h1 className="text-xl font-bold text-gray-800 uppercase">Course categories:</h1>
          <button onClick={collapseAll} className="text-sm cursor-pointer font-medium text-blue-500">Collapse all</button>
        </div>

        {/* SAT Category */}
        <div className="mb-3 rounded-md shadow-sm overflow-hidden w-full max-w-7xl"> {/* Category width */}
          <h3
            className="bg-gray-100 px-4 py-3 font-semibold text-blue-500 cursor-pointer flex items-center justify-between"
            onClick={toggleSAT}
          >
            SAT
            <span className="ml-2 text-gray-600">
              {isSATOpen ? <FiChevronUp /> : <FiChevronDown />}
            </span>
          </h3>
          {isSATOpen && (
            <div className="px-4 py-3 text-gray-700 text-sm bg-white">
              <p className="mb-2">The SAT is a standardized test widely used for college admissions in the United States. Since its debut in 1926, its name and scoring have changed several times.</p>
              <p>Access full-length practice SATs in digital format. Take a free SAT Practice Test now and get your score right away.</p>
            </div>
          )}
        </div>

        {/* TOEFL Category */}
        <div className="mb-3 rounded-md shadow-sm overflow-hidden w-full max-w-7xl"> {/* Category width */}
          <h3
            className="bg-gray-100 px-4 py-3 font-semibold text-blue-500 cursor-pointer flex items-center justify-between"
            onClick={toggleTOEFL}
          >
            TOEFL
            <span className="ml-2 text-gray-600">
              {isTOEFLOpen ? <FiChevronUp /> : <FiChevronDown />}
            </span>
          </h3>
          {isTOEFLOpen && (
            <div className="px-4 py-3 text-gray-700 text-sm bg-white">
              <p>Test of English as a Foreign Language (TOEFL) is a standardized test to measure the English language ability of non-native speakers wishing to enroll in English-speaking universities. The test is accepted by more than 11,000 universities and other institutions in over 190 countries and territories.</p>
            </div>
          )}
        </div>

        {/* IELTS Academic Category */}
        <div className="mb-3 rounded-md shadow-sm overflow-hidden w-full max-w-7xl"> {/* Category width */}
          <h3
            className="bg-gray-100 px-4 py-3 font-semibold text-blue-500 cursor-pointer flex items-center justify-between"
            onClick={toggleIELTS}
          >
            IELTS Academic
            <span className="ml-2 text-gray-600">
              {isIELTSOpen ? <FiChevronUp /> : <FiChevronDown />}
            </span>
          </h3>
          {isIELTSOpen && (
            <div className="px-4 py-3 text-gray-700 text-sm bg-white">
              <p>IELTS Academic assesses how well you can use English in an academic environment. It is suitable for people who would like to study at university or other higher education institutions. You can also take IELTS Academic for professional registration.</p>
            </div>
          )}
        </div>

        {/* AP Category */}
        <div className="rounded-md shadow-sm overflow-hidden w-full max-w-7xl"> {/* Category width */}
          <h3
            className="bg-gray-100 px-4 py-3 font-semibold text-blue-500 cursor-pointer flex items-center justify-between"
            onClick={toggleAP}
          >
            AP
            <span className="ml-2 text-gray-600">
              {isAPOpen ? <FiChevronUp /> : <FiChevronDown />}
            </span>
          </h3>
          {isAPOpen && (
            <div className="px-4 py-3 text-gray-700 text-sm bg-white">
              <p>AP Exams are standardized exams designed to measure how well you've mastered the content and skills of a specific AP course. Most AP courses have an end-of-year exam, but a few courses have different ways to assess what you've learned—for example, AP Art and Design students submit a portfolio of work for scoring.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </section>
  );
};

export default Courses;