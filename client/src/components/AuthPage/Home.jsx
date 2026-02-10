import React, { useState, useEffect, useCallback, useContext } from 'react';
import { BookOpen, BarChart2, CheckCircle, Clock, Eye } from 'lucide-react';
import { MdPlayCircleOutline, MdLightbulbOutline, MdTrendingUp } from 'react-icons/md'; // Import new Material Design icons
import UserContext from '../UserContext/UserContext';
import { useNavigate } from 'react-router-dom';

const CoursesPage = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { isLoggedIn } = useContext(UserContext);
    const navigate = useNavigate();

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const fetchAllCourses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/courses`, {
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
                const publishedCourses = data.courses.filter(course => course.isPublished);
                setCourses(publishedCourses);
            } else {
                throw new Error(data.message || "Failed to retrieve courses.");
            }
        } catch (err) {
            console.error("Failed to fetch courses:", err);
            setError(err.message || "Failed to load courses. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL]);

    useEffect(() => {
        fetchAllCourses();
    }, [fetchAllCourses]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading courses...</p>
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 font-inter">
            {/* Hero Section */}
            <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
                <div className="max-w-screen-xl mx-auto px-6">
                    <header className="mb-16 text-center md:text-left">
                        <h1 className="text-4xl lg:text-5xl font-extrabold text-blue-700 mb-4 leading-tight">
                            Unlock Your Potential with Jenskid Learning
                        </h1>
                        <p className="text-lg lg:text-xl text-gray-600 mb-8 max-w-2xl mx-auto md:mx-0">
                            Join millions like Achin in exploring a world of knowledge and career advancement.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row justify-center md:justify-start space-y-4 sm:space-y-0 sm:space-x-6">
                            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center">
                                <MdPlayCircleOutline className="inline-block mr-3 text-2xl" /> Reactivate Subscription
                            </button>
                            <button className="border-2 border-blue-600 hover:bg-blue-50 text-blue-600 font-semibold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center">
                                <MdLightbulbOutline className="inline-block mr-3 text-2xl" /> Buy for Your Team
                            </button>
                        </div>
                    </header>
                </div>
            </section>

            <main className="container mx-auto px-6 py-12">
                {/* Top Picks Section */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
                        <MdTrendingUp className="inline-block mr-3 text-blue-500 text-3xl" /> Top Picks for You
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {['Demystifying AI', 'Boost Your Critical Thinking', 'Mastering Construction Management', 'Creating Custom GPTs'].map((title, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 ease-in-out overflow-hidden transform hover:-translate-y-1">
                                <div className="bg-gradient-to-br from-gray-200 to-gray-300 h-40 rounded-t-xl flex items-center justify-center p-4">
                                    {/* Placeholder for Course Image/Icon */}
                                    <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13l8.345-8.345M12 6.253L3.655 11.658" />
                                    </svg>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
                                    <p className="text-sm text-gray-600">Taught by Leading Experts</p>
                                    <button className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-200 text-sm">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Skills Section */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8">
                        Explore Skills to Advance Your Career
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {['JavaScript', 'React.js', 'Redux.js', 'CSS', 'TypeScript', 'Express.js', 'Node.js', 'Python', 'DevOps', 'Cloud Computing'].map((skill, i) => (
                            <button
                                key={i}
                                className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-6 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-150 ease-in-out text-base"
                            >
                                {skill}
                            </button>
                        ))}
                    </div>
                </section>

                {/* This Week's Popular Courses Section (uses array of 4 for consistent display) */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8">This Week's Popular Courses</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 ease-in-out overflow-hidden transform hover:-translate-y-1">
                                <div className="bg-gradient-to-tr from-orange-200 to-orange-300 h-40 rounded-t-xl flex items-center justify-center p-4">
                                    {/* Placeholder for Course Image/Icon */}
                                    <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Popular Course {i + 1}</h3>
                                    <p className="text-sm text-gray-600">By Renowned Instructors</p>
                                    <button className="mt-4 w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors duration-200 text-sm">
                                        Learn More
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* All Available Courses Section - This will display your fetched courses */}
                <section>
                    <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b-2 pb-4 border-indigo-200">
                        All Available Courses
                    </h2>
                    {courses.length === 0 ? (
                        <p className="text-xl text-gray-500 text-center mt-8 p-6 bg-white rounded-lg shadow-md">
                            No courses currently available. Please check back later!
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {courses.map((course) => (
                                <div key={course._id} className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{course.title}</h3>
                                        <p className="text-gray-600 text-base mb-5 line-clamp-3">{course.description || 'No description provided.'}</p>
                                    </div>
                                    <div className="mt-auto pt-5 border-t border-gray-100 space-y-2">
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
                                        <div className="flex items-center text-gray-700 text-sm">
                                            <CheckCircle size={18} className={course.isPublished ? "text-green-500" : "text-gray-400"} />
                                            <span className="ml-3">Status: <span className="font-medium">{course.isPublished ? 'Published' : 'Draft'}</span></span>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/courses/${course._id}`)}
                                            className="mt-6 w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-medium shadow-md"
                                        >
                                            <Eye size={20} />
                                            <span>View Course</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default CoursesPage;