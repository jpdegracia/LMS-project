import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
// 1. Import useSearchParams
import { useNavigate, useSearchParams } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';

import {
    PlusCircle, Edit, Trash2, Eye, BookOpen, Clock, Tag, UserRound,
    HelpCircle, FileText, Code, CheckCircle, BookOpenCheck,
    Filter, ArrowDownNarrowWide, ArrowUpWideNarrow,
    ChevronLeft, ChevronRight,
    Hash, AlignLeft
} from 'lucide-react';

const QuestionBankManagementPage = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);

    const { isLoggedIn, userLoading, hasPermission } = useContext(UserContext);
    const navigate = useNavigate();
    // 2. Initialize useSearchParams
    const [searchParams, setSearchParams] = useSearchParams();

    // --- PAGINATION STATE (Initialize from URL or default) ---
    // 3. Read initial page from URL param 'page', default to 1
    const initialPage = parseInt(searchParams.get('page') || '1', 10);
    const [currentPage, setCurrentPage] = useState(initialPage > 0 ? initialPage : 1);
    const questionsPerPage = 10;
    // --- END PAGINATION STATE ---

    // --- FILTER & SORT STATE (Initialize from URL or default) ---
    // 3. Read initial filters/sort from URL params or use defaults
    const [filterType, setFilterType] = useState(searchParams.get('type') || 'all');
    const [filterSubject, setFilterSubject] = useState(searchParams.get('subject') || 'all');
    // 🚀 Update default sort if questionTitle should be the new default
    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt'); 
    const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
    // --- END FILTER & SORT STATE ---

    const canCreateQuestion = hasPermission('question:create');
    const canReadQuestions = hasPermission('question:read:all');
    const canReadSingleQuestion = hasPermission('question:read');
    const canUpdateQuestion = hasPermission('question:update');
    const canDeleteQuestion = hasPermission('question:delete');

    // --- Helper function to safely extract plain text from HTML (Kept for fallback/legacy, though we now use title) ---
    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    // --- Fetch Questions ---
    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!canReadQuestions) {
                setLoading(false);
                navigate('/dashboard');
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/questions`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setQuestions(data.data || []);
            } else {
                throw new Error(data.message || "Failed to retrieve questions.");
            }
        } catch (err) {
            console.error("Failed to fetch questions:", err);
            setError(err.message || "Failed to load questions. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [canReadQuestions, navigate]);

    // --- Fetch Subjects ---
    const fetchSubjects = useCallback(async () => {
        setLoadingSubjects(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/subjects`, { credentials: 'include' });
            if (!response.ok) { throw new Error('Failed to fetch subjects.'); }
            const data = await response.json();
            if (data.success) { setSubjects(data.data); }
            else { throw new Error(data.message || 'Failed to retrieve subjects data.'); }
        } catch (err) {
            console.error('Error fetching subjects:', err);
        } finally { setLoadingSubjects(false); }
    }, []);

    // --- Navigation Handlers ---
    const handleEditClick = useCallback((question) => {
        navigate(`/questions/edit/${question._id}`);
    }, [navigate]);

    const handleViewClick = useCallback((question) => {
        navigate(`/questions/${question._id}`);
    }, [navigate]);

    // --- Delete Handler ---
    const handleDeleteQuestion = async (question) => {
        if (!canDeleteQuestion) return;

        // 🚀 Use the questionTitle in the confirmation dialog
        const confirmed = window.confirm(`Are you sure you want to delete the question: "${question.questionTitle || getCleanPlainText(question.questionTextRaw)}"?`);

        if (confirmed) {
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/questions/${question._id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete question.');
                }
                fetchQuestions(); // Refetch after successful delete
            } catch (err) {
                console.error('Error deleting question:', err);
                alert('Error deleting question: ' + err.message); // Show error to user
            }
        }
    };

    // --- Icon Helper ---
    const getQuestionTypeIcon = (type) => {
        switch (type) {
            case 'multipleChoice': return <BookOpenCheck size={16} className="text-blue-500" />;
            case 'trueFalse': return <CheckCircle size={16} className="text-green-500" />;
            case 'shortAnswer': return <Code size={16} className="text-purple-500" />;
            case 'numerical': return <Hash size={16} className="text-pink-500" />;
            case 'essay': return <AlignLeft size={16} className="text-red-500" />;
            default: return <HelpCircle size={16} className="text-gray-500" />;
        }
    };

    // --- Initial Data Fetch Effect ---
    useEffect(() => {
        if (!userLoading) {
            if (isLoggedIn && canReadQuestions) {
                fetchQuestions();
                fetchSubjects();
            } else if (!isLoggedIn) {
                navigate('/login');
            } else if (!canReadQuestions) {
                navigate('/dashboard');
            }
        }
    }, [userLoading, isLoggedIn, canReadQuestions, fetchQuestions, fetchSubjects, navigate]);

    // --- 4. URL Update Effect (Unchanged) ---
    useEffect(() => {
        const params = {};
        if (currentPage > 1) params.page = currentPage.toString();
        if (filterType !== 'all') params.type = filterType;
        if (filterSubject !== 'all') params.subject = filterSubject;
        if (sortBy !== 'createdAt') params.sortBy = sortBy;
        if (sortOrder !== 'desc') params.sortOrder = sortOrder;

        // Use { replace: true } to avoid pushing state changes into browser history
        setSearchParams(params, { replace: true });
    }, [currentPage, filterType, filterSubject, sortBy, sortOrder, setSearchParams]);
    // --- END URL Update Effect ---

    // --- Filtered and Sorted Questions ---
    const filteredAndSortedQuestions = useMemo(() => {
        let currentQuestions = [...questions];

        if (filterType !== 'all') {
            currentQuestions = currentQuestions.filter(q => q.questionType === filterType);
        }
        if (filterSubject !== 'all') {
            currentQuestions = currentQuestions.filter(q => q.subject?._id === filterSubject);
        }

        currentQuestions.sort((a, b) => {
            let valA, valB;
            switch (sortBy) {
                // 🚀 UPDATE: Sort by questionTitle instead of questionText
                case 'questionTitle':
                    const titleA = a.questionTitle?.toLowerCase() || '';
                    const titleB = b.questionTitle?.toLowerCase() || '';
                    return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
                case 'createdAt':
                    valA = new Date(a.createdAt).getTime();
                    valB = new Date(b.createdAt).getTime();
                    return sortOrder === 'asc' ? valA - valB : valB - valA;
                case 'difficulty':
                    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
                    valA = difficultyOrder[a.difficulty] || 0;
                    valB = difficultyOrder[b.difficulty] || 0;
                    return sortOrder === 'asc' ? valA - valB : valB - valA;
                case 'subject':
                    const subjectA = a.subject?.name?.toLowerCase() || '';
                    const subjectB = b.subject?.name?.toLowerCase() || '';
                    return sortOrder === 'asc' ? subjectA.localeCompare(subjectB) : subjectB.localeCompare(subjectA);
                case 'status':
                    const statusOrder = { 'draft': 1, 'published': 2, 'archived': 3 };
                    valA = statusOrder[a.status] || 0;
                    valB = statusOrder[b.status] || 0;
                    return sortOrder === 'asc' ? valA - valB : valB - valA;
                default:
                    return 0;
            }
        });

        return currentQuestions;
    }, [questions, filterType, filterSubject, sortBy, sortOrder]); // Removed getCleanPlainText dependency

    // --- Apply Pagination (Unchanged) ---
    const { paginatedQuestions, totalPages, totalFilteredCount } = useMemo(() => {
        const totalFilteredCount = filteredAndSortedQuestions.length;
        const totalPages = Math.ceil(totalFilteredCount / questionsPerPage);

        // Ensure currentPage is valid after filtering might change totalPages
        const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages > 0 ? totalPages : 1);
        // If the calculated valid page is different from the state, update the state (and URL via useEffect)
        if (validCurrentPage !== currentPage && totalFilteredCount > 0) {
            setCurrentPage(validCurrentPage);
        }

        const startIndex = (validCurrentPage - 1) * questionsPerPage;
        const endIndex = startIndex + questionsPerPage;
        const paginatedQuestions = filteredAndSortedQuestions.slice(startIndex, endIndex);

        return { paginatedQuestions, totalPages, totalFilteredCount };
    }, [filteredAndSortedQuestions, currentPage, questionsPerPage, setCurrentPage]); // Add setCurrentPage dependency

    // --- Loading/Error/Permission Checks (Unchanged) ---
    if (loading || userLoading || loadingSubjects) {
        return <div className="p-6 text-center text-blue-600">Loading questions and subjects...</div>;
    }
    if (error) {
        return <div className="p-6 text-center text-red-500">Error: {error}</div>;
    }
    if (!isLoggedIn) {
        return <div className="p-6 text-center text-red-500">You must be logged in to access this page.</div>;
    }
    if (!canReadQuestions) {
        return <div className="p-6 text-center text-red-500">Access Denied: You do not have permission to view questions.</div>;
    }

    // --- Pagination Button Renderer (Unchanged) ---
    const renderPaginationButton = (page) => {
        const isCurrent = page === currentPage;
        return (
            <button
                key={page}
                onClick={() => setCurrentPage(page)} // This triggers the useEffect to update URL
                className={`w-10 h-10 rounded-full font-medium transition-colors duration-150 text-sm cursor-pointer
                    ${isCurrent
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200'
                    }`}
            >
                {page}
            </button>
        );
    };

    // --- Pagination Controls Renderer (Unchanged) ---
    const renderPaginationControls = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        pages.push(1); // Always show first page

        if (currentPage > 3) pages.push('...');

        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            if (!pages.includes(i)) pages.push(i);
        }

        if (currentPage < totalPages - 2) pages.push('...');

        if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages);

        return (
            <div className="flex justify-between items-center mt-6 py-4 px-4 bg-white rounded-xl shadow-lg border-t border-gray-200">
                <div className="text-sm text-gray-700 hidden sm:block">
                    {totalFilteredCount > 0 ? (
                        <p>
                            Showing <span className="font-semibold">{(currentPage - 1) * questionsPerPage + 1}</span> to <span className="font-semibold">{Math.min(currentPage * questionsPerPage, totalFilteredCount)}</span> of <span className="font-semibold">{totalFilteredCount}</span> matching results
                        </p>
                    ) : (
                        <p>No questions match your current filters.</p>
                    )}
                </div>
                <div className="flex items-center space-x-2 mx-auto sm:mx-0">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title="Previous Page"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    {pages.map((page, index) => (
                        page === '...'
                            ? <span key={`dot-${index}`} className="text-gray-500 font-bold px-1 select-none">...</span>
                            : renderPaginationButton(page)
                    ))}
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title="Next Page"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    };


    // --- MAIN RENDER ---
    return (
        <div className="container-2 p-6 bg-gray-50 min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-sm">
                <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Questions Bank</h1>
                {canCreateQuestion && (
                    <button
                        onClick={() => navigate('/question-bank-management/add')}
                        className="btn-create flex gap-3 cursor-pointer"
                    >
                        <PlusCircle size={20} />
                        <span>Add New Question</span>
                    </button>
                )}
            </div>

            {/* Filters and Sorting */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between">
                {/* Filters */}
                <div className="flex items-center gap-2">
                    <Filter size={20} className="text-gray-600" />
                    <span className="font-medium text-gray-700">Filter By:</span>
                    <select
                        className="border border-gray-300 rounded-md p-2 text-sm"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)} // Triggers URL update via useEffect
                    >
                        <option value="all">All Types</option>
                        <option value="multipleChoice">Multiple Choice</option>
                        <option value="trueFalse">True/False</option>
                        <option value="shortAnswer">Short Answer</option>
                        <option value="numerical">Numerical</option>
                        <option value="essay">Essay</option>
                    </select>
                    <select
                        className="border border-gray-300 rounded-md p-2 text-sm"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)} // Triggers URL update via useEffect
                    >
                        <option value="all">All Subjects</option>
                        {subjects.map(sub => (
                            <option key={sub._id} value={sub._id}>{sub.name}</option>
                        ))}
                    </select>
                </div>

                {/* Sorting */}
                <div className="flex items-center gap-2">
                    {sortOrder === 'asc' ? <ArrowUpWideNarrow size={20} className="text-gray-600" /> : <ArrowDownNarrowWide size={20} className="text-gray-600" />}
                    <span className="font-medium text-gray-700">Sort By:</span>
                    <select
                        className="border border-gray-300 rounded-md p-2 text-sm"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)} // Triggers URL update via useEffect
                    >
                        <option value="createdAt">Date Created</option>
                        {/* 🚀 UPDATE: Change option label and value for sorting by title */}
                        <option value="questionTitle">Question Title</option>
                        <option value="difficulty">Difficulty</option>
                        <option value="subject">Subject</option>
                        <option value="status">Status</option>
                    </select>
                    <button
                        className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} // Triggers URL update via useEffect
                        title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                    >
                        {sortOrder === 'asc' ? <ArrowUpWideNarrow size={18} /> : <ArrowDownNarrowWide size={18} />}
                    </button>
                </div>

                {/* Total Count */}
                <div className="flex-grow text-right text-sm font-medium text-gray-600">
                    Showing Total Questions: <span className="font-semibold">{questions.length}</span>
                </div>
            </div>

            {/* Questions Table or No Results Message */}
            {totalFilteredCount === 0 ? (
                <div className="text-center mt-12 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                    <p className="text-2xl font-semibold text-gray-600 mb-4">No Questions Found</p>
                    <p className="text-lg text-gray-500">
                        {questions.length > 0 ? "Adjust your filters or clear them to see more questions." : "It looks like your question bank is empty."}
                    </p>
                    {canCreateQuestion && questions.length === 0 && (
                        <p className="text-lg text-gray-500 mt-2">Click "Add New Question" to create your first question!</p>
                    )}
                </div>
            ) : (
                <>
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden my-4 border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {/* 🚀 UPDATE: Change Header to 'Question Title' */}
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Question Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Difficulty</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedQuestions.map((question) => (
                                        <tr key={question._id} className="hover:bg-gray-50 transition-colors duration-100">
                                            {/* 🚀 UPDATE: Display Question Title - Simple, non-truncating cell */}
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" style={{ maxWidth: '300px' }}>
                                                {question.questionTitle || 'No Title Provided'}
                                            </td>
                                            
                                            {/* Type */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className="inline-flex items-center space-x-1">
                                                    {getQuestionTypeIcon(question.questionType)}
                                                    <span>{question.questionType ? question.questionType.charAt(0).toUpperCase() + question.questionType.slice(1) : 'N/A'}</span>
                                                </span>
                                            </td>
                                            {/* Subject */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {question.subject ? question.subject.name : 'N/A'}
                                            </td>
                                            {/* Difficulty */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{question.difficulty || 'N/A'}</td>
                                            {/* Status */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{question.status || 'N/A'}</td>
                                            {/* Created At */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className="inline-flex items-center space-x-1">
                                                    <Clock size={14} className="text-yellow-500" />
                                                    <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    {canReadSingleQuestion && (
                                                        <button onClick={() => handleViewClick(question)} className="btn-view flex" title="View Question Details">
                                                            <Eye size={16} /> <span className="ml-1 hidden lg:inline cursor-pointer">View</span>
                                                        </button>
                                                    )}
                                                    {canUpdateQuestion && (
                                                        <button onClick={() => handleEditClick(question)} className="btn-edit flex" title="Edit Question">
                                                            <Edit size={16} /> <span className="ml-1 hidden lg:inline cursor-pointer">Edit</span>
                                                        </button>
                                                    )}
                                                    {canDeleteQuestion && (
                                                        <button onClick={() => handleDeleteQuestion(question)} className="btn-delete flex" title="Delete Question">
                                                            <Trash2 size={16} /> <span className="ml-1 hidden lg:inline cursor-pointer">Delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Pagination Controls */}
                    {renderPaginationControls()}
                </>
            )}
        </div>
    );
};

export default QuestionBankManagementPage;