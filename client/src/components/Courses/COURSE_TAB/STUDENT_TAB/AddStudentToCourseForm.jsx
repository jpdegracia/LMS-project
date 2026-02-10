import React, { useState, useEffect } from 'react';
import { Save, XCircle } from 'lucide-react';
import Modal from '../../../Modal/Modal';

const AddStudentToCourseForm = ({ courseId, onSuccess, onCancel }) => {
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Fetch all students to populate the dropdown
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                // Assuming you have a backend route to get all users with the 'student' role.
                // Replace this URL with your actual endpoint.
                // Example: GET /users/all-students
                const response = await fetch(`${BACKEND_URL}/users/all-students`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch students.');
                }
                const data = await response.json();
                // Assumes the backend response has a 'students' key
                setStudents(data.students || []);
            } catch (err) {
                setError(err.message || 'An error occurred fetching student data.');
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [BACKEND_URL]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStudentId) {
            setError('Please select a student to enroll.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Use the dedicated admin-controlled enrollment route
            const response = await fetch(`${BACKEND_URL}/enrollments/admin/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ studentId: selectedStudentId, courseId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to enroll student.');
            }
            onSuccess();
        } catch (err) {
            console.error('Error adding student to course:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-center">Add Student to Course</h2>
            
            {loading ? (
                <p className="text-center text-blue-600">Loading students...</p>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : (
                <>
                    <div className="mb-4">
                        <label htmlFor="studentSelect" className="block text-sm font-medium text-gray-700">Select a Student</label>
                        <select
                            id="studentSelect"
                            name="studentSelect"
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                            disabled={isSubmitting}
                        >
                            <option value="">-- Select a student --</option>
                            {students.map((student) => (
                                <option key={student._id} value={student._id}>
                                    {student.firstName} {student.lastName} ({student.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            disabled={isSubmitting}
                        >
                            <XCircle size={18} />
                            <span>Cancel</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                            <Save size={18} />
                            <span>Enroll Student</span>
                        </button>
                    </div>
                </>
            )}
        </form>
    );
};

export default AddStudentToCourseForm;