import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditCourseForm from './CRUD_COURSE/EditCourseForm';

const CourseDetails = ({ course, onCourseUpdated, hasPermission }) => {
    const navigate = useNavigate();
    const [isEditingCourse, setIsEditingCourse] = useState(false);

    const canEditCourse = hasPermission('course:update');
    const canDeleteCourse = hasPermission('course:delete');

    const handleDeleteCourse = async () => {
        if (!canDeleteCourse) {
            alert("You don't have permission to delete courses.");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete the course "${course.title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses/${course._id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                alert('Course deleted successfully!');
                navigate('/courses-list');
            } else {
                const errorData = await response.json();
                alert(`Failed to delete course: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Network error while deleting course.');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{course.title}</h3>
                <div className="space-x-2 flex">
                    {canEditCourse && (
                        <button
                            onClick={() => setIsEditingCourse(true)}
                            className="btn-edit flex cursor-pointer"
                        >
                            Edit Course
                        </button>
                    )}
                    {canDeleteCourse && (
                        <button
                            onClick={handleDeleteCourse}
                            className="btn-delete flex cursor-pointer"
                        >
                            Delete Course
                        </button>
                    )}
                </div>
            </div>

            <p className="text-gray-700 mb-2"><strong>Description:</strong> {course.description || 'N/A'}</p>
            <p className="text-gray-700 mb-2"><strong>Category:</strong> {course.category ? course.category.name : 'Uncategorized'}</p>
            <p className="text-gray-700 mb-2"><strong>Difficulty:</strong> {course.difficulty}</p>
            <p className="text-gray-700 mb-2"><strong>Status:</strong> <span className={`font-medium ${course.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>{course.status}</span></p>
            
            {/* Display the assigned teacher */}
            <p className="text-gray-700 mb-2">
                <strong>Assigned Teacher:</strong>{' '}
                {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName} (${course.teacher.email})` : 'Unassigned'}
            </p>

            {/* <p className="text-gray-700"><strong>Created By:</strong> {course.createdBy ? `${course.createdBy.firstName} ${course.createdBy.lastName} (${course.createdBy.email})` : 'N/A'}</p> */}

            {isEditingCourse && (
                <EditCourseForm
                    course={course}
                    // This function now receives the updated course from the child component
                    onSave={(updatedCourse) => {
                        setIsEditingCourse(false);
                        // Call the parent's update function to trigger a state refresh
                        onCourseUpdated(updatedCourse);
                        alert("Course updated successfully!");
                    }}
                    onCancel={() => setIsEditingCourse(false)}
                />
            )}
        </div>
    );
};

export default CourseDetails;