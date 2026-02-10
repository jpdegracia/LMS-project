import React from 'react';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';

const AboutUs = () => {
  return (
    <section className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow px-6 py-12 text-gray-900 mx-auto ">
        <div className="max-w-5xl text-center rounded-2xl bg-white py-10 ">
          <h1 className="text-4xl font-bold font-primary mb-6 py-10">About Us:</h1>
          <p className="text-lg mb-10 text-[24px] italic uppercase">
            <strong>"We are exceptional people nurturing exceptional people."</strong>
          </p>
          <p className="text-md mb-8 px-5 font-semibold">
            At <span className="font-semibold">The Careerlab</span>, we believe in creating an environment where
            learning is not just essential — it's exciting. Whether you're exploring the IB curriculum,
            preparing for the Digital SAT or AP exams, or navigating the admissions process, we make it
            our mission to inspire, guide, and grow together.
          </p>

          <div className="grid md:grid-cols gap-10 text-left mt-10 px-10">
            <div className="bg-violet-400 text-white p-6 rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:translate-x-3 hover:shadow-gray-600">
              <h2 className="text-3xl font-semibold text-gray-800 mb-5 font-primary">Exciting!</h2>
              <p className='font-secondary text-xl text-gray-800'>Learning must be exciting. Our programs are designed to engage and energize minds.</p>
            </div>
            <div className="bg-yellow-400 text-white p-6 rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:translate-x-3 hover:shadow-gray-600">
              <h2 className="text-3xl font-semibold text-gray-800 mb-5 font-primary">Excitement!</h2>
              <p className='font-secondary text-xl text-gray-800'>When new learning is applied, that’s when the spark turns into real growth.</p>
            </div>
            <div className="bg-blue-400 text-white p-6 rounded-2xl shadow shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:translate-x-3 hover:shadow-gray-600">
              <h2 className="text-3xl font-semibold text-gray-800 mb-5 font-primary">Excited!</h2>
              <p className='font-secondary text-xl text-gray-800'>Being at The Careerlab means being excited about what’s ahead — every single day.</p>
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-lg font-semibold mb-5">Our Focus Areas:</h3>
            <ul className="text-md space-y-1 font-semibold">
              <li>• International Baccalaureate (IB)</li>
              <li>• Digital SAT Preparation</li>
              <li>• Advanced Placement (AP) Courses</li>
              <li>• College Admissions Counseling</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </section>
  );
};

export default AboutUs;
