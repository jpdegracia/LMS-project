import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Zap, ChevronLeft, ChevronRight, ArrowDownNarrowWide, ArrowUpWideNarrow, ArrowDownUp } from 'lucide-react'; 

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const USERS_PER_PAGE = 10;

// Helper to format date (optional: keeping for potential future use)
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
};

const CourseGradeBook = ({ courseId, courseTitle }) => {
    const [attempts, setAttempts] = useState(null); 
    const [loading, setLoading] = useState(true);
    
    // NEW STATE FOR SORTING AND PAGINATION 
    const [currentPage, setCurrentPage] = useState(1);
    const [sortKey, setSortKey] = useState('name'); // Default sort key
    const [sortDirection, setSortDirection] = useState('asc'); // Default direction

    // --- Data Fetching Logic (Remains the same) ---
    const fetchGradedAttempts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/practice-tests/course/${courseId}/attempts?status=graded`, {
                 method: 'GET',
                 credentials: 'include',
            });
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                
                const latestAttemptsMap = data.data.reduce((map, attempt) => {
                    const userId = attempt.userId._id; 
                    const currentAttemptDate = new Date(attempt.createdAt);
                    const mappedAttempt = map.get(userId);

                    if (
                        !mappedAttempt || 
                        currentAttemptDate > new Date(mappedAttempt.createdAt)
                    ) {
                        map.set(userId, attempt);
                    }
                    return map;
                }, new Map());

                setAttempts(Array.from(latestAttemptsMap.values())); 
            } else {
                setAttempts([]);
                console.error("Failed to fetch graded attempts:", data.message);
            }
        } catch (err) {
            console.error("Network error fetching graded attempts:", err);
            setAttempts([]);
        } finally {
            setLoading(false);
        }
    }, [courseId, BACKEND_URL]);

    useEffect(() => {
        fetchGradedAttempts();
    }, [fetchGradedAttempts]);

    // --- Sorting Logic ---
    const getSortValue = (attempt, key) => {
        // 🚨 FIX: Reroute sorting fields to use the working sectionScores array 🚨
        switch (key) {
            case 'name':
                return `${attempt.userId?.lastName || ''} ${attempt.userId?.firstName || ''}`;
            case 'email':
                return attempt.userId?.email || '';
            case 'rwScore':
                // Use sectionScores[0] (R/W) for sorting
                return attempt.sectionScores?.[0]?.score || 0;
            case 'mathScore':
                // Use sectionScores[1] (Math) for sorting
                return attempt.sectionScores?.[1]?.score || 0;
            case 'totalScore':
                return attempt.overallScore || 0;
            default:
                return 0;
        }
    };


    const getSortedAttempts = useMemo(() => {
        if (!attempts) return [];

        const sorted = [...attempts].sort((a, b) => {
            const valA = getSortValue(a, sortKey);
            const valB = getSortValue(b, sortKey);

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [attempts, sortKey, sortDirection]);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
        setCurrentPage(1); // Reset page on new sort
    };

    // 🚨 UPDATED: Function to render the correct icon design 🚨
    const getSortIcon = (key) => {
        // Render the sort icon if the column is currently sorted
        if (sortKey === key) {
            // Using ArrowDownNarrowWide for descending (A to Z on text/low to high on score)
            // Using ArrowUpWideNarrow for ascending (Z to A on text/high to low on score)
            const Icon = sortDirection === 'desc' ? ArrowDownNarrowWide : ArrowUpWideNarrow;
            return <Icon size={28} className="text-indigo-600 font-extrabold p-0.5 cursor-pointer" />;
        }
        
        // Render a default unsorted icon (small version of the current active icon)
        return <ArrowUpWideNarrow size={20} className="text-gray-400 flex-shrink-0 cursor-pointer" />;
    };

    // --- Pagination Logic (Remains the same) ---
    const totalUsers = getSortedAttempts.length;
    const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;
    
    const paginatedAttempts = getSortedAttempts.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // --- Render Guards ---
    if (loading || attempts === null) {
        return <div className="p-4 text-center text-blue-600">Loading grade data...</div>;
    }

    if (attempts.length === 0) {
        return (
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                <Zap size={32} className="text-orange-500 mx-auto mb-3" />
                <p className="text-xl font-medium text-gray-700">No graded attempts found for this course.</p>
            </div>
        );
    }

    // --- JSX Render ---
    return (
        <div className="bg-white p-4 md:p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                Grade Report:
            </h2>

            <div className="overflow-x-auto"> 
                {/* 🚨 FIX 2: Added mx-auto to center the table and used min-w-full 🚨 */}
                <table className="min-w-[1200px] mx-auto table-auto divide-y divide-gray-300">
                    <thead className="bg-gray-200 sticky justify-between">
                        <tr>
                            {/* Full Name Column */}
                            <th className="p-0 text-left w-2/12 border border-gray-300">
                                <button
                                    onClick={() => handleSort('name')}
                                    // 🚨 Button styling for compact, transparent header 🚨
                                    className="p-3 w-full h-full text-left text-sm font-bold text-gray-800  tracking-wider hover:bg-gray-300 transition-colors inline-flex items-center"
                                >
                                    <span className="flex-grow">Full Name</span>
                                    {getSortIcon('name')}
                                </button>
                            </th>
                            {/* Email Column */}
                            <th className="p-0 text-left w-2/12 border border-gray-300">
                                <button
                                    onClick={() => handleSort('email')}
                                    className="p-3 w-full h-full text-left text-sm font-bold text-gray-800  tracking-wider hover:bg-gray-300 transition-colors inline-flex items-center"
                                >
                                    <span className="flex-grow">Email</span>
                                    {getSortIcon('email')}
                                </button>
                            </th>
                            {/* R/W Score */}
                            <th className="p-0 w-2/12 border border-gray-300">
                                <button
                                    onClick={() => handleSort('rwScore')}
                                    className="p-3 w-full h-full  text-sm font-bold text-gray-800  tracking-wider hover:bg-gray-300 transition-colors inline-flex items-center justify-between"
                                >
                                    Reading and Writing 
                                    {getSortIcon('rwScore')}
                                </button>
                            </th>
                            {/* Math Score */}
                            <th className="p-0 w-1/8 border border-gray-300">
                                <button
                                    onClick={() => handleSort('mathScore')}
                                    className="p-3 w-full h-full text-sm font-bold text-gray-800  tracking-wider hover:bg-gray-300 transition-colors inline-flex items-center justify-between"
                                >
                                    Math 
                                    {getSortIcon('mathScore')}
                                </button>
                            </th>
                            {/* Total SAT Score */}
                            <th className="p-0 w-1/8 border border-gray-300">
                                <button
                                    onClick={() => handleSort('totalScore')}
                                    className="p-3 w-full h-full text-sm font-bold text-gray-800  tracking-wider hover:bg-gray-300 transition-colors inline-flex items-center justify-between"
                                >
                                    SAT Score 
                                    {getSortIcon('totalScore')}
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedAttempts.map((attempt) => {
                            const details = attempt.satScoreDetails || {};
                            const studentName = `${attempt.userId?.firstName || ''} ${attempt.userId?.lastName || ''}`;
                            const studentEmail = attempt.userId?.email || 'Email N/A';
                            
                            // 🚨 FIX: Prioritize sectionScores array for display 🚨
                            const rwScore = attempt.sectionScores?.[0]?.score || details.scaledScoreReadingWriting || 'N/A';
                            const mathScore = attempt.sectionScores?.[1]?.score || details.scaledScoreMath || 'N/A';
                            
                            const totalScore = attempt.overallScore || 'N/A';

                            return (
                                <tr key={attempt.userId._id} className="hover:bg-gray-50">
                                    {/* Full Name */}
                                    <td className="p-3 text-sm font-medium text-gray-900 border border-gray-200">
                                        <div className="font-semibold text-gray-900">{studentName}</div>
                                    </td>
                                    {/* Email */}
                                    <td className="p-3 text-sm font-medium text-gray-900 border border-gray-200">
                                        <div className="text-sm font-normal text-gray-500">{studentEmail}</div> 
                                    </td>
                                    
                                    {/* Reading and Writing Score */}
                                    <td className="p-3 text-[14px] text-end text-gray-900 font-medium border border-gray-200">
                                        {rwScore}
                                    </td>
                                    
                                    {/* Math Score */}
                                    <td className="p-3 text-[14px] text-end text-gray-900 font-medium border border-gray-200">
                                        {mathScore}
                                    </td>
                                    
                                    {/* Total SAT Score */}
                                    <td className="p-3 text-[14px] text-end font-bold text-gray-900 border border-gray-200">
                                        {totalScore}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- Pagination Controls --- */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">
                        Showing results {startIndex + 1} - {Math.min(endIndex, totalUsers)} of {totalUsers}
                    </p>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="flex items-center px-3 py-1 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <ChevronLeft size={16} className="mr-1" /> Previous
                        </button>
                        <span className="px-3 py-1 text-sm font-medium text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="flex items-center px-3 py-1 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next <ChevronRight size={16} className="ml-1" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseGradeBook;