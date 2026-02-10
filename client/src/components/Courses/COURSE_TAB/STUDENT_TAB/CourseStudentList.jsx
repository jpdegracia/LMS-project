import React, { useState, useEffect, useCallback, useContext } from 'react';
import { User, Mail, Edit, Trash2, PlusCircle, LayoutGrid, List, Search, Eye } from 'lucide-react';
import UserContext from '../../../UserContext/UserContext';
import Modal from '../../../Modal/Modal';
import EditEnrollmentForm from './EditEnrollmentForm';
import AddStudentToCoursePage from './AddStudentToCoursePage';
import { useNavigate } from 'react-router-dom';
import CourseListControls from '../../../Shared/CourseListControl'; 

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric', 
        hour12: true
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

const CourseStudentsList = ({ courseId }) => {
    const { hasPermission } = useContext(UserContext);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    
    // REMOVED: This state is no longer needed since it's a dedicated page now
    // const [showAddModal, setShowAddModal] = useState(false);

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    
    const [sortBy, setSortBy] = useState('lastName');
    const [sortDirection, setSortDirection] = useState('asc');

    const ITEMS_PER_PAGE = 10;

    const fetchEnrolledStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/enrollments/course/${courseId}/enrollees`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch enrolled students.');
            }

            const data = await response.json();
            
            if (data.success && data.data) {
                const studentList = data.data.map(enrollment => ({
                    _id: enrollment.user._id,
                    firstName: enrollment.user.firstName,
                    lastName: enrollment.user.lastName,
                    email: enrollment.user.email,
                    avatar: enrollment.user.avatar,
                    enrollmentDate: enrollment.enrollmentDate,
                    enrollmentId: enrollment.enrollmentId,
                    lastAccessedAt: enrollment.lastAccessedAt,
                    progressPercentage: enrollment.progressPercentage,
                }));
                setStudents(studentList);
            } else {
                setStudents([]);
            }
        } catch (err) {
            console.error('Error fetching students:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }, [courseId, BACKEND_URL]);

    useEffect(() => {
        fetchEnrolledStudents();
    }, [fetchEnrolledStudents]);

    useEffect(() => {
        setCurrentPage(1);
    }, [viewMode, searchQuery, sortBy, sortDirection]);

    const handleUnenroll = async (enrollmentId, studentName) => {
        if (!hasPermission('admin:enrollment:delete')) {
            alert("You don't have permission to unenroll students.");
            return;
        }
        if (window.confirm(`Are you sure you want to unenroll ${studentName}? This action cannot be undone.`)) {
            try {
                const response = await fetch(`${BACKEND_URL}/enrollments/${enrollmentId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to unenroll student.');
                }
                alert(`${studentName} has been successfully unenrolled.`);
                fetchEnrolledStudents();
            } catch (err) {
                console.error('Error unenrolling student:', err);
                alert(`Error: ${err.message}`);
            }
        }
    };

    const handleEditClick = (student) => {
        setSelectedStudent(student);
        setShowEditModal(true);
    };

    const handleViewProfileClick = (studentId) => {
        if (hasPermission('user:read')) {
            navigate(`/users/${studentId}`);
        } else {
            alert("You don't have permission to view user profiles.");
        }
    };
    
    const handleSortChange = (newSortBy, newSortDirection) => {
        setSortBy(newSortBy);
        setSortDirection(newSortDirection);
    };

    const sortedStudents = [...students].sort((a, b) => {
        const aValue = a[sortBy] || '';
        const bValue = b[sortBy] || '';

        if (sortBy === 'enrollmentDate' || sortBy === 'lastAccessedAt') {
            const aDate = new Date(aValue);
            const bDate = new Date(bValue);
            if (sortDirection === 'asc') {
                return aDate.getTime() - bDate.getTime();
            } else {
                return bDate.getTime() - aDate.getTime();
            }
        }
        
        if (sortBy === 'progressPercentage') {
            if (sortDirection === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        }

        if (sortDirection === 'asc') {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });

    const filteredAndSortedStudents = sortedStudents.filter(student => {
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase().trim();
        const studentEmail = student.email.toLowerCase().trim();
        const query = searchQuery.toLowerCase().trim();
        return (
            fullName.includes(query) ||
            studentEmail.includes(query)
        );
    });

    const totalPages = Math.ceil(filteredAndSortedStudents.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const studentsToDisplay = filteredAndSortedStudents.slice(startIndex, endIndex);

    const renderPaginationControls = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-center items-center space-x-2 mt-4">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <span className="text-gray-700">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        );
    };

    const paginationText = () => {
        const total = filteredAndSortedStudents.length;
        if (total === 0) {
            return "Currently viewing 0 users";
        }
        const start = startIndex + 1;
        const end = Math.min(startIndex + studentsToDisplay.length, total);
        return `Currently viewing ${start} to ${end} out of ${total} users`;
    };

    if (loading) {
        return <div className="p-4 text-center text-blue-600">Loading student list...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">Error: {error}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Enrolled Students ({students.length})</h2>
                {hasPermission('admin:enrollment:create') && (
                    <button
                        // FIX: Change to navigate to the new page
                        onClick={() => navigate(`/courses/${courseId}/add-student`)}
                        className="btn-create flex gap-2 cursor-pointer"
                    >
                        <PlusCircle size={20} />
                        <span>Add Student</span>
                    </button>
                )}
            </div>
            
            <div className="flex justify-between items-center mb-4">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 px-4 py-1 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search size={18} className="absolute right-3 text-gray-400" />
                </div>
                <CourseListControls
                    viewMode={viewMode}
                    onToggleView={setViewMode}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSortChange={handleSortChange}
                />
            </div>

            {filteredAndSortedStudents.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                    {searchQuery ? `No students match your search for "${searchQuery}".` : 'No students are currently enrolled in this course.'}
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {studentsToDisplay.map((student) => {
                                const studentAvatarSrc = student?.avatar && student.avatar.startsWith('http')
                                    ? student.avatar
                                    : `https://ui-avatars.com/api/?name=${student.firstName || 'U'}+${student.lastName || 'U'}&background=random&color=fff&size=96`;

                                return (
                                    <div key={student._id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-start justify-between space-x-4">
                                        <div className="flex items-start space-x-4">
                                            <img
                                                src={studentAvatarSrc}
                                                alt={`${student.firstName}'s avatar`}
                                                className="h-10 w-10 rounded-full object-cover flex-shrink-0 mt-1"
                                            />
                                            <div>
                                                <h3 
                                                    onClick={() => handleViewProfileClick(student._id)}
                                                    className="text-lg font-semibold text-gray-900 cursor-pointer hover:underline"
                                                >
                                                    {student.firstName} {student.lastName}
                                                </h3>
                                                <p className="text-sm text-gray-600 flex items-center space-x-1 mt-1">
                                                    <Mail size={16} />
                                                    <span>{student.email}</span>
                                                </p>
                                                {student.enrollmentDate && (
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        Enrolled: {formatDate(student.enrollmentDate)}
                                                    </p>
                                                )}
                                                {student.lastAccessedAt && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Last Access: {formatDateTime(student.lastAccessedAt)}
                                                    </p>
                                                )}
                                                {student.progressPercentage !== null && (
                                                    <div className="mt-2">
                                                        <p className="text-xs font-medium text-gray-500">Progress: {student.progressPercentage}%</p>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                            <div 
                                                                className="bg-blue-600 h-1.5 rounded-full" 
                                                                style={{ width: `${student.progressPercentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleViewProfileClick(student._id)}
                                                className="p-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                                                title="View Profile"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {hasPermission('admin:enrollment:update') && (
                                                <button
                                                    onClick={() => handleEditClick(student)}
                                                    className="p-1.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors duration-200 cursor-pointer"
                                                    title="Edit Enrollment"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                            )}
                                            {hasPermission('admin:enrollment:delete') && (
                                                <button
                                                    onClick={() => handleUnenroll(student.enrollmentId, `${student.firstName} ${student.lastName}`)}
                                                    className="p-1.5 rounded-full text-red-600 hover:bg-red-100 transition-colors duration-200 cursor-pointer"
                                                    title="Unenroll Student"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Student Name
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Enrolled On
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Last Accessed
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Progress
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {studentsToDisplay.map((student) => (
                                        <tr key={student._id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img
                                                            className="h-10 w-10 rounded-full object-cover"
                                                            src={student?.avatar || `https://ui-avatars.com/api/?name=${student.firstName || 'U'}+${student.lastName || 'U'}&background=random&color=fff&size=96`}
                                                            alt={`${student.firstName}'s avatar`}
                                                        />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div
                                                            onClick={() => handleViewProfileClick(student._id)}
                                                            className="text-sm font-medium text-gray-900 cursor-pointer hover:underline"
                                                        >
                                                            {student.firstName} {student.lastName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(student.enrollmentDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDateTime(student.lastAccessedAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="w-24">
                                                    <p className="text-xs font-medium mb-1">{student.progressPercentage}%</p>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div 
                                                            className="bg-blue-600 h-1.5 rounded-full" 
                                                            style={{ width: `${student.progressPercentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleViewProfileClick(student._id)}
                                                        className="p-1.5 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                                                        title="View Profile"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    {hasPermission('admin:enrollment:update') && (
                                                        <button
                                                            onClick={() => handleEditClick(student)}
                                                            className="p-1.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors duration-200"
                                                            title="Edit Enrollment"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {hasPermission('admin:enrollment:delete') && (
                                                        <button
                                                            onClick={() => handleUnenroll(student.enrollmentId, `${student.firstName} ${student.lastName}`)}
                                                            className="p-1.5 rounded-full text-red-600 hover:bg-red-100 transition-colors duration-200"
                                                            title="Unenroll Student"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex justify-end items-center mt-4">
                        {renderPaginationControls()}
                        <div className="text-sm text-gray-400 font-medium ml-4">
                            {paginationText()}
                        </div>
                    </div>
                </>
            )}
            
            {showEditModal && selectedStudent && (
                <Modal onClose={() => setShowEditModal(false)}>
                    <EditEnrollmentForm
                        enrollmentId={selectedStudent.enrollmentId}
                        onSuccess={() => {
                            setShowEditModal(false);
                            fetchEnrolledStudents();
                            alert("Enrollment updated successfully!");
                        }}
                        onCancel={() => setShowEditModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default CourseStudentsList;