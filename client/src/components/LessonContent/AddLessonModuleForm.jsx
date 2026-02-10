// src/components/Modules/AddLessonModuleForm.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import Modal from '../Modal/Modal';
import UserContext from '../UserContext/UserContext';
import { Plus, Minus, BookOpen, HelpCircle } from 'lucide-react';

const AddLessonModuleForm = ({ onSave, onCancel }) => {
    const { user } = useContext(UserContext);

    // State for the new module being created
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        progressBar: false,
        contents: [], // Stores IDs of selected LessonContent
        status: 'draft' // Default status for a new standalone module
    });

    // State for the available raw content library
    const [allLessonContents, setAllLessonContents] = useState([]);
    const [loadingContents, setLoadingContents] = useState(true);
    const [errorContents, setErrorContents] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Fetch all raw LessonContent items to populate the selection dropdown
    useEffect(() => {
        const fetchContents = async () => {
            setLoadingContents(true);
            setErrorContents(null);
            try {
                const response = await fetch(`${BACKEND_URL}/lesson-content`, { credentials: 'include' });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch lesson content.');
                }
                const data = await response.json();
                if (data.success) {
                    setAllLessonContents(data.data || []);
                } else {
                    throw new Error(data.message || 'Failed to retrieve lesson content data.');
                }
            } catch (err) {
                console.error('Error fetching lesson content:', err);
                setErrorContents('Failed to load available lesson content.');
            } finally {
                setLoadingContents(false);
            }
        };
        fetchContents();
    }, [BACKEND_URL]);

    // Helper to get clean plain text from HTML (if titles contain HTML)
    const getCleanPlainText = (htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    };

    // Handle form field changes
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormErrors(prev => ({ ...prev, [name]: '' }));
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }, []);
    
    // Handle multi-select for lesson contents
    const handleContentsSelectChange = useCallback((e) => {
        const selectedValues = Array.from(e.target.options).filter(opt => opt.selected).map(opt => opt.value);
        setFormData(prev => ({ ...prev, contents: selectedValues }));
        setFormErrors(prev => ({ ...prev, contents: '' }));
    }, []);

    // Handle form submission to create the new standalone module
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = "Module title is required.";
        }
        if (!formData.contents || formData.contents.length === 0) {
            newErrors.contents = "A lesson module requires at least one content item.";
        }

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        const payload = {
            moduleType: 'lesson',
            title: formData.title,
            description: formData.description,
            progressBar: formData.progressBar,
            contents: formData.contents,
            status: formData.status,
            createdBy: user._id,
        };
        
        try {
            // This POSTs to the top-level /modules endpoint to create a standalone module
            const response = await fetch(`${BACKEND_URL}/modules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create new lesson module.');
            }
            // Call parent's onSave function to close the modal and re-fetch the list
            onSave();
        } catch (err) {
            console.error('Error creating lesson module:', err);
            alert(err.message || 'Error creating lesson module.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingContents) {
        return (
            <Modal onCancel={onCancel} title="Add New Lesson Module">
                <div className="flex items-center justify-center p-6 min-h-[150px]">
                    <p className="text-blue-600 text-lg">Loading content library...</p>
                </div>
            </Modal>
        );
    }
    if (errorContents) {
        return (
            <Modal onCancel={onCancel} title="Error">
                <div className="p-6">
                    <p className="text-red-600 text-lg mb-4">{errorContents}</p>
                    <div className="flex justify-end">
                        <button onClick={onCancel} className="btn-cancel px-4 py-2">Close</button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal onCancel={onCancel} title="Add New Lesson Module">
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Module Title <span className="text-red-500">*</span></label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required disabled={isSubmitting} />
                    {formErrors.title && <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>}
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="2" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" disabled={isSubmitting}></textarea>
                </div>
                <div>
                    <label htmlFor="contents" className="block text-sm font-medium text-gray-700 mb-1">Lesson Contents (Multi-Select) <span className="text-red-500">*</span></label>
                    <select multiple id="contents" name="contents" value={formData.contents} onChange={handleContentsSelectChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 h-48" required disabled={isSubmitting}>
                        {allLessonContents.length > 0 ? (
                            allLessonContents.map(lc => (
                                <option key={lc._id} value={lc._id}>{getCleanPlainText(lc.title)}</option>
                            ))
                        ) : (
                            <option value="" disabled>No lesson content available. Create some first.</option>
                        )}
                    </select>
                    {formErrors.contents && <p className="mt-1 text-xs text-red-600">{formErrors.contents}</p>}
                </div>
                <div className="flex items-center pt-2">
                    <input type="checkbox" id="progressBar" name="progressBar" checked={formData.progressBar} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" disabled={isSubmitting} />
                    <label htmlFor="progressBar" className="ml-2 block text-sm text-gray-900">Show Progress Bar</label>
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required disabled={isSubmitting}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={onCancel} className="btn-cancel px-5 py-2 rounded-md transition duration-200" disabled={isSubmitting}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="btn-create px-5 py-2 rounded-md transition duration-200 disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create Lesson Module'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddLessonModuleForm;
