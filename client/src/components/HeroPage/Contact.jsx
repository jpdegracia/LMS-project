import React, { useState } from 'react';

const Contact = () => {

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // 4. Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); 

    setLoading(true);
    setSuccessMessage(''); 
    setErrorMessage('');

    try {

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData), 
      });

      const data = await response.json(); 

      if (response.ok) { // Check if the response status is 2xx
        setSuccessMessage(data.msg || 'Message sent successfully!');
        setFormData({ name: '', email: '', message: '' }); 
      } else {

        setErrorMessage(data.msg || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Frontend error submitting form:', error);
      setErrorMessage('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto bg-slate-800/80 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-700">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          
          {/* Left: Map with a darker overlay */}
          <div className="h-[400px] lg:h-auto relative">
            <iframe
              title="Google Map"
              className="w-full h-full"
              style={{ border: 0 }}
              loading="lazy"
              src="https://www.google.com/maps/embed?..." // Ensure valid URL
            ></iframe>
            <div className="absolute inset-0 pointer-events-none shadow-[inner_0_0_50px_rgba(0,0,0,0.5)]"></div>
          </div>

          {/* Right: Modern Form */}
          <div className="p-8 md:p-12 bg-slate-800">
            <h2 className="text-3xl font-bold text-white mb-2">Visit Us</h2>
            <p className="text-slate-400 mb-8">Have questions? Our team is here to help you navigate your career path.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Full Name</label>
                  <input 
                    name="name" value={formData.name} onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 transition-all outline-none"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Email Address</label>
                  <input 
                    type="email" name="email" value={formData.email} onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 transition-all outline-none"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Message</label>
                <textarea 
                  name="message" value={formData.message} onChange={handleChange} rows="4"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 transition-all outline-none"
                  placeholder="How can we help?"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;