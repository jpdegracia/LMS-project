// src/pages/AddOrEditLessonModulePage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
import { 
    ArrowLeft, BookOpen, ListChecks, Search, PlusCircle, 
    Grab, Trash2, ScanEyeIcon, Eye, X 
} from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Rnd } from 'react-rnd'; // Ensure react-rnd is installed

// --- PREVIEW MODAL COMPONENT ---
const LessonPreviewModal = ({ content, onClose }) => {
    if (!content) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <Rnd
                default={{ x: window.innerWidth / 2 - 400, y: 80, width: 800, height: 600 }}
                minWidth={400} minHeight={300} bounds="window" dragHandleClassName="modal-handle"
                className="pointer-events-auto shadow-2xl" style={{ zIndex: 101 }}
            >
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full w-full overflow-hidden shadow-2xl font-inter">
                    <div className="modal-handle flex justify-between items-center p-4 border-b bg-indigo-600 cursor-grab active:cursor-grabbing text-white">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Eye size={16}/> Content Preview: {content.title}
                        </h3>
                        <button onClick={onClose} className="text-indigo-100 hover:text-white cursor-pointer transition">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 bg-white select-text">
                        <div className="prose max-w-none">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">{content.title}</h2>
                            <div 
                                className="text-gray-700 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: content.text || content.body || '' }} 
                            />
                            {content.mediaUrl && (
                                <div className="mt-6">
                                    <img src={content.mediaUrl} alt="Lesson Media" className="rounded-lg shadow-md max-h-96 mx-auto" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Rnd>
        </div>
    );
};

// --- SORTABLE ITEM COMPONENT ---
const SortableLessonItem = ({ content, index, onRemove, onPreview, getCleanPlainText }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: content._id,
    });

    const style = { transform: CSS.Transform.toString(transform), transition };
    const cleanTitle = getCleanPlainText(content.title);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-transparent hover:border-indigo-200 transition-all duration-200 ease-in-out"
        >
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-indigo-600 flex-shrink-0">
                <Grab size={18} />
            </div>
            <span className="font-medium text-gray-400 text-xs w-5">{index + 1}.</span>
            <div className="flex-grow flex items-center space-x-2 min-w-0">
                <BookOpen size={16} className="text-indigo-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate font-medium">
                    {cleanTitle}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPreview(content)}
                    className="text-blue-500 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Preview content"
                >
                    <ScanEyeIcon size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => onRemove(content._id)}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove from lesson"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
