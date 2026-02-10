import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react'; 
import UserContext from '../../UserContext/UserContext';
import { Editor } from '@tinymce/tinymce-react';

// NOTE: Keep CSS imports, as they usually reference files bundled locally by the package
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/ui/oxide/content.min.css';

const EditLessonContentPage = () => {
    const { lessonContentId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);

    const editorRef = useRef(null); 
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [lessonContentData, setLessonContentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // ⭐ SUBJECT STATE ADDED
    const [subjects, setSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);

    // --- TINYMCE CONFIGURATION (Cloud-Based Fix) ---
    const tinymceConfig = {
        // ⭐ CRITICAL FIX: Removed local path overrides. TinyMCE will use CDN for themes, models, and plugins.
        // base_url: '/tinymce', 
        // skin_url: '/tinymce/skins/ui/oxide', 
        // content_css: '/tinymce/skins/ui/oxide/content.min.css', 

        height: 400,
        menubar: false,
        placeholder: 'Edit your lesson content here...',
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons',
            'codesample', 'textpattern', 'colorpicker', 'fontselect', 'fontsizeselect',
            'hr', 'visualchars', 'math'
        ],
        toolbar:
            'undo redo | fontselect fontsizeselect | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table codesample charmap hr | fullscreen code help',

        image_title: true,
        automatic_uploads: true,
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',

        // Note: File picker logic is included below (assuming it's necessary for local uploads)
        file_picker_callback: function (cb, value, meta) {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', meta.filetype === 'image' ? 'image/*' : meta.filetype === 'media' ? 'video/*,audio/*' : '*/*');

            input.onchange = function () {
                const file = this.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function () {
                    const id = 'blobid' + (new Date()).getTime();
                    // Null check added for safety, though should be stable on a full page
                    const blobCache = editorRef.current?.editorUpload?.blobCache;
                    if (!blobCache) return; 

                    const base64 = reader.result.split(',')[1];
                    const blobInfo = blobCache.create(id, file, base64);
                    blobCache.add(blobInfo);

                    const uploadToServer = async () => {
                        const formData = new FormData();
                        formData.append('file', file);
                        let uploadUrl = '';
                        if (meta.filetype === 'image') {
                            uploadUrl = `${BACKEND_URL}/lesson-content/upload-image`;
                        } else if (meta.filetype === 'media') {
                            uploadUrl = file.type.startsWith('video') 
                                ? `${BACKEND_URL}/lesson-content/upload-video`
                                : `${BACKEND_URL}/lesson-content/upload-audio`;
                        } else {
                            uploadUrl = `${BACKEND_URL}/lesson-content/upload-file`;
                        }

                        try {
                            const response = await fetch(uploadUrl, { method: 'POST', body: formData, credentials: 'include' });
                            const result = await response.json();
                            if (!response.ok) throw new Error(result.message || `File upload failed.`);
                            cb(result.link || result.url, { title: file.name });
                        } catch (error) {
                            console.error(`Error uploading ${meta.filetype}:`, error);
                            alert(`Error uploading ${meta.filetype}: ${error.message}`);
                        }
                    };
                    uploadToServer();
                };
                reader.readAsDataURL(file);
            };
            input.click();
        }
    };
    // --- END TINYMCE CONFIGURATION ---

    const handleTinyMCEContentChange = useCallback((newHtml) => {
        setLessonContentData(prev => ({ ...prev, contentHtml: newHtml }));
    }, []);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setLessonContentData(prev => ({ ...prev, [name]: value }));
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
            console.error('Error fetching subjects:', err);
        } finally {
            setLoadingSubjects(false);
        }
    }, [BACKEND_URL]);

    const fetchLessonContent = useCallback(async () => {
        setLoading(true);
        setError(null);
        const fetchUrl = `${BACKEND_URL}/lesson-content/${lessonContentId}`;
        
        try {
            const response = await fetch(fetchUrl, {
                method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // ⭐ SUCCESS CHECK (Using data.data as confirmed by controller)
            if (data.success && data.data) {
                setLessonContentData({
                    ...data.data,
                    contentHtml: data.data.contentHtml || '',
                    // Extract ID for the subject dropdown
                    subject: data.data.subject?._id || data.data.subject || '' 
                });
            } else {
                throw new Error(data.message || "Failed to retrieve lesson content for editing.");
            }
        } catch (err) {
            console.error("Error fetching lesson content for edit:", err);
            setError(err.message || "Failed to load lesson content. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [lessonContentId, BACKEND_URL]);

    useEffect(() => {
        fetchLessonContent();
        fetchSubjects();
    }, [fetchLessonContent, fetchSubjects]);

    const handleSaveEditedContent = useCallback(async (e) => {
        e.preventDefault();
        const errors = {};
        if (!lessonContentData.title.trim()) errors.title = 'Title is required.';
        if (!lessonContentData.subject) errors.subject = 'Subject is required.';
        if (!lessonContentData.contentHtml || lessonContentData.contentHtml.trim() === '<p><br data-mce-bogus="1"></p>' || lessonContentData.contentHtml.trim() === '<p></p>') {
            errors.contentHtml = 'Content cannot be empty.';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`${BACKEND_URL}/lesson-content/${lessonContentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: lessonContentData.title,
                    description: lessonContentData.description,
                    subject: lessonContentData.subject, // PAYLOAD KEY CHANGED
                    contentHtml: lessonContentData.contentHtml,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || "Failed to update lesson content.");
            }

            setSuccessMessage("Lesson content updated successfully!");
            setTimeout(() => navigate(-1), 1500); // Navigate back to list
        } catch (err) {
            console.error("Error saving lesson content:", err);
            setError(err.message || "Failed to save lesson content.");
        } finally {
            setLoading(false);
        }
    }, [lessonContentData, lessonContentId, navigate, BACKEND_URL]);


    if (!hasPermission('lesson_content:update')) {
        return <div className="p-6 text-center text-red-800">Access Denied: You do not have permission to edit lesson content.</div>;
    }

    if (loading || loadingSubjects || !lessonContentData) { 
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading lesson content and subjects...</p>
            </div>
        );
    }

    if (error && !lessonContentData) {
        return <div className="min-h-screen p-6 text-center text-red-600">Error: {error}</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter">
            <main className="container-2">
                <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">

                    <h2 className="text-4xl font-bold text-gray-800 mb-6 text-left">Edit Lesson Content</h2>

                    {loading && <p className="text-center text-lg text-blue-600">Saving changes...</p>}
                    {error && <p className="text-center text-lg text-red-600">{error}</p>}
                    {successMessage && <p className="text-center text-lg text-green-600">{successMessage}</p>}

                    <form onSubmit={handleSaveEditedContent} className="space-y-6">
                        
                        {/* Subject Dropdown */}
                        <div>
                            <label htmlFor="subject" className="block text-lg font-medium text-gray-700 mb-2">Subject <span className="text-red-500">*</span></label>
                            <select 
                                id="subject" 
                                name="subject" 
                                value={lessonContentData.subject} 
                                onChange={handleChange}
                                className={`mt-1 block w-full px-4 py-3 border rounded-lg shadow-sm text-base ${formErrors.subject ? 'border-red-500' : 'border-gray-300'}`}
                                disabled={loading}
                                required
                            >
                                <option value="">Select a Subject</option>
                                {subjects.map(sub => (
                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                ))}
                            </select>
                            {formErrors.subject && <p className="mt-2 text-sm text-red-600">{formErrors.subject}</p>}
                        </div>
                        
                        {/* Title Input */}
                        <div>
                            <label htmlFor="editContentTitle" className="block text-lg font-medium text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="editContentTitle"
                                name="title"
                                value={lessonContentData.title}
                                onChange={handleChange}
                                className={`mt-1 block w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                                disabled={loading}
                            />
                            {formErrors.title && <p className="mt-2 text-sm text-red-600">{formErrors.title}</p>}
                        </div>

                        {/* Description Input */}
                        <div>
                            <label htmlFor="editContentDescription" className="block text-lg font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                id="editContentDescription"
                                name="description"
                                value={lessonContentData.description || ''}
                                onChange={handleChange}
                                rows="3"
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                disabled={loading}
                            ></textarea>
                        </div>

                        {/* TinyMCE Editor for contentHtml */}
                        <div>
                            <label htmlFor="tinymceContentEditor" className="block text-lg font-medium text-gray-700 mb-2">Content: <span className="text-red-500">*</span></label>
                            {/* Check ensures data is ready before mounting editor */}
                            {lessonContentData.contentHtml !== null && ( 
                                <Editor
                                    onInit={(evt, editor) => editorRef.current = editor}
                                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY} 
                                    init={tinymceConfig}
                                    value={lessonContentData.contentHtml}
                                    onEditorChange={handleTinyMCEContentChange}
                                />
                            )}
                            {formErrors.contentHtml && <p className="mt-2 text-sm text-red-600">{formErrors.contentHtml}</p>}
                        </div>

                        <div className="flex justify-end space-x-4 mt-8">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="btn-cancel px-6 py-3 cursor-pointer"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 btn-create cursor-pointer"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EditLessonContentPage;