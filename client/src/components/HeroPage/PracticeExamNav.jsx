import React from 'react'
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import { motion } from 'framer-motion'



const PracticeExamNav = () => {
  const exams = [
    { id: 1, title: "Entrance Prep", description: "Comprehensive sample exam for incoming freshmen." },
    { id: 2, title: "Career Placement", description: "Assessment for specialized career lab tracks." }
  ];

  return (
    <div className='bg-slate-800/80'>
    <Navbar />
    <section className="py-20 px-4 max-w-7xl mx-auto ">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-white uppercase tracking-tighter">
          Ready to <span className="text-yellow-500">Test Your Skills?</span>
        </h2>
        <div className="h-1 w-20 bg-orange-600 mx-auto mt-4 rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
        {exams.map((exam) => (
          <motion.div 
            key={exam.id}
            whileHover={{ y: -10 }}
            className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-2xl backdrop-blur-md w-full max-w-sm relative overflow-hidden group"
          >
            {/* Decorative background glow */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-colors" />
            
            <h3 className="text-2xl font-bold text-white mb-3">{exam.title}</h3>
            <p className="text-slate-400 mb-6 leading-relaxed">
              {exam.description}
            </p>
            
            <button className="w-full py-3 bg-white hover:bg-yellow-500 text-slate-900 font-bold rounded-xl transition-all duration-300">
              Enroll Now
            </button>
          </motion.div>
        ))}
      </div>
    </section>
    <Footer />
    </div>
  );
}

export default PracticeExamNav;