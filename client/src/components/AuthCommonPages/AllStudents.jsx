import React, { useEffect, useState, useContext } from 'react';
import UserContext from '../UserContext/UserContext';


const AllStudents = () => {
    const { hasPermission, loading: contextLoading } = useContext(UserContext); 

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStudentsData = async () => {
            if (contextLoading) return;

            // Frontend permission check: User must have user:read:all OR view:all_students
            // This is a client-side check for early feedback. Backend will do server-side.
            if (!hasPermission('user:read:all') && !hasPermission('view:all_students')) { 
                const noPermissionError = "You don't have permission to view all students.";
                setError(noPermissionError);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // --- CRITICAL: Fetch ALL users from the NEW general endpoint ---
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/all-users`, { // <-- ENSURE THIS IS THE URL
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                if (data.success && Array.isArray(data.users)) {
                    const studentUsers = data.users.filter(user => 
                        user.roles && user.roles.some(role => role.name === 'student')
                    );
                    setStudents(studentUsers);
                } else {
                    throw new Error(data.message || 'Failed to fetch users or invalid response structure.');
                }

            } catch (err) {
                console.error('Failed to fetch students:', err);
                setError(err.response?.data?.message || err.message || 'An unexpected error occurred.');
            } finally {
                setLoading(false);
            }
        };

        if (!contextLoading) {
            fetchStudentsData();
        }
    }, [contextLoading, hasPermission]); // Depend on contextLoading and hasPermission


    if (loading) {
        return <div className="text-center p-8 text-lg">Loading students...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8 text-lg">Error: {error}</div>;
    }

    if (students.length === 0) {
        return <div className="text-center text-gray-600 p-8 text-lg">No registered students found.</div>;
    }

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Registered Students</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                    <thead>
                        <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                            <th className="py-3 px-6 border-b border-gray-200">Name</th>
                            <th className="py-3 px-6 border-b border-gray-200">Email</th>
                            <th className="py-3 px-6 border-b border-gray-200">ID Number</th>
                            <th className="py-3 px-6 border-b border-gray-200">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm font-light">
                        {students.map((student) => (
                            <tr key={student._id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-6 whitespace-nowrap">{student.firstName} {student.lastName}</td>
                                <td className="py-3 px-6">{student.email}</td>
                                <td className="py-3 px-6 whitespace-nowrap">{student.IDnumber || 'N/A'}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {student.isVerified ? 'Verified' : 'Pending'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AllStudents;