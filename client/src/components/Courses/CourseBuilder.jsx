import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Trash2, ArrowLeft, BookOpen, HelpCircle, ListCollapse, Edit, PlusCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import UserContext from '../UserContext/UserContext';

// Props:
// - courseId: The ID of the course being built (from CourseManagementPage).
// - onBackToList: Callback to navigate back to the course list (from CourseManagementPage).
// - currentCourse: The full, populated course object (sections, modules) from the parent.
// - onUpdateCourse: Callback to update the parent's selectedCourse state after builder modifications.
const CourseBuilder = ({ courseId, onBackToList, currentCourse, onUpdateCourse }) => {
    const [courseDetails, setCourseDetails] = useState(currentCourse || null);
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState(null);
    const { hasPermission } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation(); // Get the location object to check for state
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    /**
     * Fetches a single course by its ID, ensuring deep population of sections and modules.
     * @param {string} id - The ID of the course to fetch.
     * @returns {Promise<Object|null>} The fetched course data.
     */
    const fetchCourseById = useCallback(async (id) => {
        setLocalLoading(true);
        setLocalError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/courses/${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                return data.course;
            } else {
                throw new Error(data.message || "Failed to retrieve course details for building.");
            }
        } catch (err) {
            console.error("Failed to fetch course details for builder:", err);
            setLocalError(err.message || "Failed to load course details for building. Please try again later.");
            return null;
        } finally {
            setLocalLoading(false);
        }
    }, [BACKEND_URL]);

    /**
     * Helper function to refresh local course details after an action.
     * This makes a fresh API call to get the latest populated course data.
     */
    const refreshCourseDetails = useCallback(async () => {
        const updatedCourse = await fetchCourseById(courseId);
        if (updatedCourse) {
            setCourseDetails(updatedCourse);
            onUpdateCourse({ course: updatedCourse });
        }
    }, [courseId, fetchCourseById, onUpdateCourse]);

    // Effect to initially set or re-fetch course details and to listen for refresh signals
    useEffect(() => {
        // Condition to trigger a fetch:
        // 1. No currentCourse data
        // 2. The currentCourse data is for a different ID
        // 3. The navigation state has a 'refresh' flag
        if (!currentCourse || currentCourse._id !== courseId || location.state?.refresh) {
            refreshCourseDetails();
            
            // Clear the refresh state to prevent re-fetching on subsequent renders
            if (location.state?.refresh) {
                navigate(location.pathname, { replace: true, state: {} });
            }
        } else {
            setCourseDetails(currentCourse);
        }
    }, [courseId, currentCourse, refreshCourseDetails, location.state, navigate]);

    // --- Section Management ---
    const handleDeleteSection = async (sectionId) => {
        if (!window.confirm("Are you sure you want to delete this section and all its modules? This action cannot be undone.")) return;
        setLocalLoading(true);
        setLocalError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || "Failed to delete section.");
            }
            await refreshCourseDetails();
        } catch (err) {
            console.error("Error deleting section:", err);
            setLocalError(err.message || "Failed to delete section.");
        } finally {
            setLocalLoading(false);
        }
    };

    // --- Module Management ---
    const handleDeleteModule = async (sectionId, moduleId) => {
        if (!window.confirm("Are you sure you want to remove this module from the section? The module will not be permanently deleted.")) return;
        
        setLocalLoading(true);
        setLocalError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}/modules/${moduleId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || "Failed to unlink module.");
            }
            await refreshCourseDetails(); // Refresh to reflect the updated module order
        } catch (err) {
            console.error("Error unlinking module:", err);
            setLocalError(err.message || "Failed to unlink module.");
        } finally {
            setLocalLoading(false);
        }
    };


    if (localLoading && !courseDetails) {
        return (
            <div className="p-6 bg-white rounded-xl shadow-lg text-center min-h-[400px] flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading course for builder...</p>
            </div>
        );
    }
    if (localError && !courseDetails) {
        return (
            <div className="p-6 bg-white rounded-xl shadow-lg text-center min-h-[400px] flex items-center justify-center">
                <p className="text-xl text-red-600">Error: {localError}</p>
            </div>
        );
    }
    if (!courseDetails) {
        return (
            <div className="p-6 bg-white rounded-xl shadow-lg text-center min-h-[400px] flex flex-col items-center justify-center">
                <p className="text-xl text-gray-600 mb-4">No course selected for building. Please go back to the list.</p>
                <button
                    onClick={onBackToList}
                    className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md flex items-center space-x-2"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Courses</span>
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg min-h-screen relative">
            <button onClick={onBackToList} className="absolute top-4 left-4 p-2 m-5 btn-b flex">
                <ArrowLeft size={20} />
                <span>Back to Courses</span>
            </button>
            <h2 className="text-3xl font-semibold font-primary text-gray-900 mb-6 text-center pt-12">
                Building: <span className="text-indigo-600">{courseDetails.title}</span>
            </h2>
            <p className="text-center text-gray-600 mb-8">{courseDetails.description}</p>
            {localLoading && <p className="text-center text-lg text-blue-600">Updating course content...</p>}
            {localError && <p className="text-center text-lg text-red-600">{localError}</p>}
            {hasPermission('section:create') && (
                <div className="flex justify-center mb-8">
                    <button
                        onClick={() => navigate(`/course-management/${courseId}/sections/create`)}
                        className="btn-a transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2"
                    >
                        <PlusCircle size={18} />
                        <span>Add New Section</span>
                    </button>
                </div>
            )}
            {courseDetails.sections && courseDetails.sections.length > 0 ? (
                <div className="space-y-6">
                    {courseDetails.sections
                        .sort((a, b) => a.order - b.order)
                        .map((section) => (
                            <div key={section._id} className="bg-gray-50 rounded-lg p-6 shadow-md border border-gray-200">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        <ListCollapse size={20} className="inline-block mr-2 text-purple-500" />
                                        <span className="text-purple-600 mr-2">{section.order}.</span> {section.sectionTitle}
                                    </h3>
                                    {hasPermission('section:delete') && (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleDeleteSection(section._id)}
                                                className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200"
                                                title="Delete Section"
                                                disabled={localLoading}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <p className="text-gray-600 mb-4 ml-8">{section.sectionDescription || 'No description.'}</p>
                                {hasPermission('module:create') && (
                                    <div className="flex justify-end mb-4">
                                        <button
                                            onClick={() => navigate(`/courses-manage/${courseId}/sections/${section._id}/add-module`)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-md text-sm transition duration-300 ease-in-out flex items-center space-x-1.5"
                                        >
                                            <PlusCircle size={16} />
                                            <span>Add Module</span>
                                        </button>
                                    </div>
                                )}
                                {section.modules && section.modules.length > 0 ? (
                                    <div className="mt-6 ml-8 border-l-2 border-blue-300 pl-4 space-y-3">
                                        {section.modules
                                            .sort((a, b) => a.order - b.order)
                                            .map((module) => (
                                                <div key={module._id} className="bg-white rounded-md p-3 shadow-sm flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-grow">
                                                        {module.moduleType === 'lesson' ? <BookOpen size={18} className="text-green-600" /> : <HelpCircle size={18} className="text-purple-600" />}
                                                        <span className="font-medium text-gray-900"><span className="text-blue-600 mr-1">{module.order}.</span> {module.title}</span>
                                                        {module.description && (
                                                            <span className="text-gray-500 text-sm ml-2"> - {module.description}</span>
                                                        )}
                                                        {module.moduleType === 'lesson' && module.content && (
                                                            <span className="text-blue-500 text-xs italic ml-auto">
                                                                Content: {module.content.title || 'Untitled'}
                                                            </span>
                                                        )}
                                                        {module.moduleType === 'quiz' && module.questions && module.questions.length > 0 && (
                                                            <span className="text-orange-500 text-xs italic ml-auto">
                                                                {module.questions.length} Questions
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-shrink-0 flex items-center space-x-2 ml-4">
                                                        {module.moduleType === 'lesson' && module.content && hasPermission('lesson_content:update') && (
                                                            <button
                                                                onClick={() => navigate(`/lesson-content-edit/${module.content._id}`)}
                                                                className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors duration-200 cursor-pointer"
                                                                title="Edit Lesson Content"
                                                                disabled={localLoading}
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                        )}
                                                        {hasPermission('module:delete') && (
                                                            <button
                                                                onClick={() => handleDeleteModule(section._id, module._id)}
                                                                className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200"
                                                                title="Delete Module"
                                                                disabled={localLoading}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-500 mt-4 text-sm ml-8">No modules yet. Add one above!</p>
                                )}
                            </div>
                        ))}
                </div>
            ) : (
                <p className="text-center text-lg text-gray-500 mt-8">This course has no sections yet. Add your first section above!</p>
            )}
        </div>
    );
};

export default CourseBuilder;