const AddOrEditLessonModulePage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const [previewContent, setPreviewContent] = useState(null); // Modal State
    const isEditing = !!moduleId;
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // ... Keep all your existing state (formData, lessonContentsBank, loading, etc.) ...
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
    const [successMessage, setSuccessMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [filterText, setFilterText] = useState('');
    const [sortOrder, setSortOrder] = useState('default');

    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    // ... Keep fetchResources, handleChange, handleAddContentToLesson, handleDragEnd, etc. ...
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

            if (isEditing) {
                const moduleRes = await fetch(`${BACKEND_URL}/modules/${moduleId}`, { credentials: 'include' });
                const moduleJson = await moduleRes.json();
                if (moduleRes.ok && moduleJson.success) {
                    if (moduleJson.data.moduleType !== 'lesson') {
                        throw new Error("This is not a lesson module.");
                    }
                    setFormData({
                        moduleType: 'lesson',
                        title: moduleJson.data.title || '',
                        description: moduleJson.data.description || '',
                        status: moduleJson.data.status || 'draft',
                        progressBar: moduleJson.data.progressBar || false,
                        contents: moduleJson.data.contents || []
                    });
                } else {
                    throw new Error(moduleJson.message || 'Failed to fetch lesson module.');
                }
            }
        } catch (err) {
            console.error('Error fetching resources:', err);
            setError(err.message || 'Failed to load data for the form.');
        } finally {
            setLoading(false);
        }
    }, [isEditing, moduleId, BACKEND_URL]);

    useEffect(() => {
        if (!isEditing || moduleId) {
            fetchResources();
        }
    }, [fetchResources, isEditing, moduleId]);

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
        setSuccessMessage(null);
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = "Lesson Title is required.";
        }
        
        if (!isEditing && (!formData.contents || formData.contents.length === 0)) {
            newErrors.contents = "Lesson module requires at least one content item.";
        }

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${BACKEND_URL}/modules/${moduleId}` : `${BACKEND_URL}/modules`;
        
        const payload = {
            title: formData.title,
            description: formData.description,
            status: formData.status,
            progressBar: formData.progressBar,
            moduleType: formData.moduleType,
        };

        if (!isEditing) {
            payload.contents = formData.contents.map(c => c._id);
        }

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to save lesson module.');
            }
            setSuccessMessage(`Lesson module ${isEditing ? 'updated' : 'added'} successfully!`);
            setTimeout(() => navigate('/lesson-module-management'), 1500);
        } catch (err) {
            setError(err.message || 'Error saving lesson module.');
        } finally {
            setIsSubmitting(false);
        }
    };

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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter">
            <main className="container-2">
                <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-10">
                    <h2 className="text-4xl font-bold text-gray-800">
                        {isEditing ? `Edit Lesson: ${formData.title}` : 'Add New Lesson Module'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title & Description Fields (Keep existing code) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Lesson Title</label>
                                <input type="text" name="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="mt-1 block w-2/3 px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            {/* Status, etc... */}
                        </div>

                        {!isEditing && (
                            <div className="space-y-5 border-t pt-5 mt-6 border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <ListChecks className="text-indigo-600" /> Manage Content Selection
                                </h3>
                                <div className="flex flex-col lg:flex-row gap-8">
                                    
                                    {/* LEFT: Selected Items */}
                                    <div className="flex-1 p-6 border border-gray-200 rounded-xl bg-gray-50/50 shadow-inner">
                                        <h4 className="text-sm font-black text-gray-400 uppercase mb-4 tracking-widest">In this Lesson ({formData.contents.length})</h4>
                                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                            {formData.contents.length > 0 ? (
                                                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                                    <SortableContext items={formData.contents.map(c => c._id)} strategy={verticalListSortingStrategy}>
                                                        {formData.contents.map((content, index) => (
                                                            <SortableLessonItem
                                                                key={content._id}
                                                                content={content}
                                                                index={index}
                                                                onRemove={handleRemoveContentFromLesson}
                                                                onPreview={setPreviewContent}
                                                                getCleanPlainText={getCleanPlainText}
                                                            />
                                                        ))}
                                                    </SortableContext>
                                                </DndContext>
                                            ) : (
                                                <p className="text-gray-400 italic text-sm text-center py-10">Empty lesson.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT: Content Bank */}
                                    <div className="flex-1 p-6 border border-gray-200 rounded-xl bg-gray-50/50">
                                        <h4 className="text-sm font-black text-gray-400 uppercase mb-4 tracking-widest">Available Bank ({availableContents.length})</h4>
                                        <div className="flex gap-2 mb-4">
                                            <div className="relative flex-grow">
                                                <input type="text" placeholder="Search..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="w-full pl-9 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                            </div>
                                        </div>
                                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                            {availableContents.map(content => (
                                                <div key={content._id} className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-transparent hover:border-indigo-100 shadow-sm transition-all group">
                                                    <div className="flex-grow flex items-center space-x-2 min-w-0">
                                                        <BookOpen size={16} className="text-gray-300 group-hover:text-indigo-400" />
                                                        <span className="text-sm text-gray-600 truncate">{getCleanPlainText(content.title)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button type="button" onClick={() => setPreviewContent(content)} className="text-blue-400 hover:text-blue-600 p-1 transition-colors cursor-pointer"><ScanEyeIcon size={18} /></button>
                                                        <button type="button" onClick={() => handleAddContentToLesson(content)} className="text-green-500 hover:scale-110 p-1 transition-transform cursor-pointer"><PlusCircle size={20} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-6 border-t">
                            <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-bold transition cursor-pointer">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition shadow-lg shadow-indigo-100 disabled:opacity-50 cursor-pointer">
                                {isSubmitting ? 'Saving...' : 'Save Lesson Module'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {/* PREVIEW MODAL */}
            {previewContent && (
                <LessonPreviewModal 
                    content={previewContent} 
                    onClose={() => setPreviewContent(null)} 
                />
            )}
        </div>
    );
};

export default AddOrEditLessonModulePage;