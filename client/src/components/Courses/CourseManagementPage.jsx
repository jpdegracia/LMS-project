import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
import CourseDetails from './COURSE_TAB/SETTING_TAB/CourseDetails';
import SectionsList from '../Sections/SectionListPage';
import AddSectionForm from '../Sections/CRUD_SECTION/AddSectionForm';
import CourseStudentsList from './COURSE_TAB/STUDENT_TAB/CourseStudentList';
import AddStudentToCoursePage from './COURSE_TAB/STUDENT_TAB/AddStudentToCoursePage';
import QuizAttemptsList from './COURSE_TAB/ATTEMPT_TAB/QuizAttemptList';
import CourseGradeBook from './COURSE_TAB/GRADE_TAB/GradeBook';
import Modal from '../Modal/Modal';
import { ArrowLeft, PlusCircle, Settings, Users, ClipboardList, Clock } from 'lucide-react';
import PracticeTestAttemptList from './COURSE_TAB/ATTEMPT_TAB/PracticeTestAttemptList';

const CourseManagementPage = () => {
    const { id: courseId } = useParams();
    const navigate = useNavigate();
    const { user, userLoading, isLoggedIn, loading: userContextLoading, error: userError, hasPermission } = useContext(UserContext);

    const [searchParams, setSearchParams] = useSearchParams({ tab: 'settings' });
    const activeTab = searchParams.get('tab');

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddSectionModal, setShowAddSectionModal] = useState(false);
    const location = useLocation();
    
    // REMOVED: This state is no longer needed since it's a dedicated page now
    // const [showAddStudentModal, setShowAddStudentModal] = useState(false);

    const fetchCourse = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!hasPermission('course:read')) {
                console.warn("User does not have 'course:read' permission. Redirecting.");
                alert("You do not have permission to view courses.");
                setLoading(false);
                navigate('/dashboard');
                return;
            }
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses/${courseId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error("[CourseManagementPage] fetchCourse API error:", errorData);
                throw new Error(errorData.message || `Failed to fetch course: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.success && data.data) {
                setCourse({ ...data.data });
            } else {
                const errorMessage = data.message || 'Failed to retrieve course data.';
                setError(errorMessage);
                alert(errorMessage);
                setCourse(null);
                console.error("[CourseManagementPage] Course data fetch failed (success:false):", data);
            }
        } catch (err) {
            console.error('Network error fetching course in CourseManagementPage:', err);
            const errorMessage = 'Network error: Could not connect to the backend or unexpected error.';
            setError(errorMessage);
            alert(errorMessage);
            setCourse(null);
        } finally {
            setLoading(false);
        }
    }, [courseId, navigate, hasPermission, import.meta.env.VITE_BACKEND_URL]);


    const handleBack = () => {
        if (location.state?.from) {
            navigate(location.state.from);
        } else {
            // Fallback to the management list if history is lost
            navigate('/courses-list');
        }
    };


    useEffect(() => {
        if (!userLoading) {
            if (isLoggedIn) {
                if (courseId && (!course || course._id !== courseId)) {
                    fetchCourse();
                }
            } else {
                alert("Please log in to view course management.");
                navigate('/login');
            }
        }
    }, [courseId, isLoggedIn, userLoading, navigate, fetchCourse, course]);

    if (userLoading || loading) {
        return <div className="p-4 text-center text-blue-600">Loading course details...</div>;
    }
    if (userError || error) {
        return <div className="p-4 text-center text-red-500">Error: {userError || error}</div>;
    }
    if (!course) {
        return (
            <div className="p-4 text-center text-gray-500">
                Course not found or no data available.
                <button
                    onClick={() => navigate('/courses-list')}
                    className="mt-4 px-4 py-2 btn-b flex items-center mx-auto"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Courses List</span>
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'attempts', label: 'Attempts', icon: Clock },
        { id: 'grades', label: 'Grades', icon: ClipboardList },
    ];

    return (
        <div className="container-2 p-6 bg-gray-50 min-h-screen">
            <button
                onClick={handleBack}
                className="mb-6 px-4 py-2 btn-b flex cursor-pointer space-x-2"
            >
                <ArrowLeft size={16} />
                <span>Back</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Course Management: {course.title}</h1>
            
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-0" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <React.Fragment key={tab.id}>
                            <button
                                onClick={() => setSearchParams({ tab: tab.id })}
                                className={`
                                    flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200
                                    ${activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600 cursor-pointer'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'
                                    }
                                `}
                            >
                                <tab.icon size={20} />
                                <span>{tab.label}</span>
                            </button>
                            {index < tabs.length - 1 && (
                                <div className="w-px h-6 bg-gray-300 self-center"></div>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            </div>

            <div className="p-4 bg-white rounded-lg shadow-md">
                {activeTab === 'settings' && (
                    <div>
                        <CourseDetails
                            course={course}
                            onCourseUpdated={fetchCourse}
                            hasPermission={hasPermission}
                        />
                        <hr className="my-8 border-gray-300" />
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold text-gray-700">Course Sections</h2>
                            {hasPermission('section:create') && (
                                <button
                                    onClick={() => setShowAddSectionModal(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg transition duration-200 flex items-center space-x-2 text-base font-medium shadow-md cursor-pointer"
                                >
                                    <PlusCircle size={20} />
                                    <span>Add New Section</span>
                                </button>
                            )}
                        </div>
                        <SectionsList
                            courseId={courseId}
                            sections={course.sections}
                            course={course}
                            onSectionsUpdated={fetchCourse}
                            hasPermission={hasPermission}
                        />
                    </div>
                )}
                {activeTab === 'students' && (
                    <>
                        <CourseStudentsList 
                        courseId={courseId}
                        course={course}
                         />
                    </>
                )}
                {activeTab === 'attempts' && (
                    // Use a conditional check on the course's content type
                    course.contentType === 'practice_test' ? (
                        <PracticeTestAttemptList courseId={courseId} courseTitle={course.title} />
                    ) : (
                        <QuizAttemptsList courseId={courseId} courseTitle={course.title} />
                    )
                )}
                {activeTab === 'grades' && (
                    // 🚨 NEW GRADES TAB LOGIC 🚨
                    course.contentType === 'practice_test' ? (
                        <CourseGradeBook courseId={courseId} courseTitle={course.title} />
                    ) : (
                        <div className="mt-8 text-center text-gray-500 p-8 bg-gray-50 rounded-lg border border-gray-200">
                            <ClipboardList size={32} className="mx-auto text-indigo-400 mb-3" />
                            <h2 className="text-xl font-semibold mb-2 text-gray-700">Gradebook Not Yet Supported</h2>
                            <p>Detailed gradebook views are currently only available for **Practice Test** courses.</p>
                        </div>
                    )
                )}
            </div>
            {showAddSectionModal && (
                <Modal onClose={() => setShowAddSectionModal(false)}>
                    <AddSectionForm
                        key={courseId}
                        courseId={courseId}
                        onSectionAdded={() => {
                            setShowAddSectionModal(false);
                            fetchCourse();
                            alert("Section added successfully!");
                        }}
                        onCancel={() => setShowAddSectionModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default CourseManagementPage;