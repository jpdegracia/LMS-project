import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle, XCircle, FileText, User, Clock, Star } from 'lucide-react';
import UserContext from '../../../UserContext/UserContext';
import Modal from '../../../Modal/Modal';

const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

const formatDetailedDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long',     // long month name
        day: 'numeric', 
        hour12: true
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};


// Helper function to determine the correct answer text from the snapshot
const getCorrectAnswerText = (question) => {
    // 1. Prioritize direct HTML snapshot (for fill-in-the-blank/short answer that are rich text)
    if (question.correctAnswerSnapshotHtml) {
        return question.correctAnswerSnapshotHtml;
    }
    // 2. Fallback to raw text snapshot
    if (question.correctAnswerSnapshot) {
        return question.correctAnswerSnapshot;
    }
    // 3. Check for multiple-choice options snapshot
    if (question.optionsSnapshot && question.optionsSnapshot.length > 0) {
        const correctOption = question.optionsSnapshot.find(opt => opt.isCorrect);
        // Prioritize HTML option text, fallback to raw
        return correctOption ? correctOption.optionTextHtml || correctOption.optionTextRaw || correctOption.optionText : 'Not available';
    }
    return 'Not available';
};

const ViewAttemptDetails = () => {
    const { id: quizAttemptId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- HOOKS (must be top-level) ---
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Assuming the backend is updated to deep-populate quizSnapshotId
    const fetchAttemptDetails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!hasPermission('quiz_attempt:read')) {
                setError("You don't have permission to view quiz attempt details.");
                return;
            }

            const response = await fetch(`${BACKEND_URL}/quiz-attempts/${quizAttemptId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch quiz attempt details.');
            }

            const data = await response.json();
            if (data.success && data.data) {
                setAttempt(data.data);
            } else {
                setAttempt(null);
                throw new Error(data.message || 'Quiz attempt not found.');
            }
        } catch (err) {
            console.error('Error fetching quiz attempt details:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }, [quizAttemptId, BACKEND_URL, hasPermission]);

    useEffect(() => {
        fetchAttemptDetails();
    }, [fetchAttemptDetails]);
    // --- END HOOKS ---

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
                <p className="text-xl text-red-600 mb-4">{error}</p>
                <button onClick={() => navigate(-1)} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors">Go Back</button>
            </div>
        );
    }
    
    if (!attempt) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
                <p className="text-xl text-gray-700 mb-4">Quiz attempt not found.</p>
                <button onClick={() => navigate(-1)} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors">Go Back</button>
            </div>
        );
    }

    const attemptDateTime = formatDetailedDateTime(attempt.createdAt);

    // Get the quiz snapshot (we assume it's populated on the attempt object)
    // Using questionSnapshot from quizModuleId might be safer/more complete if quizSnapshotId isn't fully reliable
    const quizSnapshot = attempt.quizSnapshotId || attempt.quizModuleId?.quizSnapshot; 
    const totalQuestions = attempt.questionsAttemptedDetails.length;
    const correctAnswers = attempt.questionsAttemptedDetails.filter(q => q.isCorrect).length;
    const incorrectAnswers = totalQuestions - correctAnswers;

    return (
        <section className="container-3 bg-white flex flex-col items-center py-12">
            <div className="max-w-7xl w-full rounded-lg ">
                {/* Back Button */}
                <div className="mb-8 px-7">
                    <button onClick={() => navigate(-1)} className="btn-b flex items-center">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                    </button>
                </div>

                 {/* New Banner Section with Buttons */}
                <div className="bg-blue-700 text-white py-8 mt-2 shadow-lg mb-10">
                    <div className="max-w-7xl mx-auto md:ml-18">
                        <h1 className="text-3xl sm:text-4xl font-medium mb-3">Score Details</h1>
                        {attempt?.enrollmentId?.courseId?.title && attempt?.createdAt && (
                            <p className="text-lg font-light mb-4">
                                {/* Display Course Title instead of Quiz Module Title */}
                                {attempt.enrollmentId.courseId.title} - {attemptDateTime}
                            </p>
                        )}
                        {attempt?.quizModuleId?.title && (
                            <p className="text-lg font-light mb-8">
                                Quiz Title: {attempt.quizModuleId.title}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-4">
                            <button className="btn-outline">Review All Questions</button>
                        </div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="mb-8 px-7">
                        <h2 className="text-2xl font-semibold mb-2">Questions Overview</h2>
                        <p className="text-gray-600 mb-4">Review your results for each question from this practice test.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 px-8">
                            <div className="bg-gray-200 p-6 rounded-lg text-center shadow">
                                <p className="text-3xl font-bold text-gray-800">{totalQuestions}</p>
                                <p className="text-lg font-medium text-gray-800 mt-2">Total Questions</p>
                            </div>
                            <div className="bg-gray-200 p-6 rounded-lg text-center shadow">
                                <p className="text-3xl font-bold text-gray-800">{correctAnswers}</p>
                                <p className="text-lg font-medium text-gray-800 mt-2">Correct Answers</p>
                            </div>
                            <div className="bg-gray-200 p-6 rounded-lg text-center shadow">
                                <p className="text-3xl font-bold text-gray-800">{incorrectAnswers}</p>
                                <p className="text-lg font-medium text-gray-800 mt-2">Incorrect Answers</p>
                            </div>
                        </div>
                </div>

                {/* Question Details Section */}
                <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-2 px-5">Question Breakdown</h2>
                <div className="space-y-6 px-5">
                    {attempt.questionsAttemptedDetails.map((attemptedQuestion, index) => {
                        // Find the corresponding question snapshot for full details
                        const questionSnapshot = quizSnapshot?.questionsSnapshot?.find(
                            qs => qs.questionId.toString() === attemptedQuestion.questionId.toString()
                        );
                        
                        // Fallback logic for displaying answers and status
                        const isCorrect = attemptedQuestion.isCorrect;
                        const pointsPossible = questionSnapshot?.pointsPossibleSnapshot || 0;
                        const pointsAwarded = attemptedQuestion.pointsAwarded || 0;
                        
                        const statusClass = isCorrect ? 'text-green-600' : 'text-red-600';
                        const statusText = isCorrect ? 'Correct' : 'Incorrect';
                        const correctAnswerText = questionSnapshot 
                            ? getCorrectAnswerText(questionSnapshot) 
                            : 'Not available';

                        return (
                            // Styling to match the clean card design
                            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                
                                <div className="flex items-center justify-between pb-3 mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Question {index + 1}
                                    </h3>
                                    <div className="ml-4 text-right">
                                        {isCorrect ? (
                                            <span className="text-green-600 font-bold flex items-center">
                                                <CheckCircle size={16} className="mr-1" /> Correct
                                            </span>
                                        ) : (
                                            <span className="text-red-600 font-bold flex items-center">
                                            <XCircle size={16} className="mr-1" /> Incorrect
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Question Text - Rendered using snapshot data */}
                                {questionSnapshot?.questionText && (
                                    <div className="text-lg font-medium text-gray-800 mb-4" 
                                        dangerouslySetInnerHTML={{ __html: questionSnapshot.questionText }} 
                                    />
                                )}

                                {/* Answer Details */}
                                <div className="space-y-1 text-base text-gray-700 pl-4">
                                    <p>
                                        <strong className="font-semibold">Your Answer:</strong> 
                                        <span className={`ml-2 ${statusClass}`}>{attemptedQuestion.userAnswer || 'No answer'}</span>
                                    </p>
                                    <p>
                                        <strong className="font-semibold">Correct Answer:</strong> 
                                        <span className="ml-2 text-green-600">{correctAnswerText}</span>
                                    </p>
                                </div>
                                
                                {/* Feedback (Optional) */}
                                {questionSnapshot?.feedbackSnapshot && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <p className="text-sm text-gray-600">
                                            <strong className="text-yellow-700">Feedback: </strong> 
                                            <span dangerouslySetInnerHTML={{ __html: decodeHtml(questionSnapshot.feedbackSnapshot) }} />
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ViewAttemptDetails;