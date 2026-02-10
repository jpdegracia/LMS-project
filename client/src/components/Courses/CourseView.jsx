import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, BarChart2, CheckCircle, ListCollapse, Play, RotateCcw, Zap, ChevronDown, ChevronUp, List, User as UserIcon, GraduationCap, FileText, Briefcase, CirclePlay, CirclePlayIcon, Timer, Download, Settings } from 'lucide-react';
import UserContext from '../UserContext/UserContext';
import { MdPlayCircleOutline } from 'react-icons/md';

const getFirstModuleInCourse = (course) => {
    if (!course || !course.sections || course.sections.length === 0) return null;
    const sortedSections = course.sections.sort((a, b) => a.order - b.order);
    for (const section of sortedSections) {
        if (section.modules && section.modules.length > 0) {
            return section.modules.sort((a, b) => a.order - b.order)[0];
        }
    }
    return null;
};

const getSectionIdForModule = (course, moduleId) => {
    if (!course || !course.sections || !moduleId) {
        return null;
    }
    const moduleIdString = String(moduleId); 
    for (const section of course.sections) {
        if (section.modules && section.modules.length > 0) {
            const moduleFound = section.modules.some(m => String(m._id) === moduleIdString); 
            if (moduleFound) {
                return section._id;
            }
        }
    }
    return null;
};

const getSectionInfoFromAttempt = (sectionId, fullCourseObject) => {
    if (!sectionId || !fullCourseObject?.sections) {
        return { title: 'Unknown Section', order: 9999 };
    }
    const sectionIdString = sectionId.toString(); 
    const populatedSection = fullCourseObject.sections.find(s => 
        s._id.toString() === sectionIdString
    );
    if (populatedSection) {
        return { 
            title: populatedSection.sectionTitle || 'Untitled Section', 
            order: populatedSection.order 
        }; 
    }
    return { title: 'Unknown Section', order: 9999 };
};


