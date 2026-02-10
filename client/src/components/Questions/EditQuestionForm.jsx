// src/components/Modules/EditModulePage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, HelpCircle } from 'lucide-react';
import UserContext from '../UserContext/UserContext';

const EditModulePage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- State Management ---
    // Initialize moduleData with sensible defaults to prevent undefined errors in JSX
    const [moduleData, setModuleData] = useState(null); // Keep as null initially, let fetch set it
    const [moduleType, setModuleType] = useState(null); // Will be set after moduleData is fetched
    const [loading, setLoading] = useState(true); // Overall loading for main module data fetch
    const [error, setError] = useState(null); // General error for main module fetch
    const [successMessage, setSuccessMessage] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // Separate states for lesson content options
    const [allLessonContentsOptions, setAllLessonContentsOptions] = useState([]);
    const [loadingLessonContents, setLoadingLessonContents] = useState(true); // Loading for lesson content options
    const [errorLessonContents, setErrorLessonContents] = useState(null); // Error for lesson content options


    // --- Helper Functions ---
    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    // --- Data Fetching Effects ---

    // Effect to fetch all lesson content options
    useEffect(() => {
        console.log("[EditModulePage DEBUG] Effect: Fetching all lesson content options.");
        const fetchLessonContents = async () => {
            setLoadingLessonContents(true);
            setErrorLessonContents(null); // Clear previous errors
            try {
                const response = await fetch(`${BACKEND_URL}/lesson-content`, { credentials: 'include' });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: response.statusText }));
                    console.error("[EditModulePage ERROR] Failed to fetch lesson content. Response:", response.status, "Error:", errorData.message);
                    throw new Error(errorData.message || 'Failed to retrieve lesson content data.');
                }
                const data = await response.json();
                if (data.success) {
                    setAllLessonContentsOptions(data.data || []);
                    console.log("[EditModulePage DEBUG] Successfully fetched lesson content. Count:", (data.data || []).length);
                } else {
                    console.error("[EditModulePage ERROR] Backend reported failure to retrieve lesson content:", data.message);
                    throw new Error(data.message || 'Failed to retrieve lesson content data.');
                }
            } catch (err) {
                console.error('Error in fetchLessonContents:', err);
                setErrorLessonContents(err.message || 'Failed to load lesson content options.');
            } finally {
                setLoadingLessonContents(false);
                console.log("[EditModulePage DEBUG] Finished fetching lesson contents. setLoadingLessonContents(false).");
            }
        };
        fetchLessonContents();
    }, [BACKEND_URL]); // Dependency on BACKEND_URL

    // Effect to fetch the specific module data
    const fetchModuleData = useCallback(async () => {
        setLoading(true); // Set loading for this specific fetch
        setError(null); // Clear previous errors
        try {
            console.log(`[EditModulePage DEBUG] Effect: Fetching module data for ID: ${moduleId}`);
            const response = await fetch(`${BACKEND_URL}/modules/${moduleId}`, { credentials: 'include' });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error(`[EditModulePage ERROR] Failed to fetch module ${moduleId}. Status: ${response.status}. Error Data:`, errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success && data.data) {
                setModuleData({
                    ...data.data,
                    // Ensure dates are formatted for input type="date" (YYYY-MM-DD)
                    availableFrom: data.data.availableFrom ? new Date(data.data.availableFrom).toISOString().split('T')[0] : '',
                    availableUntil: data.data.availableUntil ? new Date(data.data.availableUntil).toISOString().split('T')[0] : '',
                    // Contents should be simple array of IDs for lesson module multi-select value
                    // Handle both populated objects and raw IDs from backend
                    contents: data.data.moduleType === 'lesson' && Array.isArray(data.data.contents)
                        ? data.data.contents.map(c => c._id || c)
                        : [], // Default to empty array for lessons, or undefined for other types if not applicable

                    // maxAttempts handling for display and payload
                    maxAttempts: data.data.maxAttempts === -1 ? 'unlimited' : (data.data.maxAttempts ?? ''),
                    timeLimitMinutes: data.data.timeLimitMinutes ?? '',
                    passingScorePercentage: data.data.passingScorePercentage ?? '', // Use empty string for number input fallback
                });
                setModuleType(data.data.moduleType); // Set module type once main module data is loaded
                console.log(`[EditModulePage DEBUG] Module ${moduleId} data fetched successfully. Type: ${data.data.moduleType}`);
            } else {
                console.error(`[EditModulePage ERROR] Backend reported failure to retrieve module ${moduleId} content. Message:`, data.message || "No data received.");
                throw new Error(data.message || "Failed to retrieve module content for editing.");
            }
        } catch (err) {
            console.error("Error in fetchModuleData:", err);
            setError(err.message || "Failed to load module content. Please try again later.");
        } finally {
            setLoading(false); // Always set loading to false in finally
            console.log(`[EditModulePage DEBUG] Finished fetching module data. setLoading(false).`);
        }
    }, [moduleId, BACKEND_URL]); // Dependencies: moduleId from useParams, BACKEND_URL

    // Trigger fetchModuleData when component mounts or moduleId changes
    useEffect(() => {
        if (moduleId) {
            fetchModuleData();
        }
    }, [moduleId, fetchModuleData]); // Depend on moduleId and memoized fetchModuleData


    // --- Form Handlers ---

    // Handle standard input changes (for title, description, and quiz-specific fields)
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormErrors(prev => ({ ...prev, [name]: '' })); // Clear error on change

        // Special handling for maxAttempts input (string "unlimited" to number -1)
        if (name === 'maxAttempts') {
            let parsedValue;
            if (value.toLowerCase() === 'unlimited') {
                parsedValue = -1;
            } else if (value === '') {
                parsedValue = null; // Represent blank as null for backend
            } else {
                parsedValue = Number(value);
                if (isNaN(parsedValue)) {
                    // If invalid number, keep previous value or handle as validation error later
                    parsedValue = value; // Keep string to show invalid input in UI immediately
                }
            }
            setModuleData(prev => ({ ...prev, [name]: parsedValue }));
        } else {
            setModuleData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    }, []);

    // Handle array of IDs for lesson contents (multi-select)
    const handleLessonContentsSelectChange = useCallback((e) => {
        const { options } = e.target;
        const selectedValues = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                selectedValues.push(options[i].value);
            }
        }
        setModuleData(prev => ({
            ...prev,
            contents: selectedValues // Store as simple IDs
        }));
        setFormErrors(prev => ({ ...prev, contents: '' }));
    }, []);


    // Handle form submission for saving changes
    const handleSaveEditedContent = useCallback(async (e) => {
        e.preventDefault();
        setFormErrors({}); // Clear all form errors on submit attempt
        let errors = {};

        // --- Frontend Validation ---
        if (!moduleData.title?.trim()) errors.title = 'Title is required.';

        let payload = {
            title: moduleData.title,
            description: moduleData.description,
            // 'order' field is removed from Module schema, so it's not sent in payload
        };

        if (moduleType === 'lesson') {
            payload.progressBar = moduleData.progressBar;
            // Ensure contents are an array of IDs
            payload.contents = (Array.isArray(moduleData.contents) ? moduleData.contents.filter(id => id.trim()) : []);

            if (payload.contents.length === 0) {
                errors.contents = 'Lesson module must link to at least one content item.';
            }

        } else if (moduleType === 'quiz') {
            // Quiz specific settings
            payload.questionsPerPage = moduleData.questionsPerPage;
            payload.questionNavigation = moduleData.questionNavigation;
            payload.questionShuffle = moduleData.questionShuffle;
            payload.shuffleOptions = moduleData.shuffleOptions;

            // Convert 'unlimited' or empty string from UI to -1 or null for backend
            payload.maxAttempts = typeof moduleData.maxAttempts === 'string' && moduleData.maxAttempts.toLowerCase() === 'unlimited' ? -1
                                    : (moduleData.maxAttempts === null || moduleData.maxAttempts === '' ? null : parseInt(moduleData.maxAttempts, 10));

            payload.timeLimitMinutes = moduleData.timeLimitMinutes === null || moduleData.timeLimitMinutes === '' ? null : parseInt(moduleData.timeLimitMinutes, 10);
            payload.passingScorePercentage = parseInt(moduleData.passingScorePercentage, 10);
            payload.availableFrom = moduleData.availableFrom ? new Date(moduleData.availableFrom) : null;
            payload.availableUntil = moduleData.availableUntil ? new Date(moduleData.availableUntil) : null;
            payload.status = moduleData.status;

            // The questions array itself is NOT edited on this page.
            // Send the existing questions array back to the backend in the expected format: [{ question: 'ID', points: 1 }]
            payload.questions = (moduleData.questions || []).map(q => ({
                question: q.question?._id || q.question, // Handle if 'question' is populated or just an ID
                points: q.points ?? 1 // Ensure points are present, default to 1 if missing
            }));

            // Quiz-specific validation
            if (payload.maxAttempts !== -1 && (payload.maxAttempts === null || isNaN(payload.maxAttempts) || payload.maxAttempts < 1)) {
                errors.maxAttempts = 'Max attempts must be -1 for unlimited or a positive number (>=1).';
            }
            if (payload.timeLimitMinutes !== null && (isNaN(payload.timeLimitMinutes) || payload.timeLimitMinutes < 0)) {
                errors.timeLimitMinutes = 'Time limit must be a non-negative number or left blank.';
            }
            if (payload.passingScorePercentage === null || isNaN(payload.passingScorePercentage) || payload.passingScorePercentage < 0 || payload.passingScorePercentage > 100) {
                errors.passingScorePercentage = 'Passing score must be between 0 and 100.';
            }

        } else {
            errors.moduleType = "Unknown module type. Cannot save.";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setSuccessMessage(null);
            setError("Please correct the form errors."); // Display generic error for validation issues
            return;
        }

        // Set loading state for the submission process
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            console.log(`[EditModulePage DEBUG] Submitting payload for module ${moduleId}:`, payload);
            const response = await fetch(`${BACKEND_URL}/modules/${moduleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error("Backend error response on save:", errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.success) {
                console.error("Backend reported save not successful:", data.message);
                throw new Error(data.message || "Failed to update module.");
            }

            setSuccessMessage("Module updated successfully!");
            // This navigates back after a short delay
            setTimeout(() => navigate(-1), 1500);

        } catch (err) {
            console.error("Error saving module:", err);
            setError(err.message || "Failed to save module.");
        } finally {
            setLoading(false); // Always reset loading state after submission attempt (success or fail)
            console.log(`[EditModulePage DEBUG] Finished submission for module ${moduleId}. setLoading(false).`);
        }
    }, [moduleData, moduleId, navigate, BACKEND_URL, moduleType]); // Removed getCleanPlainText, it's not used here

    // --- Conditional Rendering ---
    // Permission check (this should be the very first render block)
    if (!hasPermission('module:update')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to edit modules.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                >
                    <ArrowLeft size={20} />
                    <span>Go Back</span>
                </button>
            </div>
        );
    }

    // Display loading state for initial data fetches
    // It will be "loading" if either fetch is true, or moduleData hasn't been populated yet
    if (loading || loadingLessonContents || !moduleData) {
        console.log(`[EditModulePage DEBUG] Rendering Loading state: OverallLoad=${loading}, LessonContentsLoad=${loadingLessonContents}, ModuleDataPresent=${!!moduleData}`);
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading module for editing...</p>
            </div>
        );
    }

    // Display error state for initial data fetches (if any occurred)
    if (error || errorLessonContents) {
        console.log(`[EditModulePage DEBUG] Rendering Error state: OverallError=${error}, LessonContentsError=${errorLessonContents}`);
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-red-600">Error: {error || errorLessonContents}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                >
                    <ArrowLeft size={20} />
                    <span>Go Back</span>
                </button>
            </div>
        );
    }

    // --- Main Form Render ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter">
            <main className="mx-auto px-6 max-w-7xl">
                <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-10">

                    <h2 className="text-4xl font-bold text-gray-800 mb-6 text-center items-center pt-10">
                        Edit {moduleType === 'lesson' ? 'Lesson Module' : moduleType === 'quiz' ? 'Quiz Module Settings' : 'Module'}
                    </h2>

                    {/* Feedback messages for submission (not initial load errors) */}
                    {successMessage && <p className="text-center text-lg text-green-600 mb-4">{successMessage}</p>}
                    {/* Only show 'Saving changes...' when submitting the form, not when initially loading data */}
                    {loading && !successMessage && <p className="text-center text-lg text-blue-600 mb-4">Saving changes...</p>}
                    {formErrors.general && <p className="text-center text-lg text-red-600 mb-4">{formErrors.general}</p>}


                    <form onSubmit={handleSaveEditedContent} className="space-y-10">
                        {/* General Module Settings - Two Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Module Type (Display Only) */}
                            <div>
                                <label className="block text-lg font-medium text-gray-700 mb-3">Module Type</label>
                                <input
                                    type="text"
                                    value={moduleData.moduleType}
                                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-gray-100 text-base"
                                    disabled
                                />
                            </div>

                            {/* REMOVED: Order Input field as 'order' is no longer on Module schema */}
                            {/* This entire div block is removed, as we discussed 'order' is managed by Section.modules array position. */}

                            {/* Title Input */}
                            <div className="md:col-span-2"> {/* Span both columns */}
                                <label htmlFor="editContentTitle" className="block text-lg font-medium text-gray-700 mb-3">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="editContentTitle"
                                    name="title"
                                    value={moduleData.title || ''}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    disabled={loading}
                                    required
                                />
                                {formErrors.title && <p className="mt-2 text-sm text-red-600">{formErrors.title}</p>}
                            </div>

                            {/* Description Input */}
                            <div className="md:col-span-2"> {/* Span both columns */}
                                <label htmlFor="editContentDescription" className="block text-lg font-medium text-gray-700 mb-3">Description</label>
                                <textarea
                                    id="editContentDescription"
                                    name="description"
                                    value={moduleData.description || ''}
                                    onChange={handleChange}
                                    rows="3"
                                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    disabled={loading}
                                ></textarea>
                            </div>
                        </div>

                        {/* Conditional Rendering for Lesson Module Fields */}
                        {moduleType === 'lesson' && (
                            <div className="space-y-8 border-t pt-8 mt-8 border-gray-200">
                                <h3 className="text-2xl font-semibold text-gray-800">Lesson Specific Settings</h3>

                                {/* Progress Bar Checkbox */}
                                <div className="flex items-center">
                                    <input
                                        id="progressBar"
                                        name="progressBar"
                                        type="checkbox"
                                        checked={moduleData.progressBar || false}
                                        onChange={handleChange}
                                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        disabled={loading}
                                    />
                                    <label htmlFor="progressBar" className="ml-3 block text-lg font-medium text-gray-700">
                                        Show Progress Bar
                                    </label>
                                </div>

                                {/* Lesson Contents (Multi-Select) */}
                                <div>
                                    <label className="block text-lg font-medium text-gray-700 mb-3">
                                        Lesson Contents (Multi-Select) <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-sm text-gray-500 mb-3">Select existing lesson content documents. The actual content is edited on the Lesson Content page.</p>
                                    <select
                                        multiple
                                        id="contents"
                                        name="contents"
                                        value={moduleData.contents || []} // This is already array of IDs
                                        onChange={handleLessonContentsSelectChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 h-48 focus:ring-blue-500 focus:border-blue-500 text-base"
                                        disabled={loading || loadingLessonContents}
                                        required
                                    >
                                        {Array.isArray(allLessonContentsOptions) && allLessonContentsOptions.length > 0 ? (
                                            allLessonContentsOptions.map(lc => (
                                                <option key={lc._id} value={lc._id}>{getCleanPlainText(lc.title)}</option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No lesson content available. Add some first.</option>
                                        )}
                                    </select>
                                    {formErrors.contents && <p className="mt-2 text-sm text-red-600">{formErrors.contents}</p>}
                                    {/* Display selected lesson contents as plain text */}
                                    {moduleData.contents?.length > 0 && (
                                        <div className="mt-6 p-6 border border-gray-200 rounded-md bg-gray-50 max-w-2/3">
                                            <h3 className="text-md font-semibold text-gray-700 mb-3">Selected Lesson Contents:</h3>
                                            <div className="space-y-2">
                                                {moduleData.contents.map((contentId, index) => { // Iterate over IDs directly
                                                    const foundContent = allLessonContentsOptions.find(item => item._id === contentId);
                                                    return foundContent ? (
                                                        <div key={contentId} className="flex items-center text-sm text-gray-600 p-2 bg-white rounded-md shadow-sm">
                                                            <span className="font-medium mr-2">{index + 1}.</span>
                                                            <BookOpen size={16} className="mr-2 text-blue-500" />
                                                            <span>{getCleanPlainText(foundContent.title)}</span>
                                                        </div>
                                                    ) : (
                                                        <div key={contentId} className="flex items-center text-sm text-red-600 p-2 bg-white rounded-md shadow-sm">
                                                            <span className="font-medium mr-2">{index + 1}.</span>
                                                            <HelpCircle size={16} className="mr-2" />
                                                            <span>Unknown Content (ID: {contentId})</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Conditional Rendering for Quiz Module Settings (ONLY settings, not questions) */}
                        {moduleType === 'quiz' && (
                            <div className="space-y-8 border-t pt-8 mt-8 border-gray-200">
                                <h3 className="text-2xl font-semibold text-gray-800 mb-6">Quiz Specific Settings</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    {/* Status */}
                                    <div>
                                        <label htmlFor="quizStatus" className="block text-lg font-medium text-gray-700 mb-3">
                                            Status
                                        </label>
                                        <select
                                            id="quizStatus"
                                            name="status"
                                            value={moduleData.status || 'draft'}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                            disabled={loading}
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="published">Published</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                        {formErrors.status && <p className="mt-2 text-sm text-red-600">{formErrors.status}</p>}
                                    </div>

                                    {/* Questions Per Page */}
                                    <div>
                                        <label htmlFor="questionsPerPage" className="block text-lg font-medium text-gray-700 mb-3">Questions Per Page</label>
                                        <input
                                            type="number"
                                            id="questionsPerPage"
                                            name="questionsPerPage"
                                            value={moduleData.questionsPerPage || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                            disabled={loading}
                                            min="1"
                                            max="10"
                                        />
                                        {formErrors.questionsPerPage && <p className="mt-2 text-sm text-red-600">{formErrors.questionsPerPage}</p>}
                                    </div>

                                    {/* Question Navigation */}
                                    <div>
                                        <label htmlFor="questionNavigation" className="block text-lg font-medium text-gray-700 mb-3">Question Navigation</label>
                                        <select
                                            id="questionNavigation"
                                            name="questionNavigation"
                                            value={moduleData.questionNavigation || 'sequence'}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                            disabled={loading}
                                        >
                                            <option value="sequence">Sequential</option>
                                            <option value="free">Free</option>
                                        </select>
                                        {formErrors.questionNavigation && <p className="mt-2 text-sm text-red-600">{formErrors.questionNavigation}</p>}
                                    </div>

                                    {/* Max Attempts */}
                                    <div>
                                        <label htmlFor="maxAttempts" className="block text-lg font-medium text-gray-700 mb-3">Max Attempts</label>
                                        <input
                                            type="text" // Use text to allow "unlimited" or -1 input
                                            id="maxAttempts"
                                            name="maxAttempts"
                                            value={moduleData.maxAttempts === -1 ? 'unlimited' : (moduleData.maxAttempts === null ? '' : moduleData.maxAttempts)}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase();
                                                const parsedValue = val === 'unlimited' ? -1 : (val === '' ? null : parseInt(val, 10));
                                                handleChange({ target: { name: 'maxAttempts', value: parsedValue } });
                                            }}
                                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                            disabled={loading}
                                        />
                                        <p className="mt-2 text-sm text-gray-500">Enter "unlimited" or -1 for unlimited attempts, or a number.</p>
                                        {formErrors.maxAttempts && <p className="mt-2 text-sm text-red-600">{formErrors.maxAttempts}</p>}
                                    </div>

                                    {/* Question Shuffle Checkbox */}
                                    <div className="flex items-center">
                                        <input
                                            id="questionShuffle"
                                            name="questionShuffle"
                                            type="checkbox"
                                            checked={moduleData.questionShuffle || false}
                                            onChange={handleChange}
                                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            disabled={loading}
                                        />
                                        <label htmlFor="questionShuffle" className="ml-3 block text-lg font-medium text-gray-700">
                                            Shuffle Questions
                                        </label>
                                    </div>

                                    {/* Shuffle Options Checkbox */}
                                    <div className="flex items-center">
                                        <input
                                            id="shuffleOptions"
                                            name="shuffleOptions"
                                            type="checkbox"
                                            checked={moduleData.shuffleOptions || false}
                                            onChange={handleChange}
                                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            disabled={loading}
                                        />
                                        <label htmlFor="shuffleOptions" className="ml-3 block text-lg font-medium text-gray-700">
                                            Shuffle Answer Options
                                        </label>
                                    </div>

                                    {/* Time Limit Minutes */}
                                    <div>
                                        <label htmlFor="timeLimitMinutes" className="block text-lg font-medium text-gray-700 mb-3">Time Limit (Minutes, leave blank for no limit)</label>
                                        <input
                                            type="number"
                                            id="timeLimitMinutes"
                                            name="timeLimitMinutes"
                                            value={moduleData.timeLimitMinutes === null ? '' : moduleData.timeLimitMinutes}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                            disabled={loading}
                                            min="0"
                                        />
                                        {formErrors.timeLimitMinutes && <p className="mt-2 text-sm text-red-600">{formErrors.timeLimitMinutes}</p>}
                                    </div>

                                    {/* Passing Score Percentage */}
                                    <div>
                                        <label htmlFor="passingScorePercentage" className="block text-lg font-medium text-gray-700 mb-3">Passing Score (%)</label>
                                        <input
                                            type="number"
                                            id="passingScorePercentage"
                                            name="passingScorePercentage"
                                            value={moduleData.passingScorePercentage || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                            disabled={loading}
                                            min="0"
                                            max="100"
                                        />
                                        {formErrors.passingScorePercentage && <p className="mt-2 text-sm text-red-600">{formErrors.passingScorePercentage}</p>}
                                    </div>

                                    {/* Available From */}
                                    <div>
                                        <label htmlFor="availableFrom" className="block text-lg font-medium text-gray-700 mb-3">Available From</label>
                                        <input
                                            type="date"
                                            id="availableFrom"
                                            name="availableFrom"
                                            value={moduleData.availableFrom || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                            disabled={loading}
                                        />
                                    </div>

                                    {/* Available Until */}
                                    <div>
                                        <label htmlFor="availableUntil" className="block text-lg font-medium text-gray-700 mb-3">Available Until</label>
                                        <input
                                            type="date"
                                            id="availableUntil"
                                            name="availableUntil"
                                            value={moduleData.availableUntil || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                            disabled={loading}
                                        />
                                    </div>
                                </div> {/* End of grid for Quiz Specific Settings */}
                            </div>
                        )}

                        <div className="flex justify-end space-x-4 mt-10">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="btn-cancel px-6 py-3"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 btn-create"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EditModulePage;