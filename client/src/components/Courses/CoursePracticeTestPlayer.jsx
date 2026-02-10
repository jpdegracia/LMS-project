import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Calculator, Book, ChevronLeft, ChevronRight, Bookmark, ArrowLeft, ChevronUp, ChevronDown, Award, Smartphone, Sparkle, MapPin, TimerIcon, Clock, MoreVertical, Hash, Trash2, Edit2, NotebookText, HighlighterIcon } from 'lucide-react';
import { Rnd } from 'react-rnd';
import reference from '../../assets/reference.webp';
import UserContext from '../UserContext/UserContext';

// 🟢 REQUIRED RANGY IMPORTS for Highlighting and Persistence
import 'rangy/lib/rangy-classapplier.js';
import 'rangy/lib/rangy-highlighter.js';
import 'rangy/lib/rangy-serializer.js';
import rangy from 'rangy/lib/rangy-core.js';

// 🟢 KATEX STYLES
import 'katex/dist/katex.min.css';

// 🚨 CRITICAL: HELPER FUNCTION TO DECODE HTML ENTITIES AND CLEAN WHITESPACE
const decodeHtmlHelper = (html) => {
    if (!html) return '';
    
    // 1. Decode HTML entities first (e.g., &lt; to <)
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    let decodedHtml = txt.value; // Now contains decoded characters but possibly messy HTML
    
    // 2. Use a Div to ensure normalization
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = decodedHtml;

    // Get the inner content, simplifying the structural nesting
    let cleanedHtml = tempDiv.innerHTML;
    
    // 3. Aggressive character normalization (Zero Width Spaces, Newlines, Tabs)
    cleanedHtml = cleanedHtml.replace(/[\u200b\n\r\t]/g, '');

    // 4. Standardize spaces (crucial for Rangy offset calculation)
    cleanedHtml = cleanedHtml.replace(/&nbsp;/gi, ' ');
    cleanedHtml = cleanedHtml.replace(/\s{2,}/g, ' ');

    // 5. Return the cleaned string for insertion via dangerouslySetInnerHTML
    return cleanedHtml.trim();    
};

// 🟡 NEW: Helper to find the DOM element for a highlight ID
const findHighlightElement = (highlightId) => {
    // Rangy highlights use the class 'user-highlight' and store the ID in 'data-highlight-id'
    const selectors = `.user-highlight[data-highlight-id='${highlightId}']`;
    return document.querySelector(selectors);
};

// ----------------------------------------------------------------------
// 🟢 NEW COMPONENT: AnnotationSidebar (View, Edit, Delete Interface)
// ----------------------------------------------------------------------