const CourseView = () => {
    const { id: courseId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { hasPermission, isLoggedIn, loading: userLoading, user } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [course, setCourse] = useState(null);
    const [enrollment, setEnrollment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrollmentStatus, setEnrollmentStatus] = useState('loading');
    
    const [unfinishedPracticeTestSectionId, setUnfinishedPracticeTestSectionId] = useState(null);
    const [unfinishedQuizModuleId, setUnfinishedQuizModuleId] = useState(null);
    const [practiceTestAttempts, setPracticeTestAttempts] = useState([]);
    const [unfinishedQuizAttemptId, setUnfinishedQuizAttemptId] = useState(null); 

    const [openModules, setOpenModules] = useState({});
    const [moduleHeights, setModuleHeights] = useState({});
    const [allModulesCollapsed, setAllModulesCollapsed] = useState(false);
    const [error, setError] = useState(null);

    const contentRefs = useRef({});
    const userRef = useRef(user);
    const isLoggedInRef = useRef(isLoggedIn);
    const instructorRef = useRef(null);

    const userHasCourseReadPermission = hasPermission('course:read');
    
    // ✅ ADDED: Permission check for Course Management
    const userCanManageCourse = hasPermission('course:update'); 

    const isUserEnrolled = enrollment && (enrollment.status === 'enrolled' || enrollment.status === 'in-progress' || enrollment.status === 'completed');
    const overallCourseProgress = enrollment?.progressPercentage || 0;
    const isPageLoading = loading || userLoading || enrollmentStatus === 'loading';
    const completedModuleIds = new Set(enrollment?.completedModules?.map(m => m.moduleId.toString()) || []);
    const completedContentIds = new Set(enrollment?.completedContentIds?.map(c => c.toString()) || []);

    const updateLastAccess = useCallback(async () => {
        if (!isLoggedIn || !user || !courseId || !isUserEnrolled) {
            return;
        }
        try {
            const response = await fetch(`${BACKEND_URL}/enrollments/update-last-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ courseId })
            });
            if (!response.ok) {
                console.error('[CourseView Update Access] Failed to update last access time.');
            }
        } catch (err) {
            console.error('[CourseView Update Access] Error updating last access:', err);
        }
    }, [isLoggedIn, user, courseId, isUserEnrolled, BACKEND_URL]);

    const fetchCourseAndEnrollmentData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const courseResponse = await fetch(`${BACKEND_URL}/courses/${courseId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            const courseData = await courseResponse.json();
            if (!courseResponse.ok || !courseData.success || !courseData.data) {
                throw new Error(courseData.message || "Failed to retrieve course details.");
            }
            const fetchedCourse = courseData.data;
            setCourse(fetchedCourse);

            if (isLoggedIn && user?.id) {
                const enrollmentResponse = await fetch(`${BACKEND_URL}/enrollments/course/${courseId}/with-attempts`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                const enrollmentData = await enrollmentResponse.json();
                if (enrollmentResponse.ok && enrollmentData.success && enrollmentData.data) {
                    const fetchedEnrollment = enrollmentData.data;
                    setEnrollment(fetchedEnrollment);
                    setEnrollmentStatus(fetchedEnrollment.status);
                    if (fetchedCourse.contentType === 'practice_test') {
                        if (fetchedEnrollment.practiceTestAttempts) {
                            const sortedCompletedAttempts = fetchedEnrollment.practiceTestAttempts
                                .filter(attempt => 
                                    (attempt.status === 'submitted' || attempt.status === 'graded') && 
                                    typeof attempt.overallScore === 'number' && 
                                    !isNaN(attempt.overallScore)
                                ) 
                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            setPracticeTestAttempts(sortedCompletedAttempts);
                        } else {
                            setPracticeTestAttempts([]);
                        }
                        const rawAttempts = fetchedEnrollment.practiceTestAttempts || [];
                        const latestAttempt = rawAttempts
                            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) 
                            .find(attempt => attempt.status === 'in-progress' || attempt.status === 'partially-graded'); 
                        if (latestAttempt) {
                            const lastActiveModuleId = latestAttempt.lastActiveQuizModuleId;
                            const resumeSectionId = getSectionIdForModule(fetchedCourse, lastActiveModuleId);
                            const resumableStatuses = ['in-progress', 'partially-graded'];
                            const currentQuizAttempt = latestAttempt.quizAttempts?.find(qa => 
                                qa.quizModuleId.toString() === lastActiveModuleId && 
                                resumableStatuses.includes(qa.status)
                            );
                            const currentQuizAttemptId = currentQuizAttempt?._id || null;
                            setUnfinishedPracticeTestSectionId(resumeSectionId);
                            setUnfinishedQuizModuleId(lastActiveModuleId);
                            setUnfinishedQuizAttemptId(currentQuizAttemptId); 
                        } else {
                            setUnfinishedPracticeTestSectionId(null);
                            setUnfinishedQuizModuleId(null);
                            setUnfinishedQuizAttemptId(null); 
                        }
                    } else {
                        setUnfinishedPracticeTestSectionId(null);
                        setUnfinishedQuizModuleId(null);
                        setUnfinishedQuizAttemptId(null); 
                        setPracticeTestAttempts([]); 
                    }
                } else {
                    setEnrollmentStatus('not-enrolled');
                    setEnrollment(null);
                    setUnfinishedQuizAttemptId(null); 
                    setPracticeTestAttempts([]); 
                }
            } else {
                setEnrollmentStatus('not-enrolled');
                setEnrollment(null);
                setUnfinishedQuizAttemptId(null); 
                setPracticeTestAttempts([]); 
            }
        } catch (err) {
            console.error('[LOG 7: Error Catch]', err);
            setError(err.message || "Failed to load course details. Please try again later.");
            setEnrollmentStatus('error');
        } finally {
            setLoading(false);
        }
    }, [courseId, BACKEND_URL, isLoggedIn, user]);
    
    useEffect(() => {
        let shouldFetch = false;
        if (location.state?.lastActiveSectionId && location.state?.lastActiveModuleId) {
             setUnfinishedPracticeTestSectionId(location.state.lastActiveSectionId);
             setUnfinishedQuizModuleId(location.state.lastActiveModuleId);
             if (location.state.resumeQuizAttemptId) {
                setUnfinishedQuizAttemptId(location.state.resumeQuizAttemptId);
             }
        }
        if (!userLoading && courseId) {
            if (!course || location.state?.refresh) {
                shouldFetch = true;
            }
        }
        if (shouldFetch) {
            fetchCourseAndEnrollmentData().then(() => {
                if (location.state?.refresh || location.state?.lastActiveSectionId) {
                    navigate(location.pathname, { replace: true, state: {} });
                }
            });
        }
    }, [userLoading, courseId, location.state, navigate, fetchCourseAndEnrollmentData, course, location.pathname]);

    useEffect(() => {
        if (location.state?.submissionSuccess) {
            const successType = location.state.submissionSuccess;
            let message = "Practice test submitted successfully! You can view your results and score report now.";
            if (successType.startsWith('full-test-')) {
                setUnfinishedPracticeTestSectionId(null);
                setUnfinishedQuizModuleId(null);
                setUnfinishedQuizAttemptId(null); 
                if (successType === 'full-test-auto-submit') {
                    message = "The final module time limit expired. The entire practice test has been automatically submitted and graded.";
                } else if (successType === 'full-test-manual-submit') {
                    message = "Practice test submitted and graded successfully!";
                }
            }
            window.alert(message);
            const newState = location.state.refresh ? { refresh: true } : {};
            navigate(location.pathname, { replace: true, state: newState });
        }
    }, [location.state, navigate, location.pathname]);

    useEffect(() => {
        userRef.current = user;
        isLoggedInRef.current = isLoggedIn;
    }, [user, isLoggedIn]);

    useEffect(() => {
        const newHeights = {};
        for (const moduleId in openModules) {
            if (openModules[moduleId] && contentRefs.current[moduleId]) {
                newHeights[moduleId] = contentRefs.current[moduleId].scrollHeight;
            }
        }
        setModuleHeights(newHeights);
    }, [openModules, course]);

    useEffect(() => {
        if (enrollment && isUserEnrolled) {
            updateLastAccess();
        }
    }, [enrollment, isUserEnrolled, updateLastAccess]);
    
    const handleEnrollCourse = useCallback(async () => {
        if (!isLoggedInRef.current || !userRef.current || !courseId) {
            alert("Please log in to enroll in this course.");
            navigate('/login');
            return;
        }
        try {
            const response = await fetch(`${BACKEND_URL}/enrollments/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ courseId: courseId })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                alert(`Successfully enrolled in "${course?.title}"!`);
                setEnrollment(data.data);
                setEnrollmentStatus(data.data.status);
            } else {
                alert(`Enrollment failed: ${data.message || 'Unknown error'}`);
            }
        } catch (err) {
            alert("Failed to enroll in course. Please try again.");
        }
    }, [BACKEND_URL, courseId, course, navigate]);

    const handleRelearnCourse = useCallback(async () => {
        if (!isLoggedInRef.current || !userRef.current || !courseId) {
            alert("Please log in to re-learn this course.");
            navigate('/login');
            return;
        }
        if (window.confirm("Are you sure you want to reset your progress for this course? This action cannot be undone.")) {
            try {
                const response = await fetch(`${BACKEND_URL}/enrollments/reset-progress`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ courseId: courseId })
                });
                if (response.ok) {
                    alert("Your course progress has been reset! Starting from the beginning.");
                    navigate(location.pathname, { replace: true, state: { refresh: true } });
                } else {
                    const errorData = await response.json();
                    alert(`Failed to reset course progress: ${errorData.message || 'Unknown error'}`);
                }
            } catch (error) {
                alert("An error occurred while trying to reset course progress.");
            }
        }
    }, [BACKEND_URL, courseId, navigate, location.pathname]);
    
    const getFirstUncompletedModule = useCallback(() => {
        if (!course || !isUserEnrolled) {
            return null;
        }
        const allModules = course.sections
            .sort((a, b) => a.order - b.order)
            .flatMap(section => 
                (section.modules || []).sort((a, b) => a.order - b.order)
            );
        const firstUncompletedModule = allModules.find(module => !completedModuleIds.has(module._id));
        return firstUncompletedModule;
    }, [course, isUserEnrolled, completedModuleIds]);

    const firstUncompletedModule = getFirstUncompletedModule();

    const getModuleTitle = (moduleItem, index) => `${index + 1}. ${moduleItem.title || (moduleItem.moduleType === 'lesson' ? 'Lesson Module' : 'Quiz Module')}`;

    const getModuleButtonClass = (isClickable) => {
        const base = "block w-full text-left p-2 rounded-md transition-colors duration-100 font-semibold flex items-center space-x-2";
        return isClickable ? `${base} text-gray-800 hover:bg-gray-100 cursor-pointer underline` : `${base} text-gray-500 cursor-not-allowed opacity-70`;
    };
    
    const handleModuleClick = useCallback((e, moduleItem) => {
        e.preventDefault();
        const canAccessModule = isUserEnrolled && hasPermission('course:read');
        if (!canAccessModule) {
            alert("Please enroll in this course to access its modules.");
            return;
        }
        if (moduleItem.moduleType === 'lesson') {
            setOpenModules(prev => ({
                ...prev,
                [moduleItem._id]: !prev[moduleItem._id],
            }));
        } else if (moduleItem.moduleType === 'quiz') {
            const parentSection = course.sections.find(section => section.modules.some(m => m._id === moduleItem._id));
            if (parentSection && course.contentType === 'practice_test') {
                alert("Please use the 'Start Practice Test' button to begin the test session.");
            } else {
                navigate(`/courses/${courseId}/play/${moduleItem._id}`);
            }
        }
    }, [isUserEnrolled, hasPermission, navigate, courseId, course]);

    const handlePracticeTestClick = useCallback(() => {
        if (!isUserEnrolled || !hasPermission('course:read')) {
            alert("Please enroll in this course to access this test.");
            return;
        }
         let targetSectionId = unfinishedPracticeTestSectionId;
         let targetQuizModuleId = unfinishedQuizModuleId;
         let isResume = !!targetSectionId;
        if (isResume) {
            targetSectionId = unfinishedPracticeTestSectionId;
            targetQuizModuleId = unfinishedQuizModuleId;
        } else {
            const firstPracticeTestSection = course?.sections?.find(section => section.modules.some(m => m.moduleType === 'quiz'));
            if (!firstPracticeTestSection) {
                alert("No practice test sections found in this course.");
                return;
            }
            targetSectionId = firstPracticeTestSection._id;
            targetQuizModuleId = firstPracticeTestSection.modules.sort((a,b) => a.order - b.order)[0]._id;
        }
        navigate(`/courses/${courseId}/practice-test/${targetSectionId}/${targetQuizModuleId}`, {
            state: { 
                enrollment: enrollment, 
                introWasShown: isResume,
                resumeQuizAttemptId: unfinishedQuizAttemptId,
            }
        });
    }, [isUserEnrolled, hasPermission, navigate, courseId, course, enrollment, unfinishedPracticeTestSectionId, unfinishedQuizModuleId, unfinishedQuizAttemptId]);

    const handleContentClick = useCallback((e, moduleItem, content) => {
        e.stopPropagation();
        const canAccessContent = isUserEnrolled && hasPermission('course:read');
        if (!canAccessContent) {
            alert("Please enroll in this course to access its content.");
            return;
        }
        navigate(`/courses/${courseId}/play/${moduleItem._id}`, { state: { contentId: content._id } });
    }, [isUserEnrolled, hasPermission, navigate, courseId]);

    const handleToggleAllModules = () => {
        const newCollapseState = !allModulesCollapsed;
        const allModules = course.sections.flatMap(section => section.modules || []);
        const newOpenModulesState = allModules.reduce((acc, module) => {
            acc[module._id] = !newCollapseState;
            return acc;
        }, {});
        setOpenModules(newOpenModulesState);
        setAllModulesCollapsed(newCollapseState);
    };

    const handleBack = () => {
        // 1. PRIORITY #1: Always follow the actual path the user came from
        if (location.state?.from) {
            navigate(location.state.from);
            return; 
        }

        // 2. FALLBACK: Only if state is lost (e.g., on a refresh), use role-based guessing
        if (userCanManageCourse) {
            navigate('/courses-list');
        } else if (isUserEnrolled) {
            navigate('/my-learning');
        } else {
            navigate('/courses');
        }
    };

    const totalSections = course?.sections?.length || 0;
    const totalModules = course?.sections?.reduce((total, section) =>
        total + (section.modules?.length || 0), 0) || 0;
    const totalContentItems = course?.sections?.reduce((total, section) =>
        total + (section.modules?.reduce((modTotal, module) => modTotal + (module.contents?.length || 0), 0) || 0), 0) || 0;

    const isContentCompleted = (contentId) => {
        return completedContentIds.has(contentId);
    };

    const allContentItems = course?.sections?.flatMap(section =>
        section.modules?.flatMap(module =>
            module.moduleType === 'lesson' ? module.contents : [module]
        )
    ).flat().filter(Boolean) || [];

    const completedUnits = allContentItems.filter(item => {
        if (item.moduleType === 'quiz') {
            return completedModuleIds.has(item._id);
        } else {
            return completedContentIds.has(item._id);
        }
    }).length;
    
    const totalUnits = allContentItems.length;
    const progressCounts = { completedUnits, totalUnits };
    
    const scrollToInstructor = () => {
        if (instructorRef.current) {
            instructorRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    const navigateToScoreReport = useCallback((attemptId) => {
        navigate(`/practice-tests/${attemptId}/details`);
    }, [navigate]);

    const PracticeTestScorecard = ({ attempt, index }) => {
        if (attempt.status !== 'submitted' && attempt.status !== 'graded') { 
            return null;
        }
        const date = new Date(attempt.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const practiceNumber = practiceTestAttempts.length - index;
        const practiceTitle = `Practice ${practiceNumber}`;
        const satDetails = attempt.satScoreDetails || {};
        const totalScore = attempt.overallScore || satDetails.totalSatScore || 0; 
        let sectionScoresToDisplay = [];
        const sectionScores = attempt.sectionScores || []; 
        sectionScoresToDisplay = sectionScores
            .map(scoreEntry => {
                const sectionInfo = getSectionInfoFromAttempt(scoreEntry.id, course);
                return {
                    id: scoreEntry.id,
                    score: scoreEntry.score, 
                    title: sectionInfo.title,
                    order: sectionInfo.order
                };
            })
            .filter(scoreEntry => scoreEntry.title !== 'Unknown Section')
            .sort((a, b) => a.order - b.order);

        return (
            <div className="w-60 h-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 flex-shrink-0 snap-center transition-shadow hover:shadow-xl">
                <div className="bg-blue-800 text-white p-3 flex justify-between items-center">
                    <span className="text-sm font-semibold uppercase truncate" title={course?.title || ''}>{course?.title || 'SAT PRACTICE TEST 1'}</span>
                </div>
                <div className="p-4 text-center space-y-4">
                    <div className="text-sm font-medium text-white bg-blue-600 rounded-full px-3 py-1 mb-2 inline-block shadow-sm">
                        {practiceTitle} 
                    </div>
                    <div className="font-semibold text-gray-700 text-sm">YOUR TOTAL SCORE</div>
                    <div className="text-5xl font-extrabold text-gray-900">{totalScore}</div>
                    <div className="border-t border-gray-200 pt-4 space-space-y-2">
                        {sectionScoresToDisplay.length > 0 ? ( 
                            sectionScoresToDisplay.map((section, idx) => ( 
                                <div key={section.id} className={`flex justify-between items-center text-sm ${idx > 0 ? 'mt-2' : ''}`}>
                                    <span className="text-gray-800 font-medium">{section.title}</span> 
                                    <span className="text-gray-900 font-bold">{section.score}</span> 
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-gray-500">Section scores loading or unavailable.</div>
                        )}
                    </div>
                    <button 
                        onClick={() => navigateToScoreReport(attempt._id)}
                        className="w-full py-2 mt-4 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded-lg cursor-pointer transition-colors duration-150 shadow-md flex items-center justify-center space-x-2"
                    >
                        <BarChart2 size={18}/>
                        <span>Score Details</span>
                    </button>
                    <div className="text-xs text-gray-500 pt-1">Taken: {date}</div>
                </div>
            </div>
        );
    };

    if (isPageLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading course details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-600 mb-6">Error: {error}</p>
                <button
                    onClick={handleBack}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Courses</span>
                </button>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-gray-600 mb-6">Course not found or not published.</p>
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
    
    const isPracticeTest = course.contentType === 'practice_test';
    const bannerTitle = isPracticeTest ? 'Ready to Test Your Knowledge?' : 'Ready to Start Learning?';
    const bannerParagraph = isPracticeTest ? 'Take our comprehensive practice tests to hone your skills and boost your confidence.' : 'The key to successful preparation is consistent learning. Start your journey now.';
    const h3title = isPracticeTest ? 'Practice Test Details' : 'Course Content Outline';

    let learningButtonContent = null;
    if (isLoggedIn && isUserEnrolled) {
        if (isPracticeTest) {
            const isResume = !!unfinishedPracticeTestSectionId;
            learningButtonContent = (
                <button
                    onClick={handlePracticeTestClick}
                    className={`flex space-x-2 py-3 px-6 rounded-full text-white font-semibold transition-colors duration-200 cursor-pointer ${isResume ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isResume ? (
                        <>
                            <Timer size={20} />
                            <span>Resume Test</span>
                        </>
                    ) : (
                        <>
                            <Play size={20} />
                            <span>Start Practice Test</span>
                        </>
                    )}
                </button>
            );
        } else {
            const buttonText = overallCourseProgress > 0 ? 'Continue Learning' : 'Start Learning';
            const buttonColorClasses = overallCourseProgress > 0
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-blue-600 hover:bg-blue-700'; 
            learningButtonContent = (
                <div className="flex flex-wrap gap-4 mt-4">
                    {overallCourseProgress < 100 && (
                        <button
                            onClick={() => navigate(`/courses/${courseId}/play/${firstUncompletedModule._id}`)}
                            className={`flex space-x-2 py-3 px-6 rounded-full text-white font-semibold transition-colors duration-200 ${buttonColorClasses}`}
                        >
                            <Play size={20} />
                            <span>{buttonText}</span>
                        </button>
                    )}
                    {overallCourseProgress === 100 && (
                        <div className="flex items-center space-x-4">
                            <button onClick={handleRelearnCourse} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-full shadow-md transition-colors duration-200 flex items-center space-x-2" disabled={userLoading}>
                                <RotateCcw size={20} />
                                <span>Re-learn Course</span>
                            </button>
                            <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                                Course Completed 🎉
                            </span>
                        </div>
                    )}
                </div>
            );
        }
    }

    const instructorAvatarSrc = course?.teacher?.avatar && course.teacher.avatar.startsWith('http')
    ? course.teacher.avatar
    : `https://ui-avatars.com/api/?name=${course.teacher ? course.teacher.firstName || 'U' : 'U'}+${course.teacher ? course.teacher.lastName || 'U' : 'U'}&background=random&color=fff&size=96`;

    return (
        <div className="container-2">
            <div className="flex justify-between items-center m-6">
                <button onClick={handleBack} className="px-6 py-3 btn-b space-x-2 flex cursor-pointer">
                    <ArrowLeft size={20} />
                    <span>Back to Courses</span>
                </button>

                {/* ✅ ADDED: Manage Course Button for RBAC */}
                {userCanManageCourse && (
                    <button 
                        onClick={() => navigate(`/courses-manage/${courseId}`, { state: { from: location.pathname }  })}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center space-x-2 transition-all shadow-md font-semibold cursor-pointer"
                    >
                        <Settings size={20} />
                        <span>Manage Course</span>
                    </button>
                )}
            </div>
            <main className="mx-auto px-6 md:px-0 md:max-w-full">
                <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-4">
                        <div className="flex flex-col space-y-1.5 capitalize">
                            <h2 className="text-5xl font-semibold font-primary text-gray-900 leading-tight">{course?.title}</h2>
                            <p className="text-gray-700 leading-loose text-md">{course?.description || 'No description provided.'}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-gray-700 text-sm">
                                <div className="flex items-center">
                                    {course?.contentType === 'practice_test' ? (<Zap size={18} className="text-orange-500 mr-3" />) : (<MdPlayCircleOutline size={20} className="text-purple-500 mr-3" />)}
                                    <span>Type: <span className="font-bold text-indigo-600">{course?.contentType?.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'N/A'}</span></span>
                                </div>
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2d00/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag text-purple-500 mr-3"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414L12.586 22a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828L12.586 2.586Z" /><path d="M7 7h.01" /></svg>
                                    <span>Category: <span className="font-bold text-blue-600">{course?.category?.name || 'Uncategorized'}</span></span>
                                </div>
                                <div className="flex items-center">
                                    <BarChart2 size={18} className="text-blue-500 mr-3" />
                                    <span>Difficulty: <span className="font-medium">{course?.difficulty || 'N/A'}</span></span>
                                </div>
                                <div className="flex items-center">
                                    <Clock size={18} className="text-yellow-500 mr-3" />
                                    <span> Last Updated on: <span className="font-medium">{new Date(course.updatedAt).toLocaleDateString()}</span></span>
                                </div>
                                {course?.teacher && (
                                <div className="flex items-center">
                                    <UserIcon size={18} className="text-gray-500 mr-3" />
                                    <span>Created By:
                                        <a onClick={scrollToInstructor} className="font-bold text-indigo-600 cursor-pointer underline ml-1">
                                            {course.teacher.firstName} {course.teacher.lastName}
                                        </a>
                                    </span>
                                </div>
                                )}
                            </div>
                            {isLoggedIn ? (
                                <div className="flex flex-wrap gap-4 mt-4">
                                    {learningButtonContent}
                                    {!isUserEnrolled && (
                                    <button onClick={handleEnrollCourse} className="btn-a self-start text-lg cursor-pointer transition ease-in-out duration-300" disabled={userLoading}>
                                        Enroll Now
                                    </button>
                                    )}
                                </div>
                            ) : (
                                <button onClick={handleEnrollCourse} className="mt-4 btn-a cursor-pointer self-start text-lg" title="Log in to enroll" disabled={userLoading}>
                                    Enroll Now
                                </button>
                            )}
                        </div>
                        <div className="bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center p-6 min-h-[350px] shadow-inner">
                            {course?.thumbnail ? (
                                <img src={course.thumbnail} alt={`${course?.title} thumbnail`} className="max-w-full max-h-[350px] object-contain rounded-lg" />
                            ) : (
                                <span className="text-gray-500 text-xl font-medium">Video or Image Placeholder</span>
                            )}
                        </div>
                    </div>

                    {isLoggedIn && isUserEnrolled && (
                        <div className="mt-8 bg-blue-50 p-6 rounded-lg shadow-md border border-blue-200 w-full md:w-1/2 mx-auto">
                            {isPracticeTest ? (
                                <div className="flex flex-col items-center">
                                    <h3 className="text-xl font-semibold text-blue-800 flex items-center justify-center mb-1">
                                        <Timer size={24} className="mr-2 text-blue-600" />
                                        Practice Test Progress
                                    </h3>
                                    <p className="text-sm text-blue-700 font-medium text-center">
                                        You can start a new attempt at any time.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    {overallCourseProgress === 100 ? (
                                        <div className="flex items-center justify-center flex-col">
                                            <h3 className="text-xl font-semibold text-blue-800 flex items-center justify-center mb-1">
                                                <CheckCircle size={24} className="mr-2 text-blue-600" />
                                                Course Completed!
                                            </h3>
                                            <p className="text-sm text-blue-700 font-medium text-center">
                                                Fantastic! You've completed this course.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className="w-full">
                                                <h3 className="text-xl font-semibold text-blue-800 flex items-center justify-center mb-1">
                                                    <CheckCircle size={24} className="mr-2 text-blue-600" />
                                                    Your Course Progress: {overallCourseProgress}%
                                                </h3>
                                                <div className="w-full bg-gray-200 rounded-full h-3.5 mb-2">
                                                    <div className="bg-blue-600 h-3.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${overallCourseProgress}%`, backgroundImage: `repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.1) 1px, transparent 1px, transparent 3px)`, backgroundSize: '6px 6px' }}></div>
                                                </div>
                                            </div>
                                            <div className="text-center w-full">
                                                <p className="text-lg font-bold text-gray-900 mt-1">
                                                    {progressCounts.completedUnits} of {progressCounts.totalUnits} complete.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="bg-blue-600 text-white p-8 rounded-xl text-center shadow-lg my-10">
                        <h3 className="text-3xl font-semibold font-primary mb-3">{bannerTitle}</h3>
                        <p className="mb-6 text-lg font-secondary">{bannerParagraph}</p>
                    </div>

                    {isPracticeTest && isUserEnrolled && practiceTestAttempts.length > 0 && (
                        <div className="my-10 p-8">
                            <h3 className="text-3xl font-bold text-gray-900 title mb-6 flex items-center">
                                Practice Test Attempts
                            </h3>
                            <div className="flex overflow-x-scroll grid-cols-5 gap-6 p-4 -mx-4 md:-mx-6 lg:-mx-8 border border-gray-100 rounded-xl shadow-inner bg-gray-50 snap-x snap-mandatory scroll-p-4">
                                {practiceTestAttempts.map((attempt, index) => (
                                    <PracticeTestScorecard 
                                        key={attempt._id} 
                                        attempt={attempt} 
                                        index={index}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {course.contentType === 'course_lesson' && (
                        <div>
                            <div className='flex items-center justify-between mb-3 border-b-2 pb-3 border-indigo-200'>
                                <div className='flex items-center gap-8'>
                                    <h3 className="text-3xl font-bold text-gray-900 title">{h3title}</h3>
                                    <div className="flex items-center space-x-6 text-gray-700">
                                        <div className="flex items-center text-lg">
                                            <ListCollapse size={20} className="text-indigo-500 mr-2" />
                                            <span><span className="font-bold">{totalSections}</span> Sections,</span>
                                        </div>
                                        <div className="flex items-center text-lg">
                                            <BookOpen size={20} className="text-green-500 mr-2" />
                                            <span><span className="font-bold">{totalModules}</span> Modules</span>
                                        </div>
                                        {course?.contentType === 'course_lesson' && (
                                        <div className="flex items-center text-lg">
                                            <List size={20} className="text-green-500 mr-2" />
                                            <span><span className="font-bold">{totalContentItems}</span> Contents</span>
                                        </div>
                                        )}
                                    </div>
                                </div>
                                {userHasCourseReadPermission && course?.sections?.length > 0 && (
                                <button
                                    onClick={handleToggleAllModules}
                                    className="flex items-center space-x-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
                                    aria-label={allModulesCollapsed ? "Expand all modules" : "Collapse all modules"}
                                >
                                    {allModulesCollapsed ? (
                                    <>
                                        <ChevronDown size={18} />
                                        <span>Expand All</span>
                                    </>
                                    ) : (
                                    <>
                                        <ChevronUp size={18} />
                                        <span>Collapse All</span>
                                    </>
                                    )}
                                </button>
                                )}
                            </div>

                            {!userHasCourseReadPermission ? (
                                <div className="p-6 bg-gray-100 rounded-lg text-center text-gray-700 shadow-sm">
                                    <p className="mb-3 text-lg">Full course content outline requires "course:read" permission.</p>
                                    {isLoggedIn ? (
                                    <p className="text-base">Your account does not have sufficient privileges.</p>
                                    ) : (
                                    <p className="text-base">Please <span className="text-blue-600 cursor-pointer font-medium hover:underline" onClick={() => navigate('/login')}>log in</span> to view the full content details.</p>
                                    )}
                                </div>
                            ) : course?.sections && course.sections.length > 0 ? (
                                <div className="space-y-6">
                                    {course.sections
                                    .sort((a, b) => a.order - b.order)
                                    .map((section) => {
                                        const moduleCount = section.modules?.length || 0;
                                        const contentCount = section.modules?.reduce((total, module) => total + (module.contents?.length || 0), 0) || 0;
                                        return (
                                            <div key={section._id} className="bg-gray-50 rounded-lg p-5 shadow-sm border border-gray-100">
                                                <div className="text-lg font-semibold text-purple-700 mb-2 flex items-center justify-between">
                                                    <h4 className="flex items-center">
                                                        <ListCollapse size={20} className="inline-block mr-3 text-purple-500" />
                                                        {section.order}. {section.sectionTitle}
                                                    </h4>
                                                    <span className="text-sm font-normal text-gray-600">
                                                        ({moduleCount} modules, {contentCount} contents)
                                                    </span>
                                                </div>
                                                {section.modules && section.modules.length > 0 ? (
                                                    <ul className="ml-4 mt-2 list-none space-y-1">
                                                        {section.modules
                                                        .sort((a, b) => a.order - b.order)
                                                        .map((moduleItem, index) => {
                                                            const isClickable = isUserEnrolled && hasPermission('course:read');
                                                            const isCompleted = completedModuleIds.has(moduleItem._id);
                                                            const isContentOpen = openModules[moduleItem._id];
                                                            const contentHeight = isContentOpen ? contentRefs.current[moduleItem._id]?.scrollHeight || 'auto' : 0;
                                                            return (
                                                                <li key={moduleItem._id}>
                                                                    <button
                                                                        onClick={(e) => handleModuleClick(e, moduleItem)}
                                                                        disabled={!isClickable || userLoading}
                                                                        className={getModuleButtonClass(isClickable)}
                                                                        title={getModuleTitle(moduleItem, index)}
                                                                    >
                                                                        <span className="flex items-center space-x-2 flex-grow">
                                                                            {moduleItem.moduleType === 'lesson' ? (<BookOpen size={16} className="text-green-600" />) : (<Zap size={16} className="text-orange-600" />)}
                                                                            <span>{getModuleTitle(moduleItem, index)}</span>
                                                                        </span>
                                                                        {isCompleted && (
                                                                            <CheckCircle size={16} className="text-green-500 ml-auto" title="Module Completed" />
                                                                        )}
                                                                        {moduleItem.moduleType === 'lesson' && (isContentOpen ? (
                                                                            <ChevronUp size={20} className="ml-2 text-gray-600" />
                                                                        ) : (
                                                                            <ChevronDown size={20} className="ml-2 text-gray-600" />
                                                                        ))}
                                                                    </button>
                                                                    <div
                                                                        ref={el => { contentRefs.current[moduleItem._id] = el; }}
                                                                        style={{ maxHeight: `${contentHeight}px` }}
                                                                        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
                                                                    >
                                                                        {moduleItem.moduleType === 'lesson' && moduleItem.contents && (
                                                                            <ul className="ml-8 mt-2 space-y-1 text-gray-600 text-sm">
                                                                                {moduleItem.contents.map((content) => (
                                                                                    <li key={content._id}>
                                                                                        <button
                                                                                            onClick={(e) => handleContentClick(e, moduleItem, content)}
                                                                                            disabled={!isClickable || userLoading}
                                                                                            className="flex items-center space-x-2 w-full text-left p-1 rounded-md hover:bg-gray-200 transition-colors duration-100"
                                                                                        >
                                                                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>
                                                                                            <span className="underline">{content.title}</span>
                                                                                            {isContentCompleted(content._id) && (
                                                                                                <CheckCircle size={16} className="text-green-500 ml-auto" title="Content Completed" />
                                                                                            )}
                                                                                        </button>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                ) : (
                                                    <p className="ml-4 text-gray-500 text-sm italic">No modules in this section.</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xl text-gray-500 text-center italic mt-10">This course currently has no content sections.</p>
                            )}
                        </div>
                    )}
                    {course?.teacher && (
                        <div ref={instructorRef} className="bg-gray-50 rounded-2xl shadow-sm p-8 md:p-12 mt-10 border-gray-50 border-1 ">
                            <h3 className="text-3xl font-bold font-primary text-gray-900 title mb-8">Instructor Profile:</h3>
                            <h4 className="2xl font-semibold text-indigo-700 leading-tight mb-7 underline ml-4">
                                {course.teacher.firstName} {course.teacher.lastName}
                            </h4>
                            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-4 md:space-x-10">
                                <div className="flex-shrink-0 mt-4">
                                    <img 
                                        src={instructorAvatarSrc}
                                        alt={`${course.teacher.firstName} ${course.teacher.lastName} avatar`}
                                        className="rounded-full w-30 h-30 object-cover border-4 border-indigo-100 shadow-md"
                                    />
                                </div>
                                <div className="text-center md:text-left flex-grow space-y-2 pt-2 mr-4">
                                    <p className="text-gray-600 flex items-center justify-center md:justify-start font-semibold text-xl">About Me:</p>
                                    <p className="text-gray-600 flex items-center justify-center md:justify-start font-medium">
                                      <CirclePlayIcon size={16} className="text-gray-500 mr-4" />
                                        <span>{course.teacherCoursesCount ? `${course.teacherCoursesCount} Courses` : 'No courses yet'}</span>
                                    </p>
                                    <p className="text-gray-700 leading-relaxed text-sm flex items-start justify-center md:justify-start font-medium">
                                        <FileText size={16} className="text-gray-500 mr-4 flex-shrink-0 " />
                                        <span className="max-w-2/3 text-center md:text-left whitespace-pre-wrap">
                                            {course.teacher.bio || "This instructor has not provided a bio yet. They are a dedicated professional who created this course to help you learn and grow."}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CourseView;