import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, ArrowLeft } from 'lucide-react'; // Importing icons for visual appeal

/**
 * CourseCompletePage Component
 * Displays a congratulatory message when a user completes a course.
 * Provides navigation back to the course overview or a general courses list.
 */
const CourseCompletePage = () => {
    const { courseId } = useParams(); // Get courseId from URL params for context, if needed
    const navigate = useNavigate(); // Hook for programmatic navigation

    const handleGoBackToCourse = () => {
        // Navigate back to the specific course overview page
        navigate(`/courses/${courseId}`);
    };

    const handleGoToAllCourses = () => {
        // Navigate to the general list of all courses
        navigate('/courses');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4 font-inter">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center max-w-2xl w-full transform transition-all duration-300 scale-100 hover:scale-[1.01]">
                <Award size={80} className="text-yellow-500 mx-auto mb-6 drop-shadow-lg animate-bounce-once" /> {/* Award icon */}

                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
                    Congratulations!
                </h1>
                <p className="text-xl md:text-2xl text-green-700 font-semibold mb-6">
                    You've successfully completed the course!
                </p>
                <p className="text-gray-700 text-lg mb-8 max-w-prose mx-auto">
                    Your dedication and hard work have paid off. Keep up the great learning!
                </p>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    {/* Button to go back to the specific course overview */}
                    <button
                        onClick={handleGoBackToCourse}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2 w-full sm:w-auto"
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Course Overview</span>
                    </button>

                    {/* Button to go to the general list of all courses */}
                    <button
                        onClick={handleGoToAllCourses}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-full shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2 w-full sm:w-auto"
                    >
                        <span>Explore More Courses</span>
                        <ArrowLeft size={20} className="rotate-180" /> {/* Rotated arrow for "forward" direction */}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseCompletePage;
