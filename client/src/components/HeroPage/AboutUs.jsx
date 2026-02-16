import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import { HiCheckCircle } from 'react-icons/hi';

const AboutUs = () => {
  // Animation settings for snappy entry
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 400, damping: 30 }
    }
  };

  return (
    <section className="flex flex-col min-h-screen bg-slate-900">
      <Navbar />

      <main className="flex-grow container-main py-20">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="max-w-5xl mx-auto"
        >
          {/* Header Section */}
          <div className="text-center mb-16">
            <motion.h1 variants={itemVariants} className="text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tighter">
              Our <span className="text-cyan-400">Story</span>
            </motion.h1>
            <motion.div variants={itemVariants} className="h-1.5 w-24 bg-orange-600 mx-auto rounded-full mb-10"></motion.div>
            
            <motion.p variants={itemVariants} className="text-2xl md:text-3xl text-yellow-400 font-light italic uppercase tracking-wider mb-8">
              "We are exceptional people nurturing exceptional people."
            </motion.p>
            
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
              At <span className="text-white font-bold border-b-2 border-cyan-500/50">EduGlobal</span>, 
              we believe in creating an environment where learning is not just essential — it's exciting. 
              We make it our mission to inspire, guide, and grow together.
            </motion.p>
          </div>

          {/* The "Three E's" Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {[
              { title: "Exciting!", color: "bg-violet-500", text: "Learning must be exciting. Our programs are designed to engage and energize minds." },
              { title: "Excitement!", color: "bg-amber-500", text: "When new learning is applied, that’s when the spark turns into real growth." },
              { title: "Excited!", color: "bg-blue-500", text: "Being at The Careerlab means being excited about what’s ahead — every single day." }
            ].map((card, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.02 }}
                className={`${card.color} p-8 rounded-[2rem] shadow-2xl transition-all duration-300 flex flex-col justify-between h-full`}
              >
                <h2 className="text-3xl font-black text-slate-900 mb-4">{card.title}</h2>
                <p className="text-slate-900 font-bold leading-snug text-lg opacity-90">
                  {card.text}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Focus Areas Section */}
          <motion.div 
            variants={itemVariants}
            className="bg-slate-800/50 border border-slate-700 p-10 rounded-[2.5rem] backdrop-blur-md"
          >
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                   Our Focus Areas <span className="h-px flex-1 bg-slate-700"></span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    "International Baccalaureate (IB)",
                    "Digital SAT Preparation",
                    "Advanced Placement (AP)",
                    "College Admissions Counseling",
                    "TOEFL"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-300 font-semibold group">
                      <HiCheckCircle className="text-cyan-400 text-xl group-hover:scale-125 transition-transform" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* This acts as a CTA or visual anchor inside the About section */}
              <div className="w-full md:w-auto">
                <button className="btn-b w-full md:w-auto !px-10 !py-4 text-base cursor-pointer">
                  See Our Success
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </section>
  );
};

export default AboutUs;