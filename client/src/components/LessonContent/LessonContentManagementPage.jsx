import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
import { 
    PlusCircle, Edit, Trash2, Eye, Clock, Filter, ArrowDownNarrowWide, ArrowUpWideNarrow, 
    ChevronLeft, ChevronRight 
} from 'lucide-react'; 


const LessonContentManagementPage = () => {
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false); // Only used to control navigation trigger

    // ⭐ SUBJECT STATE
    const [filterSubject, setFilterSubject] = useState('all'); 
    const [sortBy, setSortBy] = useState('createdAt'); 
    const [sortOrder, setSortOrder] = useState('desc'); 
    const [subjects, setSubjects] = useState([]); 
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    
    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const contentsPerPage = 15; 
    // --- END PAGINATION STATE ---

    const { isLoggedIn, userLoading, hasPermission } = useContext(UserContext);
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- PERMISSIONS ---
    const canCreateContent = hasPermission('lesson_content:create');
    const canReadContents = hasPermission('lesson_content:read:all'); 
    const canReadSingleContent = hasPermission('lesson_content:read'); 
    const canUpdateContent = hasPermission('lesson_content:update'); 
    const canDeleteContent = hasPermission('lesson_content:delete');
    // --- END PERMISSIONS ---

    const fetchLessonContents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!canReadContents) {
                console.error("Permission Denied: Cannot view lesson content management list.");
                setLoading(false);
                navigate('/dashboard');
                return;
            }

            const response = await fetch(`${BACKEND_URL}/lesson-content`, {
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
                setContents(data.data || []);
            } else {
                throw new Error(data.message || "Failed to retrieve lesson content.");
            }
        } catch (err) {
            console.error("Failed to fetch lesson content:", err);
            setError(err.message || "Failed to load lesson content. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [canReadContents, navigate, BACKEND_URL]);

    // ⭐ FETCH SUBJECTS
    const fetchSubjects = useCallback(async () => {
        setLoadingSubjects(true);
        try {
            const response = await fetch(`${BACKEND_URL}/subjects`, { credentials: 'include' });
            if (!response.ok) { throw new Error('Failed to fetch subjects.'); }
            const data = await response.json();
            if (data.success) { setSubjects(data.data); }
            else { throw new Error(data.message || 'Failed to retrieve subjects data.'); }
        } catch (err) {
            console.error('Error fetching subjects for lesson content:', err);
        } finally { setLoadingSubjects(false); }
    }, [BACKEND_URL]);

    const handleDeleteContent = async (contentId, contentTitle) => {
        if (!canDeleteContent) {
            console.error("Permission Denied: Cannot delete lesson content.");
            return;
        }
        
        const confirmed = window.confirm(`Are you sure you want to delete the content: "${contentTitle}"?`); 

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/lesson-content/${contentId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete lesson content.');
            }

            console.log('Lesson content deleted successfully!'); 
            fetchLessonContents(); 
        } catch (err) {
            console.error('Error deleting lesson content:', err);
            console.error(err.message || 'Error deleting lesson content. It might be in use by a module.');
        }
    };

    const getPlainTextFromHtml = useCallback((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }, []);

    useEffect(() => {
        if (!userLoading) {
            if (isLoggedIn && canReadContents) { 
                fetchLessonContents();
                fetchSubjects(); 
            } else if (!isLoggedIn) {
                 console.log("Please log in to manage lesson content.");
                 navigate('/login');
            } else if (!canReadContents) { 
                 console.log("Access Denied: You do not have permission to view lesson content.");
                 navigate('/dashboard');
            }
        }
    }, [userLoading, isLoggedIn, canReadContents, fetchLessonContents, fetchSubjects, navigate]); 
    
    useEffect(() => {
        setCurrentPage(1);
    }, [filterSubject, sortBy, sortOrder]); 


    // Filtering, Sorting, AND PAGINATION Logic combined
    const { totalFilteredCount, totalPages, paginatedContents } = useMemo(() => {
        let currentContents = [...contents]; 

        // 1. Apply Filters
        if (filterSubject !== 'all') {
            currentContents = currentContents.filter(c => c.subject?._id === filterSubject);
        }

        // 2. Apply Sorting
        currentContents.sort((a, b) => {
            let valA, valB;

            switch (sortBy) {
                case 'title':
                    valA = a.title?.toLowerCase() || '';
                    valB = b.title?.toLowerCase() || '';
                    return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'subject': 
                    valA = a.subject?.name?.toLowerCase() || '';
                    valB = b.subject?.name?.toLowerCase() || '';
                    return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'createdAt':
                    valA = new Date(a.createdAt).getTime();
                    valB = new Date(b.createdAt).getTime();
                    return sortOrder === 'asc' ? valA - valB : valB - a.createdAt;
                default:
                    return 0; 
            }
        });

        // 3. Apply Pagination
        const totalFilteredCount = currentContents.length;
        const totalPages = Math.ceil(totalFilteredCount / contentsPerPage);
        
        const startIndex = (currentPage - 1) * contentsPerPage;
        const endIndex = startIndex + contentsPerPage;
        
        const paginatedContents = currentContents.slice(startIndex, endIndex);

        return {
            paginatedContents,
            totalPages,
            totalFilteredCount
        };
    }, [contents, filterSubject, sortBy, sortOrder, currentPage, contentsPerPage]);


    const renderPaginationButton = (page) => {
        const isCurrent = page === currentPage;
        return (
            <button
                key={page}
                onClick={() => setCurrentPage(page)}
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

    const renderPaginationControls = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const startPage = Math.max(1, currentPage - 1);
        const endPage = Math.min(totalPages, currentPage + 1);

        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) pages.push('...');
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }

        const startIndex = (currentPage - 1) * contentsPerPage + 1;
        const endIndex = Math.min(currentPage * contentsPerPage, totalFilteredCount);

        return (
            <div className="flex justify-between items-center mt-6 py-4 px-4 bg-white rounded-xl shadow-lg border-t border-gray-200">
                <div className="text-sm text-gray-700 hidden sm:block">
                    {totalFilteredCount > 0 ? (
                        <p>
                            Showing <span className="font-semibold">{startIndex}</span> to <span className="font-semibold">{endIndex}</span> of <span className="font-semibold">{totalFilteredCount}</span> matching results
                        </p>
                    ) : (
                        <p>No content matches your current filters.</p>
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


    if (loading || userLoading || loadingSubjects) { 
        return <div className="p-6 text-center text-blue-600">Loading lesson content and subjects...</div>; 
    }

    if (error) {
        return <div className="p-6 text-center text-red-500">Error: {error}</div>;
    }

    if (!isLoggedIn || !canReadContents) {
         return <div className="p-6 text-center text-red-500">Access Denied.</div>;
    }

    return (
        <div className="container-2 p-6 bg-gray-50 min-h-screen font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-sm"> 
                <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Lesson Content Bank</h1>
                {canCreateContent && (
                    <button
                        // ⭐ Navigation to the dedicated creation page
                        onClick={() => navigate('/lesson-content/add')} 
                        className="btn-create flex gap-3 cursor-pointer"
                    >
                        <PlusCircle size={20} />
                        <span>Add New Content</span>
                    </button>
                )}
            </div>

            {/* --- Filter and Sort Controls --- */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter size={20} className="text-gray-600" />
                    <span className="font-medium text-gray-700">Filter By Subject:</span>

                    <select 
                        className="border border-gray-300 rounded-md p-2 text-sm"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                    >
                        <option value="all">All Subjects</option>
                        {subjects.map(sub => (
                            <option key={sub._id} value={sub._id}>{sub.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    {sortOrder === 'asc' ? 
                        <ArrowUpWideNarrow size={20} className="text-gray-600" /> : 
                        <ArrowDownNarrowWide size={20} className="text-gray-600" />
                    }
                    <span className="font-medium text-gray-700">Sort By:</span>
                    
                    <select 
                        className="border border-gray-300 rounded-md p-2 text-sm"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="createdAt">Date Created</option>
                        <option value="title">Title</option>
                        <option value="subject">Subject</option>
                    </select>

                    <button 
                        className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                    >
                        {sortOrder === 'asc' ? <ArrowUpWideNarrow size={18} /> : <ArrowDownNarrowWide size={18} />}
                    </button>
                </div>
                <div className="flex-grow text-right text-sm font-medium text-gray-600">
                    Showing <span className="font-semibold">{totalFilteredCount}</span> of <span className="font-semibold">{contents.length}</span> total content items
                </div>
            </div>
            {/* --- END Filter and Sort Controls --- */}

            {totalFilteredCount === 0 ? ( 
                <div className="text-center mt-12 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                    <p className="text-2xl font-semibold text-gray-600 mb-4">No Lesson Content Found</p>
                </div>
            ) : (
                <>
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden my-4 border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedContents.map((content) => ( 
                                        <tr key={content._id} className="hover:bg-gray-50 transition-colors duration-100">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {content.title}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {content.subject ? content.subject.name : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                                                {getPlainTextFromHtml(content.description || '') || 'No description provided.'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className="inline-flex items-center space-x-1">
                                                    <Clock size={14} className="text-yellow-500" />
                                                    <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    {canReadSingleContent && (
                                                         <button
                                                             onClick={() => navigate(`/lesson-content/${content._id}`)}
                                                             className="btn-view flex cursor-pointer"
                                                             title="View Content Details"
                                                         >
                                                             <Eye size={16} /> <span className="ml-1 hidden lg:inline">View</span>
                                                         </button>
                                                     )}
                                                     {canUpdateContent && (
                                                         <button
                                                             // ⭐ Navigation to the dedicated edit page
                                                             onClick={() => navigate(`/lesson-content/${content._id}/edit`)} 
                                                             className="btn-edit flex cursor-pointer"
                                                             title="Edit Content"
                                                         >
                                                             <Edit size={16} /> <span className="ml-1 hidden lg:inline">Edit</span>
                                                         </button>
                                                     )}
                                                     {canDeleteContent && (
                                                         <button
                                                             onClick={() => handleDeleteContent(content._id, content.title)}
                                                             className="btn-delete flex cursor-pointer"
                                                             title="Delete Content"
                                                         >
                                                             <Trash2 size={16} /> <span className="ml-1 hidden lg:inline">Delete</span>
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
                    {renderPaginationControls()}
                </>
            )}

            {/* Note: Modal rendering is completely removed here. */}
        </div>
    );
};

export default LessonContentManagementPage;