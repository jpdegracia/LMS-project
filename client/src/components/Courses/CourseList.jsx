import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
// 1. Import useSearchParams
import { useNavigate, useSearchParams } from 'react-router-dom';
import UserContext from '../UserContext/UserContext'; // Adjust path as needed
import Modal from '../Modal/Modal'; // Adjust path as needed
import {
    Eye, Trash2, PlusCircle, BookOpen, BarChart2, Calendar, Code, Filter,
    ArrowDownNarrowWide, ArrowUpWideNarrow, ListCheck,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import AddCourseForm from './CRUD_COURSE/AddCourseForm'; // Adjust path as needed

// Helper to format contentType names (e.g., 'video_lesson' -> 'Video Lesson')
const formatContentType = (type) => {
    if (!type) return 'N/A';
    return type.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const CoursesListPage = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddCourseModal, setShowAddCourseModal] = useState(false);

    const { isLoggedIn, userLoading, hasPermission } = useContext(UserContext);
    const navigate = useNavigate();
    // 2. Initialize useSearchParams
    const [searchParams, setSearchParams] = useSearchParams();

    // --- PAGINATION STATE (Initialize from URL or default) ---
    // 3. Read initial page from URL param 'page', default to 1
    const initialPage = parseInt(searchParams.get('page') || '1', 10);
    const [currentPage, setCurrentPage] = useState(initialPage > 0 ? initialPage : 1);
    const coursesPerPage = 15; // Set courses per page
    // --- END PAGINATION STATE ---

    // --- FILTER & SORT STATE (Initialize from URL or default) ---
    // 3. Read initial filters/sort from URL params or use defaults
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || ''); // Persist search term
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || ''); // Use empty string for 'all'
    const [selectedContentType, setSelectedContentType] = useState(searchParams.get('contentType') || ''); // Content Type filter
    const [sortKey, setSortKey] = useState(searchParams.get('sortBy') || 'createdAt');
    const [sortDirection, setSortDirection] = useState(searchParams.get('sortOrder') || 'desc');
    // --- END FILTER & SORT STATE ---

    // Permissions
    const canCreateCourse = hasPermission('course:create');
    const canReadCourses = hasPermission('course:read:all');
    const canManageIndividualCourse = hasPermission('course:read');
    const canDeleteCourse = hasPermission('course:delete');

    // --- Fetch Courses ---
    const fetchCoursesForManagement = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!canReadCourses) {
                console.error("Permission Denied: Cannot view course management list.");
                setLoading(false);
                navigate('/dashboard');
                return;
            }
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses`, {
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
                setCourses(data.data || []);
            } else {
                throw new Error(data.message || "Failed to retrieve courses.");
            }
        } catch (err) {
            console.error("Failed to fetch courses for management:", err);
            setError(err.message || "Failed to load courses. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [canReadCourses, navigate]);

    // --- Delete Course ---
    const handleDeleteCourse = async (courseId, courseTitle) => {
        if (!canDeleteCourse) {
             console.error("Permission Denied: Cannot delete courses.");
             // Consider showing a user-friendly message here instead of just console.error
             return;
        }
        // Use window.confirm for simplicity, replace with Modal in production
        const confirmed = window.confirm(`Are you sure you want to delete the course: "${courseTitle}"?`);
        if (!confirmed) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses/${courseId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to delete course.' }));
                throw new Error(errorData.message);
            }
            console.log('Course deleted successfully!');
            fetchCoursesForManagement(); // Refresh list after deleting
        } catch (err) {
            console.error('Error deleting course:', err);
            alert(`Error deleting course: ${err.message}`); // Inform user
        }
    };

    // --- Initial Data Fetch Effect ---
    useEffect(() => {
        if (!userLoading) {
            if (isLoggedIn && canReadCourses) {
                fetchCoursesForManagement();
            } else if (!isLoggedIn) {
                console.log("Please log in to view course management list.");
                navigate('/login');
            } else if (!canReadCourses) {
                // Redirect immediately if permission is definitively denied after loading
                console.error("Permission Denied: Cannot view course management list.");
                navigate('/dashboard');
            }
        }
    }, [userLoading, isLoggedIn, canReadCourses, fetchCoursesForManagement, navigate]);

    // --- URL Update Effect ---
    // 4. ADD THIS EFFECT to update URL search params
    useEffect(() => {
        const params = {};
        if (currentPage > 1) params.page = currentPage.toString();
        if (selectedCategory) params.category = selectedCategory;
        if (selectedContentType) params.contentType = selectedContentType; // Add contentType
        if (sortKey !== 'createdAt') params.sortBy = sortKey;
        if (sortDirection !== 'desc') params.sortOrder = sortDirection;
        if (searchTerm) params.q = searchTerm; // Add search term

        // Use { replace: true } to avoid adding filter/page changes to browser history
        setSearchParams(params, { replace: true });
    }, [currentPage, selectedCategory, selectedContentType, sortKey, sortDirection, searchTerm, setSearchParams]);
    // --- END ADD EFFECT ---

    // 5. REMOVE the useEffect that reset the page to 1 (handled by URL state now)
    // useEffect(() => { /* ... */ }, [searchTerm, selectedCategory, sortKey, sortDirection]);

    // --- Filtering, Sorting, Pagination Memo ---
    const { totalFilteredCount, totalPages, paginatedCourses } = useMemo(() => {
        let currentCourses = [...courses];

        // Apply Filtering
        const lowerSearch = searchTerm.toLowerCase();
        currentCourses = currentCourses.filter(course => {
            const matchesSearch = !searchTerm ||
                course.title?.toLowerCase().includes(lowerSearch) ||
                course.description?.toLowerCase().includes(lowerSearch);
            const matchesCategory = !selectedCategory || (course.category?.name === selectedCategory);
            const matchesContentType = !selectedContentType || (course.contentType === selectedContentType); // Filter by contentType
            return matchesSearch && matchesCategory && matchesContentType;
        });

        // Apply Sorting
        currentCourses.sort((a, b) => {
            let aValue = a[sortKey];
            let bValue = b[sortKey];

            if (sortKey === 'category.name') {
                aValue = a.category?.name?.toLowerCase() || '';
                bValue = b.category?.name?.toLowerCase() || '';
                return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (sortKey === 'createdAt') {
                aValue = new Date(a.createdAt).getTime();
                bValue = new Date(b.createdAt).getTime();
                return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            const valAStr = String(aValue || '').toLowerCase();
            const valBStr = String(bValue || '').toLowerCase();

            if (valAStr < valBStr) return sortDirection === 'asc' ? -1 : 1;
            if (valAStr > valBStr) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Apply Pagination
        const totalFilteredCount = currentCourses.length;
        const totalPages = Math.ceil(totalFilteredCount / coursesPerPage);
        // Ensure currentPage is valid after filtering might change totalPages
        const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages > 0 ? totalPages : 1);

        // If filtering reduced pages below current, update state (triggers URL update)
        if (validCurrentPage !== currentPage && totalFilteredCount > 0) {
             // Use timeout to avoid potential state update loops during render
             setTimeout(() => setCurrentPage(validCurrentPage), 0);
        }

        const startIndex = (validCurrentPage - 1) * coursesPerPage;
        const endIndex = startIndex + coursesPerPage;
        const paginatedCourses = currentCourses.slice(startIndex, endIndex);

        return { paginatedCourses, totalPages, totalFilteredCount }; // validCurrentPage isn't needed outside directly
    }, [courses, searchTerm, selectedCategory, selectedContentType, sortKey, sortDirection, currentPage, coursesPerPage, setCurrentPage]); // Add dependencies

    // --- Sort Handlers ---
    const handleSortRequest = (key) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc'); // Default to asc when changing sort key
        }
        // No need to reset page here, it's handled by the derived state logic in useMemo now
    };

    const getSortIcon = (key) => {
        if (sortKey !== key) return null;
        return sortDirection === 'asc' ? <ArrowUpWideNarrow size={16} className="ml-1 text-indigo-600" /> : <ArrowDownNarrowWide size={16} className="ml-1 text-indigo-600" />;
    };

    // --- Unique Values for Filters ---
    const uniqueCategories = useMemo(() =>
        Array.from(new Set(courses.map(course => course.category?.name).filter(Boolean))).sort()
    , [courses]);
    const uniqueContentTypes = useMemo(() =>
        Array.from(new Set(courses.map(course => course.contentType).filter(Boolean))).sort()
    , [courses]);

    // --- Pagination Renderers ---
    const renderPaginationButton = (page) => {
        const isCurrent = page === currentPage;
        return (
            <button
                key={page}
                onClick={() => setCurrentPage(page)} // Updates state, triggers URL effect
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-medium transition-colors duration-150 text-xs sm:text-sm ${isCurrent ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200'}`}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Go to page ${page}`}
            >
                {page}
            </button>
        );
    };

    const renderPaginationControls = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxPagesToShow = 5; // Adjust number of page links shown
        let startPage, endPage;

        // Logic to determine which page numbers to show (e.g., 1 ... 4 5 6 ... 10)
        if (totalPages <= maxPagesToShow) {
            startPage = 1; endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor((maxPagesToShow - 1) / 2);
            const maxPagesAfterCurrent = Math.ceil((maxPagesToShow - 1) / 2);
            if (currentPage <= maxPagesBeforeCurrent) {
                startPage = 1; endPage = maxPagesToShow;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - maxPagesToShow + 1; endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent; endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        // Add "First" page and ellipsis if needed
        if (startPage > 1) {
            pages.push(renderPaginationButton(1));
            if (startPage > 2) {
                pages.push(<span key="start-ellipsis" className="text-gray-500 font-bold px-1 select-none self-end leading-9">...</span>);
            }
        }

        // Add page numbers in the calculated range
        for (let i = startPage; i <= endPage; i++) {
            pages.push(renderPaginationButton(i));
        }

        // Add "Last" page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(<span key="end-ellipsis" className="text-gray-500 font-bold px-1 select-none self-end leading-9">...</span>);
            }
            pages.push(renderPaginationButton(totalPages));
        }

        const displayStartIndex = totalFilteredCount > 0 ? (currentPage - 1) * coursesPerPage + 1 : 0;
        const displayEndIndex = Math.min(currentPage * coursesPerPage, totalFilteredCount);

        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 py-4 px-4 bg-white rounded-xl shadow-lg border-t border-gray-200">
                {/* Info Text (Aligned Left) */}
                 <div className="text-sm text-gray-700 mb-2 sm:mb-0 text-center sm:text-left">
                     {totalFilteredCount > 0 ? (
                         `Showing ${displayStartIndex} - ${displayEndIndex} of ${totalFilteredCount} results`
                     ) : (
                         'No courses match your filters.'
                     )}
                 </div>
                 {/* Controls (Aligned Right) */}
                <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Previous Page" aria-label="Previous Page"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    {pages}
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next Page" aria-label="Next Page"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    };

    // --- Loading/Error/Permission Checks ---
    if (loading || userLoading) {
        return <div className="flex justify-center items-center h-screen"><p className="text-xl text-blue-600">Loading courses...</p></div>;
    }
    if (error) {
        return <div className="p-6 text-center text-red-500">Error loading courses: {error}</div>;
    }
    // These checks might be redundant if useEffect handles redirect, but good as fallback
    if (!isLoggedIn) { return <div className="p-6 text-center text-red-500">Please log in.</div>; }
    if (!canReadCourses) { return <div className="p-6 text-center text-red-500">Access Denied.</div>; }


    // --- MAIN RENDER ---
    return (
        <div className="container-2 p-6 bg-gray-50 min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-sm">
                <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Manage Courses</h1>
                {canCreateCourse && (
                    <button onClick={() => setShowAddCourseModal(true)} className="btn-create flex items-center gap-2 cursor-pointer">
                        <PlusCircle size={20} /> <span>Add New Course</span>
                    </button>
                )}
            </div>

            {/* Filter and Sort Controls - RESTRUCTURED */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row flex-wrap gap-4 items-center justify-between">
                {/* Right Side: Filters & Sorting */}
                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full md:w-auto justify-center md:justify-end">
                    {/* Filter Controls */}
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                        <Filter size={18} className="text-gray-500 flex-shrink-0 hidden sm:inline" />
                        <input
                            type="text" placeholder="Search..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border border-gray-300 rounded-md p-2 text-sm h-10 w-full sm:w-32 md:w-40" aria-label="Search courses"
                        />
                        <select
                            className="border border-gray-300 rounded-md p-2 text-sm cursor-pointer h-10 w-full sm:w-32 md:w-40"
                            value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                            aria-label="Filter by category"
                        >
                            <option value="">All Categories</option>
                            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <select
                            className="border border-gray-300 rounded-md p-2 text-sm cursor-pointer h-10 w-full sm:w-32 md:w-40"
                            value={selectedContentType} onChange={(e) => setSelectedContentType(e.target.value)}
                            aria-label="Filter by content type"
                        >
                            <option value="">All Types</option>
                            {uniqueContentTypes.map(type => <option key={type} value={type}>{formatContentType(type)}</option>)}
                        </select>
                    </div>

                    {/* Sort Controls */}
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                        <span className="font-medium text-gray-700 flex-shrink-0 hidden sm:inline">Sort:</span>
                        <select
                            className="border border-gray-300 rounded-md p-2 text-sm cursor-pointer h-10 w-full sm:w-32 md:w-40"
                            value={sortKey} onChange={(e) => { setSortKey(e.target.value); setSortDirection('asc'); }}
                            aria-label="Sort courses by"
                        >
                            <option value="createdAt">Date Created</option>
                            <option value="title">Title</option>
                            <option value="category.name">Category</option>
                            <option value="difficulty">Difficulty</option>
                        </select>
                        <button
                            className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0 h-10 w-10 flex items-center justify-center"
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            title={`Sort order: ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
                            aria-label={`Set sort direction to ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
                        >
                            {sortDirection === 'asc' ? <ArrowUpWideNarrow size={18} /> : <ArrowDownNarrowWide size={18} />}
                        </button>
                    </div>
                </div>

                {/* Left Side: Info Text */}
                <div className="text-sm font-medium text-gray-600 w-full md:w-auto text-center md:text-right order-last md:order-last mt-2 md:mt-0">
                    Showing <span className="font-semibold">{totalFilteredCount}</span> matching courses
                    ({courses.length} total)
                </div>
            </div>


            {/* Courses Table or No Results */}
            {totalFilteredCount === 0 ? (
                <div className="text-center mt-12 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                    <p className="text-2xl font-semibold text-gray-600 mb-4">No Courses Found</p>
                    <p className="text-lg text-gray-500">
                        {courses.length > 0 ? "Adjust filters or search term." : "No courses created yet."}
                    </p>
                    {canCreateCourse && courses.length === 0 && (
                        <p className="text-lg text-gray-500 mt-2">Click "Add New Course" to get started!</p>
                    )}
                </div>
            ) : (
                <>
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden my-4 border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {/* Table Headers with Sort Buttons */}
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <button onClick={() => handleSortRequest('title')} className="flex items-center gap-1 hover:text-indigo-600">Title {getSortIcon('title')}</button>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <button onClick={() => handleSortRequest('category.name')} className="flex items-center gap-1 hover:text-indigo-600">Category {getSortIcon('category.name')}</button>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <button onClick={() => handleSortRequest('difficulty')} className="flex items-center gap-1 hover:text-indigo-600">Difficulty {getSortIcon('difficulty')}</button>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <button onClick={() => handleSortRequest('createdAt')} className="flex items-center gap-1 hover:text-indigo-600">Created On {getSortIcon('createdAt')}</button>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedCourses.map((course) => (
                                        <tr key={course._id} className="hover:bg-gray-50 transition-colors duration-100">
                                            {/* Table Data Cells */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className="inline-flex items-center gap-1"><BookOpen size={14} className="text-indigo-500 flex-shrink-0" /><span>{course.category?.name || 'N/A'}</span></span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ course.status === 'published' ? 'bg-green-100 text-green-800' : course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800' }`}>
                                                    {course.status ? course.status.charAt(0).toUpperCase() + course.status.slice(1) : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                                                <span className="inline-flex items-center gap-1"><BarChart2 size={14} className="text-blue-500 flex-shrink-0" /><span>{course.difficulty || 'N/A'}</span></span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className="inline-flex items-center gap-1"><Code size={14} className="text-purple-500 flex-shrink-0" /><span>{formatContentType(course.contentType)}</span></span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className="inline-flex items-center gap-1"><Calendar size={14} className="text-yellow-500 flex-shrink-0" /><span>{new Date(course.createdAt).toLocaleDateString()}</span></span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    <button onClick={() => navigate(`/courses/${course._id}`, { state: { from: window.location.pathname + window.location.search } })} className="btn-view flex items-center gap-1 cursor-pointer" title="View Course Page">
                                                        <Eye size={16} /> <span className="hidden lg:inline">View</span>
                                                    </button>
                                                    {canManageIndividualCourse && (
                                                        <button onClick={() => navigate(`/courses-manage/${course._id}`)} className="btn-edit flex items-center gap-1 cursor-pointer" title="Manage Course Content">
                                                            <ListCheck size={16} /> <span className="hidden lg:inline">Manage</span>
                                                        </button>
                                                    )}
                                                    {canDeleteCourse && (
                                                        <button onClick={() => handleDeleteCourse(course._id, course.title)} className="btn-delete flex items-center gap-1 cursor-pointer" title="Delete Course">
                                                            <Trash2 size={16} /> <span className="hidden lg:inline">Delete</span>
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
                    {/* Render Pagination Controls */}
                    {renderPaginationControls()}
                </>
            )}

            {/* Add Course Modal */}
            {showAddCourseModal && (
                <Modal onClose={() => setShowAddCourseModal(false)} title="Add New Course">
                    <AddCourseForm
                        onCourseAdded={() => {
                            setShowAddCourseModal(false);
                            fetchCoursesForManagement();
                        }}
                        onCancel={() => setShowAddCourseModal(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default CoursesListPage;