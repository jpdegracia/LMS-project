// src/components/Courses/LessonContentDetailsForm.jsx
import React, { useState, useEffect } from 'react';
import { Save, XCircle } from 'lucide-react';

// Props:
// - lessonContentToEdit: (Optional) The lesson content object if editing. Null for creation.
// - onSave: Function to call when the form is submitted. (formData, lessonContentId) => Promise<boolean>
// - onCancel: Function to call when the user cancels. () => void
// - loading: Boolean, indicates if the save operation is in progress (from parent).
// - error: String, error message from the save operation (from parent).
// - moduleId: Required for creating new lesson content, to associate it with a module.
// - currentModule: The full module object (optional, for display in title/context)
const LessonContentDetailsForm = ({ lessonContentToEdit, onSave, onCancel, loading, error, moduleId, currentModule }) => {
    const [formData, setFormData] = useState({
        title: '',
        type: 'text', // Default content type
        contentHtml: '', // Specific for 'text' type content
        videoUrl: '',    // Specific for 'video' type
        imageUrl: '',    // Specific for 'image' type
        documentUrl: '', // Specific for 'document' type
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (lessonContentToEdit) {
            setFormData({
                title: lessonContentToEdit.title || '',
                type: lessonContentToEdit.type || 'text',
                contentHtml: lessonContentToEdit.contentHtml || '',
                videoUrl: lessonContentToEdit.videoUrl || '',
                imageUrl: lessonContentToEdit.imageUrl || '',
                documentUrl: lessonContentToEdit.documentUrl || '',
            });
        } else {
            // Reset form for new content creation
            setFormData({
                title: '',
                type: 'text',
                contentHtml: '',
                videoUrl: '',
                imageUrl: '',
                documentUrl: '',
            });
        }
        setFormErrors({}); // Clear errors when contentToEdit changes
    }, [lessonContentToEdit]);

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
        if (!formData.title.trim()) {
            errors.title = 'Content title is required.';
        }
        if (!formData.type) {
            errors.type = 'Content type is required.';
        }

        // Validate specific fields based on content type
        if (formData.type === 'text' && !formData.contentHtml.trim()) {
            errors.contentHtml = 'Text content is required for text type.';
        }
        if (formData.type === 'video' && !formData.videoUrl.trim()) {
            errors.videoUrl = 'Video URL is required for video type.';
        }
        if (formData.type === 'image' && !formData.imageUrl.trim()) {
            errors.imageUrl = 'Image URL is required for image type.';
        }
        if (formData.type === 'document' && !formData.documentUrl.trim()) {
            errors.documentUrl = 'Document URL is required for document type.';
        }
        // 'interactive' type may not require a specific direct value field validation here,
        // as its content might be complex and handled elsewhere.

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            const dataToSave = { ...formData };
            // Pass moduleId when saving a new lesson content
            if (!lessonContentToEdit && moduleId) {
                dataToSave.module = moduleId; // Associate with the parent module for new creation
            }
            onSave(dataToSave, lessonContentToEdit ? lessonContentToEdit._id : null);
        }
    };

    // Helper to conditionally render specific input fields based on selected type
    const renderContentTypeFields = () => {
        switch (formData.type) {
            case 'text':
                return (
                    <div>
                        <label htmlFor="contentHtml" className="block text-sm font-medium text-gray-700">Content (HTML or Markdown) <span className="text-red-500">*</span></label>
                        <textarea
                            id="contentHtml"
                            name="contentHtml"
                            value={formData.contentHtml}
                            onChange={handleChange}
                            rows="8"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="Enter lesson content here (HTML supported)..."
                            disabled={loading}
                        ></textarea>
                        {formErrors.contentHtml && <p className="mt-1 text-sm text-red-600">{formErrors.contentHtml}</p>}
                    </div>
                );
            case 'video':
                return (
                    <div>
                        <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700">Video URL <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            id="videoUrl"
                            name="videoUrl"
                            value={formData.videoUrl}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="e.g., https://youtube.com/watch?v=..."
                            disabled={loading}
                        />
                        {formErrors.videoUrl && <p className="mt-1 text-sm text-red-600">{formErrors.videoUrl}</p>}
                    </div>
                );
            case 'image':
                return (
                    <div>
                        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">Image URL <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            id="imageUrl"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="e.g., https://example.com/image.jpg"
                            disabled={loading}
                        />
                        {formErrors.imageUrl && <p className="mt-1 text-sm text-red-600">{formErrors.imageUrl}</p>}
                    </div>
                );
            case 'document':
                return (
                    <div>
                        <label htmlFor="documentUrl" className="block text-sm font-medium text-gray-700">Document URL <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            id="documentUrl"
                            name="documentUrl"
                            value={formData.documentUrl}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="e.g., https://example.com/document.pdf"
                            disabled={loading}
                        />
                        {formErrors.documentUrl && <p className="mt-1 text-sm text-red-600">{formErrors.documentUrl}</p>}
                    </div>
                );
            case 'interactive':
                return (
                    <p className="text-sm text-gray-500">
                        Interactive content is managed externally or via specific backend logic.
                        No direct content input here.
                    </p>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                {lessonContentToEdit ? `Edit Lesson Content: ${lessonContentToEdit.title}` : `Create New Lesson Content for Module ${currentModule?.title || ''}`}
            </h2>

            {loading && <p className="text-center text-blue-600 mb-4">Saving lesson content...</p>}
            {error && <p className="text-center text-red-600 mb-4">Error: {error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Content Title <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="e.g., Introduction to React Hooks"
                        disabled={loading}
                    />
                    {formErrors.title && <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>}
                </div>

                {/* Content Type Selector */}
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">Content Type <span className="text-red-500">*</span></label>
                    <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                        disabled={loading}
                    >
                        <option value="text">Text</option>
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                        <option value="document">Document</option>
                        <option value="interactive">Interactive</option>
                    </select>
                    {formErrors.type && <p className="mt-1 text-sm text-red-600">{formErrors.type}</p>}
                </div>

                {/* Conditional Content Fields */}
                {renderContentTypeFields()}

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn-cancel"
                        disabled={loading}
                    >
                        <XCircle size={18} />
                        <span>Cancel</span>
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-create"
                    >
                        <Save size={18} />
                        <span>{lessonContentToEdit ? 'Save Changes' : 'Create Content'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LessonContentDetailsForm;
