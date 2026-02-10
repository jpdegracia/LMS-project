import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, Eye, BookOpen, Lock, Edit, 
    ListChecks, Info, Calendar, Layout, FileText 
} from 'lucide-react';
import UserContext from '../UserContext/UserContext';

const ViewLessonPage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const fetchLessonData = useCallback(async () => {
        if (!moduleId || moduleId === 'undefined') return;
        try {
            const response = await fetch(`${BACKEND_URL}/modules/${moduleId}`, { 
                credentials: 'include' 
            });
            const result = await response.json();
            if (result.success) {
                setLesson(result.data);
            } else {
                setError(result.message || "Lesson not found.");
            }
        } catch (err) {
            setError("Failed to connect to server.");
        } finally {
            setLoading(false);
        }
    }, [moduleId, BACKEND_URL]);

    useEffect(() => {
        if (hasPermission('module:read:all')) {
            fetchLessonData();
        }
    }, [fetchLessonData, hasPermission]);

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center animate-pulse text-indigo-600 font-bold">Loading Lesson...</div>;
    if (error) return <div className="min-h-screen bg-white flex items-center justify-center p-10 text-red-500 font-bold">{error}</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-8 font-inter">
            <main className="container-2 mx-auto flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden h-[90vh]">
                
                {/* Header Section */}
                <div className="p-6 border-b bg-white flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                            <BookOpen size={24} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-bold text-gray-800 leading-tight">{lesson.title}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider italic">
                                    Lesson Module
                                </p>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border h-fit ${
                                    lesson.status === 'published' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                }`}>
                                    {lesson.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 btn-b cursor-pointer">
                        <ChevronLeft size={18}/> Back
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x overflow-hidden flex-grow">
                    
                    {/* Sidebar: Lesson Stats & Actions */}
                    <aside className="p-6 bg-gray-50/50 space-y-8 overflow-y-auto flex flex-col justify-between h-full">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Layout size={14}/> Lesson Info</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Parts</span>
                                        <span className="font-bold">{lesson.contents?.length || 0} Contents</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Created</span>
                                        <span className="font-bold text-indigo-600">{new Date(lesson.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Info size={14}/> Description</h3>
                                <p className="text-xs text-gray-600 leading-relaxed italic">
                                    {lesson.description || "No description provided for this lesson."}
                                </p>
                            </div>
                        </div>

                        {/* Actions aligned with your Quiz Page style */}
                        <div className="space-y-3 pt-6 border-t border-gray-200">
                            {hasPermission('module:update') && (
                                <>
                                    <button 
                                        onClick={() => navigate(`/manage-lesson-content/${moduleId}`)}
                                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ListChecks size={18} /> Manage Content
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/edit-lesson-module/${moduleId}`)} 
                                        className="w-full py-3 items-center flex gap-2 justify-center bg-white border border-indigo-200 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition shadow-sm cursor-pointer"
                                    >
                                        <Edit size={18} /> Edit Details
                                    </button>
                                </>
                            )}
                        </div>
                    </aside>

                    {/* Main Content: Lesson Parts List */}
                    <div className="lg:col-span-3 p-6 bg-white overflow-y-auto">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4 border-b pb-4 sticky top-0 bg-white z-10">
                            <FileText size={18} className="text-indigo-600" />
                            Lesson Content Structure
                        </h3>

                        <div className="space-y-3">
                            {lesson.contents && lesson.contents.length > 0 ? (
                                lesson.contents.map((part, index) => (
                                    <div key={part._id} className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-100 hover:border-indigo-300 hover:shadow-sm transition-all w-[800px] group">
                                        <span className="font-bold text-gray-800 text-xs w-6">{index + 1}.</span>
                                        <div className="flex-grow flex items-center space-x-3 min-w-0 overflow-hidden">
                                            <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-indigo-500 transition-colors">
                                                {/* You can swap icons based on content type here */}
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex flex-col truncate">
                                                <span className="text-sm font-bold text-gray-800 truncate">
                                                    {part.title || "Untitled Section"}
                                                </span>
                                                {/* <span className="text-[10px] text-gray-400 uppercase font-medium">
                                                    {part.contentType || 'Video Content'}
                                                </span> */}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                             <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 uppercase">
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-gray-400 border-2 border-dashed rounded-xl italic">
                                    This lesson has no content parts yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ViewLessonPage;