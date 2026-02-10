// src/components/Modules/EditModuleForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../Modal/Modal'; // Adjust path based on your file structure

// No specific Lucide React Icons needed here, as the content is mainly form fields.
// No Tiptap or TinyMCE imports are needed or used here.


const EditModuleForm = ({ module, sectionId, onSave, onCancel, course }) => { // Ensure 'course' prop is received
    // Initialize formData with explicit defaults from the 'module' prop
    const [formData, setFormData] = useState({
        title: module.title ?? '',
        description: module.description ?? '',
        order: module.order ?? 1,
        // Lesson-specific fields
        progressBar: module.moduleType === 'lesson' ? (module.progressBar ?? false) : false,
        contents: module.moduleType === 'lesson' && Array.isArray(module.contents) ? module.contents.map(lc => lc._id) : [],
        // Quiz-specific fields (NEW)
        questionsPerPage: module.moduleType === 'quiz' ? (module.questionsPerPage ?? 1) : 1,
        questionNavigation: module.moduleType === 'quiz' ? (module.questionNavigation || 'sequence') : 'sequence',
        questionShuffle: module.moduleType === 'quiz' ? (module.questionShuffle ?? false) : false,
        shuffleOptions: module.moduleType === 'quiz' ? (module.shuffleOptions ?? false) : false, // NEW
        questions: module.moduleType === 'quiz' && Array.isArray(module.questions) ? module.questions.map(q => q._id) : [],
        maxAttempts: module.moduleType === 'quiz' ? (module.maxAttempts ?? -1) : -1, // NEW
        timeLimitMinutes: module.moduleType === 'quiz' ? (module.timeLimitMinutes ?? '') : '', // NEW: Use empty string for input type="number" with null
        passingScorePercentage: module.moduleType === 'quiz' ? (module.passingScorePercentage ?? 0) : 0, // NEW
        availableFrom: module.moduleType === 'quiz' && module.availableFrom ? new Date(module.availableFrom).toISOString().split('T')[0] : '', // NEW: Format Date for input type="date"
        availableUntil: module.moduleType === 'quiz' && module.availableUntil ? new Date(module.availableUntil).toISOString().split('T')[0] : '', // NEW: Format Date for input type="date"
        status: module.moduleType === 'quiz' ? (module.status || 'draft') : 'draft', // NEW
        // createdBy is handled by backend based on session, no need to edit here, but keep in mind for payload
    });
    const [allLessonContentsOptions, setAllLessonContentsOptions] = useState([]);
    const [questionsBank, setQuestionsBank] = useState([]); // Stores all possible questions from bank
    const [loadingResources, setLoadingResources] = useState(true);
    const [errorResources, setErrorResources] = useState(null);
    const [isSaving, setIsSaving] = useState(false);


    // This useEffect is crucial for synchronizing local formData with the 'module' prop
    // and for fetching resources (all lesson contents, all questions)
    useEffect(() => {
        // *** DEBUG LOG ***
        console.log("[EditModuleForm useEffect] Module prop received (on init/update):", module);
        console.log("[EditModuleForm useEffect] module.contents (raw from prop):", module.contents);

        // Re-initialize formData from the 'module' prop whenever 'module' changes
        const newFormData = {
            title: module.title ?? '',
            description: module.description ?? '',
            order: module.order ?? 1,
            progressBar: module.moduleType === 'lesson' ? (module.progressBar ?? false) : false,
            contents: module.moduleType === 'lesson' && Array.isArray(module.contents) ? module.contents.map(lc => lc._id) : [],
            questionsPerPage: module.moduleType === 'quiz' ? (module.questionsPerPage ?? 1) : 1,
            questionNavigation: module.moduleType === 'quiz' ? (module.questionNavigation || 'sequence') : 'sequence',
            questionShuffle: module.moduleType === 'quiz' ? (module.questionShuffle ?? false) : false,
            shuffleOptions: module.moduleType === 'quiz' ? (module.shuffleOptions ?? false) : false, // NEW
            questions: module.moduleType === 'quiz' && Array.isArray(module.questions) ? module.questions.map(q => q._id) : [],
            maxAttempts: module.moduleType === 'quiz' ? (module.maxAttempts ?? -1) : -1, // NEW
            timeLimitMinutes: module.moduleType === 'quiz' && module.timeLimitMinutes !== null ? module.timeLimitMinutes : '', // NEW: Handle null default
            passingScorePercentage: module.moduleType === 'quiz' ? (module.passingScorePercentage ?? 0) : 0, // NEW
            availableFrom: module.moduleType === 'quiz' && module.availableFrom ? new Date(module.availableFrom).toISOString().split('T')[0] : '', // NEW
            availableUntil: module.moduleType === 'quiz' && module.availableUntil ? new Date(module.availableUntil).toISOString().split('T')[0] : '', // NEW
            status: module.moduleType === 'quiz' ? (module.status || 'draft') : 'draft', // NEW
        };
        setFormData(newFormData);
        // *** DEBUG LOG ***
        console.log("[EditModuleForm useEffect] formData.contents set to:", newFormData.contents);


        // Fetch resources (all lesson contents, questions bank) needed for the dropdowns
        const fetchResources = async () => {
            setLoadingResources(true);
            try {
                const lessonRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/lesson-content`, { credentials: 'include' });
                const lessonData = await lessonRes.json();
                if (lessonRes.ok && lessonData.success) {
                    setAllLessonContentsOptions(lessonData.data);
                } else {
                    throw new Error(lessonData.message || 'Failed to fetch lesson content.');
                }

                const questionRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/questions`, { credentials: 'include' });
                const questionData = await questionRes.json();
                if (questionRes.ok && questionData.success) {
                    setQuestionsBank(questionData.data);
                } else {
                    throw new Error(questionData.message || 'Failed to fetch questions.');
                }
            } catch (err) {
                console.error('Error fetching resources:', err);
                setErrorResources('Failed to load lesson content or questions bank.');
                alert('Failed to load resources for module editing.');
            } finally {
                setLoadingResources(false);
            }
        };
        fetchResources();
    }, [module]); // Depend on 'module' prop to re-run fetch and re-initialize formData


    // Memoized function to filter lesson content options based on what's already used in the course
    const getFilteredLessonContentsOptions = useCallback(() => {
        if (!course || !allLessonContentsOptions) return [];

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

        // Content IDs already part of THIS module being edited.
        const currentModuleContentIds = new Set(Array.isArray(module.contents) ? module.contents.map(lc => lc._id ? lc._id.toString() : lc.toString()) : []);

        return allLessonContentsOptions.filter(lc =>
            !usedContentIdsInCourse.has(lc._id.toString()) || currentModuleContentIds.has(lc._id.toString())
        );
    }, [course, allLessonContentsOptions, module.contents]);


    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
    }, []);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = { ...formData };
        // Clean up fields not relevant to the selected module type
        if (module.moduleType === 'lesson') {
            payload.questionsPerPage = undefined;
            payload.questionNavigation = undefined;
            payload.questionShuffle = undefined;
            payload.shuffleOptions = undefined; // NEW: Clear for lesson
            payload.questions = undefined;
            payload.maxAttempts = undefined; // NEW: Clear for lesson
            payload.timeLimitMinutes = undefined; // NEW: Clear for lesson
            payload.passingScorePercentage = undefined; // NEW: Clear for lesson
            payload.availableFrom = undefined; // NEW: Clear for lesson
            payload.availableUntil = undefined; // NEW: Clear for lesson
            payload.status = undefined; // NEW: Clear for lesson
        } else if (module.moduleType === 'quiz') {
            payload.progressBar = undefined;
            payload.contents = undefined;
            // Convert timeLimitMinutes to number or null
            payload.timeLimitMinutes = payload.timeLimitMinutes ? parseInt(payload.timeLimitMinutes) : null;
            // Convert maxAttempts to number or -1
            payload.maxAttempts = payload.maxAttempts ? parseInt(payload.maxAttempts) : -1;
            // Convert passingScorePercentage to number
            payload.passingScorePercentage = parseInt(payload.passingScorePercentage);
            // Convert date strings to Date objects if they are not empty
            payload.availableFrom = payload.availableFrom ? new Date(payload.availableFrom) : null;
            payload.availableUntil = payload.availableUntil ? new Date(payload.availableUntil) : null;
            // Ensure createdBy is explicitly in payload (set from UserContext on render)
            payload.createdBy = payload.createdBy || user?.id || null; // Safely get user ID
        }

        // Ensure title and description are explicitly set, even if empty string is desired
        payload.title = payload.title || '';
        payload.description = payload.description || '';


        // Validation logic for contents/questions
        if (!payload.title || !payload.order || !payload.description) { // Added description to common required
            alert("Title, description, and order are required.");
            setIsSaving(false);
            return;
        }
        if (module.moduleType === 'lesson' && (!payload.contents || payload.contents.length === 0)) {
            alert("Lesson module requires at least one content selection.");
            setIsSaving(false);
            return;
        }
        if (module.moduleType === 'quiz' && (!payload.questions || payload.questions.length === 0)) {
            alert("Quiz module requires at least one question selection.");
            setIsSaving(false);
            return;
        }
        // Quiz-specific validation
        if (module.moduleType === 'quiz' && payload.createdBy === null) {
            alert("Quiz module creator is required.");
            setIsSaving(false);
            return;
        }


        console.log("[EditModuleForm] Sending payload:", payload);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/modules/${module._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            console.log("[EditModuleForm] API response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error("[EditModuleForm] API error response:", errorData);
                throw new Error(errorData.message || 'Failed to update module.');
            }

            console.log("[EditModuleForm] Module update successful (frontend side). Calling onSave().");
            onSave(); // This triggers parent re-fetch
        } catch (err) {
            console.error('Error updating module:', err);
            alert(err.message || 'Error updating module.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingResources) {
        return <Modal onCancel={onCancel} title={`Edit ${module.moduleType === 'lesson' ? 'Lesson' : 'Quiz'} Module`}><p>Loading resources...</p></Modal>;
    }
    if (errorResources) {
        return <Modal onCancel={onCancel} title={`Edit ${module.moduleType === 'lesson' ? 'Lesson' : 'Quiz'} Module`}><p className="text-red-500">{errorResources}</p></Modal>;
    }

    return (
        <Modal onCancel={onCancel} title={`Edit ${module.moduleType === 'lesson' ? 'Lesson' : 'Quiz'} Module`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Common Fields */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Module Title</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Module Description</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange}
                        rows="2" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
                </div>

                <p className="text-lg font-medium">Module Type: <span className="font-bold">{module.moduleType.toUpperCase()}</span></p>

                <div>
                    <label htmlFor="order" className="block text-sm font-medium text-gray-700">Order</label>
                    <input type="number" id="order" name="order" value={formData.order} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" min="1" required />
                </div>

                {/* Lesson-Specific Fields */}
                {module.moduleType === 'lesson' && (
                    <>
                        <div>
                            <label htmlFor="contents" className="block text-sm font-medium text-gray-700">Lesson Contents (Multi-Select)</label>
                            <select multiple id="contents" name="contents" value={formData.contents} onChange={handleLessonContentsSelectChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-40" required>
                                {getFilteredLessonContentsOptions().map(lc => (
                                    <option key={lc._id} value={lc._id}>{lc.title} ({lc.type})</option>
                                ))}
                            </select>
                            <p className="text-sm text-gray-500 mt-1">
                                Need new content? <a href="/lesson-content-management" target="_blank" className="text-blue-600 hover:underline">Manage Lesson Content</a>
                            </p>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" id="progressBar" name="progressBar" checked={formData.progressBar} onChange={handleChange}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                            <label htmlFor="progressBar" className="ml-2 block text-sm text-gray-900">Show Progress Bar</label>
                        </div>
                    </>
                )}

                {/* Quiz-Specific Fields */}
                {module.moduleType === 'quiz' && (
                    <>
                        <div>
                            <label htmlFor="questions" className="block text-sm font-medium text-gray-700">Questions (Multi-Select)</label>
                            <select multiple id="questions" name="questions" value={formData.questions} onChange={handleQuizQuestionsSelectChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-40" required>
                                {questionsBank.map(q => (
                                    <option key={q._id} value={q._id}>{q.questionText.substring(0, 50)}...</option>
                                ))}
                            </select>
                            <p className="text-sm text-gray-500 mt-1">
                                Need new questions? <a href="/question-bank-management" target="_blank" className="text-blue-600 hover:underline">Manage Question Bank</a>
                            </p>
                        </div>
                        <div>
                            <label htmlFor="questionsPerPage" className="block text-sm font-medium text-gray-700">Questions Per Page</label>
                            <input type="number" id="questionsPerPage" name="questionsPerPage" value={formData.questionsPerPage} onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" min="1" max="10" />
                        </div>
                        <div>
                            <label htmlFor="questionNavigation" className="block text-sm font-medium text-gray-700">Question Navigation</label>
                            <select id="questionNavigation" name="questionNavigation" value={formData.questionNavigation} onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="sequence">Sequential</option>
                                <option value="free">Free</option>
                            </select>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" id="questionShuffle" name="questionShuffle" checked={formData.questionShuffle} onChange={handleChange}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                            <label htmlFor="questionShuffle" className="ml-2 block text-sm text-gray-900">Shuffle Questions</label>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" id="shuffleOptions" name="shuffleOptions" checked={formData.shuffleOptions} onChange={handleChange}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                            <label htmlFor="shuffleOptions" className="ml-2 block text-sm text-gray-900">Shuffle Options</label>
                        </div>
                        <div>
                            <label htmlFor="maxAttempts" className="block text-sm font-medium text-gray-700">Max Attempts (-1 for unlimited)</label>
                            <input type="number" id="maxAttempts" name="maxAttempts" value={formData.maxAttempts} onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                        <div>
                            <label htmlFor="timeLimitMinutes" className="block text-sm font-medium text-gray-700">Time Limit (Minutes, 0 for no limit)</label>
                            <input type="number" id="timeLimitMinutes" name="timeLimitMinutes" value={formData.timeLimitMinutes} onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" min="0" />
                        </div>
                        <div>
                            <label htmlFor="passingScorePercentage" className="block text-sm font-medium text-gray-700">Passing Score (%)</label>
                            <input type="number" id="passingScorePercentage" name="passingScorePercentage" value={formData.passingScorePercentage} onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" min="0" max="100" />
                        </div>
                        <div>
                            <label htmlFor="availableFrom" className="block text-sm font-medium text-gray-700">Available From</label>
                            <input type="date" id="availableFrom" name="availableFrom" value={formData.availableFrom} onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                        <div>
                            <label htmlFor="availableUntil" className="block text-sm font-medium text-gray-700">Available Until</label>
                            <input type="date" id="availableUntil" name="availableUntil" value={formData.availableUntil} onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        {/* createdBy is handled in backend from req.user, no need for input here, but keep in mind for payload */}
                    </>
                )}

                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md transition duration-200">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition duration-200 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Add Module'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditModuleForm;