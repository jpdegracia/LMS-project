import React, { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight, Book, XCircle as X, UserCheck, Clock, MessageSquare, Save } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const QUESTIONS_PER_PAGE = 10; 

// --- Core Helpers ---

const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

const getCorrectAnswerDisplay = (questionSnapshot) => {
    
    // 1. Check for True/False answer
    if (questionSnapshot.questionType === 'trueFalse') {
        if (typeof questionSnapshot.trueFalseAnswerSnapshot === 'boolean') {
            const text = questionSnapshot.trueFalseAnswerSnapshot ? 'True' : 'False';
            return [{ displayHtml: `<span style="font-weight: bold;">${text}</span>` }];
        }
        return [{ displayHtml: 'N/A (True/False Data Missing)' }];
    }

    // 2. Numerical Answer
    if (questionSnapshot.questionType === 'numerical') {
        const numSnap = questionSnapshot.numericalAnswerSnapshot;
        if (numSnap && typeof numSnap.answer === 'number') {
            const answer = numSnap.answer.toFixed(4);
            const tolerance = numSnap.tolerance || 0;
            const tolDisplay = tolerance > 0 ? ` ± ${tolerance.toFixed(4)}` : '';
            const rangeMin = (numSnap.answer - tolerance).toFixed(4);
            const rangeMax = (numSnap.answer + tolerance).toFixed(4);
            
            return [{ 
                displayHtml: `<span style="font-weight: bold; color: #10B981;">${answer}${tolDisplay}</span> (Range: ${rangeMin} to ${rangeMax})` 
            }];
        }
        return [{ displayHtml: 'N/A (Numerical Data Missing)' }];
    }

    // 3. Short Answer / Essay
    if (['shortAnswer', 'essay'].includes(questionSnapshot.questionType)) {
        if (questionSnapshot.correctAnswersSnapshot && questionSnapshot.correctAnswersSnapshot.length > 0) {
            return questionSnapshot.correctAnswersSnapshot.map(ans => ({
                displayHtml: ans.answerHtml || ans.answer || 'N/A' 
            }));
        }
        return [{ displayHtml: 'N/A (No key provided for manual review)' }];
    }
    
    // 4. Fallback for Multiple Choice
    if (questionSnapshot.questionType === 'multipleChoice' && questionSnapshot?.optionsSnapshot && questionSnapshot.optionsSnapshot.length > 0) {
        const correctOptions = questionSnapshot.optionsSnapshot.filter(opt => opt.isCorrect);
        if (correctOptions.length > 0) {
            return correctOptions.map(opt => ({ 
                displayHtml: opt.optionTextHtml || opt.optionTextRaw || 'N/A' 
            }));
        }
        return [{ displayHtml: 'N/A (Correct option not flagged)' }];
    }
    
    return [{ displayHtml: 'N/A' }];
};

// --- Manual Grade Reviewer Component ---
const ManualGradeReviewer = ({ attemptItem, attemptId, itemIndex, maxPoints, onGradeUpdate, onClose }) => {
    
    const snapshot = attemptItem.questionSnapshot;
    
    const [manualScore, setManualScore] = useState(attemptItem.pointsAwarded || 0);
    const [teacherNotes, setTeacherNotes] = useState(attemptItem.teacherNotes || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    
    // Determine the type of answer the student provided for correct display
    const isNumerical = snapshot.questionType === 'numerical';
    const isEssayOrShortAnswer = snapshot.questionType === 'essay' || snapshot.questionType === 'shortAnswer';
    
    const maxScore = maxPoints || snapshot.pointsPossibleSnapshot || 1;
    
    // Determine how to display the student's raw answer
    let studentAnswerDisplay;
    if (attemptItem.userAnswer === null || attemptItem.userAnswer === undefined || (typeof attemptItem.userAnswer === 'string' && attemptItem.userAnswer.trim() === '')) {
        studentAnswerDisplay = 'No Answer Provided';
    } else if (isNumerical) {
        studentAnswerDisplay = String(attemptItem.userAnswer);
    } else {
        studentAnswerDisplay = decodeHtml(attemptItem.userAnswer);
    }

    // Acceptable answers for display (SA/Essay only, numerical handled separately)
    const acceptableAnswers = getCorrectAnswerDisplay(snapshot); 

    // --- Submission Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        
        if (manualScore < 0 || manualScore > maxScore) {
            setError(`Score must be between 0 and ${maxScore}.`);
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/quiz-attempts/${attemptId}/review/${itemIndex}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ manualScore, teacherNotes }),
            });

            const data = await response.json();
            
            if (!response.ok || !data.success) {
                const errorMsg = data.error && typeof data.error === 'string' ? data.error.split('\n')[0] : (data.message || 'Failed to submit manual grade.');
                throw new Error(errorMsg);
            }

            // Notify parent component to update data
            onGradeUpdate(data.data); 
            onClose(); 

        } catch (err) {
            console.error('Manual Grading Error:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b bg-yellow-100 rounded-t-lg">
                    <h2 className="text-xl font-bold text-yellow-800 flex items-center">
                        <UserCheck className="mr-2" /> Manual Grade Review (Q: {attemptItem.quizModuleQuestionIndex})
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900">Close</button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {error && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded">{error}</div>}

                    {/* --- 1. Question Context & Text --- */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Question Prompt</h3>
                        {attemptItem.questionSnapshot?.questionContextHtml && (
                            <div className="text-sm prose max-w-none p-3 mb-2 bg-gray-50 rounded" dangerouslySetInnerHTML={{ __html: decodeHtml(attemptItem.questionSnapshot.questionContextHtml) }} />
                        )}
                        <div className="prose max-w-none text-gray-900 text-base border-l-4 border-yellow-500 pl-3" 
                            dangerouslySetInnerHTML={{ __html: decodeHtml(attemptItem.questionSnapshot.questionTextHtml) }} />
                    </div>

                    {/* --- 2. Student Answer & Acceptable Answers --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                        <div>
                            <h4 className="text-md font-bold text-gray-800 flex items-center">
                                Student's Submission: ({isNumerical ? 'Numerical' : isEssayOrShortAnswer ? 'Text' : 'Other'})
                            </h4>
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-base font-mono whitespace-pre-wrap">
                                {studentAnswerDisplay}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-md font-bold text-gray-800 mb-2">
                                {isNumerical ? 'Correct Value / Range:' : 'Acceptable Auto-Grade Answers:'}
                            </h4>
                            {/* FIX: Ensure Numerical range displays without list styling */}
                            <ul className={`ml-4 text-sm space-y-1 ${isNumerical ? 'list-none ml-0' : 'list-disc'}`}>
                                {acceptableAnswers.map((ans, index) => (
                                    <li key={index} className={`text-green-700 ${isNumerical ? 'font-bold' : ''}`}>
                                        <span dangerouslySetInnerHTML={{ __html: decodeHtml(ans.displayHtml) }} />
                                    </li>
                                ))}
                                {/* Display instruction if no key is present for text input */}
                                {acceptableAnswers.length === 0 && (
                                    <p className="text-gray-500 text-sm italic">No acceptable answers were specified.</p>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* --- 3. Manual Scoring Input --- */}
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                        <h3 className="text-lg font-bold text-yellow-800 mb-3">Assign Score (Max: {maxScore} Points)</h3>
                        <div className="flex items-center space-x-4">
                            <label className="font-medium text-gray-700">Points Awarded:</label>
                            <input
                                type="number"
                                value={manualScore}
                                onChange={(e) => setManualScore(Number(e.target.value))}
                                min="0"
                                max={maxScore}
                                step="0.5"
                                className="w-24 p-2 border border-gray-300 rounded-md focus:border-yellow-600 focus:ring-yellow-600"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setManualScore(maxScore)}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                                Assign Full ({maxScore})
                            </button>
                        </div>

                        <div className="mt-4">
                            <label htmlFor="teacherNotes" className="font-medium text-gray-700 block mb-1">Teacher Notes (Optional Rationale):</label>
                            <textarea
                                id="teacherNotes"
                                value={teacherNotes}
                                onChange={(e) => setTeacherNotes(e.target.value)}
                                rows="3"
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Explain why partial or full credit was given."
                            />
                        </div>
                    </div>
                </form>

                {/* --- Footer (Submit Button) --- */}
                <div className="p-4 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-lg">
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
                    >
                        {isSubmitting ? 'Saving...' : 'Finalize Grade & Review'} <Save className="ml-2" size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------------------
// 2. PracticeTestAttemptDetails Component (Main View)
// ---------------------------------------------------------------------------------

const QuestionContextViewer = ({ question, onClose }) => {
    if (!question || !question.questionSnapshot) return null;

    const snapshot = question.questionSnapshot;
    
    const contextHtml = snapshot.questionContextHtml || '';
    const questionHtml = snapshot.questionTextHtml || '';
    
    // Get user answer from the combined object (will be raw text/number)
    const userAnswerText = question.userAnswer || ''; 
    const isAnswerProvided = userAnswerText.trim() !== '';
    const isCorrectAttempt = isAnswerProvided && question.isCorrect;
    const attemptStatusText = !isAnswerProvided ? 'Unanswered' : (isCorrectAttempt ? 'Correct' : 'Incorrect');
    
    // Get the array of correct answers
    const correctAnswers = getCorrectAnswerDisplay(snapshot); 
    const isUserChoice = (optionHtml) => isAnswerProvided && optionHtml === userAnswerText;

    const statusIcon = attemptStatusText === 'Correct' 
        ? <CheckCircle size={18} className="mr-2" /> 
        : <XCircle size={18} className="mr-2" />;
    const statusColor = attemptStatusText === 'Correct' ? 'text-green-600' : (attemptStatusText === 'Incorrect' ? 'text-red-600' : 'text-gray-500');
    const userAnswerClass = attemptStatusText === 'Correct' ? 'text-green-600' : (attemptStatusText === 'Incorrect' ? 'text-red-600' : 'text-gray-500');


    return (
        <div className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col">
                
                <div className="flex justify-between items-center p-3 px-6 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {question.quizTitle}: Question {question.quizModuleQuestionIndex}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    
                    {snapshot.questionContextHtml && (
                        <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200">
                            <h3 className="text-base font-semibold text-gray-700 uppercase mb-3">Reading Passage / Context</h3>
                            <div className="prose max-w-none text-gray-700 font-serif" 
                                dangerouslySetInnerHTML={{ __html: decodeHtml(contextHtml) }} />
                        </div>
                    )}
                    
                    <div className={`p-6 overflow-y-auto ${snapshot.questionContextHtml ? 'w-1/2' : 'w-full'}`}>
                        
                        <h3 className="text-base font-semibold text-gray-700 uppercase mb-3">Question</h3>
                        <div className="text-[18px] font-medium text-gray-900 mb-4 prose max-w-prose font-serif" 
                            dangerouslySetInnerHTML={{ __html: decodeHtml(questionHtml) }} />
                        
                        <div className="mt-4">
                            
                            <div className={`flex items-center text-lg font-bold mb-4 ${statusColor}`}>
                                {statusIcon}
                                <span>{attemptStatusText}</span>
                            </div>

                            {/* YOUR ANSWER */}
                            <div className="text-gray-700">
                                <strong className="text-gray-900 mr-2">Your Answer:</strong> 
                                {isAnswerProvided ? (
                                    <span 
                                        className={`font-medium ${userAnswerClass} prose max-w-none inline-block`}
                                        dangerouslySetInnerHTML={{ __html: decodeHtml(userAnswerText) }} 
                                    />
                                ) : (
                                    <span className="font-medium text-gray-500">No answer provided</span>
                                )}
                            </div>

                            {/* CORRECT ANSWER(S) - FIXED TO DISPLAY IN A BLOCK LIST */}
                            <div className="text-gray-700 flex flex-col mt-1"> 
                                <strong className="text-gray-900 mr-2 flex-shrink-0">Correct Answer(s):</strong> 
                                <ul className='list-none space-y-1 mt-2 pl-4'>
                                    {correctAnswers.map((ans, idx) => (
                                        <li 
                                            key={idx} 
                                            className='font-medium text-green-600 prose max-w-none'
                                            dangerouslySetInnerHTML={{ __html: decodeHtml(ans.displayHtml) }} 
                                        />
                                    ))}
                                </ul>
                            </div>
                            
                            {/* MULTIPLE CHOICE OPTIONS LIST */}
                            {snapshot.questionType === 'multipleChoice' && snapshot.optionsSnapshot && (
                                <div className="space-y-2 mt-4">
                                    {snapshot.optionsSnapshot.map((option, index) => {
                                        const optionLetter = String.fromCharCode(65 + index);
                                        const optionHtml = option.optionTextHtml || option.optionTextRaw || '';
                                        const isCorrectOpt = option.isCorrect;
                                        const isUserOpt = isUserChoice(optionHtml);
                                        
                                        let optionBgClass = 'bg-white';
                                        let optionBorderClass = 'border-gray-200';
                                        let optionTextColorClass = 'text-gray-700';

                                        if (isCorrectOpt) {
                                            optionBgClass = 'bg-green-50';
                                            optionBorderClass = 'border-green-300';
                                            optionTextColorClass = 'text-green-800';
                                        } else if (isUserOpt && !isCorrectOpt) {
                                            optionBgClass = 'bg-red-50';
                                            optionBorderClass = 'border-red-300';
                                            optionTextColorClass = 'text-red-800';
                                        }

                                        return (
                                            <div 
                                                key={optionHtml || index} 
                                                className={`flex items-start p-3 rounded-lg border ${optionBgClass} ${optionBorderClass} ${optionTextColorClass} shadow-sm`}
                                            >
                                                <span className="mr-3 font-bold flex-shrink-0 text-base">
                                                    {optionLetter}.
                                                </span>
                                                <div 
                                                    className={`text-base font-serif flex-grow prose max-w-none ${optionTextColorClass}`}
                                                    dangerouslySetInnerHTML={{ __html: decodeHtml(optionHtml) }} 
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        </div>
                        
                        {/* FEEDBACK/RATIONALE (Unchanged) */}
                        {snapshot.feedbackSnapshot && (
                            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                <h4 className="text-base font-semibold text-yellow-800 mb-2">Rationale/Feedback </h4>
                                <div className="prose max-w-none text-gray-700 text-sm" 
                                    dangerouslySetInnerHTML={{ __html: decodeHtml(snapshot.feedbackSnapshot) }} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end bg-gray-50">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                        Close Viewer
                    </button>
                </div>
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------------------
// 2. PracticeTestAttemptDetails Component (Main View)
// ---------------------------------------------------------------------------------

const PracticeTestAttemptDetails = () => {
    const { id: attemptId } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); 

    // --- HOOKS ---
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1); 
    const [selectedSection, setSelectedSection] = useState(null); 
    const [selectedModule, setSelectedModule] = useState(null);  
    const [contextModalContent, setContextModalContent] = useState(null); 
    const [reviewModalContent, setReviewModalContent] = useState(null); 
    
    const questionListRef = useRef(null);

    // 1. Fetch Details Callback
    const fetchAttemptDetails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/practice-tests/${attemptId}/details`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch practice test details.');
            }
            const data = await response.json();
            if (data.success && data.data) {
                setAttempt(data.data);
            } else {
                setAttempt(null);
            }
        } catch (err) {
            console.error('Error fetching attempt details:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [attemptId]);

    // 🚀 NEW: Function to handle the update after manual grading
    const handleGradeUpdate = useCallback((updatedQuizAttempt) => {
        // Find the specific QuizAttempt within the PracticeTestAttempt and update its details
        setAttempt(prevAttempt => {
            if (!prevAttempt) return null;
            
            const updatedQuizAttempts = prevAttempt.quizAttempts.map(qa => {
                if (qa._id.toString() === updatedQuizAttempt._id.toString()) {
                    return updatedQuizAttempt; // Replace the old attempt object with the updated one
                }
                return qa;
            });

            // Re-run full fetch to ensure overall PTA score/status is calculated (best practice)
            fetchAttemptDetails(); 

            return {
                ...prevAttempt,
                quizAttempts: updatedQuizAttempts,
            };
        });
        setReviewModalContent(null);
    }, [fetchAttemptDetails]); 


    // 2. Fetch on mount/ID change
    useEffect(() => {
        if (attemptId) {
            fetchAttemptDetails();
        }
    }, [attemptId, fetchAttemptDetails]);

    // 3-6. (Filtering, Sorting, KaTeX, Scroll hooks remain the same)
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedSection, selectedModule]);
    
    useEffect(() => {
        setSelectedModule(null);
    }, [selectedSection]);

    useEffect(() => {
        if (window.renderMathInElement && questionListRef.current) {
            window.renderMathInElement(questionListRef.current, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false}
                ],
                throwOnError: false
            });
        }
    }, [attempt, currentPage, questionListRef.current]); 
    
    useEffect(() => {
        if (questionListRef.current) {
            questionListRef.current.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start' 
            });
        }
    }, [currentPage, selectedSection, selectedModule]);


    // 7. Data processing/Memoization
    const { allQuestions, uniqueSections, uniqueModules, pendingReviewCount, overallMetrics } = useMemo(() => {
        if (!attempt) {
            return { allQuestions: [], uniqueSections: [], uniqueModules: [], pendingReviewCount: 0, overallMetrics: { total: 0, correct: 0, incorrect: 0 } };
        }

        const questions = [];
        let totalQuestionIndex = 0; 
        let reviewCount = 0;
        let totalCorrectPoints = 0;
        
        // 1. Build a fast lookup Map for the user's answers and attempt meta-data
        const attemptDetailMap = new Map();
        (attempt.quizAttempts || []).forEach(quizAttempt => {
            (quizAttempt.questionsAttemptedDetails || []).forEach((detail, index) => {
                if (detail.questionId) {
                    // CRITICAL: Use the user's answer from the correct field
                    let userAnswer;
                    if (detail.questionType === 'numerical') {
                        userAnswer = detail.userNumericalAnswer;
                    } else if (detail.questionType === 'trueFalse') {
                        userAnswer = detail.userBooleanAnswer;
                    } else {
                        userAnswer = detail.userTextAnswer;
                    }

                    attemptDetailMap.set(detail.questionId.toString(), {
                        detail: detail,
                        quizAttemptId: quizAttempt._id.toString(),
                        itemIndex: index, // CRITICAL: Index within the QA's details array
                        userAnswer: userAnswer, // The value to be used for display checks
                    });
                }
            });
        });

        // 2. Iterate over all quiz attempts and their snapshots (the source of truth)
        const moduleTitles = new Set(); 
        const allSectionTitlesInOrder = Array.isArray(attempt.sectionIds) 
            ? attempt.sectionIds.map(s => s.sectionTitle || 'Untitled Section') : ['Test Questions'];
        const sectionTitleMap = new Map(attempt.sectionIds?.map(s => [s._id.toString(), s.sectionTitle])); 

        (attempt.quizAttempts || []).forEach(quizAttempt => {
            const quizSnapshot = quizAttempt.quizSnapshotId;
            if (!quizSnapshot) return;

            const quizModuleTitle = quizSnapshot?.quizModuleSettingsSnapshot?.title || 'Untitled Quiz';
            moduleTitles.add(quizModuleTitle);
            
            const snapshotSectionId = quizSnapshot.originalSectionId?.toString();
            const questionSectionTitle = sectionTitleMap.get(snapshotSectionId) || 'Unknown Section';

            let moduleQuestionIndex = 0;
            
            (quizSnapshot.questionsSnapshot || []).forEach(qs => {
                if (!qs.questionId) return; 

                totalQuestionIndex++; 
                moduleQuestionIndex++; 
                
                const questionIdString = qs.questionId.toString();
                const userDetailMap = attemptDetailMap.get(questionIdString) || {}; 
                const userDetail = userDetailMap.detail || {};

                // ACCURATE POINT CALCULATION: Use pointsAwarded from the detail
                if (userDetail.pointsAwarded > 0) {
                    totalCorrectPoints += userDetail.pointsAwarded;
                }
                
                // Check review status
                if (userDetail.requiresManualReview && !userDetail.isManuallyGraded) {
                    reviewCount++;
                }

                questions.push({
                    // Core Identification and Pointers for UI/Actions
                    questionId: qs.questionId,
                    quizAttemptId: userDetailMap.quizAttemptId, // Parent attempt ID for the PUT request
                    itemIndex: userDetailMap.itemIndex,     // Index for the PUT request URL
                    globalIndex: totalQuestionIndex,
                    quizModuleQuestionIndex: moduleQuestionIndex, 
                    quizTitle: quizModuleTitle, 
                    sectionTitle: questionSectionTitle,

                    // Snapshot Content
                    questionSnapshot: qs, 
                    pointsPossible: qs.pointsPossibleSnapshot || 0,

                    // User Details (May be undefined/false if untouched/auto-graded)
                    userAnswer: userDetailMap.userAnswer || '', 
                    pointsAwarded: userDetail.pointsAwarded || 0,
                    
                    isCorrect: userDetail.isCorrect || false, 
                    requiresManualReview: userDetail.requiresManualReview || false,
                    isManuallyGraded: userDetail.isManuallyGraded || false,
                    teacherNotes: userDetail.teacherNotes || '', 
                });
            });
        });
        
        // 3. Final Metric Calculation
        const totalCorrect = questions.filter(q => q.isCorrect).length;
        
        const overallMetrics = {
            total: totalQuestionIndex, // Total count of questions found
            correct: totalCorrect, 
            incorrect: totalQuestionIndex - totalCorrect, 
        };

        const uniqueModulesArray = Array.from(moduleTitles);

        return { 
            allQuestions: questions, 
            uniqueSections: allSectionTitlesInOrder, 
            uniqueModules: uniqueModulesArray,
            pendingReviewCount: reviewCount,
            overallMetrics: overallMetrics
        }; 
    }, [attempt]);

    // 8. Filtering Logic
    const filteredQuestions = useMemo(() => {
        let currentFilter = allQuestions;

        if (selectedSection) {
            currentFilter = currentFilter.filter(q => q.sectionTitle === selectedSection);
        }
        
        if (selectedModule) {
            currentFilter = currentFilter.filter(q => q.quizTitle === selectedModule);
        }

        return currentFilter;
    }, [allQuestions, selectedSection, selectedModule]);

    // --- Render Guards (MUST FOLLOW ALL HOOKS) ---
    if (loading) return <p>Loading attempt details...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;
    if (!attempt) return <p className="text-gray-500">Attempt not found.</p>;
    
    // Use correct variables for display metrics
    const totalQuestions = overallMetrics.total;
    const rawCorrectAchieved = overallMetrics.correct; 
    const incorrectOrUnansweredCount = totalQuestions - rawCorrectAchieved;
    
    const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);

    const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
    const endIndex = startIndex + QUESTIONS_PER_PAGE;
    
    const currentQuestions = filteredQuestions.slice(startIndex, endIndex);

    const handleBack = () => {
        const returnPath = location.state?.returnToCourseView; 
        if (returnPath) {
            navigate(returnPath);
        } else {
            navigate(-1);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSectionChange = (event) => {
        const value = event.target.value;
        setSelectedSection(value === 'All Sections' ? null : value);
        setSelectedModule(null);
    };

    const handleModuleChange = (event) => {
        const value = event.target.value;
        setSelectedModule(value === 'All Modules' ? null : value);
    };

    
    const formattedDate = new Date(attempt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const allSectionTitles = uniqueSections;
    const formattedSectionTitleForBanner = allSectionTitles.join(' & ');
    const courseTitle = attempt?.courseId?.title;
    const firstName = attempt.userId?.firstName;
    const lastName = attempt.userId?.lastName;
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : 'Student';

    return (
        <div className="bg-gray-50 font-inter container-3">
            {/* Back Button and Banner Section */}
            <div className="flex justify-start pt-6 pl-6 m-4">
                <button onClick={handleBack} className="px-4 py-2 btn-b flex items-center mb-2 cursor-pointer">
                    <ArrowLeft size={16} className="mr-2" />
                    <span>Back</span>
                </button>
            </div>

            <div className="bg-blue-700 text-white py-8 mt-2 shadow-lg mb-10">
                <div className="max-w-7xl mx-auto md:ml-18">
                    <h1 className="text-3xl sm:text-4xl font-medium mb-3">Score Details</h1>
                    
                    {courseTitle && attempt?.createdAt && (<p className="text-lg font-light mb-1">{courseTitle} - {formattedDate}</p>)}
                    {attempt?.createdAt && (<p className="text-lg font-light mb-2">{fullName} - Attempt #{attempt.attemptNumber}</p>)}
                    {formattedSectionTitleForBanner && (<p className="text-lg font-medium mb-8">{formattedSectionTitleForBanner}</p>)}

                    {/* <div className="flex flex-wrap gap-4">
                        <button className="btn-outline">Review All Questions</button>
                        
                        {pendingReviewCount > 0 && (
                            <span className="px-4 py-2 bg-red-600 text-white font-medium rounded-md flex items-center">
                                <Clock size={16} className="mr-2"/> {pendingReviewCount} Pending Manual Review
                            </span>
                        )}
                        <button className="btn-outline">Practice Specific Questions</button>
                    </div> */}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="container-3">
                <div className="rounded-lg shadow-md p-12">
                    {/* Questions Overview section */}
                    <div className="mb-4">
                        <h2 className="text-2xl font-semibold mb-2">Questions Overview</h2>
                        <p className="text-gray-600 mb-4">Review your results for each question from this practice test.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 px-8">
                            {/* USE CALCULATED METRICS */}
                            <div className="bg-gray-200 p-6 rounded-lg text-center shadow"><p className="text-3xl font-bold text-gray-800">{totalQuestions}</p><p className="text-lg font-medium text-gray-800 mt-2">Total Questions</p></div>
                            <div className="bg-gray-200 p-6 rounded-lg text-center shadow"><p className="text-3xl font-bold text-gray-800">{rawCorrectAchieved}</p><p className="text-lg font-medium text-gray-800 mt-2">Correct Answers</p></div>
                            <div className="bg-gray-200 p-6 rounded-lg text-center shadow"><p className="text-3xl font-bold text-gray-800">{incorrectOrUnansweredCount}</p><p className="text-lg font-medium text-gray-800 mt-2">Incorrect/Unanswered</p></div>
                        </div>
                    </div>

                    {/* Dual Filter Dropdowns & Header */}
                    <div ref={questionListRef} className="flex justify-between items-center mt-12 mb-6 border-t pt-4">
                        <h2 className="text-2xl font-bold">Question Review</h2>
                        <div className="flex items-center space-x-4">
                             {/* 🚨 Filter Dropdowns (Content omitted for brevity in system response, but would exist here) */}
                        </div>
                    </div>
                    
                    <div className="space-y-8">
                        {filteredQuestions.length > 0 ? (
                            
                            currentQuestions.map((q, index) => {
                                const questionSnapshot = q.questionSnapshot;
                                
                                const isAnswerProvided = q.userAnswer && String(q.userAnswer).trim() !== '';
                                const isCorrect = q.isCorrect;
                                
                                // NEW MANUAL GRADING STATUS LOGIC
                                let statusText;
                                let statusClass;
                                let statusIcon;
                                
                                if (q.requiresManualReview && !q.isManuallyGraded) {
                                    statusText = 'Pending Review';
                                    statusClass = 'text-orange-600';
                                    statusIcon = <Clock size={16} className="mr-1" />;
                                } else if (!isAnswerProvided) {
                                    statusText = 'Unanswered';
                                    statusClass = 'text-gray-500';
                                    statusIcon = <X size={16} className="mr-1" />;
                                } else if (isCorrect) {
                                    statusText = q.isManuallyGraded ? 'Manually Corrected' : 'Correct';
                                    statusClass = 'text-green-600';
                                    statusIcon = <CheckCircle size={16} className="mr-1" />;
                                } else {
                                    statusText = q.isManuallyGraded ? 'Manually Incorrect' : 'Incorrect';
                                    statusClass = 'text-red-600';
                                    statusIcon = <XCircle size={16} className="mr-1" />;
                                }
                                
                                // Placeholder for Section/Module Grouping Header (if you implement this logic)
                                
                                return (
                                    <Fragment key={q.questionId?._id || index}>
                                        <div className="p-4 bg-white shadow-md rounded-lg mt-4 border border-gray-200">
                                            
                                            {/* Question Header & Status */}
                                            <div className="flex items-start justify-between pb-2 mb-2 border-b border-gray-100"> 
                                        
                                                <div className="flex items-start flex-col sm:flex-row sm:items-center sm:space-x-4"> 
                                                    <h3 className="text-lg font-bold text-gray-900 flex-shrink-0">Question: {q.quizModuleQuestionIndex}</h3>
                                                    {/* <span className="text-sm font-medium text-gray-600 sm:mt-0">({q.pointsAwarded} / {q.pointsPossible} Points)</span> */}

                                                    {questionSnapshot?.questionContextHtml && (
                                                        <div className="flex items-center mt-1 sm:mt-0"> 
                                                            <button
                                                                onClick={() => setContextModalContent(q)}
                                                                className="text-gray-600 text-sm font-semibold flex items-center underline cursor-pointer hover:text-indigo-800 p-0"
                                                            >
                                                                <Book size={14} className="mr-1" /> View Context / Passage
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* STATUS DISPLAY & REVIEW BUTTON */}
                                                <div className="ml-4 text-right flex-shrink-0 flex flex-col items-end">
                                                    <span className={`${statusClass} font-bold flex items-center mb-1`}>
                                                        {statusIcon} {statusText}
                                                    </span>

                                                    {/* Review Button for Teachers */}
                                                    {q.requiresManualReview && !q.isManuallyGraded && (
                                                        <button
                                                            onClick={() => setReviewModalContent({ 
                                                                item: q, 
                                                                attemptId: q.quizAttemptId,
                                                                itemIndex: q.itemIndex
                                                            })}
                                                            className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors flex items-center"
                                                        >
                                                            <UserCheck size={14} className="mr-1" /> START REVIEW
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Question Text */}
                                            <div className="text-base text-gray-800 mb-2">
                                                {questionSnapshot?.questionTextHtml && (
                                                    <p 
                                                        className="font-medium" 
                                                        dangerouslySetInnerHTML={{ __html: decodeHtml(questionSnapshot.questionTextHtml) }} 
                                                    />
                                                )}
                                            </div>
                                            
                                            {/* Answer Details */}
                                            <div className="space-y-1.5 text-base pt-2">
                                                
                                                {/* YOUR ANSWER */}
                                                <div className="text-gray-700">
                                                    <strong className="text-gray-900 mr-2">Your Answer:</strong> 
                                                    {isAnswerProvided ? (
                                                        <span 
                                                            className={`font-medium ${statusClass} prose max-w-none inline-block`}
                                                            dangerouslySetInnerHTML={{ __html: decodeHtml(q.userAnswer) }} 
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-gray-500">No answer provided</span>
                                                    )}
                                                </div>
                                                
                                                {/* CORRECT ANSWER(S) (Always displays the helper output) */}
                                                <div className="text-gray-700">
                                                    <strong className="text-gray-900 mr-2">Correct Answer(s):</strong> 
                                                    <ul className='list-none space-y-1 mt-1'>
                                                        {getCorrectAnswerDisplay(questionSnapshot).map((ans, idx) => (
                                                            <li 
                                                                key={idx} 
                                                                className='font-medium text-green-600 flex'
                                                            >
                                                                <div dangerouslySetInnerHTML={{ __html: decodeHtml(ans.displayHtml) }} />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                
                                                {/* TEACHER REVIEW NOTES (Display if manually graded) */}
                                                {q.teacherNotes && q.isManuallyGraded && (
                                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                                        <p className="text-sm text-gray-600">
                                                            <strong className="text-indigo-700 flex items-center mb-1"><MessageSquare size={14} className='mr-1'/> Teacher Reviewer Notes: </strong> 
                                                            <span className='font-medium italic'>{decodeHtml(q.teacherNotes)}</span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Fragment>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 text-center italic">No questions found matching the selected filters.</p>
                        )}
                    </div>
                    
                    {/* 🎯 RE-INTEGRATED: Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
                            
                            {/* Pagination Status Text (Lower Left) */}
                            <div className="text-gray-600 text-sm font-medium">
                                Currently viewing {startIndex + 1} to {Math.min(endIndex, totalQuestions)} out of {totalQuestions} questions
                            </div>

                            {/* Navigation Buttons (Lower Right) */}
                            <div className="flex items-center space-x-4">
                                
                                <span className="text-lg font-medium text-gray-700">
                                    {currentPage} / {totalPages}
                                </span>
                                
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`px-4 py-2 flex items-center rounded-lg border transition-colors ${
                                        currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-700 hover:bg-blue-50 border-blue-700 cursor-pointer'
                                    }`}
                                >
                                    <ChevronLeft size={18} className="mr-1" /> Previous
                                </button>
                                
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`px-4 py-2 flex items-center rounded-lg border transition-colors ${
                                        currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-700 hover:bg-blue-50 border-blue-700 cursor-pointer'
                                    }`}
                                >
                                    Next <ChevronRight size={18} className="ml-1" />
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
            
            {/* Render the Context Modal */}
            {contextModalContent && (
                <QuestionContextViewer 
                    question={contextModalContent} 
                    onClose={() => setContextModalContent(null)} 
                />
            )}

            {/* Render the Manual Grade Reviewer Modal */}
            {reviewModalContent && (
                <ManualGradeReviewer 
                    attemptItem={reviewModalContent.item} 
                    attemptId={reviewModalContent.attemptId} 
                    itemIndex={reviewModalContent.itemIndex}
                    maxPoints={reviewModalContent.item.pointsPossible}
                    onGradeUpdate={handleGradeUpdate}
                    onClose={() => setReviewModalContent(null)} 
                />
            )}
        </div>
    );
};

export default PracticeTestAttemptDetails;