const AnnotationSidebar = ({
    annotations,
    currentQuestionId,
    onEditNote,
    onDeleteHighlight,
    currentQuestionIndex,
    getHighlightedTextById
}) => {
    console.log("[Sidebar Debug] Rendering sidebar for Question Index:", currentQuestionIndex);
    // Filter annotations for the current question
    const currentQAnns = annotations?.[currentQuestionId] || {};
    const questionTextNotes = currentQAnns.questionText?.notes || {};
    const contextNotes = currentQAnns.questionContext?.notes || {};

    // Combine notes from both areas into a structured array
    const allNotes = [];
    Object.entries(questionTextNotes).forEach(([id, note]) => {
        // Ensure the note is not an empty string (meaning it hasn't been fully deleted yet)
        if (note && note.trim().length > 0) {
            allNotes.push({ id, note, area: 'questionText' });
        }
    });
    Object.entries(contextNotes).forEach(([id, note]) => {
        if (note && note.trim().length > 0) {
            allNotes.push({ id, note, area: 'questionContext' });
        }
    });

    const currentQuestionNumber = currentQuestionIndex + 1;
    const noteRefs = useRef({});

    if (allNotes.length === 0) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                No notes for question {currentQuestionNumber}. Highlight text and add a note to see it here.
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 h-full overflow-y-auto bg-gray-50 border-l border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 flex items-center mb-4 border-b pb-2">
                <NotebookText size={20} className="mr-2 text-indigo-600" />
                Notes ({allNotes.length})
            </h3>

            {allNotes.map((noteItem) => {
                
                // Fetch the actual snippet text using the dedicated getter for the popup display
                const highlightedTextSnippet = getHighlightedTextById(noteItem.id, noteItem.area);
                
                return (
                    <div
                        key={noteItem.id}
                        ref={el => noteRefs.current[noteItem.id] = el}
                        className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                        {/* Snippet Header */}
                        <div className="text-xs text-indigo-600 font-semibold mb-1 uppercase tracking-wider">
                            {noteItem.area === 'questionText' ? 'Question Text' : 'Context Passage'}
                        </div>

                        {/* Highlighted Text Snippet */}
                        <blockquote className="text-sm italic text-gray-600 border-l-2 border-yellow-500 pl-2 mb-2">
                            "{highlightedTextSnippet}"
                        </blockquote>

                        {/* User Note */}
                        <p className="text-gray-800 text-base mb-3 leading-snug">
                            {noteItem.note}
                        </p>

                        {/* Actions */}
                        <div className="flex justify-between space-x-2">
                            <button
                                onClick={() => onEditNote(noteItem.id, noteItem.note, noteItem.area)}
                                className="flex gap-2 btn-edit cursor-pointer text-sm font-medium items-center transition-colors"
                                title="Edit Note"
                            >
                                <Edit2 size={14} /> <span>Edit</span>
                            </button>
                            <button
                                onClick={() => onDeleteHighlight(noteItem.id, noteItem.area)}
                                className="flex gap-2 btn-delete cursor-pointer text-sm font-medium items-center transition-colors"
                                title="Delete Highlight and Note"
                            >
                                <Trash2 size={14} /> <span>Delete</span>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


// 🟢🟡 ANNOTATION POPUP COMPONENT (FINAL FIXED VERSION)
const HighlightPopup = ({ popupState, onSave, onClose, onDelete }) => {
    // Initialize local state with the prop value
    const [highlightText, setHighlightText] = useState(popupState.highlightText || '');

    // 🛑 FIX: Synchronize local state with the incoming prop on every open/change.
    useEffect(() => {
        const newText = popupState.highlightText || '';
        setHighlightText(newText);
    }, [popupState.highlightText]);

    return (
        <Rnd
            style={{ zIndex: 110 }}
            default={{
                x: popupState.x,
                y: popupState.y,
                width: 300,
                height: 200,
            }}
            bounds="parent"
            dragHandleClassName="highlight-popup-handle"
            minWidth={250}
            minHeight={150}
        >
            <div className="bg-white rounded-lg shadow-2xl border border-gray-400 flex flex-col h-full w-full overflow-hidden">
                {/* Header */}
                <div className="highlight-popup-handle bg-gray-100 p-2 flex justify-between items-center cursor-move border-b border-gray-300">
                    <h3 className="font-semibold text-sm text-gray-700">
                        {popupState.isNew ? 'Add Highlight Note' : 'Edit Highlight Note'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 hover:bg-gray-300 hover:text-gray-800"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Text Area */}
                <textarea
                    value={highlightText}
                    onChange={(e) => setHighlightText(e.target.value)}
                    className="flex-1 w-full p-2 text-sm border-0 focus:ring-0 focus:outline-none resize-none"
                    placeholder="Type your note for this highlight..."
                    autoFocus
                />

                {/* Footer */}
                <div className="p-2 bg-gray-100 border-t border-gray-200 flex justify-between items-center">
                    {!popupState.isNew && (
                         <button
                            onClick={() => onDelete(popupState.highlight.id, popupState.targetArea)}
                            className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 flex items-center space-x-1"
                        >
                            <Trash2 size={14} /> <span>Delete</span>
                        </button>
                    )}
                    <button
                        onClick={() => onSave(highlightText, popupState.snippet)}
                        className="ml-auto px-3 py-1 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700"
                    >
                        Save
                    </button>
                </div>
            </div>
        </Rnd>
    );
};


const CoursePracticeTestPlayer = () => {
    const { courseId, sectionId, quizModuleId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const isFetching = useRef(false);

    const { enrollment: initialEnrollment, introWasShown } = location.state || {};
    const { hasPermission, isLoggedIn, loading: userLoading, user } = useContext(UserContext);

    // Core state
    const [course, setCourse] = useState(null);
    const [practiceTestAttempt, setPracticeTestAttempt] = useState(null);
    const [allQuizModulesInTest, setAllQuizModulesInTest] = useState([]);
    const [currentQuizModule, setCurrentQuizModule] = useState(null);
    const [currentQuizAttempt, setCurrentQuizAttempt] = useState(null);
    const [currentQuizSnapshot, setCurrentQuizSnapshot] = useState(null);

    // Question/Answer state
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({}); // Stores final answer value (string, number, or boolean string)
    const [markedForReview, setMarkedForReview] = useState(new Set());

    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showIntro, setShowIntro] = useState(!introWasShown);
    const [showDirections, setShowDirections] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [timer, setTimer] = useState(0);
    const [endTime, setEndTime] = useState(null);
    const [isTimerVisible, setIsTimerVisible] = useState(true);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [eliminatedOptions, setEliminatedOptions] = useState(new Set());
    const [isEliminationFeatureActive, setIsEliminationFeatureActive] = useState(false);
    const [testSection, setTestSection] = useState(null);
    const [showQuestionNavigator, setShowQuestionNavigator] = useState(false);
    const [showAutoSubmitMessage, setShowAutoSubmitMessage] = useState(false);

    // 🟢 DESMOS CONFIGURATION: NEW STATE FOR IN-PAGE MODALS
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [isReferenceOpen, setIsReferenceOpen] = useState(false);
    const [calculatorMode, setCalculatorMode] = useState('scientific');

    // 🟢 NEW STATE: To manage the dynamic size and position of the Rnd components
    const [calcState, setCalcState] = useState({
        width: 500,
        height: 650,
        x: 50, // Initial position
        y: 50
    });
    const [refState, setRefState] = useState({
        width: 800,
        height: 600,
        x: 200, // Initial position
        y: 100
    });

    // 🟡 MODIFIED: State for new features
    const [sectionTitle, setSectionTitle] = useState("Practice Test");
    const [isMathModule, setIsMathModule] = useState(false);

    // 🟢🟡 MODIFIED: State for Annotations
    const [annotations, setAnnotations] = useState({}); // Master object for all annotations
    const [isHighlightModeActive, setIsHighlightModeActive] = useState(false); // Toggle for note-taking
    // 🟢 NEW STATE: Quick unmark is active when a selection is held
    const [isUnmarkModeActive, setIsUnmarkModeActive] = useState(false);
    const [showHighlightPopup, setShowHighlightPopup] = useState({ visible: false, x: 0, y: 0, highlight: null, isNew: false, targetArea: null, highlightText: '' });
    // 🟢 NEW STATE: Sidebar visibility
    const [showSidebar, setShowSidebar] = useState(false);


    // Refs
    const timerRef = useRef(null);
    const timerEndExecutedRef = useRef(false);
    const desmosContainerRef = useRef(null);
    const calculatorInstanceRef = useRef(null);
    // 🟢 NEW: Refs for annotation containers
    const questionTextRef = useRef(null);
    const questionContextRef = useRef(null);
    // 🟡 FIX: Use useRef for highlighters, not useState
    const textHlRef = useRef(null);
    const contextHlRef = useRef(null);
    // 🟡 FIX: Add refs to hold current state for click handlers
    const isHighlightModeRef = useRef(isHighlightModeActive);
    const isUnmarkModeRef = useRef(isUnmarkModeActive); // 🟢 NEW REF
    const annotationsRef = useRef(annotations);
    const currentQuestionIdRef = useRef(null);
    const optionsMenuRef = useRef(null); // ⭐ FIXED: Added missing Ref for Options Menu

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // 🟢 NEW: Initialize Rangy ONCE when the component mounts.
    useEffect(() => {
        try {
            if (typeof rangy.init === 'function') {
                rangy.init();
                console.log("✅ Rangy initialized on component mount.");
            } else {
                console.error("❌ Rangy core object is missing the init function.");
            }
        } catch (e) {
            console.error("❌ Rangy init on mount failed", e);
        }
    }, []);

    // 🟡 FIX: Update refs when state changes
    useEffect(() => {
        isHighlightModeRef.current = isHighlightModeActive;
    }, [isHighlightModeActive]);

    useEffect(() => {
        isUnmarkModeRef.current = isUnmarkModeActive;
    }, [isUnmarkModeActive]);

    useEffect(() => {
        annotationsRef.current = annotations;
    }, [annotations]);

    useEffect(() => {
        const currentQuestionId = questions[currentQuestionIndex]?.questionId;
        currentQuestionIdRef.current = currentQuestionId;
        
        // 🟢 NEW: Logic to auto-close sidebar if current question has no notes
        const currentQAnns = annotations[currentQuestionId];
        const hasNotes = (currentQAnns?.questionText?.notes && Object.keys(currentQAnns.questionText.notes).length > 0) || 
                             (currentQAnns?.questionContext?.notes && Object.keys(currentQAnns.questionContext.notes).length > 0);
        
        if (showSidebar && !hasNotes) {
             setShowSidebar(false);
        }

    }, [currentQuestionIndex, questions, annotations, showSidebar]);


    // Permissions
    const canReadCourse = hasPermission('course:read');
    const canReadQuestions = hasPermission('question:read');

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const findModuleIndex = useCallback((id) => {
        return allQuizModulesInTest.findIndex(m => m._id === id);
    }, [allQuizModulesInTest]);

    const handleNextModule = useCallback(() => {
        if (!currentQuizModule) {
            return;
        }

        setEndTime(null);
        setTimer(0);
        timerEndExecutedRef.current = false;
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const currentModuleIndex = allQuizModulesInTest.findIndex(m => m._id === currentQuizModule._id);
        const nextQuizModule = allQuizModulesInTest[currentModuleIndex + 1];

        if (nextQuizModule) {
            navigate(`/courses/${courseId}/practice-test/${sectionId}/${nextQuizModule._id}`, {
                state: {
                    enrollment: initialEnrollment,
                    introWasShown: true,
                    practiceTestAttemptId: practiceTestAttempt._id
                }
            });
        } else {
            // console.log("No next module available.");
        }
    }, [currentQuizModule, allQuizModulesInTest, courseId, sectionId, navigate, initialEnrollment, practiceTestAttempt]);

    const updateEnrollmentStatus = useCallback(async (newStatus, enrollmentToUpdate) => {
        if (!isLoggedIn || !enrollmentToUpdate?._id) return false;

        try {
            const response = await fetch(`${BACKEND_URL}/enrollments/${enrollmentToUpdate._id}/update-status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // console.log(`[API Success] Enrollment status updated to ${newStatus}.`);
                return true;
            } else {
                // console.error('[API Error] Failed to update enrollment status on save.');
                return false;
            }
        } catch (error) {
            // console.error('[API Error] Network error updating enrollment status:', error);
            return false;
        }
    }, [isLoggedIn, BACKEND_URL]);

    const startQuizAttempt = useCallback(async (quizModuleToUse, practiceTestAttemptId) => {
        // console.log('[API] startQuizAttempt called for quiz:', quizModuleToUse._id);

        if (!isLoggedIn || !user || !quizModuleToUse || !initialEnrollment) {
            setError('Missing required data to start quiz.');
            return null;
        }

        const payload = {
            quizModuleId: quizModuleToUse._id,
            enrollmentId: initialEnrollment._id,
        };

        if (practiceTestAttemptId) {
            payload.practiceTestAttemptId = practiceTestAttemptId;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/quiz-attempts/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok && data.success) {
                return data.data;
            } else {
                setError(data.message || 'Failed to start quiz attempt.');
                return null;
            }
        } catch (err) {
            setError(err.message || 'Error communicating with server to start quiz.');
            return null;
        }
    }, [isLoggedIn, user, initialEnrollment, BACKEND_URL]);


    const submitQuizAttempt = useCallback(async (isAutoSubmitted = false) => {
        // console.log('[API] submitQuizAttempt called. Auto-submitted:', isAutoSubmitted);

        if (!isLoggedIn || !user || !currentQuizAttempt) {
            // console.error('Missing required data to submit quiz attempt.');
            return false;
        }

        if (currentQuizAttempt.status === 'submitted') {
            // console.log('Quiz was already submitted locally. Skipping API call.');
            return true;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/quiz-attempts/${currentQuizAttempt._id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                // 🛑 Annotations successfully removed from submission payload
                body: JSON.stringify({ userAnswers, isAutoSubmitted })
            });
            const data = await response.json();

            if (!response.ok && data.message !== 'Quiz was already submitted.') {
                throw new Error(data.message || 'Unknown error during quiz submission.');
            }

            // console.log('[API Success] Quiz attempt submitted:', data.data);

            setCurrentQuizAttempt(prevAttempt => {
                if (prevAttempt?.status !== 'submitted') {
                    return { ...prevAttempt, status: data.data.status || 'submitted', remainingTime: 0 };
                }
                return prevAttempt;
            });

            return true;
        } catch (error) {
            setError('Failed to submit quiz. Please try again.');
            return false;
        }
    }, [isLoggedIn, user, currentQuizAttempt, userAnswers, BACKEND_URL, setCurrentQuizAttempt, setError]);

    const finalizePracticeTestOrNavigate = useCallback(async (isLastModuleNow, isAutoSubmitted = false) => {

        const currentModuleIndex = findModuleIndex(currentQuizModule?._id);
        const isDefinitelyLastModule = currentModuleIndex === (allQuizModulesInTest.length - 1);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setEndTime(null);
            // console.log('🛑 [Timer Control] Timer successfully stopped during submission.');
        }

        if (isAutoSubmitted) {
            setShowAutoSubmitMessage(true);
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const isModuleSubmitted = await submitQuizAttempt(isAutoSubmitted);

        if (!isModuleSubmitted) {
            setShowAutoSubmitMessage(false);
            return;
        }

        setShowAutoSubmitMessage(false);


        if (isDefinitelyLastModule && isModuleSubmitted) {
            try {
                // Submit overall practice test
                const response = await fetch(`${BACKEND_URL}/practice-tests/${practiceTestAttempt._id}/submit`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    alert(`Final submission to the server failed: ${data.message || 'Unknown error'}`);
                    return;
                }

                const submissionType = isAutoSubmitted ? 'full-test-auto-submit' : 'full-test-manual-submit';

                navigate(`/practice-tests/submission-complete`, {
                    replace: true,
                    state: {
                        practiceTestAttemptId: practiceTestAttempt._id,
                        submissionType: submissionType,
                        courseId: courseId
                    }
                });

            } catch (error) {
                alert('Failed to submit the entire practice test.');
            }

        } else if (isModuleSubmitted) {
            // Proceed to next module
            handleNextModule();
        }
    }, [submitQuizAttempt, practiceTestAttempt, navigate, courseId, handleNextModule, BACKEND_URL, currentQuizModule, findModuleIndex, allQuizModulesInTest.length]);


    const submitAllPracticeTest = useCallback(async () => {
        if (!window.confirm("Are you sure you want to submit the entire practice test?")) {
            return;
        }
        await finalizePracticeTestOrNavigate(true, false);
    }, [finalizePracticeTestOrNavigate]);


    const saveQuizAnswers = useCallback(async (answersToSave, currentQuestionIndex, remainingTime, markedForReviewSet) => {
        // console.log('[API] saveQuizAnswers called.');
        if (!isLoggedIn || !user || !currentQuizAttempt) return null;
        try {
            const payload = {
                userAnswers: answersToSave,
                currentQuestionIndex: currentQuestionIndex,
                remainingTime: remainingTime,
                markedForReview: [...markedForReviewSet],
                // 🛑 Annotations successfully removed from save-answers payload
            };

            const response = await fetch(`${BACKEND_URL}/quiz-attempts/${currentQuizAttempt._id}/save-answers`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (response.ok && data.success) {
                if (practiceTestAttempt && currentQuizModule) {
                    await fetch(`${BACKEND_URL}/practice-tests/${practiceTestAttempt._id}/save-progress`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            lastActiveQuizModuleId: currentQuizModule._id,
                        })
                    });
                }
                // console.log('[API Success] In-progress answers saved.');
                return data.data;
            } else {
                setError('Failed to save in-progress quiz answers.');
                // console.error('[API Error] Failed to save answers:', data.message);
                return null;
            }
        } catch (error) {
            setError('Error saving quiz answers.');
            // console.error('[API Error] Error saving answers:', error);
            return null;
        }
    }, [isLoggedIn, user, currentQuizAttempt, BACKEND_URL, practiceTestAttempt, currentQuizModule, sectionId]);


    // 🛑 CRITICAL MODIFICATION: Answer Change Handler 🛑
    const handleAnswerChange = useCallback((questionId, value) => {
        setUserAnswers(prev => {
            const currentQuestion = questions.find(q => q.questionId === questionId);
            let finalValue = value;

            if (currentQuestion) {
                switch (currentQuestion.questionType) {
                    case 'numerical':
                        finalValue = value === '' ? null : Number(value);
                        if (isNaN(finalValue)) finalValue = value;
                        break;
                    case 'trueFalse':
                        finalValue = value;
                        break;
                    case 'multipleChoice':
                    case 'shortAnswer':
                    case 'essay':
                    case 'fillInTheBlank':
                    default:
                        finalValue = String(value);
                        break;
                }
            }
            return { ...prev, [questionId]: finalValue };
        });

        setEliminatedOptions(prev => {
            const newSet = new Set(prev);
            newSet.delete(value);
            return newSet;
        });
    }, [questions]);


    const handleMarkForReview = useCallback((questionId) => {
        setMarkedForReview(prev => {
            const newSet = new Set(prev);
            newSet.has(questionId) ? newSet.delete(questionId) : newSet.add(questionId);
            return newSet;
        });
    }, []);

    const handleEliminateOption = useCallback((optionText) => {
        setEliminatedOptions(prev => {
            const newSet = new Set(prev);
            newSet.has(optionText) ? newSet.delete(optionText) : newSet.add(optionText);
            return newSet;
        });
    }, []);


    const handleNextQuestion = useCallback(() => {
        // console.log('[User Action] NEXT button clicked. Current index:', currentQuestionIndex);
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < questions.length) {
            saveQuizAnswers(userAnswers, nextIndex, timer, markedForReview);
            setCurrentQuestionIndex(nextIndex);
            setEliminatedOptions(new Set());
        } else {
            saveQuizAnswers(userAnswers, questions.length, timer, markedForReview);
            setIsReviewMode(true);
            // console.log('[Navigation] Last question of module reached. Entering review mode.');
        }
    }, [currentQuestionIndex, questions.length, userAnswers, timer, markedForReview, saveQuizAnswers]);

    const handlePrevQuestion = useCallback(() => {
        // console.log('[User Action] BACK button clicked. Current index:', currentQuestionIndex);
        const prevIndex = currentQuestionIndex - 1;
        if (prevIndex >= 0) {
            saveQuizAnswers(userAnswers, prevIndex, timer, markedForReview);
            setCurrentQuestionIndex(prevIndex);
            setEliminatedOptions(new Set());
        } else {
            // console.log("Cannot go back to previous module.");
        }
    }, [currentQuestionIndex, saveQuizAnswers, userAnswers, timer, markedForReview]);

    const handleNavigatorClick = useCallback((index) => {
        // console.log('[User Action] Navigator clicked. Jumping to index:', index);
        if (index >= 0 && index < questions.length) {
            saveQuizAnswers(userAnswers, index, timer, markedForReview);

            setCurrentQuestionIndex(index);
            setShowQuestionNavigator(false);
            setEliminatedOptions(new Set());
            setIsReviewMode(false);
        }
    }, [questions, saveQuizAnswers, userAnswers, timer, markedForReview]);

    const startTimedSession = useCallback(async () => {
        if (!currentQuizAttempt) return;

        try {
            // console.log(`[API] Starting/resuming timed session for quiz attempt: ${currentQuizAttempt._id}`);

            const response = await fetch(`${BACKEND_URL}/quiz-attempts/${currentQuizAttempt._id}/start-timed-session`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            const data = await response.json();

            if (response.ok && data.success && data.data) {

                setCurrentQuizAttempt(prev => ({
                    ...prev,
                    startTime: data.data.startTime
                }));

                if (data.data.remainingSeconds !== undefined) {
                    setTimer(data.data.remainingSeconds);
                    // console.log(`[Timer Sync] Display timer set to server-calculated: ${data.data.remainingSeconds} seconds.`);
                }

                // console.log('[API Success] Timed session started/resumed successfully.');
            } else {
                // console.error('Failed to start timed session:', data.message);
                setError(data.message || 'Failed to start quiz timer. Please refresh.');
            }
        } catch (error) {
            // console.error('Error starting timed session:', error);
            setError('Connection error starting timer.');
        }
    }, [BACKEND_URL, currentQuizAttempt]);


    // --- Data Fetching and Initialization (FINAL ROBUST VERSION) ---
    useEffect(() => {
        if (isFetching.current) return;
        isFetching.current = true;
        
        setLoading(true);
        setError(null);
        setIsReviewMode(false);
        setEliminatedOptions(new Set());
        setShowQuestionNavigator(false);

        if (!userLoading) {
            const loadData = async () => {
                try {
                    const targetQuizModuleId = quizModuleId;
                    if (!canReadCourse || !canReadQuestions || !isLoggedIn || !user || !initialEnrollment) throw new Error("Missing permissions.");

                    // 1. Fetch Course
                    const courseRes = await fetch(`${BACKEND_URL}/courses/${courseId}`, { headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
                    const courseData = await courseRes.json();
                    if (!courseRes.ok) throw new Error(courseData.message);
                    setCourse(courseData.data);

                    // 2. Start/Resume Practice Test
                    const attemptRes = await fetch(`${BACKEND_URL}/practice-tests/start/${sectionId}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ userId: user._id, courseId: courseId })
                    });
                    const attemptData = await attemptRes.json();
                    if (!attemptRes.ok) throw new Error(attemptData.message);
                    setPracticeTestAttempt(attemptData.data);
                    const practiceTest = attemptData.data;

                    const currentSectionObj = practiceTest.sectionIds?.find((s) => s._id.toString() === sectionId.toString());
                    const activeTitle = currentSectionObj?.sectionTitle || fetchedCourse.sections.find(s => s._id === sectionId)?.sectionTitle || "Practice Test";
                    
                    setSectionTitle(activeTitle);

                    // 🎯 Tool Logic: Switch between Math and Reading/Writing based on section title
                    const titleLower = activeTitle.toLowerCase();
                    const isMath = titleLower.includes('math');
                    setIsMathModule(isMath);

                    if (isMath) {
                        setShowSidebar(false);
                        setIsHighlightModeActive(false);
                        setIsUnmarkModeActive(false);
                    }

                    // 3. Extract Modules (FLATTENED with Parent Section ID for Cross-Section Nav)
                    // ⭐ FIX: Map over sections explicitly to preserve section ownership (parentSectionId)
                    const fetchedModules = courseData.data.sections.flatMap(section => 
                        (section.modules || [])
                        .filter(m => m.moduleType === 'quiz')
                        .map(m => ({
                            ...m,
                            parentSectionId: section._id // ⭐ ATTACH SECTION ID HERE
                        }))
                    );

                    const snapshotIds = practiceTest.quizSnapshots.map(s => s?.originalQuizModuleId?.toString()).filter(id => id);
                    const quizModulesInTestLocal = fetchedModules.filter(m => snapshotIds.includes(m._id)).sort((a, b) => a.order - b.order);
                    setAllQuizModulesInTest(quizModulesInTestLocal);

                    // 4. Target Module
                    let finalModuleToLoad = quizModulesInTestLocal.find(m => m._id === targetQuizModuleId) || quizModulesInTestLocal[0];
                    if (practiceTest.lastActiveQuizModuleId && practiceTest.lastActiveQuizModuleId !== targetQuizModuleId) {
                        finalModuleToLoad = quizModulesInTestLocal.find(m => m._id === practiceTest.lastActiveQuizModuleId);
                    } else if (!finalModuleToLoad) {
                        finalModuleToLoad = quizModulesInTestLocal[0];
                    }
                    
                    // ⭐ FIX: Auto-Correct URL if Section ID Mismatch
                    const correctSectionId = finalModuleToLoad.parentSectionId;
                    
                    if (finalModuleToLoad._id !== quizModuleId || (correctSectionId && correctSectionId !== sectionId)) {
                        console.log(`[Router Fix] Redirecting to correct URL. Module: ${finalModuleToLoad._id}, Section: ${correctSectionId}`);
                        navigate(`/courses/${courseId}/practice-test/${correctSectionId}/${finalModuleToLoad._id}`, { 
                            replace: true, 
                            state: { enrollment: initialEnrollment, introWasShown: true, practiceTestAttemptId: practiceTest._id } 
                        });
                        return;
                    }

                    // 5. Start Quiz Attempt
                    const currentQuizAttemptData = await startQuizAttempt(finalModuleToLoad, practiceTest._id);
                    if (!currentQuizAttemptData) throw new Error('Failed to start quiz attempt.');
                    
                    // 6. Fetch Snapshot & Flatten Questions
                    const snapshotRes = await fetch(`${BACKEND_URL}/quiz-attempts/quiz-snapshots/${finalModuleToLoad._id}`, { credentials: 'include' });
                    const snapshotData = await snapshotRes.json();
                    
                    let questionsToDisplay = [];
                    
                    // ⭐ SAT FLATTENING LOGIC 
                    if (finalModuleToLoad.satSettings?.isSAT && finalModuleToLoad.satSettings.strands?.length > 0) {
                        console.log("ℹ️ [Player Debug] Detected SAT Quiz. Flattening strands...");
                        
                        if (snapshotData.success && snapshotData.data.questionsSnapshot.length > 0) {
                             questionsToDisplay = snapshotData.data.questionsSnapshot;
                        } else {
                            // Fallback: Manually flatten from module if snapshot is empty (legacy or first-time)
                            const fullModuleRes = await fetch(`${BACKEND_URL}/modules/${finalModuleToLoad._id}`, { credentials: 'include' });
                            const fullModuleData = await fullModuleRes.json();
                            const fullModule = fullModuleData.data;
                            
                            if (fullModule.satSettings?.strands) {
                                fullModule.satSettings.strands.forEach(strand => {
                                    strand.questions.forEach(qWrapper => {
                                        if (qWrapper.question) {
                                            questionsToDisplay.push({
                                                questionId: qWrapper.question._id,
                                                questionTextRaw: qWrapper.question.questionTextRaw,
                                                questionTextHtml: qWrapper.question.questionTextHtml,
                                                questionType: qWrapper.question.questionType,
                                                optionsSnapshot: qWrapper.question.options.map(o => ({
                                                    optionTextHtml: o.optionTextRaw, 
                                                    isCorrect: o.isCorrect
                                                })),
                                                questionContextHtml: qWrapper.question.questionContextHtml
                                            });
                                        }
                                    });
                                });
                            }
                        }
                    } else {
                        // Standard Quiz
                        console.log("ℹ️ [Player Debug] Detected Standard Quiz.");
                        if (snapshotData.success) questionsToDisplay = snapshotData.data.questionsSnapshot;
                    }
                    
                    console.log(`[Player Debug] Final questions list length: ${questionsToDisplay.length}`);

                    setCurrentQuizSnapshot(snapshotData.data); // ✅ Fixed Variable Name
                    setCurrentQuizModule(finalModuleToLoad);
                    setCurrentQuizAttempt(currentQuizAttemptData);
                    setAnnotations(currentQuizAttemptData.annotations || {});

                    // 7. Load Saved Answers & Merge
                    const savedAnswersMap = new Map();
                    const savedMarkedSet = new Set();
                    if (currentQuizAttemptData.questionsAttemptedDetails) {
                        currentQuizAttemptData.questionsAttemptedDetails.forEach(d => {
                            const qId = d.questionId.toString();
                            let ans = '';
                            if (d.questionType === 'numerical') ans = d.userNumericalAnswer ?? '';
                            else if (d.questionType === 'trueFalse') ans = d.userBooleanAnswer !== null ? String(d.userBooleanAnswer) : '';
                            else ans = d.userTextAnswer ?? '';
                            savedAnswersMap.set(qId, ans);
                            if (d.isMarkedForReview) savedMarkedSet.add(qId);
                        });
                    }

                    const finalQuestions = questionsToDisplay.map(q => ({
                        ...q,
                        userAnswer: savedAnswersMap.get(q.questionId.toString()) || '',
                        isMarkedForReview: savedMarkedSet.has(q.questionId.toString())
                    }));

                    setQuestions(finalQuestions);
                    setUserAnswers(Object.fromEntries(savedAnswersMap));
                    setMarkedForReview(savedMarkedSet);

                    // Review Mode Check
                    const allAnswered = finalQuestions.length > 0 && finalQuestions.every(q => savedAnswersMap.has(q.questionId.toString()) && savedAnswersMap.get(q.questionId.toString()) !== '');
                    if (allAnswered && currentQuizAttemptData.status !== 'submitted') setIsReviewMode(true);

                    // 8. Timer State Initialization (FIXED FOR UNTIMED MODULES)
                    const timeLimit = finalModuleToLoad.timeLimitMinutes;
                    const hasTimeLimit = typeof timeLimit === 'number' && timeLimit > 0;
                    
                    if (hasTimeLimit) {
                        const timeLimitSeconds = timeLimit * 60;
                        const savedRemainingTime = currentQuizAttemptData.remainingTime || timeLimitSeconds;

                        if (currentQuizAttemptData.startTime) {
                            // Calculate end time based on server start time
                            const startTimeMs = new Date(currentQuizAttemptData.startTime).getTime();
                            const calculatedEndTime = startTimeMs + (timeLimitSeconds * 1000);
                            setEndTime(calculatedEndTime);
                            setTimer(Math.max(0, Math.floor((calculatedEndTime - Date.now()) / 1000)));
                        } else {
                            // Should theoretically not happen if startTimedSession works, but fallback:
                            setTimer(savedRemainingTime);
                            setEndTime(Date.now() + (savedRemainingTime * 1000)); 
                        }
                    } else {
                        // 🟢 CRITICAL FIX: Explicitly NULL out the timer for untimed modules
                        console.log("[Player Debug] Module is untimed. Clearing timer.");
                        setEndTime(null);
                        setTimer(0);
                    }

                    // Reset the "Time's Up" flag for this new module
                    timerEndExecutedRef.current = false;

                    setCurrentQuestionIndex(currentQuizAttemptData.lastActiveQuestionIndex || 0);

                } catch (err) {
                    console.error("Load Error:", err);
                    setError(err.message);
                } finally {
                    setLoading(false);
                    isFetching.current = false;
                }
            };
            loadData();
        }
    }, [sectionId, quizModuleId, userLoading, isLoggedIn, user, courseId, startQuizAttempt, initialEnrollment, BACKEND_URL, navigate, allQuizModulesInTest]);
    
    // Add this function inside CoursePracticeTestPlayer
    const getHighlightedTextById = useCallback((highlightId, targetArea) => {
        const currentQuestionId = questions[currentQuestionIndex]?.questionId;
        const currentQAnns = annotations[currentQuestionId];
        
        // 1. PRIMARY LOOKUP: Use the saved snippet from state (now reliably persisted via backend)
        const savedSnippet = currentQAnns?.[targetArea]?.snippets?.[highlightId];
        if (savedSnippet) {
            return savedSnippet;
        }
        
        // 2. DOM FALLBACK: Only needed if the snippet was created but not yet saved (e.g., waiting for saveAnnotation to complete)
        const containerRef = targetArea === 'questionText' ? questionTextRef : questionContextRef;
        
        if (containerRef.current) {
            const highlightEl = containerRef.current.querySelector(`.user-highlight[data-highlight-id='${highlightId}']`);
            
            if (highlightEl) {
                const textContent = highlightEl.textContent;
                return textContent.substring(0, 50).trim() + (textContent.length > 50 ? '...' : '');
            }
        }
        
        // 3. FINAL FALLBACK: If not in state and not found in DOM (likely just deleted or a deep timing error)
        return 'Highlight text unavailable.';    

    }, [questionTextRef, questionContextRef, questions, currentQuestionIndex, annotations]);

    // 🟡 FINAL CORRECTED FUNCTION: createHighlightInstance
    const createHighlightInstance = useCallback((targetArea) => {
        if (!rangy.initialized || typeof rangy.createHighlighter !== 'function') {
            console.error(`❌ Rangy: createHighlighter is unavailable. Check imports (rangy-highlighter). Target: ${targetArea}`);
            return null;
        }
        
        // We do not pass the rootElement here to avoid the TypeError,
        // relying on the manual check in handleSelection and the filter.
        const hl = rangy.createHighlighter(); 

        hl.addClassApplier(rangy.createClassApplier('user-highlight', {
            ignoreExisting: true,
            // Restrict application to basic text tags to avoid highlighting controls
            tagNames: ["span", "a", "p", "div", "b", "i", "em", "strong"],
            
            // 🟢 CRITICAL BLEEDING FIX: Filter to explicitly prevent highlight spans inside option elements
            filter: (node) => {
                // Only process element nodes
                if (node.nodeType !== 1) return true;    

                // Stop if the node is a form control or option wrapper (most likely cause of bleeding)
                const tagName = node.tagName.toUpperCase();
                // Check if this node is inside an interactive form element (e.g., inside a radio button's label)
                const isFormControlAncestor = node.closest('input[type="radio"], input[type="checkbox"], textarea, select, button');

                // Prevent insertion into interactive elements
                return !['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tagName) && !isFormControlAncestor;
            },
            
            onElementCreate: (element, highlight) => {
                const currentQuestionId = currentQuestionIdRef.current;
                const notesMap = annotationsRef.current?.[currentQuestionId]?.[targetArea]?.notes;
                const highlightId = highlight.id || `temp-${Math.random().toString(36).substring(2, 10)}`;
                
                element.setAttribute('data-highlight-id', highlightId);
                element.title = notesMap?.[highlightId] || 'Click to add/edit note';
                element.style.cursor = "pointer";
            },

            onElementClick: (e, highlight) => {
                e.stopPropagation();
                e.preventDefault();

                const highlightId = highlight.id;
                const currentQuestionId = currentQuestionIdRef.current;
                const notesMap = annotationsRef.current?.[currentQuestionId]?.[targetArea]?.notes;
                const retrievedNoteValue = notesMap?.[highlightId] || '';
                
                // Fetch the actual snippet text using the dedicated getter for the popup display
                const snippetText = getHighlightedTextById(highlightId, targetArea);
                
                setShowHighlightPopup({
                    visible: true, x: e.clientX, y: e.clientY, highlight,
                    isNew: false, targetArea,
                    snippet: snippetText, // Use the fetched snippet
                    highlightText: retrievedNoteValue
                });
            }
        }));

        return hl;

    }, [currentQuestionIdRef, annotationsRef, setShowHighlightPopup, getHighlightedTextById, questionTextRef, questionContextRef]);

    
    // 🟢 NEW FUNCTION: Dedicated API call to save one annotation change
    const saveAnnotationsToBackend = useCallback(async (questionId, targetArea, annotationData) => {
        if (!currentQuizAttempt) return false;

        console.log(`➡️ [API] Saving annotations (PUT) to backend for Q:${questionId}, Area:${targetArea}`);

        const payload = {
            questionId: questionId,
            annotationData: {
                // Wrap the specific annotation area and its data (serialized, notes)
                [targetArea]: annotationData
            }
        };

        try {
            const response = await fetch(`${BACKEND_URL}/quiz-attempts/${currentQuizAttempt._id}/save-annotations`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok && data.success) {
                console.log(`✅ [API Success] Annotations saved for Q:${questionId}, Area:${targetArea}.`);
                return true;
            } else {
                console.error(`❌ [API Error] Failed to save annotations.`, data.error || data.message);
                return false;
            }
        } catch (error) {
            console.error(`❌ [Network Error] Failed to save annotations.`, error);
            return false;
        }
    }, [BACKEND_URL, currentQuizAttempt]);


    // 🟢 NEW FUNCTION: Dedicated API call to delete a specific annotation (highlight + note)
    const deleteAnnotationFromBackend = useCallback(async (questionId, targetArea, highlightId) => {
        if (!currentQuizAttempt) return false;

        console.log(`➡️ [API] Deleting annotation via dedicated endpoint (DELETE) for Q:${questionId}, Area:${targetArea}, ID:${highlightId}`);

        try {
            // DELETE /quiz-attempts/:attemptId/annotations/:questionId/:areaKey/:highlightId
            const response = await fetch(
                `${BACKEND_URL}/quiz-attempts/${currentQuizAttempt._id}/annotations/${questionId}/${targetArea}/${highlightId}`, 
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                }
            );
            
            // Checks for 200 or 204
            if (response.ok) {
                console.log(`✅ [API Success] Annotation deleted successfully on backend.`);
                return true;
            } else {
                // Attempt to read error message if provided, otherwise log status
                const data = await response.json().catch(() => ({}));
                console.error(`❌ [API Error] Failed to delete annotation.`, data.error || data.message || `Status: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ [Network Error] Failed to delete annotation.`, error);
            return false;
        }
    }, [BACKEND_URL, currentQuizAttempt]);


    // ✅ MODIFIED HOOK - Initialize/Destroy highlighters
useEffect(() => {
    const currentQuestionId = questions[currentQuestionIndex]?.questionId;
    
    // --- 0. INITIAL DISPOSAL ---
    // Safely dispose of and null out any previous/stale instances immediately.
    if (textHlRef.current && typeof textHlRef.current.dispose === 'function') textHlRef.current.dispose();
    if (contextHlRef.current && typeof contextHlRef.current.dispose === 'function') contextHlRef.current.dispose();
    
    textHlRef.current = null; 
    contextHlRef.current = null;

    // Skip if in review mode or no question ID
    if (!currentQuestionId || isReviewMode) {
        return;
    }

    // Use a timeout to ensure the DOM elements (refs) are mounted and populated.
    const timeoutId = setTimeout(() => {
        // Ensure Rangy is ready and we have the necessary DOM element ref
        if (!questionTextRef.current || !rangy.initialized) {
            return;
        }
        
        // --- 1. CREATE (New scoped instances) ---
        let localTextHl = createHighlightInstance('questionText');
        let localContextHl = createHighlightInstance('questionContext');

        if (!localTextHl && !localContextHl) return;
        
        // --- 2. DESERIALIZE (Restore highlights) ---

        const qAnns = annotations[currentQuestionId];
        
        // 2a. Text Highlighter Deserialization
        if (localTextHl) {
            textHlRef.current = localTextHl; 
            if (qAnns?.questionText?.serialized) {
                try {
                    console.log("[RESUME DEBUG] Attempting deserialization for questionText...");
                    localTextHl.deserialize(qAnns.questionText.serialized);
                    console.log(`✅ Deserialized highlights for Q: ${currentQuestionId}, Area: questionText`);
                } catch (e) {
                    console.error("❌ FAILED to deserialize questionText:", e);
                }
            }
        }
        
        // 2b. Context Highlighter Deserialization
        if (localContextHl) {
            contextHlRef.current = localContextHl; 
            if (qAnns?.questionContext?.serialized) {
                try {
                    console.log("[RESUME DEBUG] Attempting deserialization for questionContext...");
                    localContextHl.deserialize(qAnns.questionContext.serialized);
                    console.log(`✅ Deserialized highlights for Q: ${currentQuestionId}, Area: questionContext`);
                } catch (e) {
                    console.error("❌ FAILED to deserialize questionContext:", e);
                }
            }
        }
        
    }, 100); // 100ms delay to allow DOM to render DANGEROUSLY_SET_INNER_HTML

    // 🛑 CRITICAL FIX: The cleanup function only disposes of the object currently held by the ref.
    return () => {    
        clearTimeout(timeoutId); 
        console.log("[Effect Cleanup] Running disposal for currently held refs...");
        
        // Use a safe check before calling dispose to prevent the TypeError
        if (textHlRef.current && typeof textHlRef.current.dispose === 'function') {
            textHlRef.current.dispose();
        }

        if (contextHlRef.current && typeof contextHlRef.current.dispose === 'function') {
            contextHlRef.current.dispose();
        }
    };
    
}, [currentQuestionIndex, isReviewMode, questions, annotations, createHighlightInstance]);


    // 🟢 NEW EFFECT: Timer Management (Logic remains the same)
    useEffect(() => {
        if (showIntro) {
            return;
        }

        if (currentQuizModule && currentQuizAttempt && !loading && !currentQuizAttempt.startTime) {
            startTimedSession();
        }
    }, [showIntro, currentQuizModule, currentQuizAttempt, loading, startTimedSession]);

    // 🟢 DEDICATED EFFECT: Calculates and sets the definitive endTime (Triggers timer start)
    useEffect(() => {
        if (showIntro || !currentQuizModule || !currentQuizAttempt || !currentQuizAttempt.startTime) {
            return;
        }

        const setupTimer = () => {
            const timeLimitMinutes = currentQuizModule.timeLimitMinutes;
            const startTime = currentQuizAttempt.startTime;

            if (timeLimitMinutes > 0 && startTime) {
                const timeLimitSeconds = timeLimitMinutes * 60;
                const startTimeMs = new Date(startTime).getTime();
                const calculatedEndTime = startTimeMs + (timeLimitSeconds * 1000);

                setEndTime(calculatedEndTime);
                setTimer(Math.max(0, Math.floor((calculatedEndTime - Date.now()) / 1000)));
            } else {
                setEndTime(null);
                setTimer(0);
            }
        };

        setupTimer();

    }, [showIntro, currentQuizModule, currentQuizAttempt]);

    // 🛑 NEW EFFECT: Reset the timer end execution flag on module change
    useEffect(() => {
        if (currentQuizModule) {
            timerEndExecutedRef.current = false;
        }
    }, [currentQuizModule]);


    // --- Timer Countdown Effect (Logic remains the same) ---
    useEffect(() => {
        // 🟢 FIX: Added check for 'currentQuizModule.timeLimitMinutes'
        // If the module has 0 or null minutes, the timer MUST NOT run.
        const isUntimed = !currentQuizModule || !currentQuizModule.timeLimitMinutes || currentQuizModule.timeLimitMinutes <= 0;

        if (loading || showIntro || isUntimed || !endTime || currentQuizAttempt?.status === 'submitted') {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        const calculateAndUpdateTimer = () => {
            const now = Date.now();
            let newRemainingTime = Math.max(0, Math.floor((endTime - now) / 1000));

            setTimer(newRemainingTime);

            if (newRemainingTime <= 0 && !timerEndExecutedRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
                timerEndExecutedRef.current = true;

                const currentModuleIndex = allQuizModulesInTest.findIndex(m => m._id === currentQuizModule?._id);
                const isLastModuleNow = currentModuleIndex === allQuizModulesInTest.length - 1;

                const onTimerEnd = async () => {
                    // Double check time limit existence before auto-submitting
                    if (currentQuizModule && currentQuizModule.timeLimitMinutes > 0) {
                        switch (currentQuizModule.timerEndBehavior) {
                            case 'auto-submit':
                            case 'strict-zero-score':
                                await finalizePracticeTestOrNavigate(isLastModuleNow, true);
                                break;
                            default:
                                alert("Time's up! The quiz timer has ended.");
                        }
                    }
                };
                onTimerEnd();
            }
        };

        calculateAndUpdateTimer();

        timerRef.current = setInterval(calculateAndUpdateTimer, 1000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                calculateAndUpdateTimer();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(timerRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };

    }, [endTime, currentQuizAttempt?.status, currentQuizModule, allQuizModulesInTest, finalizePracticeTestOrNavigate, showIntro, loading]);
    // 🟢 NEW EFFECT: Dynamic Script Loader for Desmos API
    useEffect(() => {
        if (isCalculatorOpen && !window.Desmos) {
            const script = document.createElement('script');
            script.src = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb317058bb3156872b1498b82479f6e';
            script.async = true;
            document.head.appendChild(script);

            return () => {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
            };
        }
    }, [isCalculatorOpen]);


    // 🛑 CRITICAL MODIFICATION: Desmos Embedding Logic (Handles mode switching cleanup)
    useEffect(() => {
        if (!isCalculatorOpen || !desmosContainerRef.current || !window.Desmos) {
            if (calculatorInstanceRef.current) {
                calculatorInstanceRef.current.destroy();
                calculatorInstanceRef.current = null;
            }
            return;
        }

        if (calculatorInstanceRef.current) {
            calculatorInstanceRef.current.destroy();
            calculatorInstanceRef.current = null;
        }

        try {
            const Desmos = window.Desmos;
            let calculator;
            const container = desmosContainerRef.current;
            container.innerHTML = ''; // Clear container content before initializing

            if (calculatorMode === 'scientific') {
                calculator = Desmos.ScientificCalculator(container, {
                    border: false, keypad: true, lockViewport: true,
                });
            } else if (calculatorMode === 'graphing') {
                calculator = Desmos.GraphingCalculator(container, {
                    keypad: true, expressions: true, settingsMenu: true, zoomButtons: true, border: false,
                });
            }

            calculator.type = calculatorMode; // Set type for instance management
            calculatorInstanceRef.current = calculator;
            // console.log(`Desmos ${calculatorMode} Calculator embedded successfully.`);

        } catch (error) {
            // console.error(`Failed to embed Desmos ${calculatorMode} calculator:`, error);
        }

        return () => {
            if (calculatorInstanceRef.current) {
                calculatorInstanceRef.current.destroy();
                calculatorInstanceRef.current = null;
                // console.log(`Desmos calculator destroyed.`);
            }
        };
    }, [isCalculatorOpen, calculatorMode]);


    // 🟢 NEW FUNCTION: Handles drag/resize stop for CALCULATOR, forcing Desmos resize on stop.
    const handleCalculatorUpdate = useCallback((e, direction, ref, delta, position) => {
        if (ref) {
            setCalcState(prev => ({
                ...prev,
                width: ref.style.width,
                height: ref.style.height,
                ...position,
            }));
            // Force Desmos to redraw its canvas during continuous resize.
            if (calculatorInstanceRef.current) {
                // calculatorInstanceRef.current.resize();
            }
        }
    }, []);

    const handleCalculatorResizeStop = useCallback((e, direction, ref, delta, position) => {
        // 1. Update the state one final time
        setCalcState({
            width: ref.style.width,
            height: ref.style.height,
            ...position,
        });

        // 2. Force Desmos to redraw its canvas (FIXES THE RENDERING GLITCH)
        if (calculatorInstanceRef.current) {
            calculatorInstanceRef.current.resize();
            // console.log("Desmos resize called after resize stop for stability.");
        }
    }, []);


    // 🟢 NEW FUNCTION: Handles drag/resize stop for REFERENCE sheet.
    const handleReferenceUpdate = useCallback((e, direction, ref, delta, position) => {
        // Update state on drag/resize/stop
        if (ref) {
            setRefState(prev => ({
                ...prev,
                width: ref.style.width,
                height: ref.style.height,
                ...position
            }));
        } else if (position) {
            setRefState(prev => ({ ...prev, ...position }));
        }
    }, []);


    // 🛑 CRITICAL FIX: saveAnnotation - ONLY handles saving/editing (NOT deletion)
    const saveAnnotation = useCallback(async (targetArea, highlightId, note, explicitSnippetText) => {
        // If the note is empty, the user should be using handleDeleteHighlight
        if (note.trim().length === 0) {
            console.error("saveAnnotation called with empty note. Use handleDeleteHighlight for deletion.");
            return;    
        }
        
        console.log(`➡️➡️ [A-ENTER] Starting final state save/update for ID: ${highlightId}. Note length: ${note.length}`);

        let highlighter = (targetArea === 'questionText') ? textHlRef.current : contextHlRef.current;
        const currentQuestionId = questions[currentQuestionIndex].questionId;
        const prevQAnns = annotationsRef.current[currentQuestionId] || {};
        
        let finalSnippet;
        if (explicitSnippetText) {
            // 1. Use the text passed directly from the handler (from handleSelection)
            finalSnippet = explicitSnippetText;
        } else {
            // 2. Fallback to the snippet already persisted in the annotations state
            finalSnippet = prevQAnns[targetArea]?.snippets?.[highlightId] || 'Snippet retrieval failure.';
        }

        // --- 1. SERIALIZE THE RESULTING HIGHLIGHTS ---
        let serialized = "";
        if (highlighter && typeof highlighter.serialize === 'function') {
            try {
                // This serialization implicitly includes the new highlight created in handleSelection
                const rawSerialized = highlighter.serialize();
                // 🛑 FIX: Ensure the serialized string is truly empty if it's just the placeholder.
                serialized = (rawSerialized === "type:textContent") ? "" : rawSerialized; 
                console.log("➡️➡️ [B-SERIALIZE] Successfully serialized new highlight string.");
            } catch (e) {
                console.error("❌ [B-FAIL] Serialization crashed. Using previous serialization.", e);
                serialized = prevQAnns[targetArea]?.serialized || "";
            }
        }

        // --- 2. UPDATE NOTES MAP (Local and API payload) ---
        const prevAreaAnns = prevQAnns[targetArea] || {};
        const updatedNotes = { ...prevAreaAnns.notes };
        const updatedSnippets = { ...prevAreaAnns.snippets };

        // This block ONLY handles adding/editing the note
        updatedNotes[highlightId] = note;
        updatedSnippets[highlightId] = finalSnippet; // <-- Uses the corrected, robust snippet

        const annotationDataToSave = {
            serialized: serialized,
            notes: updatedNotes,
            snippets: updatedSnippets    
        };

        // --- 3. UPDATE LOCAL STATE (Triggers useEffect to refresh annotations) ---
        setAnnotations(prev => {
            // ... (Local state update logic remains correct and is omitted for brevity) ...

            const newPrevQAnns = prev[currentQuestionId] || {};
            const newAreaAnnotations = { ...annotationDataToSave };

            // Combine notes from the non-target area (old state) and target area (new state)
            const remainingNotes = {    
                ...(targetArea === 'questionText' ? (newPrevQAnns.questionContext?.notes || {}) : (newPrevQAnns.questionText?.notes || {})),
                ...newAreaAnnotations.notes
            };
            const hasRemainingNotes = Object.keys(remainingNotes).length > 0;
            
            // Check for remaining serialized string (from all areas)
            const hasRemainingSerialized = (targetArea === 'questionText' ? newAreaAnnotations.serialized : newPrevQAnns.questionText?.serialized || "").length > 0 ||
                                         (targetArea === 'questionContext' ? newAreaAnnotations.serialized : newPrevQAnns.questionContext?.serialized || "").length > 0;


            // Logic to clean up the overall question entry in state
            if (!hasRemainingNotes && !hasRemainingSerialized) {
                const newPrev = { ...prev };
                delete newPrev[currentQuestionId];
                return newPrev;
            }

            return {
                ...prev,
                [currentQuestionId]: {
                    ...newPrevQAnns,
                    [targetArea]: newAreaAnnotations
                }
            };
        });

        // --- 4. CALL DEDICATED API ENDPOINT (ASYNC PUT) ---
        saveAnnotationsToBackend(currentQuestionId, targetArea, annotationDataToSave);

        // 5. Cleanup UI states
        setIsHighlightModeActive(false);
        setIsUnmarkModeActive(false);    
        setShowHighlightPopup({ visible: false, x: 0, y: 0, highlight: null, isNew: false, targetArea: null, highlightText: '' });
    }, [questions, currentQuestionIndex, saveAnnotationsToBackend, annotationsRef, setIsHighlightModeActive, setIsUnmarkModeActive, setShowHighlightPopup, getHighlightedTextById]); // Ensure getHighlightedTextById is a dependency


    // 🟢 NEW HANDLER: Called from Sidebar's Edit button
    const handleEditNoteFromSidebar = useCallback((highlightId, note, targetArea) => {
        // Find the element to calculate position for Rnd pop-up near the highlight
        const highlightEl = findHighlightElement(highlightId);
        const position = highlightEl ? highlightEl.getBoundingClientRect() : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        
        // Fetch the actual snippet text using the dedicated getter for the popup display
        const snippetText = getHighlightedTextById(highlightId, targetArea);


        setShowHighlightPopup({
            visible: true,
            x: position.x + 20, // Position slightly offset from the element
            y: position.y + 20,
            highlight: { id: highlightId }, // Mock highlight object with ID
            isNew: false,
            targetArea,
            snippet: snippetText,
            highlightText: note
        });
    }, [setShowHighlightPopup, getHighlightedTextById]);


    // 🟢 CRITICAL MODIFICATION: handleDeleteHighlight - Uses new DELETE endpoint
    const handleDeleteHighlight = useCallback(async (highlightId, targetArea) => {
        if (!window.confirm("Are you sure you want to delete this highlight and its associated note?")) {
            return;
        }
        
        console.log(`🗑️ [DELETE] Triggered deletion for highlight ID: ${highlightId}`);

        const highlighter = (targetArea === 'questionText') ? textHlRef.current : contextHlRef.current;
        const currentQuestionId = questions[currentQuestionIndex].questionId;
        
        // --- 1. Perform Local DOM/Rangy Removal ---
        const highlightToRemove = highlighter?.highlights.find(h => h.id === highlightId);
        
        if (highlightToRemove) {
            try {
                // Remove the highlight spans from the DOM and Rangy's internal model
                highlighter.removeHighlights([highlightToRemove]);
                console.log(`🗑️ [DELETE-RANGY] Removed highlight ${highlightId} from DOM/Rangy.`);
            } catch (e) {
                console.error("❌ [DELETE-RANGY] Failed to remove highlight:", e);
            }
        } else {
            console.warn(`⚠️ Highlight element with ID ${highlightId} not found in Rangy model. Assuming deletion is already performed or redundant.`);
        }

        // --- 2. Generate New Serialized String & Update Notes Map Locally ---
        let serialized = "";
        if (highlighter && typeof highlighter.serialize === 'function') {
            try {
                // Serialize the remaining (clean) highlights
                const rawSerialized = highlighter.serialize();
                // 🛑 FIX: Ensure the serialized string is truly empty if it's just the placeholder.
                serialized = (rawSerialized === "type:textContent") ? "" : rawSerialized; 
            } catch (e) {
                console.error("❌ [B-FAIL] Serialization crashed during delete. Using empty string.", e);
            }
        }
        
        const prevQAnns = annotationsRef.current[currentQuestionId] || {};
        const prevAreaAnns = prevQAnns[targetArea] || {};
        const updatedNotes = { ...prevAreaAnns.notes };
        const updatedSnippets = { ...prevAreaAnns.snippets };
        
        // CRITICAL DELETION STEP: Remove the note from the map
        delete updatedNotes[highlightId];
        delete updatedSnippets[highlightId];

        const annotationDataToSave = {
            serialized: serialized, // Use the cleaned string
            notes: updatedNotes,
            snippets: updatedSnippets    
        };

        // --- 3. Update Local State (Immediate UI Refresh) ---
        setAnnotations(prev => {
            const newPrevQAnns = prev[currentQuestionId] || {};
            const newAreaAnnotations = { ...annotationDataToSave };
            
            // Logic to check if the entire question entry should be removed
            const hasRemainingSerialized = (targetArea === 'questionText' ? newAreaAnnotations.serialized : newPrevQAnns.questionText?.serialized || "").length > 0 ||
                                         (targetArea === 'questionContext' ? newAreaAnnotations.serialized : newPrevQAnns.questionContext?.serialized || "").length > 0;
            
            const remainingNotes = {    
                ...(targetArea === 'questionText' ? (newPrevQAnns.questionContext?.notes || {}) : (newPrevQAnns.questionText?.notes || {})),
                ...newAreaAnnotations.notes
            };
            const hasRemainingNotes = Object.keys(remainingNotes).length > 0;
            
            if (!hasRemainingNotes && !hasRemainingSerialized) {
                const newPrev = { ...prev };
                delete newPrev[currentQuestionId];
                return newPrev;
            }

            return {
                ...prev,
                [currentQuestionId]: {
                    ...newPrevQAnns,
                    [targetArea]: newAreaAnnotations
                }
            };
        });
        
        // --- 4. Call Dedicated Backend Delete Endpoint ---
        // This attempts to delete the highlight/note on the backend
        const backendDeleteSuccess = await deleteAnnotationFromBackend(currentQuestionId, targetArea, highlightId);

        // --- 5. Force PUT Cleanup to handle race condition/stale data ---
        // This ensures the CLEANED 'serialized' string (from Step 2) is explicitly written.
        const backendPutSuccess = await saveAnnotationsToBackend(currentQuestionId, targetArea, annotationDataToSave);


        // 6. Final UI Cleanup
        if (backendDeleteSuccess || backendPutSuccess) {
            setShowHighlightPopup({ visible: false, x: 0, y: 0, highlight: null, isNew: false, targetArea: null, highlightText: '' });
            
            // Auto-close sidebar logic (can be slightly delayed to allow React state to settle)
            setTimeout(() => {
                const updatedQAnns = annotationsRef.current[currentQuestionId];
                const hasNotes = (updatedQAnns?.questionText?.notes && Object.keys(updatedQAnns.questionText.notes).length > 0) ||    
                                 (updatedQAnns?.questionContext?.notes && Object.keys(updatedQAnns.questionContext.notes).length > 0);
                
                if (!hasNotes) {
                    setShowSidebar(false);
                }
            }, 100);
        } else {
            // If the backend fails, alert the user but keep the UI reflecting the deletion.
            alert("Fatal: Server failed both DELETE and PUT cleanup attempts. Highlight may reappear on reload.");
        }
        
    }, [questions, currentQuestionIndex, annotationsRef, deleteAnnotationFromBackend, saveAnnotationsToBackend, setShowSidebar]);


    const handleCloseHighlightPopup = useCallback(() => {
        const { isNew, highlight, targetArea } = showHighlightPopup;

        if (isNew && highlight) {
            const highlighter = (targetArea === 'questionText') ? textHlRef.current : contextHlRef.current;
            if (highlighter) {
                try {
                    // Remove the newly created highlight if the user cancels the 'Add Note' dialogue
                    highlighter.removeHighlights([highlight]);
                } catch (e) {
                    console.error("Error removing highlight on cancel:", e);
                }
            }
        }

        // Ensure highlight/unmark mode is OFF if the user was actively highlighting
        if (isNew) {
            setIsHighlightModeActive(false);
        }
        setIsUnmarkModeActive(false); // 🟢 NEW: Ensure unmark mode is off

        setShowHighlightPopup({ visible: false, x: 0, y: 0, highlight: null, isNew: false, targetArea: null, highlightText: '' });
    }, [showHighlightPopup, setIsHighlightModeActive, setIsUnmarkModeActive]);

    const handleSaveHighlight = useCallback((highlightText, snippetText) => {    
    // console.log(`➡️ [SAVE-TRIGGER] Button successfully called handler...`);

    const { targetArea, highlight } = showHighlightPopup;
    if (targetArea && highlight) {
        if (highlightText.trim().length === 0) {
            handleDeleteHighlight(highlight.id, targetArea);
        } else {
            // 🛑 MODIFIED: Pass the explicit snippetText received from the popup
            saveAnnotation(targetArea, highlight.id, highlightText, snippetText);    
        }
    }
}, [showHighlightPopup, saveAnnotation, handleDeleteHighlight]);

    // 🟢🟡 MODIFIED: Annotation Handlers (FINAL FIX for immediate visual unmark)
    const handleSelection = useCallback((e, targetArea) => {
        // 🛑 DEBUG LOG
        console.log(`[SELECTION-START] Firing onMouseUp event for Area: ${targetArea}. Highlight Mode: ${isHighlightModeRef.current}, Unmark Mode: ${isUnmarkModeRef.current}`);

        const selection = rangy.getSelection();
        if (selection.isCollapsed) {
            // If selection collapses, exit immediately unless we were actively in Unmark Mode
            if (isUnmarkModeRef.current) {
                setIsUnmarkModeActive(false); // Turn off Unmark Mode if selection collapses unexpectedly
            }
            return;
        }

        // 🛑 CRITICAL FIX: Declare 'highlighter' using 'let'
        let highlighter = (targetArea === 'questionText') ? textHlRef.current : contextHlRef.current;
        
        // 🛑 CRITICAL FIX: Defensive Initialization for timing mismatch (fixes Assignment to constant error)
        if (!highlighter) {
            console.warn(`[SELECTION-FIX] Highlighter ref for ${targetArea} was null. Attempting local recreation.`);
            highlighter = createHighlightInstance(targetArea);
            
            // Assign the new instance back to the ref immediately
            if (targetArea === 'questionText') {
                textHlRef.current = highlighter;
            } else {
                contextHlRef.current = highlighter;
            }
        }

        if (!highlighter || typeof highlighter.highlightSelection !== 'function') {
            console.error(`❌ FAILED: Highlighter object for '${targetArea}' is still null or invalid.`);
            selection.collapseToEnd();
            return;
        }
        
        const rootNode = (targetArea === 'questionText') ? questionTextRef.current : questionContextRef.current;
        
        // 🛑 CRITICAL FIX: Ensure both ends of the selection are contained within the rootNode
        if (!rootNode?.contains(selection.anchorNode) || !rootNode?.contains(selection.focusNode)) {
            const isBleeding = !rootNode?.contains(selection.anchorNode) || !rootNode?.contains(selection.focusNode); 
            
            console.error(`❌ FAILED: Selection check. Is Bleeding: ${isBleeding}. Selection is outside the correct container.`);
            selection.collapseToEnd();
            return;
        }

        // 🛑 DEBUGGING: Log the actual text content for offset diagnosis
        if (rootNode) {
            const innerText = rootNode.innerText;
            console.log(`[DEBUG RANGY TEXT] Target Area: ${targetArea}`);
            // Use placeholder characters to visualize tricky whitespace/newlines for debugging
            console.log(`[DEBUG RANGY TEXT] Node Inner Text: "${innerText.replace(/\s/g, '•').replace(/"/g, '\"')}"`); 
            console.log(`[DEBUG RANGY TEXT] Node Text Length: ${innerText.length}`);
        }

        if (isUnmarkModeRef.current) {
            // 🎯 Action: Quick Unmark Mode
            
            // 1. Rangy operation: Removes the highlights intersecting the selection (Immediate DOM removal)
            highlighter.unhighlightSelection();    
            selection.removeAllRanges();
            setIsUnmarkModeActive(false);    

            // --- 2. State Sync: Determine the new clean state immediately ---
            const currentQuestionId = questions[currentQuestionIndex].questionId;
            const targetAreaKey = highlighter === textHlRef.current ? 'questionText' : 'questionContext';
            
            // Get the serialized string representing the REMAINING highlights
            const rawSerialized = highlighter.serialize();
            
            // 🛑 FIX 1: Ensure the serialized string is truly empty if it's just the placeholder.
            const finalSerialized = (rawSerialized === "type:textContent") ? "" : rawSerialized;    
            
            // Get the IDs of the highlights that STILL exist in the Rangy model
            const remainingHighlightIds = new Set(highlighter.highlights.map(h => h.id));
            
            // Filter the existing notes map to only keep notes for *remaining* highlights
            const prevQAnns = annotationsRef.current[currentQuestionId] || {};
            const prevNotes = prevQAnns[targetAreaKey]?.notes || {};
            const prevSnippets = prevQAnns[targetAreaKey]?.snippets || {};
            const updatedNotes = {};
            const updatedSnippets = {};
            
            for (const id in prevNotes) {
                // CRITICAL FIX 2: Only retain the note/snippet if the highlight ID still exists in the model
                if (remainingHighlightIds.has(id)) {
                    updatedNotes[id] = prevNotes[id];
                    updatedSnippets[id] = prevSnippets[id];
                }
            }
            
            const annotationDataToSave = {
                serialized: finalSerialized,    
                notes: updatedNotes,
                snippets: updatedSnippets
            };
            
            // --- 3. Update local state (triggers immediate visual re-render) ---
            setAnnotations(prev => {
                const newPrevQAnns = prev[currentQuestionId] || {};
                
                // Logic to check if the entire question entry should be deleted from state
                const otherArea = targetAreaKey === 'questionText' ? 'questionContext' : 'questionText';
                const otherAreaHasData = (newPrevQAnns[otherArea]?.serialized?.length > 0) || (Object.keys(newPrevQAnns[otherArea]?.notes || {}).length > 0);
                
                if (finalSerialized.length === 0 && Object.keys(updatedNotes).length === 0 && !otherAreaHasData) {
                    const newPrev = { ...prev };
                    delete newPrev[currentQuestionId];
                    return newPrev;
                }

                return {
                    ...prev,
                    [currentQuestionId]: {
                        ...newPrevQAnns,
                        [targetAreaKey]: annotationDataToSave
                    }
                };
            });
            
            // --- 4. Send the clean state to the backend (async) ---
            saveAnnotationsToBackend(currentQuestionId, targetAreaKey, annotationDataToSave);

        } else if (isHighlightModeRef.current) {
            // 🎯 Action: Highlight/Add Note Mode (Unchanged logic for new highlights)
            const highlights = highlighter.highlightSelection('user-highlight', { selection: selection });

            const selectedText = selection.toString().substring(0, 50).trim() + (selection.toString().length > 50 ? '...' : '');

            if (highlights.length > 0) {
                console.log(`➡️ [SELECT] Successfully created new highlight (ID: ${highlights[0].id}) in ${targetArea}. Opening popup.`);

                setIsHighlightModeActive(false);

                setShowHighlightPopup({
                    visible: true, x: e.clientX, y: e.clientY, highlight: highlights[0],
                    isNew: true, targetArea: targetArea,
                    snippet: selectedText,    
                    highlightText: ''
                });

                setShowSidebar(true);

            } else {
                console.warn("⚠️ SKIPPED: highlighter.highlightSelection returned no highlights.");
            }
            selection.collapseToEnd();
        }
        
    }, [currentQuestionIndex, questions, annotationsRef, isHighlightModeRef, isUnmarkModeRef, setIsHighlightModeActive, setIsUnmarkModeActive, setShowHighlightPopup, questionTextRef, questionContextRef, setShowSidebar, saveAnnotationsToBackend, createHighlightInstance]);


    // UI handlers
    const handleIntroBack = () => { navigate(`/courses/${courseId}`); };
    const handleStartTest = async () => {
        await startTimedSession();
        setShowIntro(false);
        if (currentQuizModule?.direction) {
            setShowDirections(true);
        }
    };
    const handleCloseDirections = () => { setShowDirections(false); };

    // 🟢 DESMOS CONFIGURATION: UPDATED HANDLER TO OPEN/CLOSE IN-PAGE MODAL
    const handleCalculatorToggle = () => {
        if (testSection !== "no-calculator") {
            setIsCalculatorOpen(prev => !prev);
            if (isReferenceOpen) setIsReferenceOpen(false);
        }
    };

    // 🟢 NEW FUNCTION: Handler to OPEN/CLOSE IN-PAGE REFERENCE MODAL
    const handleReferenceToggle = () => {
        setIsReferenceOpen(prev => !prev);
        if (isCalculatorOpen) setIsCalculatorOpen(false);
    };

    const handleSaveAndExit = useCallback(async () => {

        if (!window.confirm("Are you sure you want to save and exit? You can resume this quiz later.")) {
            return;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        setEndTime(null);
        isFetching.current = true;

        // Note: saveQuizAnswers no longer contains the annotation data.
        // We rely on the async calls made in saveAnnotation.
        const savedAttempt = await saveQuizAnswers(userAnswers, currentQuestionIndex, timer, markedForReview);

        if (savedAttempt) {
            await updateEnrollmentStatus('in-progress', initialEnrollment);
            navigate(`/courses/${courseId}`, {
                state: {
                    refresh: true,
                    lastActiveSectionId: sectionId,
                    lastActiveModuleId: currentQuizModule._id
                }
            });
        } else {
            isFetching.current = false;
            alert("Failed to save your progress. Please try again.");
        }
    }, [userAnswers, currentQuestionIndex, saveQuizAnswers, navigate, courseId, timer, markedForReview, sectionId, currentQuizModule, updateEnrollmentStatus, initialEnrollment]);


    // --- Render Logic with Guards ---
    const currentQuestion = questions[currentQuestionIndex];
    const hasTimeLimit = currentQuizModule?.timeLimitMinutes > 0;
    const isLastModule = allQuizModulesInTest.length > 0 && findModuleIndex(currentQuizModule?._id) === allQuizModulesInTest.length - 1;


    // --- Render Logic with Guards ---
    if (loading || userLoading) {
        return <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex items-center justify-center"><p className="text-xl text-blue-600">Loading test...</p></div>;
    }
    if (error) {
        return (<div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center text-center"><p className="text-xl text-red-600 mb-6">Error: {error}</p><button onClick={() => navigate(-1)} className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200"><ArrowLeft size={20} /><span>Back</span></button> </div>);
    }
    if (!isLoggedIn || !canReadCourse || !canReadQuestions) {
        return <div className="p-6 text-center text-red-500">Access Denied: You do not have permission to take this test.</div>;
    }
    if (!course || !currentQuizModule) {
        return <div className="p-6 text-center text-gray-500">Test not found.</div>;
    }
    if (questions.length === 0) {
        return <div className="p-6 text-center text-gray-500">No questions found for this test.</div>;
    }

    // --- Answer Input Renderer (omitted for brevity) ---
    const renderAnswerInput = (question) => {
        const questionId = question.questionId;
        const currentAnswer = userAnswers[questionId] ?? '';

        const baseClass = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

        const textInput = (type, placeholder) => (
            <input
                type={type === 'numerical' ? 'number' : 'text'}
                id={`answer-${questionId}`}
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                className={baseClass}
                placeholder={placeholder}
                step={type === 'numerical' ? "any" : undefined}
            />
        );

        switch (question.questionType) {
            case 'shortAnswer':
            case 'fillInTheBlank':
                return (
                    <div>
                        <label htmlFor={`answer-${questionId}`} className="sr-only">Your Answer</label>
                        {textInput('text', 'Type your short answer here...')}
                    </div>
                );

            case 'numerical':
                return (
                    <div>
                        <label htmlFor={`answer-${questionId}`} className="sr-only">Numerical Answer</label>
                        <p className="text-sm font-medium w-2/3 text-gray-700 mb-2">Enter only a number (decimals are allowed). Do NOT include units or fractions.</p>
                        {textInput('numerical', 'Enter numerical answer...')}
                    </div>
                );

            case 'essay':
                return (
                    <div>
                        <label htmlFor={`answer-${questionId}`} className="sr-only">Essay Answer</label>
                        <textarea
                            id={`answer-${questionId}`}
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                            className={`${baseClass} resize-y min-h-[200px]`}
                            placeholder="Type your essay response here..."
                            spellCheck="false"
                        />
                    </div>
                );

            default:
                return null;
        }
    }

    return (
        // 🟢 Add custom CSS for highlighting
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 font-inter flex flex-col min-h-screen relative">
            <style>{`
                .prose, .prose * {
                    /* Replace 'Arial' with your single desired font if different (e.g., 'Roboto', 'Times New Roman') */
                    font-family: 'Times New Roman', sans-serif !important;
                    font-size: 20px !important; 
                    {/* line-height: 1.6 !important;  */}
                }

                /* 🚀 CRITICAL FIX: Ensure lists retain their bullets/numbering inside the .prose block */
                .prose ul, .prose ol {
                    list-style-type: disc !important; /* Force bullets for unordered lists */
                    list-style-position: outside !important; /* Ensure the bullet is visible */
                    padding-left: 1.5em !important; /* Add space for the bullet */
                    margin-left: 0 !important;
                }
                .prose ol {
                    list-style-type: decimal !important; /* Force numbers for ordered lists */
                }
                .prose li {
                    list-style-position: outside !important;
                }
                .user-highlight {
                    background-color: #fef08a; /* yellow-200 */
                    cursor: pointer;
                    border-bottom: 2px solid #eab308; /* yellow-500 */
                }
                .user-highlight:hover {
                    background-color: #fde047; /* yellow-300 */
                }
                .highlight-warning {
                    background ${isUnmarkModeActive ? '#fca5a5' : '#fbbf24'};
                    color: ${isUnmarkModeActive ? '#b91c1c' : '#b45309'};
                    border: 1px solid ${isUnmarkModeActive ? '#fca5a5' : '#fbbf24'};
                }
            `}</style>

            {/* 🟢🟡 MODIFIED: Annotation Popup - Pass onDelete handler */}
            {showHighlightPopup.visible && (
                <HighlightPopup
                    popupState={showHighlightPopup}
                    onSave={handleSaveHighlight}
                    onClose={handleCloseHighlightPopup}
                    onDelete={handleDeleteHighlight}
                />
            )}

            {/* Auto-Submission Message Overlay (omitted for brevity) */}
            {showAutoSubmitMessage && (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center">
                    <div className="bg-white border-l-4 border-indigo-600 text-black p-8 rounded-lg shadow-2xl text-center">
                        <p className="text-2xl font-bold mb-2">Time's Up! ⏱️</p>
                        <p className="text-xl">Your quiz is being automatically submitted...</p>
                    </div>
                </div>
            )}

            {/* 🟢 DESMOS CALCULATOR MODAL (Rnd - omitted for brevity) */}
            {(isCalculatorOpen && testSection !== "no-calculator") && (
                <Rnd
                    size={{ width: calcState.width, height: calcState.height }}
                    position={{ x: calcState.x, y: calcState.y }}
                    onDragStop={(e, d) => setCalcState(prev => ({ ...prev, x: d.x, y: d.y }))}
                    onResize={handleCalculatorUpdate}
                    onResizeStop={handleCalculatorResizeStop}
                    minWidth={350}
                    minHeight={400}
                    bounds="parent"
                    dragHandleClassName="calculator-handle"
                    style={{ zIndex: 100, borderRadius: '0.75rem' }}
                >
                    <div className="bg-gray-400 rounded-xl shadow-2xl flex flex-col w-full h-full overflow-hidden">
                        {/* Modal Header with Mode Switcher - USED AS DRAG HANDLE */}
                        <div className="calculator-handle cursor-move flex justify-between items-center p-4 border-b border-gray-200 bg-slate-900">
                            <h2 className="text-xl font-bold text-white">
                                {calculatorMode === 'scientific' ? 'Scientific Calculator:' : 'Graphing Calculator:'}
                            </h2>

                            {/* 🛑 Mode Switcher Buttons */}
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setCalculatorMode('scientific')}
                                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                                        calculatorMode === 'scientific'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                    title="Switch to Scientific Mode"
                                >
                                    Scientific
                                </button>
                                <button
                                    onClick={() => setCalculatorMode('graphing')}
                                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                                        calculatorMode === 'graphing'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                    title="Switch to Graphing Mode"
                                >
                                    Graphing
                                </button>
                            </div>

                            <button
                                onClick={() => setIsCalculatorOpen(false)}
                                className="text-white hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-700 cursor-pointer"
                                title="Close Calculator"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        {/* Calculator Embed Container */}
                        <div className="flex-1 w-full p-2">
                            <div
                                key={calculatorMode}
                                ref={desmosContainerRef}
                                className="w-full h-full bg-white border border-gray-300 rounded-lg"
                            >
                                {!window.Desmos && <p className="p-4 text-center text-gray-500">Loading calculator...</p>}
                            </div>
                        </div>
                    </div>
                </Rnd>
            )}

            {/* 🟢 NEW REFERENCE SHEET MODAL (Rnd - omitted for brevity) */}
            {isReferenceOpen && (
                <Rnd
                    size={{ width: refState.width, height: refState.height }}
                    position={{ x: refState.x, y: refState.y }}
                    onDragStop={(e, d) => handleReferenceUpdate(e, null, null, null, { x: d.x, y: d.y })}
                    onResize={handleReferenceUpdate}
                    onResizeStop={handleReferenceUpdate}
                    minWidth={400}
                    minHeight={300}
                    bounds="parent"
                    dragHandleClassName="reference-handle"
                    style={{ zIndex: 90, borderRadius: '0.75rem' }}
                >
                    <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full h-full overflow-hidden">
                        {/* Modal Header - USED AS DRAG HANDLE */}
                        <div className="reference-handle cursor-move flex justify-between items-center p-4 border-b border-gray-200 bg-slate-900">
                            <h2 className="text-xl font-bold text-white">Reference Sheet</h2>
                            <button
                                onClick={() => setIsReferenceOpen(false)}
                                className="text-white hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-700 cursor-pointer"
                                title="Close Reference Sheet"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        {/* Reference Image Content */}
                        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
                            <img
                                src={reference}
                                alt="Reference Sheet"
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    </div>
                </Rnd>
            )}

            {showIntro ? (
                // --- Intro Screen JSX (omitted for brevity) ---
                <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center">
                    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl text-center">
                        <h1 className="text-3xl font-bold text-indigo-700 mb-8">Practice Test</h1>
                        <div className="space-y-6">
                            <div className="flex items-center space-x-7 p-4">
                                <div className=" rounded-full w-16 h-16 flex items-center justify-center">
                                    <Clock size={40} className="text-gray-800" />
                                </div>
                                <div className="text-left">
                                    <h2 className="font-semibold text-lg text-gray-800">Timing</h2>
                                    <p className="text-gray-600">
                                        Practice tests are timed, but you can pause them. To continue on another device, you have to start over. We delete incomplete practice tests after 90 days.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-7 p-4">
                                <div className=" rounded-full w-16 h-16 flex items-center justify-center">
                                    <Award size={40} className="text-gray-800" />
                                </div>
                                <div className="text-left">
                                    <h2 className="font-semibold text-lg text-gray-800">Scores</h2>
                                    <p className="text-gray-600">
                                        When you finish the practice test, go to <strong>My Practice</strong> to see your scores and get personalized study tips.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-10 p-4">
                                <div className=" rounded-full w-16 h-16 flex items-center justify-center">
                                    <Sparkle size={40} className="text-gray-800" />
                                </div>
                                <div className="text-left">
                                    <h2 className="font-semibold text-lg text-gray-800">Assistive Technology (AT)</h2>
                                    <p className="text-gray-600">
                                        Be sure to practice with any AT you use for testing. If you configure your AT settings here, you may need to repeat this step on test day.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-7 p-4">
                                <div className=" rounded-full w-16 h-16 flex items-center justify-center">
                                    <Smartphone size={40} className="text-gray-800" />
                                </div>
                                <div className="text-left">
                                    <h2 className="font-semibold text-lg text-gray-800">No Device Lock</h2>
                                    <p className="text-gray-600">
                                        We don't lock your device during practice. On test day, you'll be blocked from using other programs or apps.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end space-x-4">
                            <button
                                onClick={handleIntroBack}
                                className="py-3 my-1 text-white font-primary font-bold px-4 flex rounded-3xl items-center bg-indigo-600 hover:bg-indigo-700 text-[14px] cursor-pointer"
                            >
                                <ArrowLeft size={20} />
                                <span>Back</span>
                            </button>
                            <button
                                onClick={handleStartTest}
                                className="py-3 my-1 text-white font-primary font-bold px-4 flex rounded-3xl items-center bg-indigo-600 hover:bg-indigo-700 text-[14px] cursor-pointer"
                            >
                                <span>Next</span>
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Directions Modal (omitted for brevity) */}
                    {showDirections && currentQuizModule?.direction && (
                        <div
                            className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300"
                            onClick={handleCloseDirections}
                        >
                            <div
                                className="absolute top-[90px] left-[10px] z-50 p-6 w-full max-w-[50rem] bg-gray-50 rounded-lg shadow-xl border border-gray-400"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="absolute top-0 left-[95px] -translate-x-1/2 transform -translate-y-2 rotate-45 w-4 h-4 bg-gray-50 border-t border-l border-gray-400" />
                                <div className="flex items-center justify-between mb-4 p-1">
                                    <h2 className="text-lg font-bold text-gray-800">Directions</h2>
                                </div>
                                <div className="prose max-w-full overflow-y-auto text-gray-800 leading-relaxed font-serif text-md p-2">
                                    <div dangerouslySetInnerHTML={{ __html: decodeHtmlHelper(currentQuizModule.direction) }} />
                                </div>
                                <div className="flex justify-end mt-4">
                                    <button
                                        className="px-4 py-2 text-sm font-semibold text-gray-800 bg-yellow-400 rounded-3xl hover:bg-yellow-500 border-1 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                                        onClick={handleCloseDirections}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <header
                        className={`px-5 py-2 shadow-md grid ${
                            hasTimeLimit ? "grid-cols-3" : "grid-cols-2"
                        } items-start w-full z-50 ${
                            testSection === "no-calculator" ? "bg-red-100" : "bg-blue-100"
                        }`}
                    >
                        {/* 1. LEFT COLUMN (Title & Directions) */}
                        <div className={`flex flex-col items-start space-y-1 min-w-0 ${hasTimeLimit ? 'col-span-1' : 'col-span-1'}`}>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                                {sectionTitle}{currentQuizModule?.title ? `: ${currentQuizModule.title}` : ""}
                            </h1>
                            {currentQuizModule && currentQuizModule.direction && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowDirections(prev => !prev)}
                                        className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md p-0.5 cursor-pointer font-semibold"
                                    >
                                        <span className='text-md'>Directions</span>
                                        {showDirections ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. CENTER COLUMN (Timer - omitted for brevity) */}
                        {hasTimeLimit && (
                            <div className="col-span-1 flex justify-center flex-col items-center space-y-1 self-center">
                                {isTimerVisible ? (
                                    <span className="text-xl font-bold text-gray-900">{formatTime(timer)}</span>
                                ) : (
                                    <div className="flex items-center space-x-1">
                                        <TimerIcon size={24} className="text-gray-900 my-1" />
                                    </div>
                                )}
                                <button
                                    onClick={() => setIsTimerVisible(prev => !prev)}
                                    className="px-2 py-0.5 text-xs text-gray-700 rounded-2xl border hover:bg-gray-50 transition-colors cursor-pointer"
                                    title={isTimerVisible ? "Hide Timer" : "Show Timer"}
                                >
                                    {isTimerVisible ? "Hide" : "Show"}
                                </button>
                            </div>
                        )}

                        {/* 🟡 MODIFIED: 3. RIGHT COLUMN (Icons) */}
                        <div className="flex items-center space-x-6 col-span-1 justify-end mt-3">
                        {isMathModule ? (
                            <>
                                {/* Show Calculator & Reference for Math */}
                                <div className="flex flex-col items-center space-y-1">
                                    <Calculator
                                        size={24}
                                        onClick={handleCalculatorToggle}
                                        className={`text-gray-900 ${testSection === "no-calculator" ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:text-gray-800"}`}
                                        title={testSection === "no-calculator" ? "Disabled" : "Calculator"}
                                    />
                                    <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Calculator</span>
                                </div>

                                <div className="flex flex-col items-center space-y-1">
                                    <Book
                                        size={24}
                                        onClick={handleReferenceToggle}
                                        className="text-gray-900 cursor-pointer hover:text-gray-800"
                                        title="Reference"
                                    />
                                    <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Reference</span>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Show Highlights & Notes for Reading/Writing OR "None of the above" */}
                                <div className="flex flex-col items-center space-y-1">
                                    <button
                                        onClick={() => {
                                            setIsHighlightModeActive(prev => !prev);
                                            setIsUnmarkModeActive(false);
                                        }}
                                        className={`p-1.5 rounded-full cursor-pointer ${isHighlightModeActive ? 'bg-indigo-200' : 'hover:bg-gray-200'}`}
                                        title="Highlight"
                                    >
                                        <HighlighterIcon size={22} className={isHighlightModeActive ? "text-indigo-700" : "text-gray-900"} />
                                    </button>
                                    <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Highlight</span>
                                </div>

                                <div className="flex flex-col items-center space-y-1">
                                    <button
                                        onClick={() => setShowSidebar(prev => !prev)}
                                        className={`p-1.5 rounded-full cursor-pointer ${showSidebar ? 'bg-green-200' : 'hover:bg-gray-200'}`}
                                        title="Notes"
                                    >
                                        <NotebookText size={22} className={showSidebar ? "text-green-700" : "text-gray-900"} />
                                    </button>
                                    <span className="text-xs text-gray-700 font-medium whitespace-nowrap">Notes</span>
                                </div>
                            </>
                        )}

                            {/* MORE/OPTIONS COLUMN (omitted for brevity) */}
                            <div className="relative" ref={optionsMenuRef}>
                                <div className="flex flex-col items-center space-y-1">
                                    <button
                                        onClick={() => setShowOptionsMenu(prev => !prev)}
                                        className="flex items-center justify-center h-6 w-10 p-2 rounded-full text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer"
                                        title="Options"
                                    >
                                        <MoreVertical size={24} className="w-6 h-6" />
                                    </button>
                                    <span className="text-xs text-gray-700 font-medium whitespace-nowrap">
                                        More
                                    </span>
                                </div>

                                {showOptionsMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                        <button
                                            onClick={() => {
                                                setShowOptionsMenu(false);
                                                handleSaveAndExit();
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                        >
                                            Save & Exit
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    <div className="w-full h-0.5 bg-[repeating-linear-gradient(to_right,black_0_35px,transparent_0px_38px)]" />


                    <nav className="bg-blue-900 shadow-md flex items-center justify-center rounded-b-2xl w-[97%] max-w-9xl mx-auto">
                        <p className="text-[14px] tracking-wider text-white font-semibold py-1">
                            THIS IS A PRACTICE TEST
                        </p>
                    </nav>

                    {isReviewMode ? (
                        // --- Review Mode Content (omitted for brevity) ---
                        <main className="container-player flex-1 flex flex-col items-center pt-10 pl-4 bg-gray-50">
                            {/* ... Review Mode JSX (Keep Existing) ... */}
                            <div className='text-center'>
                                <h2 className="text-4xl font-medium text-gray-900 mb-8">Check Your Work</h2>
                                <p className="text-gray-600 font-medium text-md mb-3">
                                    On test day, you won't be able to move on to the next module until time expires.
                                </p>
                                <p className="text-gray-600 font-medium text-md mb-8">
                                    For these practice questions, you can click <span className="font-semibold text-black">Submit</span> when you're ready to move on.
                                </p>
                            </div>
                            <div className=" bg-white rounded-2xl shadow-xl border-gray-300 py-4 w-full max-w-4xl max-h-auto text-center">
                                <div className="space-y-5">
                                    <div className="px-10 py-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                                                {sectionTitle}{" "}
                                                {currentQuizModule?.title ? `: ${currentQuizModule.title}` : ""}
                                            </h1>
                                            <div className="flex items-center space-x-6 text-md font-semibold mr-4">
                                                <div className="flex items-center gap-1">
                                                    <span className="h-4 w-4 border border-dashed border-gray-400 mr-1"></span>
                                                    <span>Unanswered</span>
                                                </div>
                                                <div className="flex items-center text-gray-900 gap-1">
                                                    <Bookmark size={18} fill="currentColor" className="mr-1 text-red-600" />
                                                    <span>For Review</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className='items-center mt-5'>
                                            <hr className="border-t shadow-2xl border-gray-400 w-[800px]" />
                                        </div>
                                        <div className="grid grid-cols-5 md:grid-cols-10 gap-x-2 gap-y-8 max-h-[50vh] overflow-y-auto px-1 py-8">
                                            {questions.map((q, index) => {
                                                const isAnswered = !!userAnswers[q.questionId];
                                                const isMarked = markedForReview.has(q.questionId);
                                                const isActive = index === currentQuestionIndex;

                                                const isDisabled = false;
                                                    
                                                let buttonClass = '';
                                                if (isAnswered) {
                                                    buttonClass = 'bg-blue-800 text-white';
                                                } else {
                                                    buttonClass = 'bg-white text-blue-800 border-2 border-dashed border-gray-400';
                                                }
                                                if (isActive) {
                                                    buttonClass += ' underline';
                                                }

                                                return (
                                                    <div key={q._id} className="relative">
                                                        {isMarked && (
                                                            <div className="absolute -top-2 right-2 text-red-600 z-10 bg-white rounded-sm p-0.5">
                                                                <Bookmark size={16} fill="currentColor" />
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => handleNavigatorClick(index)}
                                                            className={`flex items-center justify-center rounded-sm font-bold text-3xl transition-colors w-12 h-12 ml-3 ${buttonClass}`}
                                                        >
                                                            {index + 1}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>

                    ) : (
                        // 🛑 CRITICAL CHANGE: Main content wrapper now uses Grid for horizontal/sidebar control
                        <div    
                            className={`mx-auto w-full max-w-9xl flex-1 grid ${showSidebar ? 'grid-cols-[1fr_320px]' : 'grid-cols-1'}`}
                        >
                            {/* Main Content Area (Question + Context/Answers) */}
                            <main className="bg-white shadow-lg w-full border border-gray-200 flex-1 flex flex-col">
                                <div className="flex-1 flex flex-col md:flex-row">
                                    {/* Context Panel */}
                                    {currentQuestion?.questionContextHtml && (
                                        <div className="flex-1 p-8 overflow-y-auto border-r border-gray-300">
                                            <div
                                                // ⭐ DOM STABILITY FIX 1: Add key for context container
                                                key={`context-${currentQuestion.questionId}`}
                                                ref={questionContextRef}
                                                onMouseUp={(e) => handleSelection(e, 'questionContext')}
                                                className="prose max-w-full text-gray-800 leading-relaxed font-serif text-lg"
                                                dangerouslySetInnerHTML={{ __html: decodeHtmlHelper(currentQuestion.questionContextHtml) }}
                                            />
                                        </div>
                                    )}
                                    {/* Splitter */}
                                    {currentQuestion?.questionContextHtml && (
                                        // 🛑 RETAINED HORIZONTAL SPLITTER
                                        <div className="w-full h-0.5 bg-gray-400 my-4 md:my-0 md:h-full md:w-0.5" />
                                    )}

                                    {/* Question Text and Answers Area */}
                                    <div className={`p-4 md:p-8 overflow-y-auto flex-1 flex flex-col ${!currentQuestion?.questionContextHtml ? 'items-center' : ''}`}>
                                        <div className={`${currentQuestion?.questionContextHtml ? 'w-full' : 'max-w-3xl w-full'}`}>
                                            
                                            {/* --- 1. Top Bar (Mark for Review, Elimination) --- */}
                                            <div className="flex justify-between items-center p-2 bg-gray-100 mb-4">
                                                <div className="flex items-center space-x-2 md:space-x-5">
                                                    {currentQuestion && (
                                                        <h2 className="text-xl font-bold text-white bg-slate-900 rounded-sm px-2">{currentQuestionIndex + 1}</h2>
                                                    )}
                                                    <button
                                                        onClick={() => handleMarkForReview(currentQuestion.questionId)}
                                                        className="inline-flex items-center space-x-2 cursor-pointer text-gray-700 hover:text-gray-900"
                                                        aria-pressed={markedForReview.has(currentQuestion.questionId)}
                                                    >
                                                        <Bookmark
                                                            size={20}
                                                            className={markedForReview.has(currentQuestion.questionId) ? "text-red-600 fill-red-600" : "text-gray-900"}
                                                        />
                                                        <span className={`text-lg font-serif ${markedForReview.has(currentQuestion.questionId) ? 'underline' : ''}`}>
                                                            Mark for Review
                                                        </span>
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => setIsEliminationFeatureActive(prev => !prev)}
                                                    className={`relative font-semibold text-gray-800 border-2 rounded-lg p-1 cursor-pointer ${isEliminationFeatureActive ? 'bg-gray-200 border-gray-400' : 'bg-gray-100 border-gray-300'}`}
                                                >
                                                    <span className={`${isEliminationFeatureActive ? 'line-through' : ''}`}>
                                                        ABC
                                                    </span>
                                                </button>
                                            </div>
                                            
                                            {/* --- 2. Highlight Mode Instructions and Quick Unmark Button --- */}
                                            {!isMathModule && (isHighlightModeActive || isUnmarkModeActive) && (
                                                <div className={`flex items-center justify-between p-2 mb-4 rounded-md highlight-warning`}>
                                                    <p className='text-sm font-medium'>
                                                        {isUnmarkModeActive
                                                            ? "Select a highlighted portion to Unhighlight it."
                                                            : "Select text to Highlight it (Note popup will follow)."
                                                        }
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            if (isUnmarkModeActive) {
                                                                setIsUnmarkModeActive(false);
                                                                setIsHighlightModeActive(true);
                                                            } else {
                                                                setIsHighlightModeActive(false);
                                                                setIsUnmarkModeActive(true);
                                                            }
                                                        }}
                                                        className={`py-1 px-3 text-sm font-semibold rounded-full transition-colors ${
                                                            isUnmarkModeActive    
                                                                ? 'bg-red-600 text-white hover:bg-red-700'    
                                                                : 'bg-yellow-600 text-gray-900 hover:bg-yellow-700'
                                                        }`}
                                                        title={isUnmarkModeActive ? "Switch back to Highlight Mode" : "Switch to Unhighlight Mode"}
                                                    >
                                                        {isUnmarkModeActive ? 'Highlight Mode' : 'Unhighlight Mode'}
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {/* --- 3. Separator Line --- */}
                                            <div className='flex items-center'>
                                                <div className="w-full h-0.5 bg-[repeating-linear-gradient(to_right,black_0_25px,transparent_0px_28px)] ml-10 mb-6" />
                                            </div>
                                            
                                            {currentQuestion && (
                                                <div className="space-y-6 ml-10">
                                                    {/* 4. QUESTION TEXT PROMPT (HIGHLIGHTABLE AREA) */}
                                                    {/* This is the container that RANGY tracks. It must NOT contain inputs/options. */}
                                                    <div
                                                        key={`question-text-prompt-${currentQuestion.questionId}`}
                                                        ref={questionTextRef}
                                                        onMouseUp={(e) => handleSelection(e, 'questionText')}
                                                        className="text-[18px] font-medium text-gray-900 mb-4 prose max-w-prose font-serif"
                                                        dangerouslySetInnerHTML={{ __html: decodeHtmlHelper(currentQuestion.questionTextHtml) }}
                                                    />

                                                    {/* 5. ANSWER OPTIONS / INPUTS (NON-HIGHLIGHTABLE INTERACTIVE AREA) */}
                                                    
                                                    {/* True/False logic */}
                                                    {currentQuestion.questionType === 'trueFalse' && (
                                                        <div className="space-y-3">
                                                            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-100">
                                                                <input
                                                                    type="radio"
                                                                    name={currentQuestion.questionId}
                                                                    value="true"
                                                                    checked={userAnswers[currentQuestion.questionId] === 'true'}
                                                                    onChange={() => handleAnswerChange(currentQuestion.questionId, 'true')}
                                                                    className="form-radio h-4 w-4 text-indigo-600"
                                                                />
                                                                <span className="ml-3 text-base text-gray-800">True</span>
                                                            </label>
                                                            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-100">
                                                                <input
                                                                    type="radio"
                                                                    name={currentQuestion.questionId}
                                                                    value="false"
                                                                    checked={userAnswers[currentQuestion.questionId] === 'false'}
                                                                    onChange={() => handleAnswerChange(currentQuestion.questionId, 'false')}
                                                                    className="form-radio h-4 w-4 text-indigo-600"
                                                                />
                                                                <span className="ml-3 text-base text-gray-800">False</span>
                                                            </label>
                                                        </div>
                                                    )}

                                                    {/* Multiple Choice logic */}
                                                    {currentQuestion.questionType === 'multipleChoice' && (
                                                        <div className="space-y-3">
                                                            {currentQuestion.optionsSnapshot.map((option, index) => (
                                                                <div
                                                                    key={option.optionTextHtml || index}
                                                                    className={`flex items-center justify-between p-3 border border-gray-300 rounded-lg transition-colors duration-100 ${eliminatedOptions.has(option.optionTextHtml) ? 'bg-gray-50 text-gray-400' : ''}`}
                                                                >
                                                                    <label className="flex flex-grow items-center cursor-pointer font-serif text-[15px]">
                                                                        <input
                                                                            type="radio"
                                                                            name={currentQuestion.questionId}
                                                                            value={option.optionTextHtml}
                                                                            checked={userAnswers[currentQuestion.questionId] === option.optionTextHtml}
                                                                            onChange={() => handleAnswerChange(currentQuestion.questionId, option.optionTextHtml)}
                                                                            className="form-radio h-4 w-4 text-indigo-600"
                                                                        />

                                                                    <div
                                                                        className={`ml-3 text-base flex-grow prose max-w-none ${eliminatedOptions.has(option.optionTextHtml) ? 'line-through' : ''}`}
                                                                        dangerouslySetInnerHTML={{ __html: decodeHtmlHelper(option.optionTextHtml) }}
                                                                    />
                                                                    </label>

                                                                    {isEliminationFeatureActive && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleEliminateOption(option.optionTextHtml)}
                                                                            className="ml-4 p-1 text-gray-500 hover:text-red-500 transition-colors"
                                                                            title="Eliminate Option"
                                                                        >
                                                                            <X size={18} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* 🎯 Short Answer / FIB / Numerical / Essay Logic */}
                                                    {(currentQuestion.questionType === 'shortAnswer' ||
                                                        currentQuestion.questionType === 'fillInTheBlank' ||
                                                        currentQuestion.questionType === 'numerical' ||
                                                        currentQuestion.questionType === 'essay') && renderAnswerInput(currentQuestion)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </main>
                            {/* 🟢 NEW: Annotation Sidebar */}
                            {showSidebar && !isMathModule && (
                                <div className="bg-gray-50 flex-shrink-0">
                                    <AnnotationSidebar
                                        annotations={annotations}
                                        currentQuestionId={currentQuestion?.questionId}
                                        onEditNote={handleEditNoteFromSidebar}
                                        onDeleteHighlight={handleDeleteHighlight}
                                        currentQuestionIndex={currentQuestionIndex}
                                        getHighlightedTextById={getHighlightedTextById}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <div className="w-full h-0.5 bg-[repeating-linear-gradient(to_right,black_0_35px,transparent_0px_38px)]" />
                    <footer className="bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg flex items-center justify-between border-gray-200 py-1.5">
                        <div className="w-44 flex items-center">
                            <span className="text-gray-700 text-md font-primary font-semibold hidden ml-4 sm:inline">{user?.firstName || 'User'}</span>
                            <span className="text-gray-700 text-md font-primary font-semibold hidden ml-2 sm:inline">{user?.lastName || ''}</span>
                        </div>
                        <div className="flex-1 flex justify-center items-center relative">
                            {/* Question Navigator (omitted for brevity) */}
                            {!isReviewMode && currentQuizModule && (
                                currentQuizModule.questionNavigation === 'sequence' ? (
                                    <div className="flex items-center space-x-2 text-md font-bold text-white px-3 py-1 rounded-md bg-gray-900 cursor-default">
                                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowQuestionNavigator(prev => !prev)}
                                        className="flex items-center space-x-2 text-md font-bold text-white px-3 py-1 rounded-md hover:bg-gray-50 transition-colors duration-100 bg-gray-900 cursor-pointer"
                                        title="Jump to Question"
                                    >
                                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                                        {showQuestionNavigator ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                )
                            )}
                            {showQuestionNavigator && currentQuizModule && currentQuizModule.questionNavigation !== 'sequence' && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 z-50 mb-2 w-[32rem] max-w-lg bg-white rounded-lg shadow-xl border border-gray-300 pt-4 font-sans">
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 transform -translate-y-2 rotate-45 w-4 h-4 bg-white border-b border-r border-gray-200" />
                                    <div className="flex items-start">
                                        <h3 className="text-lg font-bold text-gray-900 flex-1 text-center mb-3 ml-4">
                                            {sectionTitle}{" "}
                                            {currentQuizModule?.title ? `: ${currentQuizModule.title}` : ""}
                                        </h3>
                                        <button
                                            onClick={() => setShowQuestionNavigator(false)}
                                            className="text-gray-400 hover:text-gray-700 transition-colors duration-200 mr-5"
                                            aria-label="Close"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <div className='items-center ml-6'>
                                        <hr className="border-t border-gray-300 w-[450px]" />
                                    </div>
                                    <div className="flex items-center justify-center space-x-8 my-3 text-sm font-semibold">
                                        <div className="flex items-center space-x-1">
                                            <span className="text-gray-500">
                                                <MapPin size={16} />
                                            </span>
                                            <span>Current</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-4 h-4 border border-dashed border-gray-400"></div>
                                            <span>Unanswered</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-red-600" fill="currentColor">
                                                <Bookmark size={16} />
                                            </span>
                                            <span>For Review</span>
                                        </div>
                                    </div>
                                    <div className='items-center ml-6'>
                                        <hr className="mb-4 border-t border-gray-300 w-[450px]" />
                                    </div>
                                    <div className="grid grid-cols-10 gap-y-5 max-h-[50vh] overflow-y-auto py-6 px-5">
                                        {questions.map((q, index) => {
                                            const isAnswered = !!userAnswers[q.questionId];
                                            const isMarked = markedForReview.has(q.questionId);
                                            const isActive = index === currentQuestionIndex;

                                            const isDisabled = false;

                                            let buttonClass = '';
                                            if (isAnswered) {
                                                buttonClass = 'bg-blue-800 text-white';
                                            } else {
                                                buttonClass = 'bg-white text-blue-800 border-2 border-dashed border-gray-400';
                                            }
                                            if (isActive) {
                                                buttonClass += ' underline';
                                            }
                                            if (isMarked) {
                                                buttonClass += ' relative';
                                            }
                                            buttonClass += ` ${isDisabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`;

                                            return (
                                                <div key={q._id} className="relative">
                                                    {isActive && (
                                                        <div className="absolute -top-4.5 left-1/2 -translate-x-1/3 flex items-center justify-center">
                                                            <MapPin size={16} className="text-gray-700" />
                                                        </div>
                                                    )}
                                                    {isMarked && (
                                                        <div className="absolute -top-2 -right-1 text-red-600 z-10 bg-white rounded-sm p-0.5">
                                                            <Bookmark size={14} fill="currentColor" />
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={isDisabled ? null : () => handleNavigatorClick(index)}
                                                        className={`flex items-center justify-center rounded-sm font-bold text-lg transition-colors w-8 h-8 ml-3 ${buttonClass}`}
                                                        disabled={isDisabled}
                                                    >
                                                        {index + 1}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => {
                                                setIsReviewMode(true);
                                                setShowQuestionNavigator(false);
                                            }}
                                            className="px-4 py-2 border border-indigo-800 text-indigo-800 font-bold rounded-full hover:border-blue-700 transition-colors mb-6 cursor-pointer"
                                        >
                                            Go to Review Page
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end space-x-4 mr-4 w-44">
                            <button
                                onClick={() => {
                                    if (isReviewMode) {
                                        setIsReviewMode(false);
                                        setCurrentQuestionIndex(questions.length - 1);
                                    } else {
                                        handlePrevQuestion();
                                    }
                                }}
                                className={`py-3 my-1 text-white font-primary font-bold px-6 flex rounded-3xl bg-blue-800 hover:bg-blue-900 cursor-pointer text-[14px] ${currentQuestionIndex === 0 && !isReviewMode ? 'hidden' : ''}`}
                            >
                                <span>BACK</span>
                            </button>

                            <button
                                onClick={async () => {
                                    if (isReviewMode) {
                                        if (isLastModule) {
                                            await submitAllPracticeTest();
                                        } else {
                                            await finalizePracticeTestOrNavigate(false, false);
                                        }
                                    } else {
                                        handleNextQuestion();
                                    }
                                }}
                                className="py-3 my-1 text-white font-primary font-bold px-6 flex rounded-3xl bg-blue-800 hover:bg-blue-900 cursor-pointer text-[14px]"
                            >
                                <span>{isLastModule && isReviewMode ? 'SUBMIT' : 'NEXT'}</span>
                            </button>
                        </div>
                    </footer>
                </>
            )}
        </div>
    );
};

export default CoursePracticeTestPlayer;