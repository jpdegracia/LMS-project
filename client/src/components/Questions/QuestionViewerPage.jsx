import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, BookOpen, CheckCircle, Code, FileText, HelpCircle, Tag, 
    BarChart2, UserRound, MessageSquare, XCircle, Clock, Info, UserCheck,
    Hash, AlignLeft // NEW ICONS
} from 'lucide-react'; 

// FIX: Mocking external dependency for compilation
const UserContext = React.createContext({
    isLoggedIn: true,
    userLoading: false,
    hasPermission: () => true, 
});

const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

// 🎯 HELPER: Renders the Correct Answer Key concisely
const renderCorrectAnswerKey = (q) => {
    const type = q.questionType;

    // --- 1. Numerical Answer ---
    if (type === 'numerical' && q.numericalAnswer && typeof q.numericalAnswer.answer === 'number') {
        const num = q.numericalAnswer.answer;
        const tol = q.numericalAnswer.tolerance || 0;
        const display = tol > 0 ? `${num.toFixed(4)} ± ${tol.toFixed(4)}` : `${num}`;
        const range = tol > 0 ? ` (Range: ${(num - tol).toFixed(4)} to ${(num + tol).toFixed(4)})` : '';

        return (
            <p className="text-gray-800 font-semibold text-lg flex items-center">
                <CheckCircle size={18} className="text-green-600 mr-2" />
                <span className="text-green-700">{display}</span>
                <span className="text-sm text-gray-500 ml-2">{range}</span>
            </p>
        );
    }

    // --- 2. True/False Answer ---
    if (type === 'trueFalse' && typeof q.trueFalseAnswer === 'boolean') {
        const text = q.trueFalseAnswer ? 'True' : 'False';
        const color = q.trueFalseAnswer ? 'text-green-700' : 'text-red-700';
        return (
            <p className="text-gray-800 font-semibold text-lg flex items-center">
                <CheckCircle size={18} className={`${color} mr-2`} />
                <span className={color}>{text}</span>
            </p>
        );
    }
    
    // --- 3. Short Answer / Essay / MC Multi-Correct ---
    if (q.correctAnswers?.length > 0 || (type === 'multipleChoice' && q.options?.filter(opt => opt.isCorrect).length > 0)) {
        
        const correctItems = type === 'multipleChoice' 
            ? q.options.filter(opt => opt.isCorrect)
            : q.correctAnswers;

        // Display all acceptable/correct items horizontally (inline list)
        return (
            <ul className="list-none flex flex-wrap gap-x-4 gap-y-1 mt-1 pl-0">
                {correctItems.map((item, index) => {
                    const html = item.optionTextHtml || item.optionTextRaw || item.answerHtml || item.answer || 'N/A';

                    return (
                        <li key={index} className="font-medium text-green-600 flex items-center pr-4 border-r border-green-600 last:border-r-0">
                            <CheckCircle size={14} className="mr-1 flex-shrink-0" />
                            <div 
                                className="inline prose max-w-none"
                                dangerouslySetInnerHTML={{ __html: decodeHtml(html) }} 
                            />
                        </li>
                    );
                })}
            </ul>
        );
    }
    
    return <p className="text-gray-500 italic">No answer key found.</p>;
};


const QuestionViewerPage = () => {
    const { id: questionId } = useParams(); 
    const navigate = useNavigate();
    const { isLoggedIn, userLoading, hasPermission } = useContext(UserContext); 

    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // FIX: Hardcode a placeholder BACKEND_URL to avoid import.meta.env error 
    // This will likely cause a fetch error until you replace it with your real URL.
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL; 

    const canReadQuestion = hasPermission('question:read'); 

    const fetchQuestionData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setQuestion(null); 

        try {
            if (!canReadQuestion) {
                setLoading(false);
                // navigate('/dashboard'); 
                return;
            }

            // --- REINSTATED ORIGINAL FETCH LOGIC ---
            const response = await fetch(`${BACKEND_URL}/questions/${questionId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            // ---------------------------------------


            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.data) {
                setQuestion(data.data);
            } else {
                throw new Error(data.message || "Failed to retrieve question details.");
            }
        } catch (err) {
            console.error("Error fetching question details:", err);
            // This error is expected if 'https://your-api-domain.com' is not the correct URL
            setError(err.message || "Failed to load question. Please verify the BACKEND_URL.");
        } finally {
            setLoading(false);
        }
    }, [questionId, BACKEND_URL, canReadQuestion]);


    useEffect(() => {
        if (!userLoading) {
            if (isLoggedIn) {
                if (questionId) {
                    fetchQuestionData();
                } else {
                    setError("No question ID provided in URL.");
                    setLoading(false);
                }
            } else {
                // navigate('/login'); 
            }
        }
    }, [questionId, isLoggedIn, userLoading, fetchQuestionData]);


    // Helper to get icon for question type
    const getQuestionTypeIcon = (type) => {
        switch(type) {
            case 'multipleChoice': return <BookOpen size={20} className="text-blue-600" />;
            case 'trueFalse': return <CheckCircle size={20} className="text-green-600" />;
            case 'shortAnswer': return <Code size={20} className="text-purple-600" />;
            case 'numerical': return <Hash size={20} className="text-pink-600" />; 
            case 'essay': return <AlignLeft size={20} className="text-red-600" />; 
            default: return <HelpCircle size={20} className="text-gray-600" />;
        }
    };


    if (loading || userLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading question...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-600 mb-6">Error: {error}</p>
                <button
                    onClick={() => navigate(-1)} 
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
            </div>
        );
    }

    if (!isLoggedIn || !canReadQuestion || !question) {
        return <div className="p-6 text-center text-red-500">Access Denied or Question not found.</div>;
    }


    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter">
            {/* 🎯 CSS FIX: Inject a style block with high specificity to force list styles inside the prose container */}
            <style jsx="true">{`
                .prose, .prose * {
                    font-family: 'Arial', sans-serif !important; 
                }

                .prose ul, .prose ol {
                    /* Restore the list style */
                    list-style-type: disc !important; 
                    
                    /* Restore necessary padding for the bullet to show up */
                    padding-left: 1.5em !important;
                    margin-left: 0 !important;
                }
                /* Also ensure list items are correctly positioned */
                .prose li {
                    list-style-position: outside !important;
                }
            `}</style>

            <main className="container-2 py-8 bg-white rounded-2xl shadow-xl">
                <div className="flex items-center space-x-3 mb-6 border-b pb-4">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="btn-b flex cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </button>

                    {/* Question Type Icon */}
                    {getQuestionTypeIcon(question.questionType)}

                    {/* 🚀 UPDATED HEADING: Use Question Title as the main display */}
                    <h1 className="text-3xl font-bold text-gray-900 capitalize flex-grow">
                        Question Details
                    </h1>

                    {/* Add Edit Button here if user has permission to edit */}
                    {hasPermission('question:update') && (
                        <button 
                            onClick={() => navigate(`/questions/edit/${question._id}`)}
                            className="btn-b bg-blue-600 hover:bg-blue-700 cursor-pointer text-white"
                        >
                            Edit
                        </button>
                    )}
                </div>

                <div className="space-y-6">
                    
                    {/* 🚀 NEW SECTION: Display Question Title for consistency if needed, although it's in H1 */}
                    <div className="p-4 border rounded-lg bg-indigo-50">
                        <p className="text-lg font-medium text-gray-900 mb-1">Question Title:</p>
                        <p className="text-xl font-bold text-gray-800">{question.questionTitle || 'N/A'}</p>
                    </div>

                    {/* Question Context Text */}
                    {(question.questionContextHtml || question.questionContext) && ( 
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <p className="text-lg font-medium text-gray-900 mb-2">Question Context:</p>
                            
                            <div 
                                // ✅ FIX: Rely on the injected <style> block
                                className="text-gray-800 prose max-w-none" 
                                dangerouslySetInnerHTML={{ 
                                    __html: decodeHtml(question.questionContextHtml || question.questionContext) 
                                }} 
                            />
                        </div>
                    )}
                    
                    {/* Question Text */}
                    {(question.questionTextHtml || question.questionTextRaw) && (
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <p className="text-lg font-medium text-gray-900 mb-2">Question Text:</p>
                            
                            <div 
                                // ✅ FIX: Rely on the injected <style> block
                                className="text-gray-800 prose max-w-none" 
                                dangerouslySetInnerHTML={{ 
                                    __html: decodeHtml(question.questionTextHtml || question.questionTextRaw) 
                                }} 
                            />
                        </div>
                    )}

                    {/* Question Type */}
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <p className="text-lg font-medium text-gray-900 mb-2">Type:</p>
                        <p className="text-gray-800 capitalize">{question.questionType}</p>
                    </div>
                    
                    {/* 🎯 CORRECT ANSWER KEY DISPLAY (All types consolidated here) */}
                    <div className="p-4 border rounded-lg bg-green-50">
                        <p className="text-lg font-medium text-gray-900 mb-2">Correct Answer Key:</p>
                        {renderCorrectAnswerKey(question)}
                    </div>

                    {/* Options (for multipleChoice) */}
                    {question.questionType === 'multipleChoice' && question.options && question.options.length > 0 && (
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <p className="text-lg font-medium text-gray-900 mb-2">Options Breakdown:</p>
                            <ul className="space-y-2">
                                {question.options.map((option, index) => (
                                    <li key={index} className={`flex items-start space-x-2 p-2 rounded-md ${option.isCorrect ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {option.isCorrect ? <CheckCircle size={18} className="mt-1 flex-shrink-0" /> : <XCircle size={18} className="mt-1 flex-shrink-0" />}
                                        
                                        <div 
                                            // ✅ FIX: Rely on the injected <style> block
                                            className="text-gray-800 prose max-w-none flex-grow" 
                                            dangerouslySetInnerHTML={{ __html: decodeHtml(option.optionTextHtml)}} 
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {/* Manual Grading Status */}
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <p className="text-lg font-medium text-gray-900 mb-2">Manual Grading Status:</p>
                        <p className="text-sm text-gray-700 flex items-center space-x-2">
                            <UserCheck size={16} className={`mr-2 ${question.requiresManualGrading ? 'text-red-600' : 'text-green-600'}`} />
                            <span className="font-semibold">Required:</span>
                            <span className={`${question.requiresManualGrading ? 'text-red-600' : 'text-green-600'} font-bold`}>
                                {question.requiresManualGrading ? 'YES' : 'NO (Auto-Graded)'}
                            </span>
                        </p>
                    </div>

                    {/* Feedback/Explanation */}
                    {question.feedback && (
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <p className="text-lg font-medium text-gray-900 mb-2 flex items-center space-x-2">
                                <MessageSquare size={18} className="text-blue-500" />
                                <span>Feedback/Rationale:</span>
                            </p>
                            {/* Feedback is guaranteed to be rendered HTML by the controller */}
                            <div 
                                // ✅ FIX: Rely on the injected <style> block
                                className="text-gray-800 prose max-w-none" 
                                dangerouslySetInnerHTML={{ __html: decodeHtml(question.feedback) }} 
                            />
                        </div>
                    )}

                    {/* Metadata (No change needed) */}
                    <div className="p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <p className="text-sm text-gray-700 flex items-center space-x-2">
                            <Tag size={16} className="text-purple-500" />
                            <span>Subject: <span className="font-medium">{question.subject ? question.subject.name : 'N/A'}</span></span>
                        </p>
                        <p className="text-sm text-gray-700 flex items-center space-x-2">
                            <BarChart2 size={16} className="text-blue-500" />
                            <span>Difficulty: <span className="font-medium capitalize">{question.difficulty || 'N/A'}</span></span>
                        </p>
                        <p className="text-sm text-gray-700 flex items-center space-x-2">
                            <Info size={16} className="text-orange-500" />
                            <span>Status: <span className="font-medium capitalize">{question.status || 'N/A'}</span></span>
                        </p>
                        <p className="text-sm text-gray-700 flex items-center space-x-2">
                            <UserRound size={16} className="text-gray-500" />
                            <span>Created By: <span className="font-medium">{question.createdBy ? `${question.createdBy.firstName} ${question.createdBy.lastName || question.createdBy.username}` : 'N/A'}</span></span>
                        </p>
                        <p className="text-sm text-gray-700 flex items-center space-x-2">
                            <Clock size={16} className="text-yellow-500" />
                            <span>Created On: <span className="font-medium">{new Date(question.createdAt).toLocaleDateString()}</span></span>
                        </p>
                        {question.tags && question.tags.length > 0 && (
                            <p className="text-sm text-gray-700 flex items-center space-x-2 md:col-span-2">
                                <Tag size={16} className="text-indigo-500" />
                                <span>Tags: <span className="font-medium">{question.tags.join(', ')}</span></span>
                            </p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default QuestionViewerPage;