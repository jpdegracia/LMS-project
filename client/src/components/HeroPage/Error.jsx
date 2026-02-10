import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';

const Error = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  const handleGoBack = (event) => {
    event.preventDefault(); // Prevent default link behavior
    navigate(-1); // Navigate back one step in history
  };

  return (
    <section>
      <Navbar />
      <div className="mt-20 mb-20 flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-4xl font-bold text-red-600 mb-4 uppercase">Oops!</h1>
        <p className="text-lg text-gray-700 mb-6 font-semibold">The page you're looking for doesn't exist or an error occurred.</p>
        <a
          href="#" // Change href to "#" or remove it if you prefer. The onClick will handle navigation.
          onClick={handleGoBack} // Use the onClick handler
          className="text-blue-600 hover:underline text-sm font-semibold"
        >
          Go back to previous page
        </a>
      </div>
      <Footer />
    </section>
  );
};

export default Error;