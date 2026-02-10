import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../components/UserContext/UserContext';
import { PlusCircle, Trash2, Search, Grab, FlaskConical, Zap } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableQuizItem = ({ quizItem, index, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: quizItem._id,
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
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
                <Zap size={18} className="text-orange-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-grow">
                    {quizItem.title}
                </span>
            </div>
            <button
                type="button"
                onClick={() => onRemove(quizItem._id)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                title="Remove quiz from test"
            >
                <Trash2 size={20} />
            </button>
        </div>
    );
};

const AddTestModuleForm = ({ onSave, onCancel }) => {
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [formData, setFormData] = useState({
        moduleType: 'test',
        title: '',
        description: '',
        quizModules: [],
        status: 'draft',
    });

    const [availableQuizzes, setAvailableQuizzes] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [error, setError] = useState(null);

    const [filterText, setFilterText] = useState('');
    const [sortOrder, setSortOrder] = useState('default');

    const fetchResources = useCallback(async () => {
        setLoadingResources(true);
        setError(null);
        try {
            if (!hasPermission('module:create')) {
                throw new Error("You don't have permission to create tests.");
            }
            // The backend request should already be filtered for quizzes, but we add a local filter for robustness.
            const quizzesRes = await fetch(`${BACKEND_URL}/modules?moduleType=quiz`, { credentials: 'include' });
            const quizzesJson = await quizzesRes.json();

            if (quizzesRes.ok && quizzesJson.success) {
                // Add a local filter to explicitly check for the 'quiz' moduleType
                const quizzes = (quizzesJson.data || []).filter(q => q.moduleType === 'quiz' && q.status === 'published');
                setAvailableQuizzes(quizzes);
            } else {
                throw new Error(quizzesJson.message || 'Failed to fetch quizzes.');
            }
        } catch (err) {
            console.error('Error fetching resources:', err);
            setError(err.message || 'Failed to load quizzes.');
        } finally {
            setLoadingResources(false);
        }
    }, [BACKEND_URL, hasPermission]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormErrors(prev => ({ ...prev, [name]: '' }));
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleAddQuizToTest = useCallback((quizToAdd) => {
        setFormData(prev => {
            const isAlreadyAdded = (prev.quizModules || []).some(q => q._id === quizToAdd._id);
            if (!isAlreadyAdded) {
                return {
                    ...prev,
                    quizModules: [...(prev.quizModules || []), quizToAdd]
                };
            }
            return prev;
        });
        setFormErrors(prev => ({ ...prev, quizModules: '' }));
    }, []);

    const handleRemoveQuizFromTest = useCallback((quizIdToRemove) => {
        setFormData(prev => ({
            ...prev,
            quizModules: (prev.quizModules || []).filter(q => q._id !== quizIdToRemove)
        }));
        setFormErrors(prev => ({ ...prev, quizModules: '' }));
    }, []);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.quizModules.findIndex(q => q._id === active.id);
                const newIndex = prev.quizModules.findIndex(q => q._id === over.id);
                return { ...prev, quizModules: arrayMove(prev.quizModules, oldIndex, newIndex) };
            });
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = "Test Title is required.";
        }
        if (!formData.quizModules || formData.quizModules.length === 0) {
            newErrors.quizModules = "A test module requires at least one quiz section.";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        const payload = {
            moduleType: 'test',
            title: formData.title,
            description: formData.description,
            status: formData.status,
            quizModules: formData.quizModules.map(q => q._id),
        };

        try {
            const response = await fetch(`${BACKEND_URL}/modules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to add test module.');
            }
            onSave();
        } catch (err) {
            console.error('Error adding test module:', err);
            setError(err.message || 'Error adding test module.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingResources) {
        return <div className="p-6 text-center text-blue-600">Loading quizzes...</div>;
    }
    if (error) {
        return <div className="p-6 text-center text-red-500">Error: {error}</div>;
    }
    const selectedQuizIds = (formData.quizModules || []).map(q => q._id);
    const quizzesAvailable = availableQuizzes
        .filter(quiz => !selectedQuizIds.includes(quiz._id))
        .filter(quiz => quiz.title.toLowerCase().includes(filterText.toLowerCase()));

    return (
        <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-10">
            <h2 className="text-4xl font-bold text-gray-800 flex items-center space-x-4 mb-6">
                <FlaskConical size={36} className="text-purple-600" />
                <span>Add New Test Module</span>
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="md:col-span-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Test Title <span className="text-red-500">*</span>
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
                            Description (Optional)
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
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                            Status <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status}
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
                </div>

                <div className="space-y-5 border-t pt-5 mt-6 border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Manage Test Sections</h3>
                    {formErrors.quizModules && <p className="mt-2 text-sm text-red-600 mb-5">{formErrors.quizModules}</p>}
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
                            <h4 className="text-md font-semibold text-gray-700 mb-4">Sections in this Test: ({formData.quizModules.length})</h4>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {formData.quizModules.length > 0 ? (
                                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={formData.quizModules.map(q => q._id)} strategy={verticalListSortingStrategy}>
                                            {formData.quizModules.map((quiz, index) => (
                                                <SortableQuizItem
                                                    key={quiz._id}
                                                    quizItem={quiz}
                                                    index={index}
                                                    onRemove={handleRemoveQuizFromTest}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                ) : (
                                    <p className="text-gray-500 italic p-3">No quizzes added yet. Add some from the right panel.</p>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
                            <h4 className="text-md font-semibold text-gray-700 mb-4">Available Quizzes: ({quizzesAvailable.length})</h4>
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    placeholder="Filter quizzes by title..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm"
                                />
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {quizzesAvailable.length > 0 ? (
                                    quizzesAvailable.map(quiz => (
                                        <div key={quiz._id} className="flex items-center space-x-2 p-3 bg-white rounded-md shadow-sm">
                                            <div className="flex-grow flex items-center space-x-2">
                                                <Zap size={18} className="text-orange-500 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 flex-grow">{quiz.title}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAddQuizToTest(quiz)}
                                                className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 transition-colors"
                                                title="Add quiz to test"
                                            >
                                                <PlusCircle size={20} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 italic p-3">No quizzes available or matching your filter.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
                        {isSubmitting ? 'Adding...' : 'Add Test Module'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddTestModuleForm;
