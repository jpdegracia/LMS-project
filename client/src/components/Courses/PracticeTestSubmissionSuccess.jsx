// src/components/Courses/PracticeTestSubmissionSuccess.jsx

import React, { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import { Monitor, Smile } from 'lucide-react';

// This component is designed to render on a success page route, 
// e.g., /practice-test/submission-complete

const PracticeTestSubmissionSuccess = () => {
    // 1. Get the navigate function
    const navigate = useNavigate();
    

    // 2. Get the attempt ID from the navigation state
    const location = useLocation();
    const practiceTestAttemptId = location.state?.practiceTestAttemptId; // Safely get the ID
    const courseId = location.state?.courseId;

    // If the ID is missing, we can't show the score, so provide a fallback.
    if (!practiceTestAttemptId || !courseId) {
        return (
            <div className="text-center p-20">
                <h1 className="text-3xl text-red-500">Error: Could not retrieve submission details.</h1>
                <p className="text-gray-600 mt-4">Missing Attempt ID or Course ID.</p>
                <button 
                    onClick={() => navigate('/dashboard')} 
                    className="mt-6 px-6 py-2 bg-blue-500 text-white rounded"
                >
                    Go to Dashboard
                </button>
            </div>
        );
    }

    const courseViewPath = `/courses/${courseId}`;

    // The destination for "View Your Score" is now the details page for the specific attempt ID.
    const handleViewScore = useCallback(() => {
        // Navigate directly to the attempt details page using the retrieved ID
        navigate(`/practice-tests/${practiceTestAttemptId}/details`, { 
            replace: true, // Use replace so the success page isn't in the history
            state: { 
                // 🚨 This state key tells the Details component where to go upon clicking 'Back'
                returnToCourseView: courseViewPath 
            } 
        });
    }, [navigate, practiceTestAttemptId, courseViewPath]); // Dependency array now uses practiceTestAttemptId

    // Tailwind classes for the celebratory background effect
    const confettiStyle = {
        background: 'linear-gradient(135deg, #1f2937, #111827)', // Dark blue background
        minHeight: '100vh',
    };

    // Confetti Elements (Your previously generated list)
    const confettiElements = useMemo(() => {
        const count = 50; 
        const colors = ['bg-yellow-300', 'bg-pink-400', 'bg-indigo-300', 'bg-red-400', 'bg-green-300', 'bg-cyan-300', 'bg-orange-400', 'bg-purple-400'];
        const sizes = ['w-2 h-2', 'w-3 h-3', 'w-4 h-4', 'w-5 h-5'];
        
        // Use a fixed set of position classes across the full grid
        const positions = [
            // (50 positions array, unchanged from your previous code)
            'top-[2%] left-[4%]', 'top-1/12 left-1/12', 'top-1/12 left-1/5', 'top-1/12 left-1/3', 'top-1/12 left-1/2',
            'top-1/12 left-2/3', 'top-1/12 left-4/5', 'top-1/12 right-1/12', 'top-[2%] right-[4%]', 'top-[5%] left-1/4',
            'top-1/6 left-1/6', 'top-1/6 right-1/6', 'top-1/6 left-3/4', 'top-1/6 right-3/4', 'top-1/5 left-2/5',
            'top-1/5 right-2/5', 'top-1/4 left-1/12', 'top-1/4 left-1/4', 'top-1/4 left-1/2', 'top-1/4 right-1/4',
            'top-1/3 left-1/5', 'top-1/3 right-1/5', 'top-1/3 left-2/3', 'top-1/3 right-2/3', 'top-2/5 left-1/8',
            'top-2/5 right-1/8', 'top-1/2 left-1/10', 'top-1/2 right-1/10', 'top-1/2 left-1/2', 'top-1/2 right-1/2',
            'bottom-2/5 left-1/6', 'bottom-2/5 right-1/6', 'bottom-2/5 left-2/4', 'bottom-2/5 right-2/4', 'top-[45%] left-[60%]',
            'bottom-1/3 left-1/3', 'bottom-1/3 right-1/3', 'bottom-1/4 left-1/4', 'bottom-1/4 right-1/4', 'bottom-1/5 left-3/5',
            'bottom-1/5 right-3/5', 'bottom-1/6 left-1/12', 'bottom-1/6 right-1/12', 'bottom-1/6 left-5/6', 'bottom-1/6 right-5/6',
            'bottom-1/12 left-1/12', 'bottom-1/12 left-1/4', 'bottom-1/12 left-1/2', 'bottom-1/12 left-3/4', 'bottom-1/12 right-1/12',
        ];

        const elements = [];
        for (let i = 0; i < count; i++) {
            const posClass = positions[Math.floor(Math.random() * positions.length)];
            
            elements.push({
                pos: posClass,
                size: sizes[Math.floor(Math.random() * sizes.length)],
                color: colors[Math.floor(Math.random() * colors.length)],
                delay: `delay-[${Math.floor(Math.random() * 1200)}ms]`,
            });
        }
        return elements;
    }, []);

    return (
        // JSX rendering (unchanged)
        <div 
            className="flex items-center justify-center font-inter p-4 relative overflow-hidden container" 
            style={confettiStyle}
        >
            {/* Confetti/Sparkle Effect */}
            <div className="absolute inset-0 z-0 opacity-20">
                {confettiElements.map((sparkle, index) => (
                    <div
                        key={index}
                        className={`absolute ${sparkle.pos} ${sparkle.size} ${sparkle.color} rounded-full animate-pulse ${sparkle.delay}`}
                    />
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-2xl p-8 sm:p-12 w-full max-w-3xl z-10 text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-8">
                    You're All Finished!
                </h1>

                <div className="flex flex-col sm:flex-row items-center justify-center space-y-6 sm:space-y-0 sm:space-x-10">
                    
                    {/* Image/Icon Placeholder */}
                    <div className="relative w-40 h-40 flex items-center justify-center p-4 bg-gray-100 rounded-full border-4 border-gray-300">
                        <Monitor size={100} className="text-blue-500" /> 
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Smile size={40} className="text-gray-800 mb-4" />
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="text-left max-w-xs">
                        <p className="text-xl font-semibold text-gray-700 mb-2">
                            Congratulations on completing the SAT practice test!
                        </p>
                    </div>
                </div>

                {/* View Your Score Button */}
                <button
                    onClick={handleViewScore}
                    className="mt-12 px-10 py-3 text-lg font-bold text-black bg-yellow-400 rounded-lg shadow-md hover:bg-yellow-500 transition-colors focus:outline-none focus:ring-4 focus:ring-yellow-300 focus:ring-opacity-75 cursor-pointer"
                >
                    View Your Score
                </button>
            </div>
        </div>
    );
};

export default PracticeTestSubmissionSuccess;