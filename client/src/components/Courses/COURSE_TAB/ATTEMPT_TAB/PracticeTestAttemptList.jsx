import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    BookOpen, Clock, BarChart2, CheckCircle, ArrowLeft, Timer, Calendar,
    Search, ArrowUp, ArrowDown, ListFilter, UserCheck // Added UserCheck icon
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Define available sortable columns and their corresponding keys/types
const SORT_COLUMNS = {
    date: 'createdAt',
    score: 'overallScore',
    attempt: 'attemptNumber',
};

// Map display names for the dropdown
const SORT_OPTIONS = [
    { value: 'date', label: 'Date' },
    { value: 'attempt', label: 'Attempt #' },
    { value: 'score', label: 'Score' },
];

const PracticeTestAttemptList = ({ courseId, courseTitle }) => {
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- State for Filtering and Sorting ---
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('date'); // Default sort by date
    const [sortDirection, setSortDirection] = useState('desc'); // Default sort descending (newest first)

    const formatAttemptDate = (isoString) => {
        if (!isoString) return 'N/A';
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        };
        return new Date(isoString).toLocaleDateString(undefined, options);
    };

    const fetchPracticeTestAttempts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Note: The backend controller is expected to retrieve 'submitted', 'graded', and 'partially-graded' attempts.
            const response = await fetch(`${BACKEND_URL}/practice-tests/course/${courseId}/attempts`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch practice test attempts.');
            }
            const data = await response.json();
            if (data.success && data.data) {
                setAttempts(data.data);
            } else {
                setAttempts([]);
            }
        } catch (err) {
            console.error('Error fetching practice test attempts:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        if (courseId) {
            fetchPracticeTestAttempts();
        }
    }, [courseId, fetchPracticeTestAttempts]);

    // --- Sorting and Filtering Logic (Memoized for Performance) ---
    const filteredAndSortedAttempts = useMemo(() => {
        let currentAttempts = [...attempts];
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        // 1. Filtering
        const filtered = currentAttempts.filter(attempt => {
            const firstName = attempt.userId?.firstName?.toLowerCase() || '';
            const lastName = attempt.userId?.lastName?.toLowerCase() || '';
            const fullName = `${firstName} ${lastName}`;
            const status = attempt.status?.toLowerCase() || '';

            const searchMatch = fullName.includes(lowerCaseSearchTerm) || status.includes(lowerCaseSearchTerm);
            
            return searchMatch;
        });

        // 2. Sorting
        const sorted = filtered.sort((a, b) => {
            const key = SORT_COLUMNS[sortColumn];
            let valA, valB;
            
            // Define statuses that allow scoring logic
            const isScoredA = ['submitted', 'graded', 'partially-graded'].includes(a.status);
            const isScoredB = ['submitted', 'graded', 'partially-graded'].includes(b.status);

            if (sortColumn === 'date') {
                valA = new Date(a[key]);
                valB = new Date(b[key]);
            } else if (sortColumn === 'score') {
                // 🚀 UPDATE: Include 'partially-graded' status in score check, but use 0 if score isn't yet available (e.g., waiting for grading)
                valA = isScoredA ? (a[key] || 0) : 0; 
                valB = isScoredB ? (b[key] || 0) : 0;
            } else if (sortColumn === 'attempt') {
                valA = a[key] || 0;
                valB = b[key] || 0;
            } else {
                return 0;
            }

            let comparison = 0;
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }

            return sortDirection === 'asc' ? comparison : comparison * -1;
        });

        return sorted;
    }, [attempts, searchTerm, sortColumn, sortDirection]);

    // Handler to toggle the sort direction
    const toggleSortDirection = () => {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    };
    
    // Handler for the dropdown change
    const handleColumnChange = (event) => {
        const newColumn = event.target.value;
        setSortColumn(newColumn);
        
        setSortDirection(newColumn === 'date' ? 'desc' : 'asc');
    };

    if (loading) {
        return <p>Loading practice test attempts...</p>;
    }

    if (error) {
        return <p className="text-red-500">Error: {error}</p>;
    }

    // Determine the number of attempts requiring review (assuming backend flags the PTA if any child quiz needs review)
    const pendingReviewCount = attempts.filter(a => a.status === 'partially-graded').length;


    return (
        <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
                Practice Test Attempts :
                {pendingReviewCount > 0 && (
                    <span className="text-lg font-semibold text-orange-600 ml-4 flex items-center">
                        <UserCheck size={20} className="mr-2" /> {pendingReviewCount} PENDING REVIEW
                    </span>
                )}
            </h3>

            {/* --- Filter and Sort Controls Section --- */}
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6 p-4 bg-white rounded-lg shadow">
                
                {/* Search Filter */}
                <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name (First/Last) or status..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Sorting Controls - Dropdown and Direction Button */}
                <div className="flex items-center space-x-2">
                    <span className="text-gray-600 font-medium whitespace-nowrap">Sort By:</span>
                    
                    <div className="relative">
                        <ListFilter className="w-4 h-4 absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                        <select
                            value={sortColumn}
                            onChange={handleColumnChange}
                            className="appearance-none block w-full py-2 pl-3 pr-8 text-sm border border-gray-300 bg-white rounded-md focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        >
                            {SORT_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={toggleSortDirection}
                        title={sortDirection === 'asc' ? 'Current: Ascending. Click to sort Descending' : 'Current: Descending. Click to sort Ascending'}
                        className="p-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                        {sortDirection === 'asc' ? (<ArrowUp className="w-5 h-5 text-blue-600" />) : (<ArrowDown className="w-5 h-5 text-blue-600" />)}
                    </button>
                </div>
            </div>
            {/* -------------------------------------------------------- */}

            {filteredAndSortedAttempts.length > 0 ? (
                <div className="space-y-4">
                    {filteredAndSortedAttempts.map((attempt, index) => {
                        // 🚀 UPDATE: Include 'partially-graded' in scoring status check
                        const isGradingComplete = attempt.status === 'graded'; 
                        const isPendingReview = attempt.status === 'partially-graded';
                        const isScored = isGradingComplete || isPendingReview;

                        const hasRawScores = (attempt.satScoreDetails?.rawScoreReadingWriting !== undefined) &&
                                             (attempt.satScoreDetails?.rawScoreMath !== undefined);

                        const scoreIsAvailable = isScored && hasRawScores; 

                        const rawCorrectAchieved = scoreIsAvailable ? 
                            ((attempt.satScoreDetails.rawScoreReadingWriting || 0) + (attempt.satScoreDetails.rawScoreMath || 0)) : 
                            0;

                        // 🚀 UPDATE: Status/Score Text and Styling
                        let scoreText = 'N/A';
                        let statusColor = 'text-gray-500';

                        if (isGradingComplete) {
                            scoreText = `${rawCorrectAchieved} / ${attempt.overallTotalPoints || '?'}`;
                            statusColor = 'text-green-600';
                        } else if (isPendingReview) {
                            scoreText = 'Pending...';
                            statusColor = 'text-orange-600';
                        } else if (attempt.status === 'in-progress') {
                            scoreText = 'In Progress';
                            statusColor = 'text-blue-500';
                        }


                        return (
                            <div key={attempt._id} className="p-4 rounded-lg shadow-sm hover:shadow-md transition duration-200 bg-white border border-gray-200">
                                <div className="flex items-center justify-between">
                                    {/* Left/Center Section: Attempt Info & Date */}
                                    <div className="flex-1 space-y-1">
                                        <p className="font-bold text-lg text-gray-800 flex items-center">
                                            {attempt.userId?.firstName} {attempt.userId?.lastName} - Attempt # {attempt.attemptNumber}
                                        </p>

                                        {/* Date and Status */}
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                            <span>{formatAttemptDate(attempt.createdAt)}</span>
                                            
                                            <span className={`ml-4 font-semibold ${statusColor}`}>
                                                {isPendingReview && <UserCheck size={14} className="inline mr-1" />}
                                                Status: {attempt.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Section: Score and Button */}
                                    <div className="flex items-center space-x-4">
                                        
                                        {/* Prominent Score Display */}
                                        <div className={`flex flex-col items-end p-2 rounded-md w-28 text-center`}>
                                            <p className="text-md font-semibold text-gray-700 uppercase mb-2">Score:</p>
                                            <p className={`text-2xl font-bold ${statusColor}`}>
                                                {scoreText}
                                            </p>
                                        </div>

                                        {/* View Details Button */}
                                        <button
                                            onClick={() => navigate(`/practice-tests/${attempt._id}/details`)}
                                            className={`px-4 py-2 font-medium rounded-md transition-colors whitespace-nowrap 
                                                ${isPendingReview ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-blue-600 text-white hover:bg-blue-700'}
                                            `}
                                        >
                                            {isPendingReview ? 'Review Grade' : 'View Details'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-gray-500 p-4 text-center">
                    {searchTerm ? "No attempts match your search criteria." : "No practice test attempts found for this course."}
                </p>
            )}
        </div>
    );
};

export default PracticeTestAttemptList;