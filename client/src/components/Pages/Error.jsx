import React from 'react';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';

const Error = () => {
  return (
    <section>
    <Navbar />
      <div className="mt-20 mb-20 flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-4xl font-bold text-red-600 mb-4 uppercase">Oops!</h1>
        <p className="text-lg text-gray-700 mb-6 font-semibold">The page you're looking for doesn't exist or an error occurred.</p>
        <a
          href="/"
          className="text-blue-600 hover:underline text-sm font-semibold"
        >
          Go back to Home
        </a>
      </div>
      <Footer />
    </section>
  );
};

export default Error;
