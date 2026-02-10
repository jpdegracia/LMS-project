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
    <section className="px-4 py-10 bg-white rounded-xl m-5">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Left Section: Map Embed */}
        <div className="w-full h-[300px] md:h-full rounded-xl overflow-hidden shadow-lg my-2">
          <iframe
            title="Google Map"
            className="w-full h-full"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3925.057112065806!2d123.90614228418312!3d10.337314740821103!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a999f225de375b%3A0x32c695336031b2c1!2sThe%20Careerlab!5e0!3m2!1sen!2sph!4v1745554423150!5m2!1sen!2sph"
          ></iframe>
        </div>

        {/* Right Section: Form */}
        <form className="bg-orange-50 dark:bg-gray-800 shadow-md rounded-xl p-8 space-y-6 my-18" onSubmit={handleSubmit}>
          {/* Form Title */}
          <div className="max-w-md mx-auto p-6 bg-slate-800 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300">
            <h2 className="h2 text-yellow-200">Contact & Visit Us:</h2>
          </div>

          {/* Form Fields */}
          <div>
            <label htmlFor="name" className="font-secondary block text-gray-700 dark:text-gray-300">Name:</label>
            <input
              type="text"
              id="name" 
              name="name" 
              value={formData.name}
              onChange={handleChange}
              className="mt-1 w-full px-4 py-2 border border-black dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="font-secondary block text-gray-700 dark:text-gray-300">Email:</label>
            <input
              type="email"
              id="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 w-full px-4 py-2 border border-black dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="message" className="font-secondary block text-gray-700 dark:text-gray-300">Message:</label>
            <textarea
              id="message" 
              name="message" 
              value={formData.message}
              onChange={handleChange}
              rows="5"
              className="mt-1 w-full px-4 py-2 border border-black dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Your message..."
              required
            />
          </div>

          {/* Loading, Success, and Error Messages */}
          {loading && <p className="text-blue-600 dark:text-blue-400 font-bold">Sending message...</p>}
          {successMessage && <p className="text-green-600 dark:text-green-400 font-bold">{successMessage}</p>}
          {errorMessage && <p className="text-red-600 dark:text-red-400 font-bold ">{errorMessage}</p>}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-a font-secondary font-normal"
            disabled={loading} 
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Contact;