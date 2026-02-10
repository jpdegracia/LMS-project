import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react'; 
import UserContext from '../../UserContext/UserContext';
import { Editor } from '@tinymce/tinymce-react';

// CSS imports remain
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/ui/oxide/content.min.css';

// Reuse the boilerplate from EditLessonContentPage, simplifying for Add mode
const AddLessonContentPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);

    const editorRef = useRef(null); 
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- STATE INITIALIZED FOR NEW CONTENT ---
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subject: '', 
        contentHtml: '', 
    });

    const [subjects, setSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Re-use TinyMCE config (Cloud-based fix)
    const tinymceConfig = {
        height: 400, menubar: false, placeholder: 'Enter lesson content here...',
        plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons', 'codesample', 'textpattern', 'colorpicker', 'fontselect', 'fontsizeselect', 'hr', 'visualchars', 'math'],
        toolbar: 'undo redo | fontselect fontsizeselect | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table codesample charmap hr | fullscreen code help',
        image_title: true, automatic_uploads: true,
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        // NOTE: file_picker_callback logic must be defined here, similar to the Edit page.
    };

    const handleTinyMCEContentChange = useCallback((newHtml) => {
        setFormData(prev => ({ ...prev, contentHtml: newHtml }));
    }, []);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormErrors(prev => ({ ...prev, [name]: '' }));
    }, []);

    const fetchSubjects = useCallback(async () => {
        setLoadingSubjects(true);
        try {
            const response = await fetch(`${BACKEND_URL}/subjects`, { credentials: 'include' });
            const data = await response.json();
            if (response.ok && data.success) {
                setSubjects(data.data);
            } else {
                throw new Error(data.message || 'Failed to retrieve subjects data.');
            }
        } catch (err) {
            setError('Failed to load subjects.');
        } finally {
            setLoadingSubjects(false);
        }
    }, [BACKEND_URL]);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    // ⭐ NEW SUBMISSION LOGIC FOR POST (CREATION)
    const handleSaveNewContent = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        // Basic Client-Side Validation
        if (!formData.title.trim() || !formData.subject || !formData.contentHtml.trim()) {
            setError('Title, Subject, and Content are required.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/lesson-content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `Failed to create content (HTTP ${response.status}).`);
            }
            
            setSuccessMessage("Lesson content created successfully!");
            setTimeout(() => navigate(-1), 1500); // Navigate back to list

        } catch (err) {
            console.error("Error creating lesson content:", err);
            setError(err.message || "Failed to create lesson content.");
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, navigate, BACKEND_URL]);


    if (loadingSubjects) { 
        return <div className="min-h-screen p-6 flex items-center justify-center"><p>Loading subjects...</p></div>;
    }
    
    // NOTE: We don't check for initialData as this page is for creation only

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter">
            <main className="container-2">
                <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">

                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-left">Add New Lesson Content</h2>

                    {/* ... (Success/Error Messages) ... */}
                    {error && <p className="text-center text-lg text-red-600">{error}</p>}
                    {successMessage && <p className="text-center text-lg text-green-600">{successMessage}</p>}

                    <form onSubmit={handleSaveNewContent} className="space-y-6">
                        
                        {/* Subject Dropdown */}
                        <div>
                            <label htmlFor="subject" className="block text-lg font-medium text-gray-700 mb-2">Subject: <span className="text-red-500">*</span></label>
                            <select 
                                id="subject" 
                                name="subject" 
                                value={formData.subject} 
                                onChange={handleChange}
                                className={`mt-1 block w-1/3 px-4 py-3 border rounded-lg shadow-sm text-base ${formErrors.subject ? 'border-red-500' : 'border-gray-300'}`}
                                required
                            >
                                <option value="">Select a Subject</option>
                                {subjects.map(sub => (
                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Title Input */}
                        <div>
                            <label htmlFor="title" className="block text-lg font-medium text-gray-700 mb-2">Title: <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className={`mt-1 block w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base`}
                                required
                            />
                        </div>

                        {/* Description Input */}
                        <div>
                            <label htmlFor="description" className="block text-lg font-medium text-gray-700 mb-2">Description:</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                            ></textarea>
                        </div>

                        {/* TinyMCE Editor for contentHtml */}
                        <div>
                            <label htmlFor="contentHtml" className="block text-lg font-medium text-gray-700 mb-2">Content: <span className="text-red-500">*</span></label>
                            <Editor
                                onInit={(evt, editor) => editorRef.current = editor}
                                apiKey={import.meta.env.VITE_TINYMCE_API_KEY} 
                                init={tinymceConfig}
                                value={formData.contentHtml}
                                onEditorChange={handleTinyMCEContentChange}
                            />
                        </div>

                        <div className="flex justify-end space-x-4 mt-8">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="btn-cancel px-6 py-3 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-3 btn-create cursor-pointer"
                            >
                                {isSubmitting ? 'Creating...' : 'Add Content'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AddLessonContentPage;