import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, ListChecks, Search, HelpCircle, ScanEyeIcon } from 'lucide-react';
import UserContext from '../UserContext/UserContext';

const QuizManagementPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);

    const [quizzes, setQuizzes] = useState([]);
    const [subjects, setSubjects] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [loadingSubjects, setLoadingSubjects] = useState(true); 
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    const [filterText, setFilterText] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('all'); 
    const [sortOrder, setSortOrder] = useState('default');

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- HELPER: Calculate Total Questions (Handles SAT vs Standard) ---
    const getQuestionCount = (quiz) => {
        // Check if it's an SAT quiz with strands
        if (quiz.satSettings?.isSAT && quiz.satSettings.strands?.length > 0) {
            // Sum up questions from all strands
            return quiz.satSettings.strands.reduce((total, strand) => {
                return total + (strand.questions ? strand.questions.length : 0);
            }, 0);
        }
        // Fallback for Standard Quiz
        return quiz.questions ? quiz.questions.length : 0;
    };

    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setLoadingSubjects(true);
        setError(null);
        try {
            const [modulesResponse, subjectsResponse] = await Promise.all([
                fetch(`${BACKEND_URL}/modules`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/subjects`, { credentials: 'include' })
            ]);

            const [modulesData, subjectsData] = await Promise.all([
                modulesResponse.json(),
                subjectsResponse.json()
            ]);
            
            if (modulesData.success) {
                // Filter modules to only show quizzes
                const allQuizModules = (modulesData.data || []).filter(module => module.moduleType === 'quiz');
                
                // Use a Map to store unique modules by their _id (safety check)
                const uniqueQuizzes = new Map();
                allQuizModules.forEach(quiz => {
                    uniqueQuizzes.set(quiz._id, quiz);
                });

                setQuizzes(Array.from(uniqueQuizzes.values()));

            } else {
                throw new Error(modulesData.message || 'Failed to retrieve modules data.');
            }

            if (subjectsData.success) {
                setSubjects(subjectsData.data || []); 
            } else {
                throw new Error(subjectsData.message || 'Failed to retrieve subjects data.'); 
            }

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Failed to load quizzes or subjects.'); 
        } finally {
            setLoading(false);
            setLoadingSubjects(false); 
        }
    }, [BACKEND_URL]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteQuiz = useCallback(async (quizId) => {
        if (!hasPermission('module:delete')) {
            alert("You don't have permission to delete quizzes.");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this quiz module? This action cannot be undone.")) {
            return;
        }

        setLoading(true);
        setSuccessMessage(null);
        setError(null);

        try {
            const response = await fetch(`${BACKEND_URL}/modules/${quizId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete quiz module.');
            }

            setSuccessMessage('Quiz module deleted successfully!');
            fetchData(); // Refresh list
        } catch (err) {
            console.error('Error deleting quiz module:', err);
            setError(err.message || 'Error deleting quiz module.');
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL, fetchData, hasPermission]);
    
    const handleAddQuizClick = () => {
        navigate('/add-quiz');
    };

    const filteredAndSortedQuizzes = quizzes
        .filter(quiz =>
            (selectedSubject === 'all' || quiz.subjectId?._id === selectedSubject) && 
            (getCleanPlainText(quiz.title).toLowerCase().includes(filterText.toLowerCase()) ||
            getCleanPlainText(quiz.description || '').toLowerCase().includes(filterText.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortOrder === 'title-asc') {
                return getCleanPlainText(a.title).localeCompare(getCleanPlainText(b.title));
            } else if (sortOrder === 'title-desc') {
                return getCleanPlainText(b.title).localeCompare(getCleanPlainText(a.title));
            } else if (sortOrder === 'status-asc') {
                return a.status.localeCompare(b.status);
            } else if (sortOrder === 'status-desc') {
                return b.status.localeCompare(a.status);
            }
            return 0;
        });

    const canCreateQuiz = hasPermission('quiz:create');
    const canEditQuizSettings = hasPermission('module:update');
    const canViewQuizDetails = hasPermission('quiz:read');
    const canManageQuizQuestions = hasPermission('question:update') || hasPermission('question:read') || hasPermission('question:create');

    if (!hasPermission('quiz:read:all')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to view quiz management.</p>
            </div>
        );
    }

    if (loading || loadingSubjects) { 
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading quizzes and subjects...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-red-600">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="container-2 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter">
            <main className="mx-auto px-6 max-w-9xl">
                <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-8">
                    <h2 className="text-4xl font-bold text-gray-800 mb-6 text-center">Quiz Module Management</h2>
                    
                    {successMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{successMessage}</span>
                            <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setSuccessMessage(null)}>
                                <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.15a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.03a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.15 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                            </span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{error}</span>
                            <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setError(null)}>
                                <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.15a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.03a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.15 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                            </span>
                        </div>
                    )}

                    <div className="flex justify-end mb-6">
                        {canCreateQuiz && (
                            <button
                                onClick={handleAddQuizClick}
                                className="btn-create flex gap-2 cursor-pointer"
                            >
                                <PlusCircle size={20} />
                                <span>Add New Quiz</span>
                            </button>
                        )}
                    </div>
                    
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search quizzes by title or description..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                disabled={loading}
                            />
                            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        
                        <div className="flex-1">
                            <label htmlFor="subjectFilter" className="sr-only">Filter by Subject</label>
                            <select
                                id="subjectFilter"
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base cursor-pointer"
                                disabled={loading || loadingSubjects}
                            >
                                <option value="all">All Subjects</option>
                                {subjects.map(subject => (
                                    <option key={subject._id} value={subject._id}>
                                        {subject.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex-1">
                            <label htmlFor="sortOrder" className="sr-only">Sort By</label>
                            <select
                                id="sortOrder"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base cursor-pointer"
                                disabled={loading}
                            >
                                <option value="default">Default Order</option>
                                <option value="title-asc">Title (A-Z)</option>
                                <option value="title-desc">Title (Z-A)</option>
                                <option value="status-asc">Status (A-Z)</option>
                                <option value="status-desc">Status (Z-A)</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    {filteredAndSortedQuizzes.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg shadow-md">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredAndSortedQuizzes.map((quiz) => (
                                        <tr key={quiz._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quiz.title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {quiz.description ? quiz.description.substring(0, 55) + (quiz.description.length > 55 ? '...' : '') : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {quiz.categoryId?.name || 'Uncategorized'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {quiz.subjectId?.name || 'Uncategorized'} 
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {/* ⭐ Use Helper function here */}
                                                {getQuestionCount(quiz)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    quiz.status === 'published' ? 'bg-green-100 text-green-800' :
                                                    quiz.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {quiz.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    {canViewQuizDetails && (
                                                        <button
                                                            onClick={() => navigate(`/view-quiz/${quiz._id}`)}
                                                            className='text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer'
                                                            title="View Quiz Details"
                                                        >
                                                            <ScanEyeIcon size={18} />
                                                        </button>
                                                    )}
                                                    {canEditQuizSettings && (
                                                        <button
                                                            onClick={() => navigate(`/edit-quiz/${quiz._id}`)}
                                                            className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                                                            title="Edit Quiz Settings"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {canManageQuizQuestions && (
                                                        <button
                                                            // ⭐ Fixed Routing to match other pages
                                                            onClick={() => navigate(`/manage-quiz-questions/${quiz._id}`)}
                                                            className="text-purple-600 hover:text-purple-900 p-1 rounded-md hover:bg-purple-50 transition-colors cursor-pointer"
                                                            title="Manage Quiz Questions"
                                                        >
                                                            <ListChecks size={18} />
                                                        </button>
                                                    )}
                                                    {hasPermission('module:delete') && (
                                                        <button
                                                            onClick={() => handleDeleteQuiz(quiz._id)}
                                                            className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                                            title="Delete Quiz"
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
                    ) : (
                        <p className="text-center text-gray-500">No quizzes found.</p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default QuizManagementPage;