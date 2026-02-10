import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../components/UserContext/UserContext';
import QuizSettingsForm from '../Questions/QuizSettingsForm';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircle, Trash2, BookOpen, Search, Grab, ArrowLeft, Zap, Settings, HelpCircle } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';

const SortableItem = ({ qItem, index, onRemove, loading, getCleanPlainText }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: qItem.question?._id || qItem._id,
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const questionId = qItem.question?._id || qItem._id;
    const cleanText = getCleanPlainText(qItem.question?.questionText) || 'Unknown Question';
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-transparent transition-all duration-200 ease-in-out"
        >
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-purple-600 flex-shrink-0">
                <Grab size={20} />
            </div>
            <span className="font-medium text-gray-800">{index + 1}.</span>
            <div className="flex-grow flex items-center space-x-2">
                <BookOpen size={18} className="text-purple-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-grow">
                    {cleanText.substring(0, 70) + (cleanText.length > 70 ? '...' : '')}
                </span>
            </div>
            <button
                type="button"
                onClick={() => onRemove(questionId)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                disabled={loading}
                title="Remove question from quiz"
            >
                <Trash2 size={20} />
            </button>
        </div>
    );
};

const AddQuizModuleForm = ({ onSave, onCancel }) => {
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [formData, setFormData] = useState({
        moduleType: 'quiz',
        title: '',
        description: '',
        categoryId: '',
        questionsPerPage: 1,
        questionNavigation: 'sequence',
        questionShuffle: false,
        shuffleOptions: false,
        questions: [],
        maxAttempts: -1,
        timeLimitMinutes: '',
        passingScorePercentage: 0,
        availableFrom: '',
        availableUntil: '',
        status: 'draft',
        direction: '',
    });

    const [questionsBank, setQuestionsBank] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    const [filterText, setFilterText] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [sortOrder, setSortOrder] = useState('default');
    
    const [satCategoryId, setSatCategoryId] = useState(null);

    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    const fetchResources = useCallback(async () => {
        setLoadingResources(true);
        setError(null);
        try {
            if (!hasPermission('quiz:create')) {
                throw new Error("You don't have permission to create quizzes.");
            }
            const [questionsRes, categoriesRes, subjectsRes] = await Promise.all([
                fetch(`${BACKEND_URL}/questions`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/categories`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/subjects`, { credentials: 'include' }),
            ]);
            const [questionsJson, categoriesJson, subjectsJson] = await Promise.all([
                questionsRes.json(),
                categoriesRes.json(),
                subjectsRes.json(),
            ]);
            if (questionsRes.ok && questionsJson.success) {
                const publishedQuestions = (questionsJson.data || []).filter(q => q.status === 'published');
                setQuestionsBank(publishedQuestions);
            } else {
                throw new Error(questionsJson.message || 'Failed to fetch questions.');
            }
            if (categoriesRes.ok && categoriesJson.success) {
                setCategories(categoriesJson.data || []);
            } else {
                throw new Error(categoriesJson.message || 'Failed to retrieve categories data.');
            }
            if (subjectsRes.ok && subjectsJson.success) {
                setSubjects(subjectsJson.data || []);
            } else {
                throw new Error(subjectsJson.message || 'Failed to retrieve subjects data.');
            }
        } catch (err) {
            console.error('Error fetching resources:', err);
            setError(err.message || 'Failed to load resources.');
        } finally {
            setLoadingResources(false);
        }
    }, [BACKEND_URL, hasPermission]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);
    
    useEffect(() => {
        if (categories.length > 0) {
            const satCat = categories.find(cat => cat.name === 'SAT');
            if (satCat) {
                setSatCategoryId(satCat._id);
            }
        }
    }, [categories]);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormErrors(prev => ({ ...prev, [name]: '' }));
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'questionShuffle' || name === 'shuffleOptions' ? value === 'true' : value)
        }));
    }, []);
    
    const handleDirectionChange = useCallback((content) => {
        setFormData(prev => ({ ...prev, direction: content }));
    }, []);

    const handleAddQuestionToQuiz = useCallback((questionToAdd) => {
        setFormData(prev => {
            if (!prev) return prev;
            const currentQuestions = prev.questions || [];
            const isAlreadyAdded = currentQuestions.some(q => (q.question?._id || q._id) === questionToAdd._id);
            if (!isAlreadyAdded) {
                return {
                    ...prev,
                    questions: [...currentQuestions, { question: questionToAdd, points: 1 }]
                };
            }
            return prev;
        });
        setFormErrors(prev => ({ ...prev, questions: '' }));
    }, []);

    const handleRemoveQuestionFromQuiz = useCallback((questionIdToRemove) => {
        setFormData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                questions: (prev.questions || []).filter(q => (q.question?._id || q._id) !== questionIdToRemove)
            };
        });
        setFormErrors(prev => ({ ...prev, questions: '' }));
    }, []);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFormData((prev) => {
                if (!prev) return prev;
                const oldIndex = prev.questions.findIndex((q) => (q.question?._id || q._id) === active.id);
                const newIndex = prev.questions.findIndex((q) => (q.question?._id || q._id) === over.id);
                return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) };
            });
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newErrors = {};
        if (!formData.categoryId) {
            newErrors.categoryId = 'A category is required.';
        }
        if (!formData.title.trim()) {
            newErrors.title = "Quiz Title is required.";
        }
        if (!formData.questions || formData.questions.length === 0) {
            newErrors.questions = "Quiz module requires at least one question selection.";
        }
        
        const payload = { ...formData };
        payload.questionsPerPage = parseInt(payload.questionsPerPage, 10);
        payload.passingScorePercentage = parseInt(payload.passingScorePercentage, 10);
        payload.maxAttempts = payload.maxAttempts === '' || payload.maxAttempts === 'unlimited' ? -1 : parseInt(payload.maxAttempts, 10);
        payload.timeLimitMinutes = payload.timeLimitMinutes === '' ? null : parseInt(payload.timeLimitMinutes, 10);
        payload.availableFrom = payload.availableFrom || null;
        payload.availableUntil = payload.availableUntil || null;

        if (formData.categoryId === satCategoryId) {
            if (isNaN(payload.questionsPerPage) || payload.questionsPerPage < 1) {
                newErrors.questionsPerPage = "Questions Per Page is required and must be at least 1.";
            }
            if (isNaN(payload.passingScorePercentage) || payload.passingScorePercentage < 0 || payload.passingScorePercentage > 100) {
                newErrors.passingScorePercentage = "Passing Score (%) is required and must be between 0 and 100.";
            }
            if (payload.maxAttempts !== -1 && (isNaN(payload.maxAttempts) || payload.maxAttempts < 1)) {
                newErrors.maxAttempts = 'Max attempts must be a positive number, or leave blank for unlimited.';
            }
            if (payload.timeLimitMinutes !== null && isNaN(payload.timeLimitMinutes) || payload.timeLimitMinutes < 0) {
                newErrors.timeLimitMinutes = 'Time limit cannot be negative.';
            }
        }
        
        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        const questionsPayload = (formData.questions || [])
            .map(q => {
                const questionId = q.question?._id;
                if (!questionId) {
                    console.error("Missing question ID in a selected question object:", q);
                    return null;
                }
                return {
                    questionId: questionId,
                    points: q.points ?? 1
                };
            })
            .filter(item => item !== null);

        const finalPayload = {
            ...payload,
            questions: questionsPayload,
            categoryId: formData.categoryId,
        };

        try {
            const response = await fetch(`${BACKEND_URL}/modules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(finalPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add quiz module.');
            }
            onSave();
        } catch (err) {
            console.error('Error adding quiz module:', err);
            setError(err.message || 'Error adding quiz module.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingResources) {
        return <div className="p-6 text-center text-blue-600">Loading resources...</div>;
    }

    if (error) {
        return <div className="p-6 text-center text-red-500">Error: {error}</div>;
    }
    const availableQuestions = questionsBank.filter(
        q => !formData.questions.some(qSelected => q.question?._id === qSelected._id || q._id === qSelected.question?._id)
    ).filter(
        q => getCleanPlainText(q.questionText).toLowerCase().includes(filterText.toLowerCase())
    ).filter(
        q => selectedSubject === '' || (q.subject && q.subject._id === selectedSubject)
    ).sort((a, b) => {
        const titleA = getCleanPlainText(a.questionText).toLowerCase();
        const titleB = getCleanPlainText(b.questionText).toLowerCase();
        if (sortOrder === 'title-asc') return titleA.localeCompare(titleB);
        if (sortOrder === 'title-desc') return titleB.localeCompare(a.questionText);
        return 0;
    });
    const isSatCategorySelected = formData.categoryId && formData.categoryId === satCategoryId;
    return (
        <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-10">
            <h2 className="text-4xl font-bold text-gray-800 flex items-center space-x-4 mb-6">
                <Zap size={36} className="text-orange-600" />
                <span>Add New Quiz Module</span>
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="md:col-span-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Quiz Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            required
                            disabled={isSubmitting}
                        />
                        {formErrors.title && <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Quiz Description (Optional)
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="2"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            disabled={isSubmitting}
                        ></textarea>
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                            Quiz Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="categoryId"
                            name="categoryId"
                            value={formData.categoryId}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            disabled={isSubmitting}
                            required
                        >
                            <option value="">Select a category</option>
                            {categories.map(category => (
                                <option key={category._id} value={category._id}>{category.name}</option>
                            ))}
                        </select>
                        {formErrors.categoryId && <p className="mt-1 text-xs text-red-600">{formErrors.categoryId}</p>}
                    </div>

                    {isSatCategorySelected && (
                        <div className="md:col-span-2">
                            <label htmlFor="direction" className="block text-sm font-medium text-gray-700 mb-1">
                                Quiz Direction (Optional)
                            </label>
                            <Editor
                                apiKey='dpd6dld04b51jyqhuze4ik03um8y07n98w0bzavbou4on3dm'
                                id="direction"
                                value={formData.direction}
                                onEditorChange={handleDirectionChange}
                                disabled={isSubmitting}
                                init={{ 
                                    height: 200, 
                                    menubar: false, 
                                    plugins: ['link', 'image', 'code'], 
                                    toolbar: 'undo redo | bold italic underline strikethrough | link image | code', 
                                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                                }}
                            />
                        </div>
                    )}
                    
                    <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status || 'draft'}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                required
                                disabled={isSubmitting}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                            {formErrors.status && <p className="mt-1 text-xs text-red-600">{formErrors.status}</p>}
                        </div>
                        <div className="flex-1">
                            <label htmlFor="questionShuffle" className="block text-sm font-medium text-gray-700 mb-1">
                                Shuffle Questions
                            </label>
                            <select
                                id="questionShuffle"
                                name="questionShuffle"
                                value={formData.questionShuffle ? 'true' : 'false'}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                disabled={isSubmitting}
                            >
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="shuffleOptions" className="block text-sm font-medium text-gray-700 mb-1">
                                Shuffle Answer Options
                            </label>
                            <select
                                id="shuffleOptions"
                                name="shuffleOptions"
                                value={formData.shuffleOptions ? 'true' : 'false'}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                disabled={isSubmitting}
                            >
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                {isSatCategorySelected && (
                    <div className="space-y-5 border-t pt-5 mt-6 border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">Quiz Settings</h3>
                        <QuizSettingsForm
                            formData={formData}
                            handleChange={handleChange}
                            formErrors={formErrors}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                )}
                
                <div className="space-y-5 border-t pt-5 mt-6 border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Manage Questions</h3>
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
                            <h4 className="text-md font-semibold text-gray-700 mb-4">Questions in this Quiz: ({formData.questions?.length || 0})</h4>
                            {formErrors.questions && <p className="mt-2 text-sm text-red-600 mb-5">{formErrors.questions}</p>}
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {formData.questions?.length > 0 ? (
                                    <DndContext
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={formData.questions.map(q => q.question?._id || q._id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {formData.questions.map((qItem, index) => (
                                                <SortableItem
                                                    key={qItem.question?._id || qItem._id}
                                                    qItem={qItem}
                                                    index={index}
                                                    onRemove={handleRemoveQuestionFromQuiz}
                                                    loading={isSubmitting}
                                                    getCleanPlainText={getCleanPlainText}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                ) : (
                                    <p className="text-center text-gray-500 italic p-3">No questions added yet. Add some from the right panel.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
                            <h4 className="text-md font-semibold text-gray-700 mb-4">Available Questions: ({availableQuestions.length})</h4>
                            
                            <div className="flex flex-col gap-4 mb-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Filter questions by text..."
                                        value={filterText}
                                        onChange={(e) => setFilterText(e.target.value)}
                                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm"
                                        disabled={isSubmitting}
                                    />
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
                                        disabled={isSubmitting}
                                    >
                                        <option value="">All Subjects</option>
                                        {subjects.map(subject => (
                                            <option key={subject._id} value={subject._id}>{subject.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
                                        disabled={isSubmitting}
                                    >
                                        <option value="default">Default Order</option>
                                        <option value="title-asc">Title (A-Z)</option>
                                        <option value="title-desc">Title (Z-A)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {availableQuestions.length > 0 ? (
                                    availableQuestions.map(qBank => (
                                        <div key={qBank._id} className="flex items-center space-x-2 p-3 bg-white rounded-md shadow-sm">
                                            <div className="flex-grow flex items-center space-x-2">
                                                <Zap size={18} className="text-purple-500 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 flex-grow">
                                                    {getCleanPlainText(qBank.questionText).substring(0, 70) + (getCleanPlainText(qBank.questionText).length > 70 ? '...' : '')}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAddQuestionToQuiz(qBank)}
                                                className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 transition-colors"
                                                disabled={isSubmitting}
                                                title="Add question to quiz"
                                            >
                                                <PlusCircle size={20} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 italic p-3">No questions available or matching your filter.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
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
                        {isSubmitting ? 'Adding...' : 'Add Quiz Module'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddQuizModuleForm;
