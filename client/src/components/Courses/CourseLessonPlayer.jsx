import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, Video, Image, FileText, Code, ListCollapse, HelpCircle, UserRound, BarChart2, Clock, Zap, ChevronDown, ChevronUp, ArrowRight, Eye, CheckCheck, X, Calculator, Bookmark, ChevronLeft, ChevronRight, Book, Award, CheckCircle, RefreshCw } from 'lucide-react';
import UserContext from '../UserContext/UserContext';
import { MdPlayCircleOutline } from 'react-icons/md';

// Utility function to shuffle an array (Fisher-Yates algorithm)
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// 🚀 NEW/UPDATED HELPER: Decode HTML Entities (Moved from other file)
const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}


const CourseLessonPlayer = () => {
    const { courseId, moduleId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { hasPermission, isLoggedIn, loading: userLoading, user } = useContext(UserContext);

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isNavigating, setIsNavigating] = useState(false);

    const [activeLessonModule, setActiveLessonModule] = useState(null);
    const [activeContentItem, setActiveContentItem] = useState(null);
    const [activeQuizModule, setActiveQuizModule] = useState(null);
    
    // State for shuffled questions
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    
    // State for shuffled options for the current question
    const [shuffledOptions, setShuffledOptions] = useState([]);
    
    const [currentQuizQuestionIndex, setCurrentQuizQuestionIndex] = useState(0);
    const [userQuizAnswers, setUserQuizAnswers] = useState({});
    const [showQuestionNavigator, setShowQuestionNavigator] = useState(false);
    const [navigatorFilter, setNavigatorFilter] = useState('all');

    const [enrollment, setEnrollment] = useState(null);
    const [quizAttempt, setQuizAttempt] = useState(null);

    const [showDetailedReview, setShowDetailedReview] = useState(false);

    const [showProgressPanel, setShowProgressPanel] = useState(false);

    const [openSections, setOpenSections] = useState(new Set());
    const [openContentAccordions, setOpenContentAccordions] = useState({});

    const [showQuizCompletionMessage, setShowQuizCompletionMessage] = useState(false);
    const [quizCompletionMessage, setQuizCompletionMessage] = useState('');

    const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(true);

    const [isCourseCompleted, setIsCourseCompleted] = useState(false);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const canReadCourse = hasPermission('course:read');
    const canReadLessonContent = hasPermission('lesson_content:read');
    const canReadQuiz = hasPermission('question:read');

    const completedModuleIds = new Set(enrollment?.completedModules?.map(m => m.moduleId.toString()) || []);
    const completedContentIds = new Set(enrollment?.completedContentIds?.map(c => c.toString()) || []);

    const allModules = course?.sections.flatMap(section =>
        section.modules.map(module => ({ ...module, sectionId: section._id, sectionOrder: section.order, sectionTitle: section.sectionTitle }))
    ).sort((a, b) => {
        if (a.sectionOrder !== b.sectionOrder) return a.sectionOrder - b.sectionOrder;
        return a.order - b.order;
    }) || [];

    const currentModuleInAllModulesIndex = allModules.findIndex(m => m._id === moduleId);
    const overallProgress = enrollment?.progressPercentage || 0;

    const sortedContents = activeLessonModule?.contents
        ? [...activeLessonModule.contents].sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
            const typeOrder = { 'video': 1, 'html': 2, 'image': 3, 'document': 4, 'interactive': 5 };
            const typeA = typeOrder[a.contentType] || 99;
            const typeB = typeOrder[b.contentType] || 99;
            if (typeA !== typeB) return typeA - typeB;
            return (a.title || '').localeCompare(b.title || '');
        })
        : [];

    const currentContentIndex = sortedContents.findIndex(item => item?._id === activeContentItem?._id);
    const isLastContentOfCurrentLessonModule = activeLessonModule && currentContentIndex === sortedContents.length - 1;
    const isLastQuizQuestionOfCurrentQuizModule = activeQuizModule && currentQuizQuestionIndex === shuffledQuestions.length - 1;

    const isLastModuleInCourse = currentModuleInAllModulesIndex === allModules.length - 1;
    const isFirstModuleInCourse = currentModuleInAllModulesIndex === 0;

    const getNextPlayableModule = useCallback(() => {
        if (currentModuleInAllModulesIndex < allModules.length - 1) {
            return allModules[currentModuleInAllModulesIndex + 1];
        }
        return null;
    }, [allModules, currentModuleInAllModulesIndex]);

    const sendProgressUpdate = useCallback(async (currentModuleId, contentId = null, updateType = 'content_viewed', quizAttemptId = null) => {
        if (!isLoggedIn || !user || !user.id || !courseId) {
            console.warn("sendProgressUpdate: Pre-check failed (NOT LOGGED IN or MISSING USER ID). Cannot send progress.");
            return;
        }
        console.log(`Sending progress update for module: ${currentModuleId}, content: ${contentId}, type: ${updateType}`);
        try {
            const payload = { courseId, moduleId: currentModuleId, statusUpdate: updateType };
            if (contentId) payload.contentId = contentId;
            if (quizAttemptId) payload.quizAttemptId = quizAttemptId;
            const response = await fetch(`${BACKEND_URL}/enrollments/mark-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setEnrollment(data.data);
                    console.log("Progress update successful:", data.data);
                    return data.data;
                }
            } else {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error("sendProgressUpdate: API call FAILED with status:", response.status, "Error:", errorData);
            }
        } catch (err) {
            console.error("sendProgressUpdate: Error during fetch or response parsing:", err);
        }
        return null;
    }, [BACKEND_URL, courseId, isLoggedIn, user]);

    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    const renderContentPlayer = useCallback((contentItem) => {
        if (!contentItem || !contentItem.contentHtml) {
            return <div className="text-center text-gray-500 py-10">No content selected or available for playback.</div>;
        }

        if (contentItem.contentType === 'video') {
            return (
                <div className="video-responsive">
                    <div className="prose max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: contentItem.contentHtml }} />
                </div>
            );
        }

        return (
            <div className="prose max-w-none text-gray-800 leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: contentItem.contentHtml }} />
            </div>
        );
    }, []);

    const startQuiz = useCallback(async (quizModuleId) => {
        if (!isLoggedIn || !enrollment) {
            console.warn("User not logged in or enrollment not found. Cannot start quiz.");
            return null;
        }
        console.log(`Attempting to start quiz module: ${quizModuleId}`);
        try {
            const payload = {
                quizModuleId: quizModuleId,
                enrollmentId: enrollment._id,
                userId: user._id,
            };

            const response = await fetch(`${BACKEND_URL}/quiz-attempts/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok && data.success) {
                console.log("Quiz started successfully:", data.data);
                return data.data;
            } else {
                console.error("Failed to start quiz:", data.message);
                return null;
            }
        } catch (err) {
            console.error("Error starting quiz:", err);
            return null;
        }
    }, [BACKEND_URL, isLoggedIn, enrollment, user]);

    const fetchCourseAndModuleData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setActiveQuizModule(null);
        setQuizAttempt(null);
        setCurrentQuizQuestionIndex(0);
        setUserQuizAnswers({});
        setShuffledQuestions([]); // Reset state for new fetch
        setShuffledOptions([]); // Reset state for new fetch
        setShowQuizCompletionMessage(false);
        setIsNavigating(false);

        const { contentId } = location.state || {};

        console.log(`Fetching data for courseId: ${courseId}, moduleId: ${moduleId}`);

        try {
            if (!canReadCourse) {
                setError("You do not have permission to view this course or its contents.");
                setLoading(false);
                navigate('/dashboard');
                return;
            }

            const [courseResponse, progressResponse] = await Promise.all([
                fetch(`${BACKEND_URL}/courses/${courseId}`, { headers: { 'Content-Type': 'application/json' }, credentials: 'include' }),
                isLoggedIn && user?.id ? fetch(`${BACKEND_URL}/enrollments/${courseId}`, { headers: { 'Content-Type': 'application/json' }, credentials: 'include' }) : null
            ]);

            const courseData = await courseResponse.json();
            if (!courseResponse.ok || !courseData.success || !courseData.data) {
                throw new Error(courseData.message || `Failed to retrieve course details.`);
            }
            setCourse(courseData.data);
            const fetchedCourse = courseData.data;

            let updatedEnrollment = null;
            if (progressResponse && progressResponse.ok) {
                const progressData = await progressResponse.json();
                if (progressData.success && progressData.data) {
                    updatedEnrollment = progressData.data;
                    setEnrollment(updatedEnrollment);
                }
            } else {
                console.warn("Failed to fetch user progress. Proceeding without it.");
            }

            let foundModule = null;
            for (const section of fetchedCourse.sections || []) {
                foundModule = (section.modules || []).find(m => m._id === moduleId);
                if (foundModule) {
                    setOpenSections(prev => new Set(prev).add(section._id));
                    break;
                }
            }

            if (!foundModule) {
                setError("Module not found in this course.");
                setLoading(false);
                navigate(`/courses/${courseId}`);
                return;
            }

            const isSATCourseFetched = fetchedCourse.category?.name === 'SAT';

            if (foundModule.moduleType === 'lesson') {
                if (!canReadLessonContent) {
                    setError("You do not have permission to view lesson content.");
                    setLoading(false);
                    return;
                }
                setActiveLessonModule(foundModule);
                setActiveQuizModule(null);
                
                const currentModuleSortedContents = (foundModule.contents || []).sort((a, b) => {
                    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
                    const typeOrder = { 'video': 1, 'html': 2, 'image': 3, 'document': 4, 'interactive': 5 };
                    const typeA = typeOrder[a.contentType] || 99;
                    const typeB = typeOrder[b.contentType] || 99;
                    if (typeA !== typeB) return typeA - typeB;
                    return (a.title || '').localeCompare(b.title || '');
                });

                if (currentModuleSortedContents.length > 0) {
                    let initialContent = null;
                    if (contentId) {
                        initialContent = currentModuleSortedContents.find(content => content._id === contentId);
                    }
                    if (!initialContent) {
                        initialContent = currentModuleSortedContents[0];
                    }

                    setActiveContentItem(initialContent);
                    setOpenContentAccordions({ [foundModule._id]: true });
                    const isInitialContentCompleted = updatedEnrollment?.completedContentIds?.includes(initialContent._id);
                    if (!isInitialContentCompleted) {
                        await sendProgressUpdate(foundModule._id, initialContent._id, 'content_viewed');
                    }
                } else {
                    setActiveContentItem({ _id: 'no-content', title: 'No Content Available', contentHtml: '<p>This lesson module has no content defined.</p>', contentType: 'html' });
                    setOpenContentAccordions({ [foundModule._id]: true });
                }

            } else if (foundModule.moduleType === 'quiz') {
                if (!canReadQuiz) {
                    setError("You do not have permission to start this quiz.");
                    setLoading(false);
                    return;
                }

                if (isSATCourseFetched) {
                    setLoading(false);
                    navigate(`/courses/${courseId}/test/${foundModule._id}`);
                    return;
                } else {
                    setActiveQuizModule(foundModule);
                    setActiveLessonModule(null);
                    setActiveContentItem(null);
                    setOpenContentAccordions({});
                    
                    let questionsToStore = foundModule.questions || [];
                    
                    // FIX: Shuffle questions ONCE when the quiz is loaded
                    if (foundModule.questionShuffle) {
                        questionsToStore = shuffleArray(questionsToStore);
                    }
                    
                    setShuffledQuestions(questionsToStore); // Store the (potentially) shuffled questions in state
                    setCurrentQuizQuestionIndex(0);
                    setUserQuizAnswers({});
                }
            } else {
                setError("Module type is unknown or not supported for playback here.");
            }
        } catch (err) {
            console.error("Error fetching course and module data:", err);
            setError(err.message || "Failed to load course content. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [courseId, moduleId, BACKEND_URL, canReadCourse, canReadLessonContent, canReadQuiz, navigate, isLoggedIn, user, sendProgressUpdate, location.state]);

    // New useEffect to handle shuffling options for the current question
    useEffect(() => {
        if (activeQuizModule && shuffledQuestions.length > 0) {
            const currentQuestion = shuffledQuestions[currentQuizQuestionIndex]?.question;
            if (currentQuestion) {
                // Check if options should be shuffled based on quiz settings
                if (activeQuizModule.shuffleOptions) {
                    // CRITICAL FIX: Only shuffle if questionType is multipleChoice
                    if (currentQuestion.questionType === 'multipleChoice') {
                         setShuffledOptions(shuffleArray(currentQuestion.options || []));
                    } else {
                        setShuffledOptions(currentQuestion.options || []);
                    }
                } else {
                    setShuffledOptions(currentQuestion.options || []);
                }
            }
        }
    }, [currentQuizQuestionIndex, shuffledQuestions, activeQuizModule]);

    const handleContentItemClick = useCallback(async (contentItem) => {
        console.log(`Navigating to content: ${contentItem.title}`);
        setActiveContentItem(contentItem);
        if (contentItem && activeLessonModule && contentItem._id) {
            await sendProgressUpdate(activeLessonModule._id, contentItem._id, 'content_viewed');
            navigate(`/courses/${courseId}/play/${activeLessonModule._id}`, { state: { contentId: contentItem._id } });
        }
    }, [activeLessonModule, sendProgressUpdate, navigate, courseId]);

    const toggleSection = useCallback((sectionIdToToggle) => {
        console.log(`Toggling section: ${sectionIdToToggle}`);
        setOpenSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionIdToToggle)) {
                newSet.delete(sectionIdToToggle);
            } else {
                newSet.add(sectionIdToToggle);
            }
            return newSet;
        });
    }, []);

    const toggleContentAccordion = (moduleId) => {
        console.log(`Toggling content accordion for module: ${moduleId}`);
        setOpenContentAccordions(prev => ({
            ...prev,
            [moduleId]: !prev[moduleId]
        }));
    };
    
    const handleFinishCourse = useCallback(() => {
        console.log("handleFinishCourse called. All modules are complete.");
        setIsCourseCompleted(true);
        setQuizAttempt(null);
        console.log("Course completion message state set.");
    }, []);

    const handlePrevNextContent = useCallback(async (direction) => {
        console.log(`Navigating to ${direction} content/module.`);
        if (!course || !moduleId) {
            console.error("No course or module ID available for navigation.");
            return;
        }
        
        setIsNavigating(true);

        const sortedSections = [...course.sections].sort((a, b) => a.order - b.order);
        let currentSectionIndex = -1;
        let currentModuleIndex = -1;
        let sortedModulesInCurrentSection = [];

        for (let i = 0; i < sortedSections.length; i++) {
            sortedModulesInCurrentSection = [...(sortedSections[i].modules || [])].sort((a, b) => a.order - b.order);
            const foundModuleIndex = sortedModulesInCurrentSection.findIndex(m => m._id === moduleId);
            if (foundModuleIndex !== -1) {
                currentSectionIndex = i;
                currentModuleIndex = foundModuleIndex;
                break;
            }
        }

        if (currentSectionIndex === -1 || currentModuleIndex === -1) {
            console.error("Current module or section not found.");
            setIsNavigating(false);
            return;
        }

        const currentModuleObj = sortedModulesInCurrentSection[currentModuleIndex];

        if (currentModuleObj.moduleType === 'lesson') {
            const currentModuleContents = currentModuleObj.contents ? [...currentModuleObj.contents].sort((a, b) => a.order - b.order) : [];
            const currentContentIndexInModule = currentModuleContents.findIndex(item => item?._id === activeContentItem?._id);

            if (direction === 'next') {
                if (currentContentIndexInModule < currentModuleContents.length - 1) {
                    const nextContent = currentModuleContents[currentContentIndexInModule + 1];
                    setActiveContentItem(nextContent);
                    if (nextContent?._id && currentModuleObj?._id) {
                        await sendProgressUpdate(currentModuleObj._id, nextContent._id, 'content_viewed');
                    }
                    navigate(`/courses/${courseId}/play/${currentModuleObj._id}`, { state: { contentId: nextContent._id } });
                } else {
                    const updatedEnrollment = await sendProgressUpdate(currentModuleObj._id, activeContentItem._id, 'module_completed');
                    
                    if (currentModuleIndex < sortedModulesInCurrentSection.length - 1) {
                        const nextModule = sortedModulesInCurrentSection[currentModuleIndex + 1];
                        navigate(`/courses/${courseId}/play/${nextModule._id}`);
                    } else if (currentSectionIndex < sortedSections.length - 1) {
                        const nextSection = sortedSections[currentSectionIndex + 1];
                        const nextSectionModules = [...(nextSection.modules || [])].sort((a, b) => a.order - b.order);
                        if (nextSectionModules.length > 0) {
                            const nextModule = nextSectionModules[0];
                            navigate(`/courses/${courseId}/play/${nextModule._id}`);
                        } else {
                            navigate(`/courses/${courseId}`);
                        }
                    } else {
                        if (updatedEnrollment?.progressPercentage === 100) {
                            handleFinishCourse();
                        } else {
                            setQuizCompletionMessage("You have not completed all modules. Please finish all lessons and quizzes before marking the course as complete.");
                            setShowQuizCompletionMessage(true);
                        }
                    }
                }
            } else if (direction === 'prev') {
                if (currentContentIndexInModule > 0) {
                    const prevContent = currentModuleContents[currentContentIndexInModule - 1];
                    setActiveContentItem(prevContent);
                    navigate(`/courses/${courseId}/play/${currentModuleObj._id}`, { state: { contentId: prevContent._id } });
                } else if (currentModuleIndex > 0) {
                    const prevModule = sortedModulesInCurrentSection[currentModuleIndex - 1];
                    navigate(`/courses/${courseId}/play/${prevModule._id}`);
                } else if (currentSectionIndex > 0) {
                    const prevSection = sortedSections[currentSectionIndex - 1];
                    const prevSectionModules = [...(prevSection.modules || [])].sort((a, b) => a.order - b.order);
                    if (prevSectionModules.length > 0) {
                        const lastModule = prevSectionModules[prevSectionModules.length - 1];
                        navigate(`/courses/${courseId}/play/${lastModule._id}`);
                    } else {
                        navigate(`/courses/${courseId}`);
                    }
                } else {
                    console.log("Beginning of course content.");
                }
            }
        } else if (currentModuleObj.moduleType === 'quiz') {
            if (direction === 'next') {
                if (currentModuleIndex < sortedModulesInCurrentSection.length - 1) {
                    const nextModule = sortedModulesInCurrentSection[currentModuleIndex + 1];
                    navigate(`/courses/${courseId}/play/${nextModule._id}`);
                } else if (currentSectionIndex < sortedSections.length - 1) {
                    const nextSection = sortedSections[currentSectionIndex + 1];
                    const nextSectionModules = [...(nextSection.modules || [])].sort((a, b) => a.order - b.order);
                    if (nextSectionModules.length > 0) {
                        const nextModule = nextSectionModules[0];
                        navigate(`/courses/${courseId}/play/${nextModule._id}`);
                    } else {
                        navigate(`/courses/${courseId}`);
                    }
                } else {
                    if (overallProgress === 100) {
                        handleFinishCourse();
                    } else {
                        setQuizCompletionMessage("You have not completed all modules. Please finish all lessons and quizzes before marking the course as complete.");
                        setShowQuizCompletionMessage(true);
                    }
                }
            } else if (direction === 'prev') {
                if (currentModuleIndex > 0) {
                    const prevModule = sortedModulesInCurrentSection[currentModuleIndex - 1];
                    navigate(`/courses/${courseId}/play/${prevModule._id}`);
                } else if (currentSectionIndex > 0) {
                    const prevSection = sortedSections[currentSectionIndex - 1];
                    const prevSectionModules = [...(prevSection.modules || [])].sort((a, b) => a.order - b.order);
                    if (prevSectionModules.length > 0) {
                        const lastModule = prevSectionModules[prevSectionModules.length - 1];
                        navigate(`/courses/${courseId}/play/${lastModule._id}`);
                    } else {
                        navigate(`/courses/${courseId}`);
                    }
                } else {
                    console.log("Beginning of course content.");
                }
            }
        }
    }, [course, moduleId, activeContentItem, courseId, navigate, sendProgressUpdate, handleFinishCourse, overallProgress]);

    const currentQuizQuestion = shuffledQuestions[currentQuizQuestionIndex];

    const handleQuizAnswerChange = useCallback(async (questionId, value, questionType) => {
        console.log(`Answer changed for question: ${questionId}, new value: ${value}`);
        setUserQuizAnswers(prev => {
            const newAnswers = { ...prev };
            if (questionType === 'multipleChoice' || questionType === 'trueFalse') {
                // Store booleans for true/false, strings for MC, short answers
                newAnswers[questionId] = (questionType === 'trueFalse' && typeof value === 'string') ? (value === 'true') : value;
            } else if (questionType === 'shortAnswer' || questionType === 'fillInTheBlank') {
                newAnswers[questionId] = value;
            }
            return newAnswers;
        });
    }, []);
    
    const handleSubmitQuiz = useCallback(async () => {
        console.log("Submitting quiz.");
        if (!activeQuizModule || !quizAttempt) {
            console.error("handleSubmitQuiz: Missing activeQuizModule or quizAttempt. Cannot submit.");
            setQuizCompletionMessage("Failed to submit quiz. Please try again.");
            setShowQuizCompletionMessage(true);
            return;
        }

        console.log(`Attempting to submit quiz attempt ID: ${quizAttempt._id}`);

        try {
            const response = await fetch(`${BACKEND_URL}/quiz-attempts/${quizAttempt._id}/submit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userAnswers: userQuizAnswers })
            });

            const data = await response.json();

            if (response.ok && data.success && data.data) {
                setQuizAttempt(data.data);
                console.log("Quiz submission successful:", data.data);

                if (data.data.passed) {
                    const updatedEnrollment = await sendProgressUpdate(activeQuizModule._id, null, 'quiz_completed', quizAttempt._id);
                    
                    if (updatedEnrollment?.progressPercentage === 100) {
                        setQuizCompletionMessage(`You have successfully completed the final quiz!`);
                        setShowQuizCompletionMessage(true);
                    } else {
                        setQuizCompletionMessage(`You have successfully completed the quiz.`);
                        setShowQuizCompletionMessage(true);
                    }
                } else {
                    console.log("Quiz failed. Displaying failure message.");
                    setQuizCompletionMessage(`Consider revisiting the course materials to get a better score on your next attempt.`);
                    setShowQuizCompletionMessage(true);
                }
            } else {
                const errorMessage = data.message || "An unknown error occurred.";
                console.error("Quiz submission failed. API response status:", response.status, "Error:", errorMessage);
                setQuizCompletionMessage(errorMessage);
                setShowQuizCompletionMessage(true);
            }
        } catch (err) {
            console.error("Error during quiz submission:", err);
            setQuizCompletionMessage("An error occurred during quiz submission. Please try again.");
            setShowQuizCompletionMessage(true);
        }
    }, [activeQuizModule, quizAttempt, userQuizAnswers, BACKEND_URL, sendProgressUpdate, handleFinishCourse]);

    const handleNextQuizQuestion = useCallback(() => {
        console.log(`Navigating to next quiz question. Current index: ${currentQuizQuestionIndex}`);
        if (currentQuizQuestionIndex < shuffledQuestions.length - 1) {
            setCurrentQuizQuestionIndex(prev => prev + 1);
        } else {
            console.log("Last quiz question reached. Submitting quiz.");
            handleSubmitQuiz();
        }
    }, [currentQuizQuestionIndex, shuffledQuestions.length, handleSubmitQuiz]);

    const handlePrevQuizQuestion = useCallback(() => {
        console.log(`Navigating to previous quiz question. Current index: ${currentQuizQuestionIndex}`);
        if (currentQuizQuestionIndex > 0) {
            setCurrentQuizQuestionIndex(prev => prev - 1);
        }
    }, [currentQuizQuestionIndex]);

    useEffect(() => {
        if (!userLoading && isLoggedIn && user && enrollment && activeQuizModule && !quizAttempt) {
            console.log("Starting a new quiz attempt...");
            startQuiz(activeQuizModule._id)
                .then(attempt => {
                    if (attempt) {
                        setQuizAttempt(attempt);
                    } else {
                        setError("Failed to start the quiz. Please try again.");
                    }
                })
                .catch(err => {
                    console.error("Error in quiz start effect:", err);
                    setError("An error occurred while starting the quiz.");
                });
        }
    }, [userLoading, isLoggedIn, user, enrollment, activeQuizModule, quizAttempt, startQuiz, setError]);

    useEffect(() => {
        if (!userLoading && isLoggedIn && user && user.id) {
            if (courseId && moduleId) {
                fetchCourseAndModuleData();
            } else {
                setError("Missing course ID or module ID in URL.");
                setLoading(false);
            }
        } else if (!userLoading && !isLoggedIn) {
            console.warn("Please log in to view course content.");
            navigate('/login');
        }
    }, [courseId, moduleId, isLoggedIn, userLoading, fetchCourseAndModuleData, navigate, user]);

    const handleGoToCourseOverview = () => {
        console.log("Navigating back to course overview.");
        setShowQuizCompletionMessage(false);
        navigate(`/courses/${courseId}`);
    };

    const handleProceedToNextModule = () => {
        console.log("Proceeding to the next module.");
        setShowQuizCompletionMessage(false);
        const nextModule = getNextPlayableModule();
        if (nextModule) {
            navigate(`/courses/${courseId}/play/${nextModule._id}`);
        } else {
            console.log("No next module found. Course is complete.");
            navigate(`/courses/${courseId}/complete`);
        }
    };

    const handleRetryQuiz = useCallback(() => {
        console.log("Retrying quiz.");
        setQuizAttempt(null);
        setShowQuizCompletionMessage(false);
        setQuizCompletionMessage('');
        setCurrentQuizQuestionIndex(0);
        setUserQuizAnswers({});
        // Use a key change to force re-fetch and re-render the quiz from scratch
        navigate(location.pathname, { replace: true });
    }, [setQuizAttempt, setShowQuizCompletionMessage, setCurrentQuizQuestionIndex, setUserQuizAnswers, navigate, location.pathname]);

    const checkIfModuleCompleted = (modId) => completedModuleIds.has(modId);
    const checkIfContentCompleted = (contentId) => completedContentIds.has(contentId);

    const getProgressCounts = useCallback(() => {
        let totalUnits = 0;
        let completedUnits = 0;

        const allModules = course?.sections.flatMap(section =>
            section.modules.map(module => ({ ...module, sectionId: section._id, sectionOrder: section.order }))
        ).sort((a, b) => {
            if (a.sectionOrder !== b.sectionOrder) return a.sectionOrder - b.order;
            return a.order - b.order;
        }) || [];

        allModules.forEach(module => {
            if (module.moduleType === 'lesson') {
                const contents = module.contents || [];
                totalUnits += contents.length;

                contents.forEach(content => {
                    if (completedContentIds.has(content._id)) {
                        completedUnits++;
                    }
                });
            } else if (module.moduleType === 'quiz') {
                totalUnits += 1;

                if (completedModuleIds.has(module._id)) {
                    completedUnits++;
                }
            }
        });

        return {
            totalUnits,
            completedUnits
        };
    }, [course, completedContentIds, completedModuleIds]);

    const progressCounts = getProgressCounts();

    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (overallProgress / 100) * circumference;

    if (loading || userLoading || isNavigating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading course content...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-600 mb-6">Error: {error}</p>
                <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Course</span>
                </button>
            </div>
        );
    }

    if (!isLoggedIn) {
        return <div className="p-6 text-center text-red-500">You must be logged in to view this lesson.</div>;
    }

    if (!canReadCourse) {
        return <div className="p-6 text-center text-red-500">Access Denied: You do not have permission to view this course content.</div>;
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-gray-600 mb-6">Course not found.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Courses List</span>
                </button>
            </div>
        );
    }
    
    if (isCourseCompleted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center text-center space-y-6">
                <Award size={100} className="text-yellow-500 mx-auto mb-6 drop-shadow-lg animate-bounce-once" />
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-indigo-700 leading-tight">
                    Congratulations! You've completed the entire course! 🎉
                </h1>
                <p className="text-lg text-gray-800 max-w-2xl mx-auto">
                    You have successfully finished all modules and quizzes. Great job!
                </p>
                <button
                    onClick={handleGoToCourseOverview}
                    className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 text-sm"
                >
                    <span>Back to Course Overview</span>
                    <ArrowRight size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 font-inter relative">
            <nav className="bg-blue-100 text-white p-4 flex items-center justify-between shadow-lg z-40 relative">
                <div className="flex items-center space-x-4">
                    <img src="https://thecareerlab.ph/wp-content/uploads/2024/01/wordpressLogo.png" alt="logo" className="h-8 w-auto bg-white p-1 rounded" />
                    <h1
                        className="text-md underline font-semibold text-gray-900 cursor-pointer hover:text-blue-500 transition-colors duration-200 uppercase"
                        onClick={() => navigate(`/courses/${course._id}`)}
                        title={`Back to ${course.title} Course Overview`}
                    >
                        {course.title}
                    </h1>
                </div>

                <div className="flex items-center space-x-4">
                    {isLoggedIn && (
                        <>
                            <div className="relative">
                                <button
                                    className="flex items-center space-x-2 p-2 rounded-[20px] transition-colors duration-200 hover:bg-amber-50 cursor-pointer"
                                    onClick={() => setShowProgressPanel(!showProgressPanel)}
                                    aria-expanded={showProgressPanel}
                                >
                                    <span className="text-sm font-semibold text-gray-800 underline">Your Progress:</span>
                                    <div className="relative w-12 h-12">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                className="text-gray-300"
                                                strokeWidth="5"
                                                stroke="currentColor"
                                                fill="transparent"
                                                r={radius}
                                                cx="24"
                                                cy="24"
                                            />
                                            <circle
                                                className="text-blue-500 transition-all duration-500 ease-out"
                                                strokeWidth="5"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                                stroke="currentColor"
                                                fill="transparent"
                                                r={radius}
                                                cx="24"
                                                cy="24"
                                            />
                                        </svg>
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                            <Award size={24} className="text-yellow-500" />
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-800">{overallProgress}%</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </nav>

            <div className="flex flex-grow w-full">
                <main className={`flex-grow px-6 py-8 mx-auto max-w-8xl transition-all duration-300
                                ${isRightSidebarExpanded ? 'xl:mr-10' : 'xl:mr-10'}`}>
                    <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 h-full">
                        {showQuizCompletionMessage ? (
                            <div className="bg-white rounded-lg p-1 max-w-3xl w-full h-full min-h-[400px] flex flex-col justify-center items-center text-center space-y-6 mx-auto">
                                {quizAttempt ? (
                                    quizAttempt.passed ? (
                                        <Award size={80} className="text-yellow-500 mx-auto mb-6 drop-shadow-lg animate-bounce-once" />
                                    ) : (
                                        null
                                    )
                                ) : (
                                    <Award size={80} className="text-yellow-500 mx-auto mb-6 drop-shadow-lg animate-bounce-once" />
                                )}

                                <h1 className={`text-3xl sm:text-3xl md:text-5xl font-semibold mb-6 leading-tight ${quizAttempt ? (quizAttempt.passed ? 'text-blue-600' : 'text-slate-900') : 'text-indigo-700'}`}>
                                    {quizAttempt ? (quizAttempt.passed ? 'Quiz Completed!' : 'Quiz Completed.') : 'Course Completed!'}
                                </h1>
                                <p className="text-base sm:text-lg md:text-lg text-gray-900 font-semibold mb-6">{quizCompletionMessage}</p>

                                {quizAttempt && (
                                    <div className="mt-8 pt-8 border-t-2 border-gray-200 w-full text-left">
                                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Quiz Summary</h3>
                                        <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center mb-6 shadow-inner">
                                            <span className="font-semibold text-lg text-gray-700">Your Score:</span>
                                            <span className={`text-2xl font-bold ${quizAttempt.score === quizAttempt.totalPointsPossible ? 'text-blue-600' : 'text-gray-800'}`}>
                                                {quizAttempt.score} / {quizAttempt.totalPointsPossible}
                                            </span>
                                        </div>

                                        {quizAttempt?.questionsAttemptedDetails?.length > 0 && (
                                            <button
                                                onClick={() => setShowDetailedReview(!showDetailedReview)}
                                                className="w-full flex justify-between items-center bg-gray-200 hover:bg-gray-300 p-3 rounded-lg text-gray-700 font-semibold transition-colors duration-200"
                                            >
                                                <span>
                                                    {showDetailedReview ? 'Hide Detailed Review' : 'Show Detailed Review'}
                                                </span>
                                                {showDetailedReview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>
                                        )}

                                        {showDetailedReview && (
                                            <div className="max-h-96 overflow-y-auto space-y-8 mt-6 p-2 rounded-lg border border-gray-200 bg-gray-50">
                                                {quizAttempt.questionsAttemptedDetails.map((detail, index) => (
                                                    <div key={detail.questionId} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="flex-grow">
                                                                <p className="text-md font-bold text-gray-900 mb-2">Question {index + 1}:</p>
                                                                <div
                                                                    className="prose max-w-none text-gray-800"
                                                                    dangerouslySetInnerHTML={{ __html: detail.questionText }}
                                                                />
                                                            </div>
                                                            <span className="ml-4">
                                                                {detail.isCorrect ? (
                                                                    <CheckCheck size={28} className="text-green-500" title="Correct" />
                                                                ) : (
                                                                    <X size={28} className="text-red-500" title="Incorrect" />
                                                                )}
                                                            </span>
                                                        </div>

                                                        <div className="mt-4 border-t border-gray-100 pt-4">
                                                            <p className="text-sm font-semibold text-gray-600 mb-1">Your Answer:</p>
                                                            <p
                                                                className={`text-base font-medium p-3 rounded-md ${
                                                                    detail.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                                }`}
                                                            >
                                                                {detail.userAnswer || 'No Answer Provided'}
                                                            </p>
                                                        </div>

                                                        {!detail.isCorrect && (
                                                            <div className="mt-4">
                                                                <p className="text-sm font-semibold text-gray-600 mb-1">Correct Answer:</p>
                                                                <p className="text-base font-medium bg-green-50 p-3 rounded-md text-green-700">
                                                                    {detail.correctAnswerSnapshot}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 gap-6 mt-8">
                                    <button
                                        onClick={handleGoToCourseOverview}
                                        className="px-6 py-3 btn-cancel"
                                    >
                                        Back to Course
                                    </button>
                                    {quizAttempt?.passed && getNextPlayableModule() && (
                                        <button
                                            onClick={handleProceedToNextModule}
                                            className="px-6 py-3 btn-quiz-next"
                                        >
                                            Continue to Next Module
                                        </button>
                                    )}
                                    {quizAttempt?.passed && overallProgress === 100 && !getNextPlayableModule() && (
                                        <button
                                            onClick={handleFinishCourse}
                                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 text-sm"
                                        >
                                            <span>Finish Course</span>
                                            <CheckCheck size={16} />
                                        </button>
                                    )}
                                    {quizAttempt && !quizAttempt.passed && (quizAttempt.quizModuleSettingsSnapshot.maxAttempts === -1 || quizAttempt.quizModuleSettingsSnapshot.maxAttempts > 1) && (
                                        <>
                                            <button
                                                onClick={handleRetryQuiz}
                                                className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 flex items-center space-x-2 text-sm"
                                            >
                                                <span>Retry Quiz</span>
                                                <RefreshCw size={16} />
                                            </button>
                                            {getNextPlayableModule() && (
                                                <button
                                                    onClick={handleProceedToNextModule}
                                                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center space-x-2 text-sm"
                                                >
                                                    <span>Skip Quiz</span>
                                                    <ArrowRight size={16} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {activeLessonModule ? (
                                    <>
                                        <div className="bg-white p-6 rounded-lg shadow-inner border border-gray-200">
                                            {activeContentItem ? renderContentPlayer(activeContentItem) : (
                                                <p className="text-gray-600 text-center py-10">No content selected for playback.</p>
                                            )}
                                            {activeContentItem?.description && (
                                                <p className="text-gray-600 mt-4 italic text-sm">{activeContentItem.description}</p>
                                            )}
                                        </div>

                                        <footer className="bg-white p-4 flex items-center justify-between mt-6 rounded-lg shadow-sm border border-gray-200">
                                            <button
                                                onClick={() => handlePrevNextContent('prev')}
                                                disabled={isFirstModuleInCourse}
                                                className="px-4 py-2 flex items-center space-x-2 rounded-lg transition-colors duration-200 bg-blue-700 text-white hover:bg-yellow-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft size={20} />
                                                <span>Prev Content</span>
                                            </button>
                                            <button
                                                onClick={() => handlePrevNextContent('next')}
                                                disabled={(isLastContentOfCurrentLessonModule && isLastModuleInCourse) || showQuizCompletionMessage || (activeLessonModule && !activeContentItem)}
                                                className="px-4 py-2 flex items-center space-x-2 rounded-lg transition-colors duration-200 bg-blue-700 text-white hover:bg-yellow-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span>Next Content</span>
                                                <ArrowRight size={16} />
                                            </button>
                                        </footer>

                                        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mt-6">
                                            <h3 className="text-3xl font-bold text-gray-800 mb-3">
                                                {activeLessonModule?.title || 'Untitled Lesson'}
                                            </h3>
                                            {activeLessonModule?.description && (
                                                <p className="text-gray-600 text-base mb-4 font-secondary font-medium">{activeLessonModule.description}</p>
                                            )}
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mt-6 border border-gray-200">
                                            <h3 className="text-3xl font-bold text-gray-800 mb-2">
                                                {course.title || 'Untitled Course'}
                                            </h3>

                                            {course.description && (
                                                <p className="text-gray-600 text-base mb-4 font-secondary font-medium">
                                                    {getCleanPlainText(course.description)}
                                                </p>
                                            )}

                                            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 capitalize">

                                                <span className="flex items-center">
                                                    <BookOpen size={16} className="mr-1 text-purple-500" />
                                                    <span>Type: <span className="font-bold text-indigo-600">{course.contentType?.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'N/A'}</span></span>
                                                </span>

                                                <span className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                                                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                        className="lucide lucide-tag text-purple-500 mr-1">
                                                        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414L12.586 22a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828L12.586 2.586Z" />
                                                        <path d="M7 7h.01" />
                                                    </svg>
                                                    Category:
                                                    <span className="font-bold text-blue-600 ml-1">
                                                        {course?.category?.name || 'Uncategorized'}
                                                    </span>
                                                </span>

                                                {course.difficulty && (
                                                    <span className="flex items-center">
                                                        <BarChart2 size={16} className="mr-1 text-blue-500" />
                                                        Difficulty: {course.difficulty}
                                                    </span>
                                                )}

                                                {course.updatedAt && (
                                                    <span className="flex items-center">
                                                        <Clock size={16} className="mr-1 text-yellow-500" />
                                                        Last Updated on: {new Date(course.updatedAt).toLocaleDateString()}
                                                    </span>
                                                )}

                                            </div>
                                        </div>
                                    </>
                                ) : activeQuizModule ? (
                                    <>
                                        <div className="bg-white p-8 md:p-12 w-full border border-gray-200">
                                            <div className="flex justify-between items-center mb-6">
                                                <h2 className="text-2xl font-bold text-gray-800">
                                                    {activeQuizModule.title || 'Untitled Quiz'}
                                                </h2>
                                                <span className="xl text-xl font-semibold text-indigo-600">
                                                    Question {currentQuizQuestionIndex + 1} / {shuffledQuestions.length}
                                                </span>
                                            </div>
                                            {currentQuizQuestion ? (
                                                <div className="space-y-6 w-full md:max-w-3xl xl:max-w-4xl mx-auto">
                                                    <div className="w-full flex flex-col items-center">
                                                        <p className="text-md font-semibold text-gray-700 mb-4 w-full text-left">
                                                            Question {currentQuizQuestionIndex + 1}:
                                                        </p>
                                                        {currentQuizQuestion.question?.questionTextHtml ? (
                                                            // FIX: Ensure question text is decoded/rendered as HTML
                                                            <div className="text-lg font-medium text-gray-900 mb-4 w-full text-left prose max-w-none"
                                                                dangerouslySetInnerHTML={{ __html: decodeHtml(currentQuizQuestion.question.questionTextHtml) }}
                                                            />
                                                        ) : (
                                                            <p className="text-lg font-medium text-red-500 mb-4 w-full text-left">
                                                                No question text found.
                                                            </p>
                                                        )}
                                                    </div>
                                                    {currentQuizQuestion.question?.questionType === 'multipleChoice' && (
                                                        <div className="space-y-3 flex flex-col items-center w-full">
                                                            {shuffledOptions.map((option, index) => (
                                                                // CRITICAL FIX: Use a div + dangerouslySetInnerHTML for option text
                                                                <label key={option.optionTextRaw || index} className={`flex items-start p-3 cursor-pointer w-full transition-colors duration-100 border border-gray-300 rounded-lg text-gray-800
                                                                    ${userQuizAnswers[currentQuizQuestion.question._id] === option.optionTextRaw ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'hover:bg-gray-100'}`}>
                                                                    <input
                                                                        type="radio"
                                                                        name={currentQuizQuestion.question._id}
                                                                        // Use optionTextRaw for the value as it's the stable identifier
                                                                        value={option.optionTextRaw} 
                                                                        checked={userQuizAnswers[currentQuizQuestion.question._id] === option.optionTextRaw}
                                                                        onChange={() => handleQuizAnswerChange(currentQuizQuestion.question._id, option.optionTextRaw, 'multipleChoice')}
                                                                        className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500 mt-1"
                                                                    />
                                                                    {/* RENDER DECODED HTML FOR OPTION */}
                                                                    <div 
                                                                        className="ml-3 text-base prose max-w-none flex-grow"
                                                                        dangerouslySetInnerHTML={{ __html: decodeHtml(option.optionTextHtml || option.optionTextRaw) }} 
                                                                    />
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {currentQuizQuestion.question?.questionType === 'trueFalse' && (
                                                        <div className="space-y-3 flex flex-col items-center w-full">
                                                            <label className={`flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer transition-colors duration-100 text-gray-800 w-full
                                                                ${userQuizAnswers[currentQuizQuestion.question._id] === true ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'hover:bg-gray-100'}`}>
                                                                <input
                                                                    type="radio"
                                                                    name={currentQuizQuestion.question._id}
                                                                    value="true"
                                                                    checked={userQuizAnswers[currentQuizQuestion.question._id] === true}
                                                                    onChange={() => handleQuizAnswerChange(currentQuizQuestion.question._id, true, 'trueFalse')}
                                                                    className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span className="ml-3 text-base">True</span>
                                                            </label>
                                                            <label className={`flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer transition-colors duration-100 text-gray-800 w-full
                                                                ${userQuizAnswers[currentQuizQuestion.question._id] === false ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'hover:bg-gray-100'}`}>
                                                                <input
                                                                    type="radio"
                                                                    name={currentQuizQuestion.question._id}
                                                                    value="false"
                                                                    checked={userQuizAnswers[currentQuizQuestion.question._id] === false}
                                                                    onChange={() => handleQuizAnswerChange(currentQuizQuestion.question._id, false, 'trueFalse')}
                                                                    className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span className="ml-3 text-base">False</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                    {currentQuizQuestion.question?.questionType === 'shortAnswer' && (
                                                        <div className="flex flex-col items-center w-full">
                                                            <label htmlFor={`answer-${currentQuizQuestion.question._id}`} className="sr-only">Your Answer</label>
                                                            <input
                                                                type="text"
                                                                id={`answer-${currentQuizQuestion.question._id}`}
                                                                value={userQuizAnswers[currentQuizQuestion.question._id] || ''}
                                                                onChange={(e) => handleQuizAnswerChange(currentQuizQuestion.question._id, e.target.value, 'shortAnswer')}
                                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-left"
                                                                placeholder="Type your answer here..."
                                                            />
                                                        </div>
                                                    )}
                                                    {currentQuizQuestion.question?.questionType === 'fillInTheBlank' && (
                                                        <div className="flex flex-col items-center w-full">
                                                            <label htmlFor={`blank-answer-${currentQuizQuestion.question._id}`} className="sr-only">Fill in the blank</label>
                                                            <input
                                                                type="text"
                                                                id={`blank-answer-${currentQuizQuestion.question._id}`}
                                                                value={userQuizAnswers[currentQuizQuestion.question._id] || ''}
                                                                onChange={(e) => handleQuizAnswerChange(currentQuizQuestion.question._id, e.target.value, 'fillInTheBlank')}
                                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-left"
                                                                placeholder="Fill in the blank..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-500 py-10">No questions found for this quiz module.</div>
                                            )}
                                        </div>

                                        <div className="bg-white p-4 flex items-center justify-between mt-6 rounded-lg shadow-sm border border-gray-200 px-7">
                                            <button
                                                onClick={handlePrevQuizQuestion}
                                                disabled={currentQuizQuestionIndex === 0}
                                                className="px-4 py-2 flex items-center gap-2 rounded-lg transition-colors duration-200 bg-blue-700 text-white hover:bg-yellow-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft size={20} />
                                                <span>Previous Question</span>
                                            </button>
                                            <button
                                                onClick={handleNextQuizQuestion}
                                                className="px-4 py-2 rounded-lg flex gap-2 transition-colors duration-200 bg-blue-700 text-white hover:bg-yellow-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span>{currentQuizQuestionIndex === shuffledQuestions.length - 1 ? 'Submit Quiz' : 'Next Question'}</span>
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mt-6">
                                            <h3 className="text-3xl font-bold text-gray-800 mb-3">
                                                {activeQuizModule?.title || 'Untitled Lesson'}
                                            </h3>
                                            {activeQuizModule?.description && (
                                                <p className="text-gray-600 text-base mb-4 font-secondary font-medium">{activeQuizModule.description}</p>
                                            )}
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mt-6 border border-gray-200">
                                            <h3 className="text-3xl font-bold text-gray-800 mb-2">
                                                {course.title || 'Untitled Course'}
                                            </h3>

                                            {course.description && (
                                                <p className="text-gray-600 text-base mb-4 font-secondary font-medium">
                                                    {getCleanPlainText(course.description)}
                                                </p>
                                            )}

                                            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 capitalize">

                                                <span className="flex items-center">
                                                    <BookOpen size={16} className="mr-1 text-purple-500" />
                                                    <span>Type: <span className="font-bold text-indigo-600">{course.contentType?.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'N/A'}</span></span>
                                                </span>

                                                <span className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                                                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                        className="lucide lucide-tag text-purple-500 mr-1">
                                                        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414L12.586 22a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828L12.586 2.586Z" />
                                                        <path d="M7 7h.01" />
                                                    </svg>
                                                    Category:
                                                    <span className="font-bold text-blue-600 ml-1">
                                                        {course?.category?.name || 'Uncategorized'}
                                                    </span>
                                                </span>

                                                {course.difficulty && (
                                                    <span className="flex items-center">
                                                        <BarChart2 size={16} className="mr-1 text-blue-500" />
                                                        Difficulty: {course.difficulty}
                                                    </span>
                                                )}

                                                {course.updatedAt && (
                                                    <span className="flex items-center">
                                                        <Clock size={16} className="mr-1 text-yellow-500" />
                                                        Last Updated on: {new Date(course.updatedAt).toLocaleDateString()}
                                                    </span>
                                                )}

                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-gray-500 py-10">
                                        No lesson or quiz module is currently active or supported for direct playback here.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>

                <div className={`
                    bg-gray-50 rounded-lg shadow-md border-t-4 border-purple-500
                    overflow-y-auto max-h-[calc(100vh-80px)]
                    flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out
                    fixed inset-y-0 right-0 w-80 z-50 xl:static
                    xl:translate-x-0 xl:top-20 xl:h-[calc(100vh-80px)]
                    ${isRightSidebarExpanded ? 'xl:w-120 p-6' : 'xl:w-20 p-2'}`}
                >
                    <div className={`flex items-center ${isRightSidebarExpanded ? 'justify-between' : 'justify-center'} mb-6 pb-4 border-b border-gray-200`}>
                        {isRightSidebarExpanded && <h3 className="text-2xl font-semibold text-gray-800">Course Outline</h3>}
                        <button
                            onClick={() => setIsRightSidebarExpanded(!isRightSidebarExpanded)}
                            className="p-2 rounded-full text-gray-800 hover:bg-gray-200 transition-colors duration-200"
                            aria-label={isRightSidebarExpanded ? "Collapse Course Outline" : "Expand Course Outline"}
                        >
                            {isRightSidebarExpanded ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
                        </button>
                    </div>

                    {course && isRightSidebarExpanded && (
                        <div className="flex items-center space-x-4 mb-4">
                            <button
                                onClick={() => handlePrevNextContent('prev')}
                                disabled={isFirstModuleInCourse}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2 text-sm"
                            >
                                <ArrowLeft size={16} />
                                <span>Prev</span>
                            </button>

                            {overallProgress === 100 ? (
                                <button
                                    onClick={handleFinishCourse}
                                    disabled={
                                        showQuizCompletionMessage ||
                                        (isLastModuleInCourse && activeQuizModule && !quizAttempt) ||
                                        (isLastModuleInCourse && activeLessonModule && !isLastContentOfCurrentLessonModule)
                                    }
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 text-sm"
                                >
                                    <span>Finish</span>
                                    <CheckCheck size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handlePrevNextContent('next')}
                                    disabled={isLastModuleInCourse || showQuizCompletionMessage || (activeLessonModule && !activeContentItem)}
                                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2 text-sm"
                                >
                                    <span>Next</span>
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    {course.sections && course.sections.length > 0 ? (
                        <div className="space-y-4 flex-grow">
                            {course.sections
                                .sort((a, b) => a.order - b.order)
                                .map((section) => {
                                    const isSectionOpen = openSections.has(section._id);
                                    const moduleCount = section.modules?.length || 0;
                                    const contentCount = section.modules?.reduce((total, module) => total + (module.contents?.length || 0), 0) || 0;
                                    return (
                                        <div key={section._id} className="rounded-lg border border-gray-200 overflow-hidden">
                                            <button
                                                onClick={() => toggleSection(section._id)}
                                                className={`flex justify-between items-center w-full p-4 text-[15px] font-semibold text-left transition-colors duration-200 ${
                                                    isSectionOpen ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {isRightSidebarExpanded ? (
                                                    <span className="flex-grow flex justify-between items-center pr-2">
                                                        <span className="flex items-center space-x-2">
                                                            <ListCollapse size={20} />
                                                            <span>{section.order}. {section.sectionTitle}</span>
                                                        </span>
                                                        <span className="text-sm font-normal text-gray-600">
                                                            ({moduleCount} modules, {contentCount} contents)
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center space-x-2 justify-center w-full">
                                                        <ListCollapse size={20} />
                                                    </span>
                                                )}
                                                {isRightSidebarExpanded && (isSectionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />)}
                                            </button>

                                            {isSectionOpen && isRightSidebarExpanded && section.modules && section.modules.length > 0 && (
                                                <ul className="bg-white py-2 px-4 space-y-1">
                                                    {section.modules
                                                        .sort((a, b) => a.order - b.order)
                                                        .map((moduleItem, index) => {
                                                            const isCompleted = checkIfModuleCompleted(moduleItem._id);
                                                            const isContentAccordionOpen = openContentAccordions[moduleItem._id];
                                                            const isCurrentModule = moduleId === moduleItem._id;
                                                            return (
                                                                <li key={moduleItem._id}>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            if (moduleItem.moduleType === 'lesson') {
                                                                                toggleContentAccordion(moduleItem._id);
                                                                            } else {
                                                                                navigate(`/courses/${courseId}/play/${moduleItem._id}`);
                                                                            }
                                                                        }}
                                                                        className={`font-medium flex items-center space-x-2 py-1 px-2 rounded-md w-full text-left cursor-pointer transition-colors duration-100
                                                                            ${(isCurrentModule && activeLessonModule) ? 'bg-blue-100 text-blue-800' :
                                                                                (isCurrentModule && activeQuizModule) ? 'bg-orange-100 text-orange-800' : 'text-gray-800 hover:bg-gray-200'}`}
                                                                        title={isRightSidebarExpanded ? (moduleItem.title || 'Untitled Module') : ''}
                                                                    >
                                                                        <span className="flex items-center space-x-2">
                                                                            {moduleItem.moduleType === 'lesson' ? (<BookOpen size={16} className="text-green-600" />) : (<Zap size={16} className="text-orange-600" />)}
                                                                            {isRightSidebarExpanded && <span>{index + 1}. {moduleItem.title || 'Untitled Module'}</span>}
                                                                        </span>
                                                                        {isRightSidebarExpanded && (
                                                                            <span className="flex items-center space-x-2">
                                                                                {isCompleted && <CheckCircle size={16} className="text-green-500" title="Completed" />}
                                                                                {moduleItem.moduleType === 'lesson' && (isContentAccordionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />)}
                                                                            </span>
                                                                        )}
                                                                    </button>

                                                                    {isContentAccordionOpen && moduleItem.moduleType === 'lesson' && moduleItem.contents && (
                                                                        <ul className="ml-8 mt-2 space-y-1 text-gray-600 text-sm">
                                                                            {moduleItem.contents
                                                                                .sort((a,b) => a.order - b.order)
                                                                                .map((contentItem) => {
                                                                                    const isContentCompleted = checkIfContentCompleted(contentItem._id);
                                                                                    return (
                                                                                        <li key={contentItem._id}>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.preventDefault();
                                                                                                    e.stopPropagation();
                                                                                                    navigate(`/courses/${courseId}/play/${moduleItem._id}`, { state: { contentId: contentItem._id } });
                                                                                                }}
                                                                                                className={`flex items-center space-x-2 w-full text-left p-1 rounded-md transition-colors duration-100
                                                                                                    ${activeContentItem?._id === contentItem._id ? 'bg-blue-200 font-semibold' : 'hover:bg-gray-200'}`}
                                                                                            >
                                                                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>
                                                                                                <span className="flex-grow underline text-left">{contentItem.title}</span>
                                                                                                {isContentCompleted && <CheckCheck size={16} className="text-green-500 ml-auto" />}
                                                                                            </button>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                        </ul>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                </ul>
                                            )}
                                            {isSectionOpen && isRightSidebarExpanded && (!section.modules || section.modules.length === 0) && (
                                                <p className="bg-white py-2 px-4 text-gray-500 text-sm italic">No modules in this section.</p>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center italic mt-10 flex-grow">This course currently has no content sections.</p>
                    )}
                </div>
            </div>

            {showProgressPanel && (
                <div className="absolute top-16 right-24 mt-3 z-[100] p-6 w-72 bg-amber-50 rounded-lg shadow-xl border border-gray-200">
                    <div className="absolute -top-2 right-12 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 z-[-1]" />
                    <div className="flex flex-col items-center justify-center text-center">
                        <p className="text-xl font-bold text-gray-900 mb-1">
                            {progressCounts.completedUnits} of {progressCounts.totalUnits} complete.
                        </p>
                        <p className="text-gray-600 text-sm">
                            Finish all lessons and quizzes to complete the course.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseLessonPlayer;