import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Trash2, ArrowLeft, BookOpen, HelpCircle, ListCollapse, Edit, PlusCircle, Layers } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserContext from '../../../UserContext/UserContext';

// Props:
// - courseId: The ID of the course being built.
// - onBackToList: Callback to navigate back to the course list.
// - currentCourse: The full, populated course object.
// - onUpdateCourse: Callback to update the parent's state.
const CourseBuilder = ({ courseId, onBackToList, currentCourse, onUpdateCourse }) => {
    const [courseDetails, setCourseDetails] = useState(currentCourse || null);
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState(null);
    const { hasPermission } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- Helper to Calculate Quiz Stats ---
    const getQuizStats = (module) => {
        if (module.moduleType !== 'quiz') return null;

        const isSAT = module.satSettings?.isSAT;
        let count = 0;

        if (isSAT) {
            // Sum questions from all strands
            count = module.satSettings?.strands?.reduce((acc, strand) => {
                return acc + (strand.questions ? strand.questions.length : 0);
            }, 0) || 0;
        } else {
            // Standard flat list
            count = module.questions ? module.questions.length : 0;
        }

        return { isSAT, count };
    };

    /**
     * Fetches a single course by its ID.
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
                throw new Error(data.message || "Failed to retrieve course details.");
            }
        } catch (err) {
            console.error("Failed to fetch course details:", err);
            setLocalError(err.message);
            return null;
        } finally {
            setLocalLoading(false);
        }
    }, [BACKEND_URL]);

    const refreshCourseDetails = useCallback(async () => {
        const updatedCourse = await fetchCourseById(courseId);
        if (updatedCourse) {
            setCourseDetails(updatedCourse);
            onUpdateCourse({ course: updatedCourse });
        }
    }, [courseId, fetchCourseById, onUpdateCourse]);

    useEffect(() => {
        if (!currentCourse || currentCourse._id !== courseId || location.state?.refresh) {
            refreshCourseDetails();
            if (location.state?.refresh) {
                navigate(location.pathname, { replace: true, state: {} });
            }
        } else {
            setCourseDetails(currentCourse);
        }
    }, [courseId, currentCourse, refreshCourseDetails, location.state, navigate]);

    // --- Section Management ---
    const handleDeleteSection = async (sectionId) => {
        if (!window.confirm("Are you sure you want to delete this section?")) return;
        setLocalLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) throw new Error("Failed to delete section.");
            await refreshCourseDetails();
        } catch (err) {
            setLocalError(err.message);
        } finally {
            setLocalLoading(false);
        }
    };

    // --- Module Management ---
    const handleDeleteModule = async (sectionId, moduleId) => {
        if (!window.confirm("Remove this module from the section?")) return;
        setLocalLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}/modules/${moduleId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) throw new Error("Failed to unlink module.");
            await refreshCourseDetails();
        } catch (err) {
            setLocalError(err.message);
        } finally {
            setLocalLoading(false);
        }
    };

    if (localLoading && !courseDetails) {
        return <div className="p-6 bg-white rounded-xl shadow-lg text-center"><p className="text-xl text-blue-600">Loading...</p></div>;
    }
    if (!courseDetails) {
        return <div className="p-6 text-center text-red-600">Course not found. <button onClick={onBackToList}>Back</button></div>;
    }

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg min-h-screen relative font-inter">
            <button onClick={onBackToList} className="absolute top-4 left-4 p-2 m-5 btn-b flex cursor-pointer">
                <ArrowLeft size={20} />
                <span>Back to Courses</span>
            </button>
            <h2 className="text-3xl font-semibold font-primary text-gray-900 mb-6 text-center pt-12">
                Building: <span className="text-indigo-600">{courseDetails.title}</span>
            </h2>
            <p className="text-center text-gray-600 mb-8">{courseDetails.description}</p>
            
            {localLoading && <p className="text-center text-blue-600">Updating...</p>}
            {localError && <p className="text-center text-red-600">{localError}</p>}

            {hasPermission('section:create') && (
                <div className="flex justify-center mb-8">
                    <button
                        onClick={() => navigate(`/course-management/${courseId}/sections/create`)}
                        className="btn-a transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 cursor-pointer"
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
                                        <button onClick={() => handleDeleteSection(section._id)} className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200" disabled={localLoading}>
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-gray-600 mb-4 ml-8">{section.sectionDescription || 'No description.'}</p>
                                
                                {hasPermission('module:create') && (
                                    <div className="flex justify-end mb-4">
                                        <button
                                            onClick={() => navigate(`/courses-manage/${courseId}/sections/${section._id}/add-module`)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-md text-sm flex items-center space-x-1.5 cursor-pointer"
                                        >
                                            <PlusCircle size={16} /> <span>Add Module</span>
                                        </button>
                                    </div>
                                )}

                                {section.modules && section.modules.length > 0 ? (
                                    <div className="mt-6 ml-8 border-l-2 border-blue-300 pl-4 space-y-3">
                                        {section.modules
                                            .sort((a, b) => a.order - b.order)
                                            .map((module) => {
                                                // Calculate stats for this module loop
                                                const quizStats = getQuizStats(module);

                                                return (
                                                    <div key={module._id} className="bg-white rounded-md p-3 shadow-sm flex items-center justify-between">
                                                        <div className="flex items-center space-x-3 flex-grow">
                                                            {module.moduleType === 'lesson' ? (
                                                                <BookOpen size={18} className="text-green-600" />
                                                            ) : (
                                                                // Use Layers icon for SAT, HelpCircle for Standard
                                                                quizStats?.isSAT ? <Layers size={18} className="text-purple-600" /> : <HelpCircle size={18} className="text-blue-600" />
                                                            )}
                                                            
                                                            <div>
                                                                <span className="font-medium text-gray-900"><span className="text-blue-600 mr-1">{module.order}.</span> {module.title}</span>
                                                                {module.description && <span className="text-gray-500 text-sm ml-2">- {module.description}</span>}
                                                            </div>
                                                        </div>

                                                        {/* --- RIGHT SIDE: INFO & ACTIONS --- */}
                                                        <div className="flex items-center space-x-4">
                                                            
                                                            {/* 1. Module Info Badge */}
                                                            {module.moduleType === 'lesson' && module.content && (
                                                                <span className="text-blue-500 text-xs italic">
                                                                    Content: {module.content.title || 'Untitled'}
                                                                </span>
                                                            )}

                                                            {module.moduleType === 'quiz' && quizStats && (
                                                                <div className="flex flex-col items-end">
                                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${quizStats.isSAT ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                        {quizStats.isSAT ? 'SAT Mode' : 'Standard'}
                                                                    </span>
                                                                    <span className="text-gray-500 text-xs italic mt-0.5">
                                                                        {quizStats.count} Questions
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* 2. Action Buttons */}
                                                            <div className="flex items-center space-x-2">
                                                                {module.moduleType === 'lesson' && module.content && hasPermission('lesson_content:update') && (
                                                                    <button onClick={() => navigate(`/lesson-content-edit/${module.content._id}`)} className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer" title="Edit Content">
                                                                        <Edit size={16} />
                                                                    </button>
                                                                )}
                                                                
                                                                {/* Edit Quiz Settings & Questions Button */}
                                                                {module.moduleType === 'quiz' && (
                                                                    <button onClick={() => navigate(`/edit-quiz/${module._id}`)} className="p-1.5 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 cursor-pointer" title="Edit Quiz Settings">
                                                                        <Edit size={16} />
                                                                    </button>
                                                                )}

                                                                {hasPermission('module:delete') && (
                                                                    <button onClick={() => handleDeleteModule(section._id, module._id)} className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer" title="Remove Module">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-500 mt-4 text-sm ml-8">No modules yet.</p>
                                )}
                            </div>
                        ))}
                </div>
            ) : (
                <p className="text-center text-lg text-gray-500 mt-8">No sections yet. Add your first section above!</p>
            )}
        </div>
    );
};

export default CourseBuilder;