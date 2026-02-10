import React, { useState, useEffect, useCallback, useContext } from 'react';
import { FileText, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import UserContext from '../../../UserContext/UserContext';
import { useNavigate } from 'react-router-dom';
import AttemptListControls from '../../../Shared/AttemptListControl';

const formatDate = (dateString) => {
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

const QuizAttemptsList = ({ courseId }) => {
    const { hasPermission } = useContext(UserContext);
    const navigate = useNavigate();

    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const [sortBy, setSortBy] = useState('attemptDate');
    const [sortDirection, setSortDirection] = useState('desc');
    const [viewMode, setViewMode] = useState('list');
    
    const [successMessage, setSuccessMessage] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const ITEMS_PER_PAGE = 10;

    const fetchQuizAttempts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!hasPermission('quiz_attempt:read:all')) {
                setError("You don't have permission to view quiz attempts.");
                setLoading(false);
                return;
            }

            const response = await fetch(`${BACKEND_URL}/quiz-attempts/course/${courseId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch quiz attempts.');
            }

            const data = await response.json();
            
            // --- ADDED CONSOLE.LOG FOR DEBUGGING ---
            console.log('API Response data from /quiz-attempts/course:', data);
            // ----------------------------------------
            
            if (data.success && data.attempts) {
                setAttempts(data.attempts);
            } else {
                setAttempts([]);
            }
        } catch (err) {
            console.error('Error fetching quiz attempts:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }, [courseId, BACKEND_URL, hasPermission]);

    useEffect(() => {
        fetchQuizAttempts();
    }, [fetchQuizAttempts]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortBy, sortDirection]);

    const sortedAndFilteredAttempts = [...attempts]
        .filter(attempt => {
            const studentName = `${attempt.userId?.firstName || ''} ${attempt.userId?.lastName || ''}`.toLowerCase();
            const quizTitle = attempt.quizTitle?.toLowerCase() || '';
            const sectionTitle = attempt.section?.toLowerCase() || '';
            const query = searchQuery.toLowerCase().trim();
            return (
                studentName.includes(query) ||
                quizTitle.includes(query) ||
                sectionTitle.includes(query)
            );
        })
        .sort((a, b) => {
            let aValue, bValue;
            
            if (sortBy === 'studentName') {
                aValue = `${a.userId?.lastName || ''} ${a.userId?.firstName || ''}`;
                bValue = `${b.userId?.lastName || ''} ${b.userId?.firstName || ''}`;
            } else if (sortBy === 'quizTitle') {
                aValue = a.quizTitle || '';
                bValue = b.quizTitle || '';
            } else if (sortBy === 'attemptDate') {
                aValue = new Date(a.createdAt);
                bValue = new Date(b.createdAt);
            }
            
            if (typeof aValue === 'string') {
                const comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
                return sortDirection === 'asc' ? comparison : -comparison;
            } else {
                const comparison = aValue - bValue;
                return sortDirection === 'asc' ? comparison : -comparison;
            }
        });
    
    const totalPages = Math.ceil(sortedAndFilteredAttempts.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const attemptsToDisplay = sortedAndFilteredAttempts.slice(startIndex, endIndex);

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
        const total = sortedAndFilteredAttempts.length;
        if (total === 0) {
            return "Currently viewing 0 users";
        }
        const start = startIndex + 1;
        const end = Math.min(startIndex + attemptsToDisplay.length, total);
        return `Currently viewing ${start} to ${end} out of ${total} users`;
    };

    const handleSortChange = (newSortBy, newSortDirection) => {
        setSortBy(newSortBy);
        setSortDirection(newSortDirection);
    };

    const handleDeleteClick = async (attemptId) => {
        if (window.confirm("Are you sure you want to delete this quiz attempt? This action cannot be undone.")) {
            try {
                const response = await fetch(`${BACKEND_URL}/quiz-attempts/${attemptId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete quiz attempt.');
                }
                setAttempts(attempts.filter(a => a._id !== attemptId));
                setSuccessMessage("Quiz attempt deleted successfully!");
            } catch (err) {
                console.error('Error deleting quiz attempt:', err);
                setError(err.message || 'An unexpected error occurred during deletion.');
            }
        }
    };
    
    if (loading) {
        return <div className="p-4 text-center text-blue-600">Loading quiz attempts...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">Error: {error}</div>;
    }

    if (attempts.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">
                No quiz attempts have been recorded for this course.
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quiz Attempts:</h2>

            <div className="flex justify-between items-center mb-4">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        placeholder="Search attempts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 px-4 py-1 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search size={18} className="absolute right-3 text-gray-400" />
                </div>
                <AttemptListControls 
                    viewMode={viewMode}
                    onToggleView={setViewMode}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSortChange={handleSortChange}
                />
            </div>
            
            {successMessage && (
                <div className="p-4 rounded-md bg-green-100 text-green-700 font-medium">
                    {successMessage}
                </div>
            )}

            {sortedAndFilteredAttempts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                    {searchQuery ? `No attempts match your search for "${searchQuery}".` : 'No attempts have been recorded for this course.'}
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Student
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quiz Title
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Section
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Score
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Attempt Date
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {attemptsToDisplay.map((attempt) => {
                                    const durationMinutes = attempt.duration ? Math.round(attempt.duration / 60) : null;
                                    
                                    return (
                                        <tr key={attempt._id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    <div className="h-10 w-10 flex-shrink-0">
                                                        <img 
                                                            className="h-10 w-10 rounded-full object-cover"
                                                            src={attempt.userId?.avatar || `https://ui-avatars.com/api/?name=${attempt.userId?.firstName || ''}+${attempt.userId?.lastName || ''}&background=random&color=fff&size=96`} 
                                                            alt={`${attempt.userId?.firstName}'s avatar`} 
                                                        />
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {attempt.userId?.firstName} {attempt.userId?.lastName}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {attempt.quizTitle || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {attempt.section || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {attempt.score} / {attempt.totalPointsPossible}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                {attempt.passed ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Passed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <XCircle className="w-3 h-3 mr-1" /> Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(attempt.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        className="p-1.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors duration-200"
                                                        title="View Attempt Details"
                                                        onClick={() => navigate(`/attempts/${attempt._id}`)}
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    {hasPermission('quiz_attempt:delete') && (
                                                        <button 
                                                            className="p-1.5 rounded-full text-red-600 hover:bg-red-100 transition-colors duration-200"
                                                            title="Delete Attempt"
                                                            onClick={() => handleDeleteClick(attempt._id)}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end items-center mt-4">
                        {renderPaginationControls()}
                        <div className="text-sm text-gray-400 font-medium ml-4">
                            {paginationText()}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default QuizAttemptsList;