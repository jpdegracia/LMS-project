import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import UserContext from '../../UserContext/UserContext';


const EditLessonContentPage = () => {
    const { lessonContentId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext); // For permission checks, if needed

    const [lessonContentData, setLessonContentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Fetch existing lesson content data
    const fetchLessonContent = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/lesson-content/${lessonContentId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success && data.content) {
                setLessonContentData(data.content);
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
    }, [fetchLessonContent]);

    // Handle form submission for saving changes
    const handleSaveEditedContent = useCallback(async (e) => {
        e.preventDefault();
        const errors = {};
        if (!lessonContentData.title.trim()) errors.title = 'Title is required.';
        if (!lessonContentData.contentHtml && !lessonContentData.videoUrl && !lessonContentData.imageUrl && !lessonContentData.documentUrl) {
            errors.contentHtml = 'At least one content type (text, video, image, document) must be provided.';
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
                body: JSON.stringify(lessonContentData), // Send the updated data
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
            // Optionally navigate back to CourseBuilder or LessonPage after a short delay
            setTimeout(() => navigate(-1), 1500); // Go back to the previous page

        } catch (err) {
            console.error("Error saving lesson content:", err);
            setError(err.message || "Failed to save lesson content.");
        } finally {
            setLoading(false);
        }
    }, [lessonContentData, lessonContentId, navigate, BACKEND_URL]);

    // Check permission (optional, route should ideally be protected)
    if (!hasPermission('lesson_content:update')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to edit lesson content.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                >
                    <ArrowLeft size={20} />
                    <span>Go Back</span>
                </button>
            </div>
        );
    }

    if (loading && !lessonContentData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading lesson content for editing...</p>
            </div>
        );
    }

    if (error && !lessonContentData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-red-600">Error: {error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                >
                    <ArrowLeft size={20} />
                    <span>Go Back</span>
                </button>
            </div>
        );
    }

    if (!lessonContentData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-gray-600 mb-4">Lesson content not found or could not be loaded.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md flex items-center space-x-2"
                >
                    <ArrowLeft size={20} />
                    <span>Go Back</span>
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter">
            <main className="mx-auto px-6 max-w-6xl">
                <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">

                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center items-center pt-10">
                        Edit Lesson Content ID: 
                    </h2>
                    <h5 className="font-medium font-secondary text-[15px] text-blue-600 text-center">( {lessonContentId} )</h5>

                    {loading && <p className="text-center text-lg text-blue-600">Saving changes...</p>}
                    {error && <p className="text-center text-lg text-red-600">{error}</p>}
                    {successMessage && <p className="text-center text-lg text-green-600">{successMessage}</p>}

                    <form onSubmit={handleSaveEditedContent} className="space-y-6">
                        <div>
                            <label htmlFor="editContentTitle" className="block text-lg font-medium text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="editContentTitle"
                                name="title"
                                value={lessonContentData.title}
                                onChange={(e) => {
                                    setLessonContentData({ ...lessonContentData, title: e.target.value });
                                    setFormErrors(prev => ({ ...prev, title: '' }));
                                }}
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                disabled={loading}
                            />
                            {formErrors.title && <p className="mt-2 text-sm text-red-600">{formErrors.title}</p>}
                        </div>
                        <div>
                            <label htmlFor="editContentHtml" className="block text-lg font-medium text-gray-700 mb-2">Content (HTML) <span className="text-red-500">*</span></label>
                            <textarea
                                id="editContentHtml"
                                name="contentHtml"
                                value={lessonContentData.contentHtml || ''}
                                onChange={(e) => {
                                    setLessonContentData({ ...lessonContentData, contentHtml: e.target.value });
                                    setFormErrors(prev => ({ ...prev, contentHtml: '' }));
                                }}
                                rows="10"
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="Enter your lesson content in HTML format..."
                                disabled={loading}
                            ></textarea>
                            {formErrors.contentHtml && <p className="mt-2 text-sm text-red-600">{formErrors.contentHtml}</p>}
                        </div>
                        <div>
                            <label htmlFor="editVideoUrl" className="block text-lg font-medium text-gray-700 mb-2">Video URL</label>
                            <input
                                type="text"
                                id="editVideoUrl"
                                name="videoUrl"
                                value={lessonContentData.videoUrl || ''}
                                onChange={(e) => setLessonContentData({ ...lessonContentData, videoUrl: e.target.value })}
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="e.g., https://www.youtube.com/watch?v=VIDEO_ID"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="editImageUrl" className="block text-lg font-medium text-gray-700 mb-2">Image URL</label>
                            <input
                                type="text"
                                id="editImageUrl"
                                name="imageUrl"
                                value={lessonContentData.imageUrl || ''}
                                onChange={(e) => setLessonContentData({ ...lessonContentData, imageUrl: e.target.value })}
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="e.g., https://example.com/image.jpg"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="editDocumentUrl" className="block text-lg font-medium text-gray-700 mb-2">Document URL</label>
                            <input
                                type="text"
                                id="editDocumentUrl"
                                name="documentUrl"
                                value={lessonContentData.documentUrl || ''}
                                onChange={(e) => setLessonContentData({ ...lessonContentData, documentUrl: e.target.value })}
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="e.g., https://example.com/document.pdf"
                                disabled={loading}
                            />
                        </div>

                        <div className="flex justify-end space-x-4 mt-8">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="btn-cancel px-6 py-3"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 btn-create"
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
