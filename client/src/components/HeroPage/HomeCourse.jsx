import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, BarChart2, CheckCircle, Clock } from 'lucide-react'; // Icons for display

const HomeCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL; // Get backend URL

    const fetchAllCourses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Your GET /courses endpoint already deep populates sections/modules
            // So, this will get the full course structure for display.
            const response = await fetch(`${BACKEND_URL}/courses`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Important for sending cookies (e.g. for session tracking)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                // Filter for published courses if this is a public page
                // Or remove this filter if you want to show all courses publicly regardless of status
                const publishedCourses = data.courses.filter(course => course.isPublished);
                setCourses(publishedCourses);
            } else {
                throw new Error(data.message || "Failed to retrieve courses.");
            }
        } catch (err) {
            console.error("Failed to fetch public courses:", err);
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

    if (courses.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex items-center justify-center">
                <p className="text-xl text-gray-500">No courses currently available.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter">
            <header className="py-6 mb-8 text-center bg-white shadow-md rounded-xl">
                <h1 className="text-4xl font-extrabold text-indigo-800">
                    Our Courses
                </h1>
                <p className="text-gray-600 mt-2">Explore our wide range of educational offerings.</p>
            </header>
            <main className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <div key={course._id} className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h3>
                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description || 'No description provided.'}</p>
                            </div>
                            <div className="mt-auto pt-4 border-t border-gray-100">
                                <div className="flex items-center text-gray-700 text-sm mb-2">
                                    <BarChart2 size={16} className="text-blue-500 mr-2" />
                                    <span>Difficulty: {course.difficulty || 'N/A'}</span>
                                </div>
                                <div className="flex items-center text-gray-700 text-sm mb-2">
                                    <BookOpen size={16} className="text-green-500 mr-2" />
                                    <span>Sections: {course.sections ? course.sections.length : 0}</span>
                                </div>
                                <div className="flex items-center text-gray-700 text-sm mb-2">
                                    <Clock size={16} className="text-yellow-500 mr-2" />
                                    <span>Created: {new Date(course.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center text-gray-700 text-sm">
                                    <CheckCircle size={16} className={course.isPublished ? "text-green-500" : "text-gray-400"} mr-2 />
                                    <span>Status: {course.isPublished ? 'Published' : 'Draft'}</span>
                                </div>
                                {/* You might add a "View Course" button here that navigates to a public course view page */}
                                {/* Example: <button className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">View Course</button> */}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default HomeCourses;