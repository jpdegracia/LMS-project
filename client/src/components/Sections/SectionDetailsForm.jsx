// src/components/Courses/SectionDetailsForm.jsx
import React, { useState, useEffect } from 'react';
import { Save, XCircle } from 'lucide-react';

// Props:
// - sectionToEdit: (Optional) The section object if editing. Null for creation.
// - onSave: Function to call when the form is submitted. (formData, sectionId) => Promise<boolean>
// - onCancel: Function to call when the user cancels. () => void
// - loading: Boolean, indicates if the save operation is in progress (from parent).
// - error: String, error message from the save operation (from parent).
// - courseId: Required for creating/editing a section, to associate it with its parent course.
// - currentCourse: The full course object (optional, for display/context).
const SectionDetailsForm = ({ sectionToEdit, onSave, onCancel, loading, error, courseId, currentCourse }) => {
    // Initialize form state
    const [formData, setFormData] = useState({
        sectionTitle: '',
        sectionDescription: '',
        order: '', // Order is a number
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (sectionToEdit) {
            setFormData({
                sectionTitle: sectionToEdit.sectionTitle || '',
                sectionDescription: sectionToEdit.sectionDescription || '',
                order: sectionToEdit.order || '',
            });
        } else {
            // Reset form for new section creation
            setFormData({
                sectionTitle: '',
                sectionDescription: '',
                order: '',
            });
        }
        setFormErrors({}); // Clear errors when sectionToEdit changes
    }, [sectionToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));
        setFormErrors(prevErrors => ({
            ...prevErrors,
            [name]: '',
        }));
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.sectionTitle.trim()) {
            errors.sectionTitle = 'Section title is required.';
        }
        if (formData.order === '' || isNaN(formData.order) || parseInt(formData.order) < 1) {
            errors.order = 'Order must be a positive number.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            const dataToSave = {
                ...formData,
                order: parseInt(formData.order), // Ensure order is an integer
            };
            // For new sections, pass courseId for association
            // For existing sections, pass sectionToEdit._id for identification
            onSave(dataToSave, sectionToEdit ? sectionToEdit._id : null, courseId);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg max-w-2xl mx-auto">
            <header className="py-4 mb-6 text-center bg-gray-50 rounded-xl">
                <h2 className="text-3xl font-semibold text-indigo-800">
                    {sectionToEdit ? `Edit Section: ${sectionToEdit.sectionTitle}` : `Add New Section to ${currentCourse?.title || 'Course'}`}
                </h2>
                {currentCourse && (
                    <p className="text-lg text-gray-600 mt-2">Course: <span className="font-medium">{currentCourse.title}</span></p>
                )}
            </header>

            {loading && <p className="text-center text-blue-600 mb-4">Saving section...</p>}
            {error && <p className="text-center text-red-600 mb-4">Error: {error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Section Title */}
                <div>
                    <label htmlFor="sectionTitle" className="block text-sm font-medium text-gray-700">Section Title <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="sectionTitle"
                        name="sectionTitle"
                        value={formData.sectionTitle}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="e.g., Introduction, Core Concepts"
                        disabled={loading}
                    />
                    {formErrors.sectionTitle && <p className="mt-1 text-sm text-red-600">{formErrors.sectionTitle}</p>}
                </div>

                {/* Section Description */}
                <div>
                    <label htmlFor="sectionDescription" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                    <textarea
                        id="sectionDescription"
                        name="sectionDescription"
                        value={formData.sectionDescription}
                        onChange={handleChange}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="A brief overview of this section..."
                        disabled={loading}
                    ></textarea>
                </div>

                {/* Order */}
                <div>
                    <label htmlFor="order" className="block text-sm font-medium text-gray-700">Order <span className="text-red-500">*</span></label>
                    <input
                        type="number"
                        id="order"
                        name="order"
                        value={formData.order}
                        onChange={handleChange}
                        min="1"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="e.g., 1, 2, 3"
                        disabled={loading}
                    />
                    {formErrors.order && <p className="mt-1 text-sm text-red-600">{formErrors.order}</p>}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
                        disabled={loading}
                    >
                        <XCircle size={18} />
                        <span>Cancel</span>
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <Save size={18} />
                        <span>{sectionToEdit ? 'Save Changes' : 'Create Section'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SectionDetailsForm;
