import React, { useState, useEffect } from 'react';
import { Save, XCircle } from 'lucide-react';

const EditEnrollmentForm = ({ enrollmentId, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        // Add fields you want to edit, e.g., 'enrollmentStatus' or 'notes'
        // Let's assume you're adding an 'enrollmentStatus' field to your Enrollment model
        enrollmentStatus: 'enrolled', // Example
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Optional: Fetch the current enrollment details to pre-populate the form
    useEffect(() => {
        const fetchEnrollment = async () => {
            const response = await fetch(`${BACKEND_URL}/enrollments/${enrollmentId}`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setFormData({ enrollmentStatus: data.enrollment.status });
            }
        };
        fetchEnrollment();
    }, [enrollmentId, BACKEND_URL]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/enrollments/${enrollmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update enrollment.');
            }
            onSuccess();
        } catch (err) {
            console.error('Error updating enrollment:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-center">Edit Enrollment</h2>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            
            {/* Example: A dropdown for status */}
            <div>
                <label htmlFor="enrollmentStatus" className="block text-sm font-medium text-gray-700">Enrollment Status</label>
                <select
                    id="enrollmentStatus"
                    name="enrollmentStatus"
                    value={formData.enrollmentStatus}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={loading}
                >
                    <option value="enrolled">Enrolled</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="completed">Completed</option>
                </select>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    disabled={loading}
                >
                    <XCircle size={18} />
                    <span>Cancel</span>
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                    <Save size={18} />
                    <span>Save Changes</span>
                </button>
            </div>
        </form>
    );
};

export default EditEnrollmentForm;