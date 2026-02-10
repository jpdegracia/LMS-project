import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Tag, UserRound } from 'lucide-react';
import UserContext from '../UserContext/UserContext';

const LessonPage = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn } = useContext(UserContext);

    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const fetchLessonData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setLesson(null);

        try {
            const response = await fetch(`${BACKEND_URL}/lesson-content/${lessonId}`, {
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
                setLesson(data.content);
            } else {
                throw new Error(data.message || "Failed to retrieve lesson details.");
            }
        } catch (err) {
            console.error("Error fetching lesson details:", err);
            setError(err.message || "Failed to load lesson details. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [lessonId, BACKEND_URL]);

    useEffect(() => {
        if (lessonId) {
            fetchLessonData();
        }
    }, [lessonId, fetchLessonData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading lesson content...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-2xl text-red-600 mb-8 font-semibold">Error: {error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-8 px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-3 transition-colors duration-200 shadow-md text-lg"
                >
                    <ArrowLeft size={22} />
                    <span>Back to Previous Page</span>
                </button>
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-2xl text-gray-600 mb-8 font-semibold">Lesson not found or no lesson selected.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-8 px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-3 transition-colors duration-200 shadow-md text-lg"
                >
                    <ArrowLeft size={22} />
                    <span>Back to Previous Page</span>
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 sm:p-8 font-inter">
            <main className="mx-auto px-4 sm:px-6 max-w-9xl"> {/* Increased max-width slightly for more content room */}
                <div className="relative bg-white rounded-3xl shadow-2xl p-8 md:p-14 space-y-10"> {/* Increased padding and shadow */}

                    {/* Lesson Title and Associated Media/Document */}
                    <div className="text-center pt-20 pb-8 border-b-2 border-gray-100"> {/* Increased top padding, thicker border */}
                        <h2 className=" text-start text-4xl md:text-5xl font-semibold font-primary text-gray-900 mb-20 leading-tight">{lesson.title}</h2>
                        
                        {/* Display video if available */}
                        {lesson.videoUrl && (
                            <div className="mt-8 flex justify-center"> {/* Increased margin-top */}
                                <iframe
                                    src={lesson.videoUrl.replace("watch?v=", "embed/")}
                                    title={lesson.title || "Lesson Video"}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full aspect-video max-w-2xl h-auto rounded-xl shadow-xl" /* Aspect-video for better responsiveness */
                                ></iframe>
                            </div>
                        )}
                        {/* Display image if available */}
                        {lesson.imageUrl && (
                            <div className="mt-8 flex justify-center"> {/* Increased margin-top */}
                                <img
                                    src={lesson.imageUrl}
                                    alt={lesson.title || "Lesson Image"}
                                    className="max-w-full h-auto rounded-xl shadow-xl object-contain"
                                />
                            </div>
                        )}
                        {/* Display document if available */}
                        {lesson.documentUrl && (
                            <div className="mt-8 flex justify-center"> {/* Increased margin-top */}
                                <a href={lesson.documentUrl} target="_blank" rel="noopener noreferrer"
                                   className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-full shadow-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.414L16.586 7A2 2 0 0117 8.414V16a2 2 0 01-2 2H5a2 2 0 01-2-2V4zm5 2V3.5L14.5 9H11a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                    </svg>
                                    View Document
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Lesson Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-gray-600 text-base mb-8 pt-4 border-t border-gray-100"> {/* Increased text size, gap, added top padding/border */}
                        {/* These fields (module, course, createdBy) are not directly in your LessonContent schema.
                            They will appear as "N/A" or not render if not populated by backend via populate methods. */}
                        {lesson.module && lesson.module.title && (
                            <div className="flex items-center space-x-3">
                                <Tag size={18} className="text-purple-500" />
                                <span>Module: <span className="font-medium">{lesson.module.title}</span></span>
                            </div>
                        )}
                        {lesson.course && lesson.course.title && (
                            <div className="flex items-center space-x-3">
                                <Tag size={18} className="text-green-500" />
                                <span>Course: <span className="font-medium">{lesson.course.title}</span></span>
                            </div>
                        )}
                        <div className="flex items-center space-x-3">
                            <Clock size={18} className="text-yellow-500" />
                            <span>Created: <span className="font-medium">{new Date(lesson.createdAt).toLocaleDateString()}</span></span>
                        </div>
                        {lesson.createdBy && lesson.createdBy.username && (
                            <div className="flex items-center space-x-3">
                                <UserRound size={18} className="text-gray-500" />
                                <span>Author: <span className="font-medium">{lesson.createdBy.username}</span></span>
                            </div>
                        )}
                    </div>

                    {/* Lesson Content Area - Uses lesson.contentHtml from your schema */}
                    <div className="prose max-w-none text-gray-800 leading-loose py-6 px-4 md:px-0"> {/* Added vertical padding and horizontal padding for small screens */}
                        {lesson.contentHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: lesson.contentHtml }} />
                        ) : (
                            <p className="text-gray-500 italic text-xl text-center">No textual content available for this lesson.</p>
                        )}
                    </div>

                    {/* Bottom Back Button */}
                    <div className="flex justify-center mt-16 pb-4"> {/* Increased margin-top, added bottom padding */}
                        <button
                            onClick={() => navigate(-1)}
                            className="px-10 py-5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl flex items-center space-x-4 transition-colors duration-200 shadow-lg text-xl font-medium"
                        >
                            <ArrowLeft size={24} />
                            <span>Back to Previous Page</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LessonPage;
