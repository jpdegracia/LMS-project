import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
import CourseDetails from '../Courses/CourseDetails';
import SectionsList from '../Sections/SectionListPage';
import AddSectionForm from '../Sections/CRUD_SECTION/AddSectionForm';
import Modal from '../Modal/Modal';
import { ArrowLeft, PlusCircle } from 'lucide-react';


const CourseManagementPage = () => {
    const { id: courseId } = useParams();
    const navigate = useNavigate();
    const { user, isLoggedIn, loading: userLoading, error: userError, hasPermission } = useContext(UserContext);

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddSectionModal, setShowAddSectionModal] = useState(false);

    const fetchCourse = useCallback(async () => {
        // console.log("[CourseManagementPage] fetchCourse initiated to refresh data!");
        setLoading(true);
        setError(null);
        // setCourse(null); // Keep commented for smoother loading, unless needed for specific UX

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
                // *** FIX: Create a NEW object reference when setting state ***
                // This forces React to recognize the 'course' prop as changed,
                // triggering re-renders down the component tree.
                setCourse({ ...data.data }); // Using spread to create a shallow copy ensures new reference
                // console.log("[CourseManagementPage] Course data set with fresh data. Contents populated (sample):", data.data.sections?.[0]?.modules?.[0]?.contents);
                // console.log("[CourseManagementPage] Course data set with fresh data. Full object:", { ...data.data });
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
    }, [courseId, navigate, hasPermission, import.meta.env.VITE_BACKEND_URL]); // Dependencies for fetchCourse useCallback


    useEffect(() => {
        // This useEffect ensures the initial fetch or re-fetch on route/auth change
        if (!userLoading) {
            if (isLoggedIn) {
                // console.log("[CourseManagementPage] useEffect triggered initial/auth fetch.");
                // Fetch only if courseId is available and course data is not yet loaded or doesn't match
                // We add `course` to dependencies here to prevent unnecessary re-fetches if `course` is already populated.
                if (courseId && (!course || course._id !== courseId)) {
                    fetchCourse();
                }
            } else {
                alert("Please log in to view course management.");
                navigate('/login');
            }
        }
    }, [courseId, isLoggedIn, userLoading, navigate, fetchCourse, course]); // Added 'course' to dependencies


    if (userLoading || loading) {
        return <div className="p-4 text-center text-blue-600">Loading course details...</div>;
    }

    if (userError || error) {
        return <div className="p-4 text-center text-red-500">Error: {userError || error}</div>;
    }

    if (!course) {
        return <div className="p-4 text-center text-gray-500">Course not found or no data available.</div>;
    }

    const canAddSections = hasPermission('section:create');

    return (
        <div className="course-management-page p-6 bg-gray-50 min-h-screen">
            <button
                onClick={() => navigate('/courses-list')}
                className="mb-6 px-4 py-2 btn-b flex"
            >
                <ArrowLeft size={16} />
                <span>Back to Courses List</span>
            </button>

            <h1 className="text-3xl font-bold text-gray-800 mb-6">Course Management: {course.title}</h1>

            <CourseDetails
                course={course}
                onCourseUpdated={fetchCourse} // This triggers fetchCourse
                hasPermission={hasPermission}
            />

            <hr className="my-8 border-gray-300" />

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-700">Course Sections</h2>
                {canAddSections && (
                    <button
                        onClick={() => setShowAddSectionModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg transition duration-200 flex items-center space-x-2 text-base font-medium shadow-md"
                    >
                        <PlusCircle size={20} />
                        <span>Add New Section</span>
                    </button>
                )}
            </div>

            {/* Component for listing sections and their nested modules */}
            <SectionsList
                courseId={courseId}
                sections={course.sections}
                course={course}
                onSectionsUpdated={fetchCourse}
                hasPermission={hasPermission}
            />

            {/* Modal for adding a new Section */}
            {showAddSectionModal && (
                <AddSectionForm
                    courseId={courseId} // <<< FIX: Pass the actual courseId here
                    onSectionAdded={() => {
                        setShowAddSectionModal(false);
                        fetchCourse();
                        alert("Section added successfully!");
                    }}
                    onCancel={() => setShowAddSectionModal(false)}
                />
            )}
        </div>
    );
};

export default CourseManagementPage;