import React, { useState, useEffect } from 'react';
import { Save, XCircle } from 'lucide-react'; // Assuming you have these icons

// Props:
// - courseToEdit: (Optional) The course object if we are editing. Null for creation.
// - onSave: Function to call when the form is submitted successfully. (formData, courseId) => void
// - onCancel: Function to call when the user cancels. () => void
// - loading: Boolean, indicates if the save operation is in progress (from parent).
// - error: String, error message from the save operation (from parent).
const CourseDetailsForm = ({ courseToEdit, onSave, onCancel, loading, error }) => {
    // Initialize form state with existing course data if editing, otherwise empty
    // Removed 'format', 'price', and 'category' fields to align with updated schema
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        // 'category' field removed
        difficulty: 'beginner',
        thumbnail: '',
        isPublished: false,
        status: 'draft', // Default status for new courses
    });
    const [formErrors, setFormErrors] = useState({});

    // Populate form data when courseToEdit changes (for editing mode)
    useEffect(() => {
        if (courseToEdit) {
            setFormData({
                title: courseToEdit.title || '',
                description: courseToEdit.description || '',
                // 'category' field removed
                difficulty: courseToEdit.difficulty || 'beginner',
                thumbnail: courseToEdit.thumbnail || '',
                isPublished: courseToEdit.isPublished || false,
                status: courseToEdit.status || 'draft',
            });
        } else {
            // Reset form for new course creation
            setFormData({
                title: '',
                description: '',
                // 'category' field removed
                difficulty: 'beginner',
                thumbnail: '',
                isPublished: false,
                status: 'draft',
            });
        }
        setFormErrors({}); // Clear errors when courseToEdit changes
    }, [courseToEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value,
        }));
        // Clear error for the field being changed as user types
        setFormErrors(prevErrors => ({
            ...prevErrors,
            [name]: '',
        }));
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.title.trim()) {
            errors.title = 'Course title is required.';
        }
        if (!formData.description.trim()) {
            errors.description = 'Description is required.';
        }
        // Removed validation for 'category'
        // Add more validation rules as needed (e.g., URL validation for thumbnail)

        setFormErrors(errors);
        return Object.keys(errors).length === 0; // Return true if no errors
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSave(formData, courseToEdit ? courseToEdit._id : null);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                {courseToEdit ? 'Edit Course Details' : 'Create New Course'}
            </h2>

            {/* Display loading and error messages from the parent (CourseManagementPage) */}
            {loading && <p className="text-center text-blue-600 mb-4">Saving course...</p>}
            {error && <p className="text-center text-red-600 mb-4">Error: {error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Course Title <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="e.g., Advanced React Hooks"
                        disabled={loading}
                    />
                    {formErrors.title && <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>}
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="A comprehensive course covering..."
                        disabled={loading}
                    ></textarea>
                    {formErrors.description && <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>}
                </div>

                {/* Removed Category Input Field */}
                {/* <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="e.g., Web Development, Data Science"
                        disabled={loading}
                    />
                    {formErrors.category && <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>}
                </div> */}

                {/* Difficulty */}
                <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">Difficulty</label>
                    <select
                        id="difficulty"
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                        disabled={loading}
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>

                {/* Thumbnail URL */}
                <div>
                    <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700">Thumbnail URL (Optional)</label>
                    <input
                        type="text"
                        id="thumbnail"
                        name="thumbnail"
                        value={formData.thumbnail}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="https://example.com/course-thumbnail.jpg"
                        disabled={loading}
                    />
                </div>

                {/* Is Published Checkbox */}
                <div className="flex items-center">
                    <input
                        id="isPublished"
                        name="isPublished"
                        type="checkbox"
                        checked={formData.isPublished}
                        onChange={handleChange}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        disabled={loading}
                    />
                    <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900">Publish Course</label>
                </div>

                {/* Status Dropdown */}
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                        disabled={loading}
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
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
                        className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
                    >
                        <Save size={18} />
                        <span>{courseToEdit ? 'Save Changes' : 'Create Course'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CourseDetailsForm;