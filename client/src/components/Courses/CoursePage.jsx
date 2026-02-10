import React, { useState, useEffect, useCallback, useContext } from 'react';
import { BookOpen, BarChart2, CheckCircle, Clock, Eye, Hourglass } from 'lucide-react';
import { MdPlayCircleOutline, MdLightbulbOutline } from 'react-icons/md';
import UserContext from '../UserContext/UserContext';
import { useNavigate } from 'react-router-dom';

import careerlab from '../../assets/careerlab.png';

const image = careerlab;

const CoursesPage = () => {
    const [courses, setCourses] = useState([]);
    const [userEnrollments, setUserEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);

    const { isLoggedIn, user, loading: userLoading } = useContext(UserContext);
    const navigate = useNavigate();

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        let allCourses = [];
        let enrollments = [];

        try {
            // 1. Fetch All Courses
            const coursesResponse = await fetch(`${BACKEND_URL}/courses`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!coursesResponse.ok) {
                const errorData = await coursesResponse.json().catch(() => ({ message: coursesResponse.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${coursesResponse.status}`);
            }

            const coursesData = await coursesResponse.json();
            if (coursesData.success) {
                allCourses = (coursesData.data || []).filter(course => course.status === 'published');
                setCourses(allCourses);
                const uniqueCategories = ['all', ...new Set(allCourses.map(course => course.category?.name).filter(Boolean))];
                setCategories(uniqueCategories);
            } else {
                throw new Error(coursesData.message || "Failed to retrieve courses.");
            }

            // 2. Conditionally Fetch User Enrollments
            if (isLoggedIn && user && user.id) {
                const enrollmentsResponse = await fetch(`${BACKEND_URL}/enrollments/my-courses`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });

                if (!enrollmentsResponse.ok) {
                    const errorData = await enrollmentsResponse.json().catch(() => ({ message: enrollmentsResponse.statusText }));
                    console.error("fetchUserEnrollments: HTTP error fetching user enrollments:", enrollmentsResponse.status, errorData.message);
                    // On error, use empty array but continue rendering
                    enrollments = [];
                } else {
                    const data = await enrollmentsResponse.json();
                    enrollments = (data.success && data.data) ? data.data : [];
                }
            }
            
            // Update state with final enrollment data
            setUserEnrollments(enrollments);

        } catch (err) {
            console.error("fetchAllData: Failed to fetch data:", err);
            setError(err.message || "Failed to load courses or progress. Please try again later.");
        } finally {
            // Only set loading to false AFTER all data fetches have completed
            setLoading(false);
        }
    }, [BACKEND_URL, isLoggedIn, user]);

    // 🚀 UPDATED useEffect HOOK 🚀
    useEffect(() => {
        // Wait until the user context determines if the user is logged in
        if (!userLoading) { 
            fetchAllData();
        }
    }, [userLoading, fetchAllData]);

    // Simplified getEnrollmentStatus function - left in for completeness
    const getEnrollmentStatus = (courseId) => {
        const enrollment = userEnrollments.find(e => e.courseId && e.courseId._id === courseId);
        if (!enrollment) {
            return { status: 'not-enrolled', enrollment: null, progress: 0 };
        }
        return { status: enrollment.status, enrollment: enrollment, progress: enrollment.progressPercentage };
    };

    if (loading || userLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading courses and your progress...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex items-center justify-center">
                <p className="text-xl text-red-600">Error: {error}</p>
            </div>
        );
    }

    const enrolledCourseIds = new Set(userEnrollments.map(e => e.courseId && e.courseId._id).filter(Boolean));

    const myCourses = courses.filter(course => {
        const matchesSearchTerm = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || (course.category && course.category.name === selectedCategory);
        return enrolledCourseIds.has(course._id) && matchesSearchTerm && matchesCategory;
    });

    const whatToLearnNextCourses = courses.filter(course => {
        const matchesSearchTerm = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || (course.category && course.category.name === selectedCategory);
        return !enrolledCourseIds.has(course._id) && matchesSearchTerm && matchesCategory;
    });
    
    return (
        <div className="container-2 bg-gray-50 font-inter">
            <main className="container mx-auto px-6 py-12 space-y-5">

                {/* Hero Section */}
                    <section className="container-2 text-center justify-center items-center text-gray-800 overflow-hidden">
                        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10 mt-10">
                            <header className="mb-8 text-center"> {/* Removed md:text-left */}
                                <h1 className="text-3xl sm:text-3xl md:text-3xl lg:text-4xl font-semibold font-primary text-blue-700 mb-4 leading-tight">
                                    Unlock Your Potential with The Careerlab°!
                                </h1>
                                <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                                    Join millions of learners exploring a world of knowledge and advancing their careers.
                                </p>
                                {/* <div className="mt-8 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6"> 
                                    <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center text-base sm:text-lg">
                                        <MdPlayCircleOutline className="inline-block mr-3 text-2xl" /> Reactivate Subscription
                                    </button>
                                    <button className="border-2 border-blue-600 hover:bg-blue-50 text-blue-600 font-semibold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center text-base sm:text-lg">
                                        <MdLightbulbOutline className="inline-block mr-3 text-2xl" /> Buy for Your Team
                                    </button>
                                </div> */}
                                {/* <div className="mt-10 max-w-lg mx-auto">
                                <img 
                                    src={image} 
                                    alt="Careerlab Logo or Hero Image" 
                                    className="w-40 h-40"
                                />
                                </div> */}
                            </header>
                        </div>
                    </section>

                {/* What to Learn Next Section */}
                <section>
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b-2 pb-4 border-black">
                        <h2 className="text-3xl font-bold font-primary text-gray-900 mb-4 md:mb-0">
                            What to Learn Next ?
                        </h2>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                            <div className="relative w-full sm:w-72">
                                <input
                                    type="text"
                                    placeholder="Search courses..."
                                    className="w-full pl-10 pr-4 py-2 border bg-white border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
                                </svg>
                            </div>
                            <div className="w-full sm:w-40">
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    {categories.map(category => (
                                        <option key={category} value={category}>
                                            {category === 'all' ? 'All Categories' : category}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className=' text-2xl mt-3 mb-6 ml-2'>
                        <h3 className='font-semibold'>Recommended for you</h3>
                    </div>

                    {whatToLearnNextCourses.length === 0 ? (
                        <p className="text-xl text-gray-500 text-center mt-8 p-6 bg-white rounded-lg shadow-md">
                            No courses match your search criteria.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-10">
                            {whatToLearnNextCourses.map((course) => {
                                return (
                                    <button
                                        key={course._id}
                                        onClick={() => navigate(`/courses/${course._id}`, { state: { from: window.location.pathname + window.location.search } })}
                                        className="text-left bg-white rounded-xl shadow-lg flex flex-col justify-between hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    >
                                        <div className='justify-center items-center'>
                                        {/* Thumbnail Section - Added an Image tag with Tailwind CSS classes for styling */}
                                            {course.thumbnail && (
                                                <div className="w-full aspect-video lg:h-52 px-6 pt-5">
                                                    <img 
                                                        src={course.thumbnail} 
                                                        alt={`${course.title} thumbnail`} 
                                                        className="w-full h-full object-center "
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-4 p-6 justify-between -mt-1">
                                            
                                            <div className="flex-grow">
                                                <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight
                                                                hover:text-blue-700 hover:underline transition-all duration-200 cursor-pointer line-clamp-2">
                                                    {course.title}
                                                </h3>
                                                {/* Adjusted line-clamp-3 to line-clamp-4 or removed it, depending on your design preference. 
                                                    Line-clamp-3 might be too short with the thumbnail present. 
                                                    I'll use line-clamp-4 for more space. */}
                                                <p className="text-gray-600 text-base line-clamp-2">{course.description || 'No description provided.'}</p>
                                            </div>

                                        </div>
                                        
                                        <div className="mt-auto pt-5 border-t p-6 border-gray-100 grid grid-cols-2 gap-y-2 gap-x-4">
                                            <div className="flex items-center text-gray-700 text-sm">
                                                {course.contentType === 'practice_test' ? (
                                                    <BookOpen size={18} className="text-orange-500 mr-3" />
                                                ) : (
                                                    <MdPlayCircleOutline size={20} className="text-purple-500 mr-3" />
                                                )}
                                                <span>Type: <span className="font-bold text-indigo-600">{course.contentType.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'N/A'}</span></span>
                                            </div>
                                            <div className="flex items-center text-gray-700 text-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag text-purple-500 mr-3"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414L12.586 22a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828L12.586 2.586Z"/><path d="M7 7h.01"/></svg>
                                                <span>Category: <span className="font-bold text-blue-600">{course.category?.name || 'Uncategorized'}</span></span>
                                            </div>
                                            <div className="flex items-center text-gray-700 text-sm">
                                                <BarChart2 size={18} className="text-blue-500 mr-3" />
                                                <span>Difficulty: <span className="font-medium">{course.difficulty || 'N/A'}</span></span>
                                            </div>
                                            <div className="flex items-center text-gray-700 text-sm">
                                                <BookOpen size={18} className="text-green-500 mr-3" />
                                                <span>Sections: <span className="font-medium">{course.sections ? course.sections.length : 0}</span></span>
                                            </div>
                                            <div className="flex items-center text-gray-700 text-sm">
                                                <Clock size={18} className="text-yellow-500 mr-3" />
                                                <span>Created: <span className="font-medium">{new Date(course.createdAt).toLocaleDateString()}</span></span>
                                            </div>
                                            <div></div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default CoursesPage;