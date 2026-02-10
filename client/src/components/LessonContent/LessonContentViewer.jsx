import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Video, Image, FileText, Code } from 'lucide-react';
import UserContext from '../UserContext/UserContext';

const LessonContentViewer = () => {
    const { id: lessonContentId } = useParams();
    const navigate = useNavigate();
    const { hasPermission, isLoggedIn, loading: userLoading } = useContext(UserContext);

    const [lessonContent, setLessonContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const fetchLessonContentData = useCallback(async () => {
        console.log("[LessonContentViewer] Attempting to fetch lesson content with ID:", lessonContentId);
        setLoading(true);
        setError(null);
        setLessonContent(null);

        try {
            if (!hasPermission('lesson_content:read')) {
                console.warn("User does not have 'lesson_content:read' permission. Redirecting.");
                alert("You do not have permission to view this lesson content.");
                setLoading(false);
                navigate('/dashboard');
                return;
            }

            const response = await fetch(`${BACKEND_URL}/lesson-content/${lessonContentId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            console.log("[LessonContentViewer] API Response Status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error("[LessonContentViewer] API Error Data:", errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("[LessonContentViewer] API Success Data:", data);

            if (data.success && data.data) {
                setLessonContent(data.data);
                console.log("[LessonContentViewer] Lesson content data set:", data.data);
            } else {
                throw new Error(data.message || "Failed to retrieve lesson content details.");
            }
        } catch (err) {
            console.error("Error fetching lesson content details:", err);
            setError(err.message || "Failed to load lesson content. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [lessonContentId, BACKEND_URL, hasPermission, navigate]);

    useEffect(() => {
        if (!userLoading) {
            if (isLoggedIn) {
                if (lessonContentId) {
                    fetchLessonContentData();
                }
            } else {
                alert("Please log in to view this lesson content.");
                navigate('/login');
            }
        }
    }, [lessonContentId, isLoggedIn, userLoading, fetchLessonContentData, navigate]);

    if (loading || userLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading lesson content...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-600 mb-6">Error: {error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
            </div>
        );
    }

    if (!lessonContent) { // After loading, if content is still null
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-gray-600 mb-6">Lesson content not found.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
            </div>
        );
    }

    // --- Main Content Render ---
    const renderContent = () => {
        // If content is entirely managed by Froala,
        // then lessonContent.type might primarily be 'text' or even irrelevant,
        // as all rich content is within contentHtml.
        // We'll prioritize contentHtml, and if it's empty, fall back to old fields if they exist
        // for backward compatibility, or just show 'No content'.
        if (lessonContent.contentHtml) {
            return (
                <div className="prose max-w-none text-gray-800">
                    {/* WARNING: Using dangerouslySetInnerHTML without sanitization can open you to XSS attacks.
                        Ensure contentHtml is sanitized on the backend before storing, or use a frontend sanitizer library. */}
                    <div dangerouslySetInnerHTML={{ __html: lessonContent.contentHtml }} />
                </div>
            );
        } else {
            // Fallback for older content or if contentHtml is unexpectedly empty
            // You might remove this entire else block if you are certain all content
            // will always be in contentHtml going forward.
            switch (lessonContent.type) {
                case 'video':
                    return (
                        <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden shadow-lg">
                            <iframe
                                src={lessonContent.videoUrl}
                                title={lessonContent.title || 'Untitled Video Lesson'}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute top-0 left-0 w-full h-full border-0"
                            ></iframe>
                        </div>
                    );
                case 'image':
                    return (
                        <div className="flex justify-center items-center rounded-lg overflow-hidden shadow-lg bg-gray-100 p-4 flex-col">
                            <img src={lessonContent.imageUrl} alt={lessonContent.title || "Lesson Image"} className="max-w-full h-auto max-h-[80vh] object-contain rounded-lg" />
                        </div>
                    );
                case 'document':
                    return (
                        <div className="flex flex-col items-center justify-center space-y-4 text-center">
                            <FileText size={48} className="text-blue-600" />
                            <p className="text-lg text-gray-700 font-medium">Document: {lessonContent.title || 'Untitled Document'}</p>
                            {lessonContent.documentUrl ? (
                                <a
                                    href={lessonContent.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full transition-colors duration-200 flex items-center space-x-2"
                                >
                                    <FileText size={20} /> {/* Changed Eye to FileText for consistency with document */}
                                    <span>View Document</span>
                                </a>
                            ) : (
                                <p className="text-red-500">Document URL not available.</p>
                            )}
                        </div>
                    );
                case 'interactive':
                    return (
                        <div className="p-4 bg-yellow-100 rounded-lg text-yellow-800 shadow-sm text-center">
                            <Code size={48} className="text-yellow-600 mx-auto mb-3" />
                            <p className="font-semibold">Interactive Content: {lessonContent.title || 'Untitled'}</p>
                            <p className="text-sm"> (Implement specific embedding or logic for interactive content here) </p>
                        </div>
                    );
                case 'text': // Even if type is 'text', contentHtml should handle it
                default:
                    return (
                        <div className="text-red-500 text-center p-6 bg-red-50 rounded-lg">
                            <p>No displayable content found for this lesson, or unsupported type: {lessonContent.type || 'N/A'}.</p>
                        </div>
                    );
            }
        }
    };

    // Helper to get the correct icon based on content type, prioritizing contentHtml if available
    const getContentTypeIcon = () => {
        if (lessonContent.contentHtml) {
            // If contentHtml exists, it could contain mixed media.
            // You might inspect the contentHtml string to guess the primary type,
            // or just use a generic 'text' icon, or a 'rich content' icon.
            // For simplicity, we'll use BookOpen as a general 'lesson' icon.
            return <BookOpen size={28} className="text-blue-600 ml-4" />;
        }

        // Fallback for old content structure
        switch (lessonContent.type) {
            case 'text': return <BookOpen size={28} className="text-blue-600 ml-4" />;
            case 'video': return <Video size={28} className="text-red-600 ml-4" />;
            case 'image': return <Image size={28} className="text-green-600 ml-4" />;
            case 'document': return <FileText size={28} className="text-purple-600 ml-4" />;
            case 'interactive': return <Code size={28} className="text-yellow-600 ml-4" />;
            default: return <BookOpen size={28} className="text-gray-500 ml-4" />; // Default fallback icon
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter">
            <main className="container-2 py-8 bg-white rounded-2xl shadow-xl">
                <div className="flex items-center space-x-3 mb-6 border-b pb-4">
                    {/* Display icon based on content type */}
                    {getContentTypeIcon()}
                    <h1 className="text-3xl font-bold text-gray-900 capitalize flex-grow">
                        {lessonContent.title || `Untitled ${lessonContent.type} content`}
                    </h1>
                </div>

                {lessonContent.description && (
                    <div className="mb-8 text-gray-700 italic">
                        <p>{lessonContent.description}</p>
                    </div>
                )}

                <div className="lesson-content-display mt-8">
                    {renderContent()}
                </div>

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="btn-b flex mt-20"
                >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                </button>
            </main>
        </div>
    );
};

export default LessonContentViewer;