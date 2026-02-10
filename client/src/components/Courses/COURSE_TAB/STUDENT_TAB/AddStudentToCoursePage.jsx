import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, XCircle, Search, ArrowLeft, Loader2 } from 'lucide-react';
import UserContext from '../../../UserContext/UserContext'; 
import StudentListControls from '../../../Shared/StudentListControl'; // UPDATED import path

const AddStudentToCoursePage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user, isLoggedIn, hasPermission, loading: userContextLoading } = useContext(UserContext);

    const [allStudents, setAllStudents] = useState([]);
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);

    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [viewMode, setViewMode] = useState('list'); 
    const [sortBy, setSortBy] = useState('lastName');
    const [sortDirection, setSortDirection] = useState('asc');

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        if (!userContextLoading && isLoggedIn && hasPermission('admin:enrollment:create')) {
            const fetchInitialData = async () => {
                setLoading(true);
                setError(null);
                
                try {
                    const [allUsersResponse, enrolledResponse] = await Promise.all([
                        fetch(`${BACKEND_URL}/users/`, { credentials: 'include' }), 
                        fetch(`${BACKEND_URL}/enrollments/course/${courseId}/enrollees`, { credentials: 'include' }),
                    ]);

                    const allUsersData = await allUsersResponse.json();
                    const enrolledData = await enrolledResponse.json();

                    if (!allUsersResponse.ok || !allUsersData.success) {
                        throw new Error(allUsersData.message || 'Failed to fetch all users.');
                    }
                    if (!enrolledResponse.ok || !enrolledData.success) {
                        throw new Error(enrolledData.message || 'Failed to fetch enrolled students.');
                    }
                    
                    const allUsersList = allUsersData.users || [];
                    const enrolledList = enrolledData.data || [];

                    const enrolledIds = new Set(enrolledList.map(e => e.user._id));
                    const filtered = allUsersList.filter(user => !enrolledIds.has(user._id));
                    
                    setAllStudents(allUsersList);
                    setEnrolledStudents(enrolledList);
                    setAvailableStudents(filtered);
                    
                } catch (err) {
                    console.error('Error fetching initial data:', err);
                    setError(err.message || 'An error occurred fetching data.');
                } finally {
                    setLoading(false);
                }
            };
            fetchInitialData();
        } else if (!userContextLoading && !isLoggedIn) {
            navigate('/login');
        } else if (!userContextLoading && !hasPermission('admin:enrollment:create')) {
            setError("You do not have permission to access this page.");
            setLoading(false);
        }
    }, [courseId, BACKEND_URL, userContextLoading, isLoggedIn, hasPermission, navigate]);

    const handleCancel = () => {
        navigate(-1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStudentId) {
            setError('Please select a student to enroll.');
            return;
        }
        setIsSubmitting(true);
        setError(null);

        try {
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
            
            navigate(-1);

        } catch (err) {
            console.error('Error adding student to course:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSortChange = (newSortBy, newSortDirection) => {
        setSortBy(newSortBy);
        setSortDirection(newSortDirection);
        setError(null);
    };
    
    const handleToggleView = (newViewMode) => {
        setViewMode(newViewMode);
        setError(null); 
    };

    const sortedStudents = [...availableStudents].sort((a, b) => {
        const aValue = a[sortBy] || '';
        const bValue = b[sortBy] || '';

        if (sortDirection === 'asc') {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });

    const filteredStudents = sortedStudents.filter(student => {
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase().trim();
        const studentEmail = student.email.toLowerCase().trim();
        const query = searchQuery.toLowerCase().trim();
        return (
            fullName.includes(query) ||
            studentEmail.includes(query)
        );
    });

    if (loading) {
        return <p className="text-center text-blue-600">Loading students...</p>;
    }

    return (
        <section className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto bg-white p-8 rounded-lg shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={handleCancel} className="btn-b flex items-center">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 flex-grow text-center">
                        Add Student to Course
                    </h1>
                    <div className="w-12"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="relative flex items-center flex-grow mr-4">
                            <input
                                type="text"
                                placeholder="Find user by name or email."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <StudentListControls
                            viewMode={viewMode}
                            onToggleView={handleToggleView}
                            sortBy={sortBy}
                            sortDirection={sortDirection}
                            onSortChange={handleSortChange}
                        />
                    </div>

                    {error && (
                        <div className="text-center text-red-500 mb-4 font-medium">
                            {error}
                        </div>
                    )}
                    
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border border-gray-300 rounded-md max-h-96 overflow-y-auto p-4 mb-4">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(student => {
                                    const studentAvatarSrc = student?.avatar && student.avatar.startsWith('http')
                                        ? student.avatar
                                        : `https://ui-avatars.com/api/?name=${student.firstName || 'U'}+${student.lastName || 'U'}&background=random&color=fff&size=96`;

                                    return (
                                        <div
                                            key={student._id}
                                            onClick={() => setSelectedStudentId(student._id)}
                                            className={`
                                                p-4 border rounded-md shadow-sm cursor-pointer transition-all duration-200 ease-in-out
                                                ${selectedStudentId === student._id ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-100'}
                                            `}
                                        >
                                            <div className="flex items-center mb-2">
                                                <img 
                                                    src={studentAvatarSrc} 
                                                    alt={`${student.firstName} ${student.lastName}`} 
                                                    className="w-10 h-10 rounded-full object-cover mr-3" 
                                                />
                                                <h3 className="font-semibold text-gray-900">{student.firstName} {student.lastName}</h3>
                                            </div>
                                            <p className="text-sm text-gray-500">{student.email}</p>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="col-span-full text-center text-gray-500 p-4">No students available to enroll.</p>
                            )}
                        </div>
                    ) : (
                        <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto mb-4">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(student => {
                                    const studentAvatarSrc = student?.avatar && student.avatar.startsWith('http')
                                        ? student.avatar
                                        : `https://ui-avatars.com/api/?name=${student.firstName || 'U'}+${student.lastName || 'U'}&background=random&color=fff&size=96`;

                                    return (
                                        <button
                                            type="button"
                                            key={student._id}
                                            onClick={() => setSelectedStudentId(student._id)}
                                            className={`
                                                w-full text-left p-3 border-b border-gray-200 last:border-b-0
                                                hover:bg-gray-100 transition-colors duration-150
                                                ${selectedStudentId === student._id ? 'bg-blue-100 text-blue-800 font-semibold' : ''}
                                            `}
                                        >
                                            <div className="flex items-center">
                                                <img 
                                                    src={studentAvatarSrc} 
                                                    alt={`${student.firstName} ${student.lastName}`} 
                                                    className="w-8 h-8 rounded-full object-cover mr-3" 
                                                />
                                                <div>
                                                    <p className="font-medium">{student.firstName} {student.lastName}</p>
                                                    <p className="text-sm text-gray-500">{student.email}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="text-center text-gray-500 p-4">No students available to enroll.</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            disabled={isSubmitting}
                        >
                            <XCircle size={18} />
                            <span>Cancel</span>
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedStudentId || isSubmitting}
                            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                            <Save size={18} />
                            <span>Enroll Student</span>
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default AddStudentToCoursePage;