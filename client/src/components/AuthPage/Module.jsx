import React, { useState } from 'react';

const Module = () => {
  const [modules, setModules] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newModule = {
      id: Date.now(),
      title: formData.title,
      description: formData.description,
    };

    setModules((prevModules) => [...prevModules, newModule]);

    // Reset form
    setFormData({
      title: '',
      description: '',
    });
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white shadow-xl rounded-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center">Add Course Module</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Module Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full mt-1 p-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full mt-1 p-2 border rounded-lg"
            rows="4"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition"
        >
          Add Module
        </button>
      </form>

      {/* List of added modules */}
      <div className="mt-10">
        <h3 className="text-xl font-semibold mb-4">Existing Modules</h3>
        {modules.length === 0 ? (
          <p className="text-gray-500">No modules added yet.</p>
        ) : (
          <ul className="space-y-2">
            {modules.map((module) => (
              <li
                key={module.id}
                className="p-4 bg-gray-100 border rounded-lg shadow-sm"
              >
                <h4 className="font-bold">{module.title}</h4>
                <p>{module.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Module;
