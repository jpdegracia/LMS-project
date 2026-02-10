import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../Modal/Modal';
import UserContext from '../../components/UserContext/UserContext';
import { Plus, Minus, BookOpen, Grab, Trash2, Search, HelpCircle, PlusCircle } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableLessonItem = ({ content, index, onRemove, getCleanPlainText }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: content._id,
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const cleanTitle = getCleanPlainText(content.title);
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
                <BookOpen size={18} className="text-blue-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-grow">
                    {cleanTitle.substring(0, 70) + (cleanTitle.length > 70 ? '...' : '')}
                </span>
            </div>
            <button
                type="button"
                onClick={() => onRemove(content._id)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                title="Remove content from lesson"
            >
                <Trash2 size={20} />
            </button>
        </div>
    );
};

const AddLessonModuleForm = ({ onSave, onCancel }) => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        moduleType: 'lesson',
        title: '',
        description: '',
        status: 'draft',
        progressBar: false,
        contents: []
    });

    const [lessonContentsBank, setLessonContentsBank] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const [filterText, setFilterText] = useState('');
    const [sortOrder, setSortOrder] = useState('default');

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    const fetchResources = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const contentsRes = await fetch(`${BACKEND_URL}/lesson-content`, { credentials: 'include' });
            const contentsJson = await contentsRes.json();
            if (contentsRes.ok && contentsJson.success) {
                setLessonContentsBank(contentsJson.data || []);
            } else {
                throw new Error(contentsJson.message || 'Failed to fetch lesson content bank.');
            }
        } catch (err) {
            console.error('Error fetching resources:', err);
            setError(err.message || 'Failed to load data for the form.');
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormErrors(prev => ({ ...prev, [name]: '' }));
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }, []);

    const handleAddContentToLesson = useCallback((contentToAdd) => {
        setFormData(prev => {
            const isAlreadyAdded = (prev.contents || []).some(c => c._id === contentToAdd._id);
            if (!isAlreadyAdded) {
                return {
                    ...prev,
                    contents: [...(prev.contents || []), contentToAdd]
                };
            }
            return prev;
        });
        setFormErrors(prev => ({ ...prev, contents: '' }));
    }, []);

    const handleRemoveContentFromLesson = useCallback((contentIdToRemove) => {
        setFormData(prev => ({
            ...prev,
            contents: (prev.contents || []).filter(c => c._id !== contentIdToRemove)
        }));
        setFormErrors(prev => ({ ...prev, contents: '' }));
    }, []);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.contents.findIndex(c => c._id === active.id);
                const newIndex = prev.contents.findIndex(c => c._id === over.id);
                return { ...prev, contents: arrayMove(prev.contents, oldIndex, newIndex) };
            });
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = "Lesson Title is required.";
        }
        if (!formData.contents || formData.contents.length === 0) {
            newErrors.contents = "Lesson module requires at least one content item.";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        const payload = {
            title: formData.title,
            description: formData.description,
            status: formData.status,
            progressBar: formData.progressBar,
            moduleType: formData.moduleType,
            contents: formData.contents.map(c => c._id),
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
                throw new Error(data.message || 'Failed to save lesson module.');
            }
            onSave();
        } catch (err) {
            console.error('Error saving lesson module:', err);
            setError(err.message || 'Error saving lesson module.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-blue-600">Loading lesson module details...</div>;
    }
    if (error) {
        return <div className="p-6 text-center text-red-500">Error: {error}</div>;
    }

    const selectedContentIds = (formData.contents || []).map(c => c._id);
    const availableContents = lessonContentsBank
        .filter(content => !selectedContentIds.includes(content._id))
        .filter(content => getCleanPlainText(content.title).toLowerCase().includes(filterText.toLowerCase()))
        .sort((a, b) => {
            const titleA = getCleanPlainText(a.title).toLowerCase();
            const titleB = getCleanPlainText(b.title).toLowerCase();
            if (sortOrder === 'title-asc') return titleA.localeCompare(titleB);
            if (sortOrder === 'title-desc') return titleB.localeCompare(titleA);
            return 0;
        });

    return (
        <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-10">
            <h2 className="text-4xl font-bold text-gray-800 flex items-center space-x-4 mb-6">
                <BookOpen size={36} className="text-green-600" />
                <span>Add New Lesson Module</span>
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="md:col-span-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Lesson Title <span className="text-red-500">*</span>
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
                    <div className="flex items-center pt-2 md:col-span-2">
                        <input
                            type="checkbox"
                            id="progressBar"
                            name="progressBar"
                            checked={formData.progressBar}
                            onChange={handleChange}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            disabled={isSubmitting}
                        />
                        <label htmlFor="progressBar" className="ml-2 block text-sm text-gray-900">Show Progress Bar</label>
                    </div>
                </div>
                
                <div className="space-y-5 border-t pt-5 mt-6 border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Manage Lesson Content</h3>
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
                            <h4 className="text-md font-semibold text-gray-700 mb-4">Content in this Lesson: ({formData.contents.length})</h4>
                            {formErrors.contents && <p className="mt-2 text-sm text-red-600 mb-5">{formErrors.contents}</p>}
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {formData.contents.length > 0 ? (
                                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext
                                            items={formData.contents.map(c => c._id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {formData.contents.map((content, index) => (
                                                <SortableLessonItem
                                                    key={content._id}
                                                    content={content}
                                                    index={index}
                                                    onRemove={handleRemoveContentFromLesson}
                                                    getCleanPlainText={getCleanPlainText}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                ) : (
                                    <p className="text-gray-500 italic p-3">No content added yet. Add some from the right panel.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
                            <h4 className="text-md font-semibold text-gray-700 mb-4">Available Content: ({availableContents.length})</h4>
                            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Filter content by title..."
                                        value={filterText}
                                        onChange={(e) => setFilterText(e.target.value)}
                                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm"
                                    />
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
                                    >
                                        <option value="default">Default Order</option>
                                        <option value="title-asc">Title (A-Z)</option>
                                        <option value="title-desc">Title (Z-A)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {availableContents.length > 0 ? (
                                    availableContents.map(content => (
                                        <div key={content._id} className="flex items-center space-x-2 p-3 bg-white rounded-md shadow-sm">
                                            <div className="flex-grow flex items-center space-x-2">
                                                <BookOpen size={18} className="text-blue-500 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 flex-grow">
                                                    {getCleanPlainText(content.title).substring(0, 70) + (getCleanPlainText(content.title).length > 70 ? '...' : '')}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAddContentToLesson(content)}
                                                className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 transition-colors"
                                                title="Add content to lesson"
                                            >
                                                <PlusCircle size={20} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 italic p-3">No content available or matching your filter.</p>
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
                        {isSubmitting ? 'Saving...' : 'Save Lesson Module'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddLessonModuleForm;
