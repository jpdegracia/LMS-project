// src/components/Modules/AddModuleForm.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import Modal from '../../Modal/Modal';
import UserContext from '../../UserContext/UserContext';

// Lucide Icons for general use
import { Plus, Minus, CheckCircle, XCircle, Trash2 } from 'lucide-react';


const AddModuleForm = ({ sectionId, onModuleAdded, onCancel, course }) => {
    const { user } = useContext(UserContext);

    const [formData, setFormData] = useState({
        moduleType: 'lesson',
        title: '',
        description: '',
        progressBar: false,
        contents: [], // Stores IDs of selected LessonContent
        questionsPerPage: 1,
        questionNavigation: 'sequence',
        questionShuffle: false,
        shuffleOptions: false,
        questions: [], // Stores IDs of selected Questions (these will be simple IDs from the select)
        maxAttempts: -1, // Default to unlimited internally (-1 is backend representation)
        timeLimitMinutes: '', // Use empty string for optional number inputs
        passingScorePercentage: 0,
        availableFrom: '',
        availableUntil: '',
        status: 'draft',
    });

    const [allLessonContentsOptions, setAllLessonContentsOptions] = useState([]);
    const [questionsBank, setQuestionsBank] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [errorResources, setErrorResources] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({}); // State for form validation errors

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        const fetchResources = async () => {
            setLoadingResources(true);
            setErrorResources(null);
            try {
                const lessonRes = await fetch(`${BACKEND_URL}/lesson-content`, { credentials: 'include' });
                const lessonData = await lessonRes.json();
                if (lessonRes.ok && lessonData.success) {
                    setAllLessonContentsOptions(lessonData.data || []);
                } else {
                    throw new Error(lessonData.message || 'Failed to fetch lesson content.');
                }

                const questionRes = await fetch(`${BACKEND_URL}/questions`, { credentials: 'include' });
                const questionData = await questionRes.json();
                if (questionRes.ok && questionData.success) {
                    // Filter out any questions with invalid or missing _id before setting to state
                    setQuestionsBank((questionData.data || []).filter(q => q._id && typeof q._id === 'string'));
                } else {
                    throw new Error(questionData.message || 'Failed to fetch questions.');
                }
            } catch (err) {
                console.error('Error fetching resources:', err);
                setErrorResources('Failed to load lesson content or questions bank.');
            } finally {
                setLoadingResources(false);
            }
        };
        fetchResources();
    }, [BACKEND_URL]);

    // Helper to get clean plain text from HTML (for question options display)
    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    // Filter lesson contents to only show those not already used in the current course
    const getFilteredLessonContentsOptions = useCallback(() => {
        if (!course || !Array.isArray(allLessonContentsOptions)) return [];

        const usedContentIdsInCourse = new Set();
        (course.sections || []).forEach(section => {
            (section.modules || []).forEach(mod => {
                if (mod.moduleType === 'lesson' && Array.isArray(mod.contents)) {
                    mod.contents.forEach(contentItem => {
                        if (contentItem && contentItem._id) {
                            usedContentIdsInCourse.add(contentItem._id.toString());
                        } else if (typeof contentItem === 'string') {
                            usedContentIdsInCourse.add(contentItem);
                        }
                    });
                }
            });
        });

        // Also exclude contents already selected in the current form
        const currentModuleContentIds = new Set(Array.isArray(formData.contents) ? formData.contents.map(lc => lc._id ? lc._id.toString() : lc.toString()) : []);

        return allLessonContentsOptions.filter(lc =>
            !usedContentIdsInCourse.has(lc._id.toString()) || currentModuleContentIds.has(lc._id.toString())
        );
    }, [course, allLessonContentsOptions, formData.contents]);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormErrors(prev => ({ ...prev, [name]: '' })); // Clear error on change

        if (name === 'maxAttempts') {
            let parsedValue;
            if (value === '') { // If user leaves it blank
                parsedValue = -1; // Treat as unlimited
            } else {
                parsedValue = Number(value); 
                if (isNaN(parsedValue)) { 
                    parsedValue = null; // Still treat non-numeric as null/invalid
                }
            }
            setFormData(prev => ({ ...prev, [name]: parsedValue }));
        } else if (name === 'moduleType') {
            setFormData(prev => ({
                ...prev,
                moduleType: value,
                contents: value === 'lesson' ? prev.contents : [], // Keep existing if switching back
                questions: value === 'quiz' ? prev.questions : [], // Keep existing if switching back
                // Reset quiz/lesson specific number fields to default/null when switching type
                questionsPerPage: 1,
                maxAttempts: -1, // Reset to default unlimited
                timeLimitMinutes: '', // Reset to empty string
                passingScorePercentage: 0,
                questionNavigation: 'sequence',
                questionShuffle: false,
                shuffleOptions: false,
                availableFrom: '',
                availableUntil: '',
                status: 'draft',
            }));
            setFormErrors({}); // Clear all errors when module type changes
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    }, []);

    const handleLessonContentsSelectChange = useCallback((e) => {
        const { options } = e.target;
        const selectedValues = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                selectedValues.push(options[i].value);
            }
        }
        setFormData(prev => ({ ...prev, contents: selectedValues }));
        setFormErrors(prev => ({ ...prev, contents: '' }));
    }, []);

    const handleQuizQuestionsSelectChange = useCallback((e) => {
        const { options } = e.target;
        const selectedValues = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                selectedValues.push(options[i].value);
            }
        }
        setFormData(prev => ({ ...prev, questions: selectedValues }));
        setFormErrors(prev => ({ ...prev, questions: '' }));
    }, []);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newErrors = {};

        // Frontend validation
        if (!formData.title.trim()) {
            newErrors.title = "Module Title is required.";
        }

        const payload = { ...formData };
        payload.section = sectionId;

        // Clean up fields not relevant to the selected module type
        if (payload.moduleType === 'lesson') {
            payload.questionsPerPage = undefined;
            payload.questionNavigation = undefined;
            payload.questionShuffle = undefined;
            payload.shuffleOptions = undefined;
            payload.questions = undefined;
            payload.maxAttempts = undefined;
            payload.timeLimitMinutes = undefined;
            payload.passingScorePercentage = undefined;
            payload.availableFrom = undefined;
            payload.availableUntil = undefined;
            payload.status = undefined; // status is for quizzes in your schema
            // Ensure contents array is valid
            if (!payload.contents || payload.contents.length === 0) {
                newErrors.contents = "Lesson module requires at least one content selection.";
            }
        } else if (payload.moduleType === 'quiz') {
            payload.progressBar = undefined;
            payload.contents = undefined;
            // Ensure numbers are parsed or null if empty
            payload.timeLimitMinutes = payload.timeLimitMinutes !== '' ? parseInt(payload.timeLimitMinutes, 10) : null;
            payload.passingScorePercentage = parseInt(payload.passingScorePercentage, 10);
            // Convert date strings to Date objects or null if empty
            payload.availableFrom = payload.availableFrom ? new Date(payload.availableFrom) : null;
            payload.availableUntil = payload.availableUntil ? new Date(payload.availableUntil) : null;

            // --- IMPORTANT FIX: Transform questions array for backend ---
            // The backend likely expects an array of objects for quiz questions, e.g., [{ question: 'ID', points: 1 }]
            payload.questions = (formData.questions || []).map(qId => ({
                question: qId,
                points: 1 // Default to 1 point as there's no UI for custom points in AddModuleForm
            })).filter(item => item.question && typeof item.question === 'string' && item.question.trim()); // Ensure valid IDs are sent

            // Ensure questions array is valid AFTER transformation
            if (!payload.questions || payload.questions.length === 0) {
                newErrors.questions = "Quiz module requires at least one question selection.";
            }
            if (payload.questionsPerPage === '' || isNaN(payload.questionsPerPage) || payload.questionsPerPage < 1) {
                newErrors.questionsPerPage = "Questions Per Page is required and must be at least 1.";
            }
            if (payload.passingScorePercentage === '' || isNaN(payload.passingScorePercentage) || payload.passingScorePercentage < 0 || payload.passingScorePercentage > 100) {
                newErrors.passingScorePercentage = "Passing Score (%) is required and must be between 0 and 100.";
            }
            // Validation for maxAttempts:
            // It's valid if it's -1 (unlimited) or a positive number (>= 1).
            // It's invalid if it's any other negative number.
            if (payload.maxAttempts !== -1 && payload.maxAttempts < 1) { 
                 newErrors.maxAttempts = 'Max attempts must be a positive number, or leave blank for unlimited.';
            }
            if (payload.timeLimitMinutes !== null && payload.timeLimitMinutes < 0) {
                newErrors.timeLimitMinutes = 'Time limit cannot be negative.';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        // --- Add console logs for debugging payload ---
        console.log("Submitting payload for new module:", JSON.parse(JSON.stringify(payload))); // Deep copy to avoid mutation issues
        console.log("Raw selected question IDs (formData.questions):", formData.questions);
        console.log("Transformed questions array in payload:", payload.questions);


        try {
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}/modules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add module.');
            }

            onModuleAdded(); // Call onModuleAdded on success
        } catch (err) {
            console.error('Error adding module:', err);
            setErrorResources(err.message || 'Error adding module.'); // Display error in modal
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render loading/error states in the modal
    if (loadingResources) {
        return (
            <Modal onCancel={onCancel} title="Add New Module">
                <div className="flex items-center justify-center p-6 min-h-[150px]">
                    <p className="text-blue-600 text-lg">Loading resources...</p>
                </div>
            </Modal>
        );
    }

    if (errorResources) {
        return (
            <Modal onCancel={onCancel} title="Error">
                <div className="p-6">
                    <p className="text-red-600 text-lg mb-4">{errorResources}</p>
                    <div className="flex justify-end">
                        <button onClick={onCancel} className="btn-cancel px-4 py-2">Close</button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal onCancel={onCancel} title="Add New Module">
            <form onSubmit={handleSubmit} className="space-y-6 p-6"> {/* Increased padding on form container */}
                {/* General Module Fields - Arranged in two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"> {/* Adjusted gap values */}
                    <div className="md:col-span-2"> {/* Title spans both columns */}
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Module Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base" 
                            required
                            disabled={isSubmitting}
                        />
                        {formErrors.title && <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>}
                    </div>

                    <div className="md:col-span-2"> {/* Description spans both columns */}
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Module Description (Optional)</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="2"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base" 
                            disabled={isSubmitting}
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="moduleType" className="block text-sm font-medium text-gray-700 mb-1">
                            Module Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="moduleType"
                            name="moduleType"
                            value={formData.moduleType}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base" 
                            required
                            disabled={isSubmitting}
                        >
                            <option value="lesson">Lesson</option>
                            <option value="quiz">Quiz</option>
                        </select>
                    </div>
                    {/* Placeholder for future field or just keep it as one column for now */}
                    <div></div>
                </div>

                {/* Lesson-Specific Fields */}
                {formData.moduleType === 'lesson' && (
                    <div className="space-y-5 border-t pt-5 mt-6 border-gray-200"> {/* Adjusted spacing and border */}
                        <h3 className="text-lg font-semibold text-gray-800">Lesson Specifics</h3>
                        <div>
                            <label htmlFor="contents" className="block text-sm font-medium text-gray-700 mb-1">
                                Lesson Contents (Multi-Select) <span className="text-red-500">*</span>
                            </label>
                            <select
                                multiple
                                id="contents"
                                name="contents"
                                value={formData.contents}
                                onChange={handleLessonContentsSelectChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 h-48 focus:ring-blue-500 focus:border-blue-500 text-base" 
                                required
                                disabled={isSubmitting}
                            >
                                {Array.isArray(getFilteredLessonContentsOptions()) && getFilteredLessonContentsOptions().length > 0 ? (
                                    getFilteredLessonContentsOptions().map(lc => (
                                        <option key={lc._id} value={lc._id}>{lc.title}</option>
                                    ))
                                ) : (
                                    <option value="" disabled>No lesson content available. Add some first.</option>
                                )}
                            </select>
                            <p className="text-sm text-gray-500 mt-2">
                                Need new content? <a href="/lesson-content-management" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Manage Lesson Content</a>
                            </p>
                            {formErrors.contents && <p className="mt-1 text-xs text-red-600">{formErrors.contents}</p>}
                        </div>
                        <div className="flex items-center pt-2"> {/* Added padding top */}
                            <input
                                type="checkbox"
                                id="progressBar"
                                name="progressBar"
                                checked={formData.progressBar}
                                onChange={handleChange}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-blue-500"
                                disabled={isSubmitting}
                            />
                            <label htmlFor="progressBar" className="ml-2 block text-sm text-gray-900">Show Progress Bar (Optional)</label>
                        </div>
                    </div>
                )}

                {/* Quiz-Specific Fields */}
                {formData.moduleType === 'quiz' && (
                    <div className="space-y-5 border-t pt-5 mt-6 border-gray-200"> {/* Adjusted spacing and border */}
                        <h3 className="text-lg font-semibold text-gray-800">Quiz Specifics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"> {/* New grid for quiz specifics */}
                            <div className="md:col-span-2"> {/* Questions multi-select spans both columns */}
                                <label htmlFor="questions" className="block text-sm font-medium text-gray-700 mb-1">
                                    Questions (Multi-Select) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    multiple
                                    id="questions"
                                    name="questions"
                                    value={formData.questions}
                                    onChange={handleQuizQuestionsSelectChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 h-48 focus:ring-blue-500 focus:border-blue-500 text-base" 
                                    required
                                    disabled={isSubmitting}
                                >
                                    {/* Filter questionsBank to ensure only valid _id are used for options */}
                                    {Array.isArray(questionsBank) && questionsBank.length > 0 ? (
                                        questionsBank.filter(q => q._id && typeof q._id === 'string').map(q => (
                                            <option key={q._id} value={q._id}>
                                                {getCleanPlainText(q.questionText).substring(0, 70) + (getCleanPlainText(q.questionText).length > 70 ? '...' : '')}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>No questions available. Add some first.</option>
                                    )}
                                </select>
                                <p className="text-sm text-gray-500 mt-2">
                                    Need new questions? <a href="/question-bank-management" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Manage Question Bank</a>
                                </p>
                                {formErrors.questions && <p className="mt-1 text-xs text-red-600">{formErrors.questions}</p>}
                            </div>

                            <div>
                                <label htmlFor="questionsPerPage" className="block text-sm font-medium text-gray-700 mb-1">
                                    Questions Per Page <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="questionsPerPage"
                                    name="questionsPerPage"
                                    value={formData.questionsPerPage}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    min="1"
                                    required
                                    disabled={isSubmitting}
                                />
                                {formErrors.questionsPerPage && <p className="mt-1 text-xs text-red-600">{formErrors.questionsPerPage}</p>}
                            </div>
                            <div>
                                <label htmlFor="questionNavigation" className="block text-sm font-medium text-gray-700 mb-1">Question Navigation (Optional)</label>
                                <select
                                    id="questionNavigation"
                                    name="questionNavigation"
                                    value={formData.questionNavigation}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    disabled={isSubmitting}
                                >
                                    <option value="sequence">Sequential</option>
                                    <option value="free">Free</option>
                                </select>
                            </div>

                            <div className="flex items-center col-span-1"> {/* Aligned checkboxes in their own column */}
                                <input
                                    type="checkbox"
                                    id="questionShuffle"
                                    name="questionShuffle"
                                    checked={formData.questionShuffle}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-blue-500"
                                    disabled={isSubmitting}
                                />
                                <label htmlFor="questionShuffle" className="ml-2 block text-sm text-gray-900">Shuffle Questions (Optional)</label>
                            </div>
                            <div className="flex items-center col-span-1"> {/* Aligned checkboxes in their own column */}
                                <input
                                    type="checkbox"
                                    id="shuffleOptions"
                                    name="shuffleOptions"
                                    checked={formData.shuffleOptions}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-blue-500"
                                    disabled={isSubmitting}
                                />
                                <label htmlFor="shuffleOptions" className="ml-2 block text-sm text-gray-900">Shuffle Options (Optional)</label>
                            </div>

                            <div>
                                <label htmlFor="maxAttempts" className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
                                <input
                                    type="text" 
                                    id="maxAttempts"
                                    name="maxAttempts"
                                    // Display empty string if -1 (unlimited) or null, otherwise display the number
                                    value={formData.maxAttempts === -1 ? '' : (formData.maxAttempts === null ? '' : formData.maxAttempts)}
                                    onChange={handleChange} 
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    // Removed min="0" as it's now type="text"
                                    disabled={isSubmitting}
                                />
                                <p className="mt-1 text-xs text-gray-500">Leave blank for unlimited attempts.</p> {/* Updated hint */}
                                {formErrors.maxAttempts && <p className="mt-1 text-xs text-red-600">{formErrors.maxAttempts}</p>}
                            </div>
                            <div>
                                <label htmlFor="timeLimitMinutes" className="block text-sm font-medium text-gray-700 mb-1">Time Limit (Minutes, leave blank for no limit) (Optional)</label>
                                <input
                                    type="number"
                                    id="timeLimitMinutes"
                                    name="timeLimitMinutes"
                                    value={formData.timeLimitMinutes}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    min="0"
                                    disabled={isSubmitting}
                                />
                                {formErrors.timeLimitMinutes && <p className="mt-1 text-xs text-red-600">{formErrors.timeLimitMinutes}</p>}
                            </div>

                            <div>
                                <label htmlFor="passingScorePercentage" className="block text-sm font-medium text-gray-700 mb-1">
                                    Passing Score (%) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="passingScorePercentage"
                                    name="passingScorePercentage"
                                    value={formData.passingScorePercentage}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    min="0"
                                    max="100"
                                    required
                                    disabled={isSubmitting}
                                />
                                {formErrors.passingScorePercentage && <p className="mt-1 text-xs text-red-600">{formErrors.passingScorePercentage}</p>}
                            </div>
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                    Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="availableFrom" className="block text-sm font-medium text-gray-700 mb-1">Available From (Optional)</label>
                                <input
                                    type="date"
                                    id="availableFrom"
                                    name="availableFrom"
                                    value={formData.availableFrom}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label htmlFor="availableUntil" className="block text-sm font-medium text-gray-700 mb-1">Available Until (Optional)</label>
                                <input
                                    type="date"
                                    id="availableUntil"
                                    name="availableUntil"
                                    value={formData.availableUntil}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                    disabled={isSubmitting}
                                />
                            </div>

                        </div> {/* End of grid for Quiz specifics */}
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200"> {/* Added padding top and border */}
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn-cancel px-5 py-2 rounded-md transition duration-200" 
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-create px-5 py-2 rounded-md transition duration-200 disabled:opacity-50" 
                    >
                        {isSubmitting ? 'Adding...' : 'Add Module'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddModuleForm;
