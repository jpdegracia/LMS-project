import React, { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import { MdAnnouncement, MdCheckCircleOutline } from "react-icons/md";
import { Edit2, Hourglass, Megaphone, Send, Trash2, X, Clock } from "lucide-react";
import UserContext from '../UserContext/UserContext'; 
import { Editor } from "@tinymce/tinymce-react";

const MyLearning = () => {
    const [userEnrollments, setUserEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { hasPermission, isLoggedIn, user, loading: userLoading } = useContext(UserContext);  

    // --- Notification/Announcement States ---
    const [announcements, setAnnouncements] = useState([]);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false); 
    const [currentEditId, setCurrentEditId] = useState(null); 
    const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const fetchUserEnrollments = useCallback(async () => {
        if (!isLoggedIn || userLoading || !user || !user.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const enrollmentsResponse = await fetch(`${BACKEND_URL}/enrollments/my-courses`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!enrollmentsResponse.ok) {
                const errorData = await enrollmentsResponse.json().catch(() => ({ message: enrollmentsResponse.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${enrollmentsResponse.status}`);
            }

            const data = await enrollmentsResponse.json();
            if (data.success && data.data) {
                const progressCourses = data.data.filter(e => e.status !== 'not-enrolled');
                setUserEnrollments(progressCourses);
            }

        } catch (err) {
            console.error("Failed to fetch user enrollments:", err);
            setError("Failed to load your learning data.");
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL, isLoggedIn, user, userLoading]);

    // Fetch Recent Announcements
    const fetchAnnouncements = useCallback(async () => {
        try {
            // Note: Ensure your backend controller populates 'sender' with 'firstName lastName avatar'
            const res = await fetch(`${BACKEND_URL}/notifications`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                const onlyAnnouncements = data.data.filter(n => n.type === 'ANNOUNCEMENT');
                setAnnouncements(onlyAnnouncements.slice(0, 5)); 
            }
        } catch (err) {
            console.error("Announcement error:", err);
        }
    }, [BACKEND_URL]);

    useEffect(() => {
        if (!userLoading) { 
            fetchUserEnrollments();
            fetchAnnouncements();
        }
    }, [userLoading, fetchUserEnrollments, fetchAnnouncements]);

    // --- CRUD ACTIONS ---

    const handleEditInitiate = (ann) => {
        setBroadcastData({ 
            // Pull directly from the new title field in your DB
            title: ann.title || '', 
            // Pull directly from the content field (which should now only be the message body)
            message: ann.content || '' 
        });
        setCurrentEditId(ann._id);
        setIsEditing(true);
        setIsBroadcastModalOpen(true);
    };

    const handleEditorChange = (content) => {
        setBroadcastData(prev => ({ ...prev, message: content }));
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!window.confirm("Are you sure? This will delete the post for ALL students.")) return;
        try {
            const res = await fetch(`${BACKEND_URL}/notifications/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                fetchAnnouncements();
            }
        } catch (err) {
            alert("Delete failed");
        }
    };

    const handleBroadcastSubmit = async (e) => {
        e.preventDefault();
        
        const url = isEditing 
            ? `${BACKEND_URL}/notifications/${currentEditId}` 
            : `${BACKEND_URL}/notifications/broadcast`;
        
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: broadcastData.title,
                    message: broadcastData.message, 
                    targetId: null, 
                    targetModel: null,
                    type: 'ANNOUNCEMENT'
                })
            });

            if (res.ok) {
                setIsBroadcastModalOpen(false);
                setIsEditing(false);
                setBroadcastData({ title: '', message: '' });
                fetchAnnouncements();
            }
        } catch (err) {
            console.error("Broadcast Error:", err);
            alert("Broadcast failed");
        }
    };

    if (loading || userLoading) {
        return <div className="min-h-screen p-8 flex items-center justify-center text-indigo-600 font-bold">Loading...</div>;
    }

    const activeCourses = userEnrollments.filter(e => e.status === 'in-progress' || e.status === 'enrolled');
    const completedCourses = userEnrollments.filter(e => e.status === 'completed');

    return (
        <div className="container-3 bg-gray-50 p-8">
            <div className="bg-gradient-to-r from-blue-200 to-blue-300 text-blue-700 text-2xl font-semibold p-8 rounded-xl shadow-md mb-10">
                Welcome back, {user?.firstName || 'User'}! Keep up the great work.
            </div>

            {/* --- ANNOUNCEMENT SECTION --- */}
            <div className="mb-12 flex flex-col items-center">
                <div className="w-full max-w-2xl"> 
                    
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                            <MdAnnouncement size={24} className="text-amber-500" /> Recent Announcements
                        </h3>
                        
                        {hasPermission('manage_notifications:create') && (
                            <button 
                                onClick={() => {
                                    setIsEditing(false);
                                    setBroadcastData({ title: '', message: '' });
                                    setIsBroadcastModalOpen(true);
                                }}
                                className="flex items-center gap-2 bg-sky-100 hover:bg-sky-200 text-gray-900 px-4 py-2 rounded-lg shadow-sm transition-all font-bold text-xs uppercase tracking-wider cursor-pointer"
                            >
                                <Megaphone size={16} /> Add Announcement
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {announcements.length > 0 ? announcements.map((ann) => (
                            <div 
                                key={ann._id} 
                                className="group bg-white border-l-4 border-blue-500 p-5 rounded-xl shadow-sm hover:shadow-md transition-all flex justify-between items-start border "
                            >
                                <div className="flex-grow">
                                    {ann.title && (
                                        <h4 className="text-base font-bold text-slate-900 mb-1">
                                            {ann.title}
                                        </h4>
                                    )}
                                    
                                    {/* Display only the message body here */}
                                    <div 
                                        className="text-gray-800 text-sm leading-relaxed mb-4 announcement-rich-text"
                                        dangerouslySetInnerHTML={{ __html: ann.content }} 
                                    />
                                    
                                    {/* Metadata Row: Avatar, Name, and Timestamp */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {ann.sender && (
                                            <div className="flex items-center gap-2 pr-4 border-r border-gray-200">
                                                <img 
                                                    src={ann.sender.avatar || `https://ui-avatars.com/api/?name=${ann.sender.firstName}+${ann.sender.lastName}&background=eff6ff&color=3b82f6`} 
                                                    alt="creator" 
                                                    className="w-5 h-5 rounded-full object-cover border border-gray-100"
                                                />
                                                <span className="text-blue-600">
                                                    Created by: {ann.sender.firstName} 
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={10} />
                                            <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                            <span className="normal-case font-medium opacity-70">
                                                {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {hasPermission('manage_notifications:update') && (
                                        <button onClick={() => handleEditInitiate(ann)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer">
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                    {hasPermission('manage_notifications:delete') && (
                                        <button onClick={() => handleDeleteAnnouncement(ann._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-400 text-sm italic">
                                No current announcements.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MODAL FOR BROADCASTING --- */}
            {isBroadcastModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 relative">
                        <button onClick={() => setIsBroadcastModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors">
                            <X size={20} />
                        </button>
                        
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                            <Megaphone size={24} className="text-blue-600" /> 
                            {isEditing ? "Edit Announcement" : "New Broadcast"}
                        </h2>

                        <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Title</label>
                                <input 
                                    type="text" placeholder="e.g., October Simulation Schedule" required
                                    className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-blue-500 outline-none transition-all"
                                    value={broadcastData.title}
                                    onChange={(e) => setBroadcastData({...broadcastData, title: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Message Details</label>
                                <Editor
                                    apiKey='dpd6dld04b51jyqhuze4ik03um8y07n98w0bzavbou4on3dm'
                                    value={broadcastData.message}
                                    init={{
                                        height: 300,
                                        menubar: false,
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
                                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                        ],
                                        toolbar: 'undo redo | blocks | ' +
                                            'bold italic forecolor | alignleft aligncenter ' +
                                            'alignright alignjustify | bullist numlist outdent indent | ' +
                                            'removeformat | help',
                                        content_style: 'body { font-family:Inter,Helvetica,Arial,sans-serif; font-size:14px }',
                                        border_radius: '12px'
                                    }}
                                    onEditorChange={handleEditorChange}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsBroadcastModalOpen(false)} 
                                    className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                                >
                                    <Send size={18} /> {isEditing ? "Update Announcement" : "Send to All Users"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- COURSES SECTIONS (REMAINS SAME) --- */}
            <div className="mb-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center">
                    <Hourglass size={24} className="text-purple-600 mr-2" /> In-Progress Courses
                </h2>
                {activeCourses.length === 0 ? (
                    <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm text-center">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">No Active Courses</h3>
                        <p className="text-sm text-gray-500">Start a course from the "What to Learn Next?" section.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeCourses.map(enrollment => {
                            const isPracticeTest = enrollment.courseId?.contentType === 'practice_test';
                            const thumbnail = enrollment.courseId?.thumbnail; 
                            return (
                                <Link 
                                    key={enrollment._id} 
                                    to={`/courses/${enrollment.courseId?._id}`}
                                    state={{ from: window.location.pathname }} 
                                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-200 ease-in-out flex items-start space-x-6" 
                                >
                                    {thumbnail && (
                                        <div className="flex-shrink-0 w-30 h-30 overflow-hidden rounded-lg bg-gray-100 hidden sm:block">
                                            <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex flex-col flex-grow">
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">{enrollment.courseId?.title || 'Course Title'}</h4>
                                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{enrollment.courseId?.description}</p>
                                        {!isPracticeTest && (
                                            <div className="flex items-center justify-between space-x-2 mt-2">
                                                <div className="w-2/3 bg-gray-200 rounded-full h-2"> 
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${enrollment.progressPercentage || 0}%` }}></div>
                                                </div>
                                                <p className="text-xs text-gray-600">Progress: {enrollment.progressPercentage || 0}%</p>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center">
                    <MdCheckCircleOutline size={24} className="text-green-600 mr-2" /> Completed Courses 
                </h2>
                {completedCourses.length === 0 ? (
                    <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm text-center">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Keep going!</h3>
                        <p className="text-sm text-gray-500">Complete an active course to see it here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {completedCourses.map(enrollment => {
                            const thumbnail = enrollment.courseId?.thumbnail; 
                            return (
                                <Link 
                                    key={enrollment._id} 
                                    to={`/courses/${enrollment.courseId?._id}`}
                                    state={{ from: window.location.pathname }}
                                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-200 ease-in-out flex items-start space-x-4 border-2 border-green-400"
                                >
                                    <div className="flex flex-col flex-grow">
                                        <h4 className="text-xl font-bold text-gray-800 mb-3">{enrollment.courseId?.title}</h4>
                                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{enrollment.courseId?.description}</p>
                                    </div>
                                    {thumbnail && (
                                        <div className="flex-shrink-0 w-24 h-24 overflow-hidden rounded-lg bg-gray-100 hidden sm:block">
                                            <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover opacity-70" />
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyLearning;