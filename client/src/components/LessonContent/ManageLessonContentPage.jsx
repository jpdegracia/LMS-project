import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Rnd } from 'react-rnd';
import { 
    ArrowLeft, PlusCircle, Trash2, BookOpen, 
    Search, Grab, ScanEyeIcon, Eye, X, ListChecks 
} from 'lucide-react';
import UserContext from '../UserContext/UserContext';

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
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full w-full overflow-hidden shadow-2xl font-inter text-left">
                    <div className="modal-handle flex justify-between items-center p-4 border-b bg-indigo-600 cursor-grab active:cursor-grabbing text-white">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Eye size={16}/> Content Preview
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
                                dangerouslySetInnerHTML={{ __html: content.text || content.body || content.content || '' }} 
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
            className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-transparent hover:border-indigo-200 transition-all duration-200 ease-in-out group"
        >
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-indigo-600 flex-shrink-0">
                <Grab size={18} />
            </div>
            <span className="font-bold text-gray-400 text-xs w-5">{index + 1}.</span>
            <div className="flex-grow flex items-center space-x-2 min-w-0 text-left">
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
                >
                    <ScanEyeIcon size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => onRemove(content._id)}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
const ManageLessonContentPage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [moduleData, setModuleData] = useState(null);
    const [lessonContentsBank, setLessonContentsBank] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [previewContent, setPreviewContent] = useState(null);

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
            if (!hasPermission('module:update')) {
                throw new Error("Access Denied: Permission module:update required.");
            }

            // 1. Fetch raw responses
            const [contentsRes, moduleRes, categoriesRes] = await Promise.all([
                fetch(`${BACKEND_URL}/lesson-content`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/modules/${moduleId}`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/categories`, { credentials: 'include' }),
            ]);

            // 2. Parse JSON separately to avoid initialization errors
            const contentsJson = await contentsRes.json();
            const moduleJson = await moduleRes.json();
            const categoriesJson = await categoriesRes.json();

            // 3. Set States
            if (contentsJson.success) setLessonContentsBank(contentsJson.data || []);
            if (moduleJson.success) setModuleData(moduleJson.data);
            if (categoriesJson.success) setCategories(categoriesJson.data || []);

        } catch (err) {
            console.error("Fetch error:", err);
            setError(err.message || 'Failed to load resources.');
        } finally {
            setLoading(false);
        }
    }, [moduleId, BACKEND_URL, hasPermission]);

    useEffect(() => {
        if (moduleId) fetchResources();
    }, [fetchResources, moduleId]);

    const handleAddContentToLesson = (content) => {
        setModuleData(prev => {
            if (!prev) return prev;
            const contents = prev.contents || [];
            if (contents.some(c => c._id === content._id)) return prev;
            return { ...prev, contents: [...contents, content] };
        });
    };

    const handleRemoveContentFromLesson = (id) => {
        setModuleData(prev => ({
            ...prev,
            contents: (prev?.contents || []).filter(c => c._id !== id)
        }));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setModuleData((prev) => {
            const oldIdx = prev.contents.findIndex(c => c._id === active.id);
            const newIdx = prev.contents.findIndex(c => c._id === over.id);
            return { ...prev, contents: arrayMove(prev.contents, oldIdx, newIdx) };
        });
    };

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const contentIds = (moduleData?.contents || []).map(c => c._id);
            const res = await fetch(`${BACKEND_URL}/modules/${moduleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ contents: contentIds }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Update failed.");
            setSuccessMessage("Content sequence saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableContents = lessonContentsBank
        .filter(c => {
            if (!moduleData?.contents) return true;
            return !moduleData.contents.some(sc => sc._id === c._id);
        })
        .filter(c => getCleanPlainText(c.title).toLowerCase().includes(filterText.toLowerCase()))
        .filter(c => !selectedCategory || (c.category?._id === selectedCategory));

    if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold animate-pulse">Loading Management Interface...</div>;

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-8 font-inter">
            <main className="max-w-7xl mx-auto w-full flex-grow flex flex-col">
                <div className="relative bg-white rounded-2xl shadow-xl p-6 md:p-12 space-y-8 flex flex-col flex-grow">
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-3xl font-bold text-gray-800">
                            Manage Content: <span className="text-indigo-600">{moduleData?.title || 'Untitled Lesson'}</span>
                        </h2>
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 btn-b cursor-pointer">
                            <ArrowLeft size={18} /> Back
                        </button>
                    </div>

                    {successMessage && <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-xl font-medium">{successMessage}</div>}
                    {error && <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-medium">{error}</div>}

                    <form onSubmit={handleSaveChanges} className="space-y-6 flex-grow flex flex-col">
                        <div className="flex flex-col lg:flex-row gap-8 flex-grow h-full">
                            
                            <div className="flex-1 p-6 border border-gray-200 rounded-2xl bg-gray-50/50 shadow-inner flex flex-col min-h-[400px]">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                                    <ListChecks size={14}/> Active Lesson Structure
                                </h4>
                                <div className="space-y-2 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                                    {moduleData?.contents?.length > 0 ? (
                                        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                            <SortableContext items={moduleData.contents.map(c => c._id)} strategy={verticalListSortingStrategy}>
                                                {moduleData.contents.map((content, index) => (
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
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 italic text-sm">
                                            No content added yet.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 p-6 border border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col min-h-[400px]">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                                    <Search size={14}/> Content Bank
                                </h4>
                                
                                <div className="mb-4 space-y-3">
                                    <div className="relative">
                                        <input type="text" placeholder="Search..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="w-full pl-10 p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none" />
                                        <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                                    </div>
                                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-2.5 bg-white border cursor-pointer border-gray-200 rounded-xl text-sm">
                                        <option value="">All Categories</option>
                                        {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                                    {availableContents.map(content => (
                                        <div key={content._id} className="flex items-center space-x-2 p-3 bg-white rounded-xl border border-transparent hover:border-indigo-100 shadow-sm transition-all group">
                                            <div className="flex-grow flex items-center space-x-2 min-w-0 text-left">
                                                <BookOpen size={16} className="text-gray-300 group-hover:text-indigo-400" />
                                                <span className="text-sm text-gray-600 truncate font-medium">{getCleanPlainText(content.title)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => setPreviewContent(content)} className="text-blue-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition-colors cursor-pointer"><ScanEyeIcon size={18} /></button>
                                                <button type="button" onClick={() => handleAddContentToLesson(content)} className="text-green-500 hover:text-green-700 p-1.5 rounded-full hover:bg-green-50 transition-colors cursor-pointer"><PlusCircle size={20} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 mt-auto">
                            <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-semibold transition cursor-pointer">Cancel</button>
                            <button type="submit" disabled={isSubmitting || !moduleData} className="px-8 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 font-semibold transition active:scale-95 cursor-pointer">
                                {isSubmitting ? 'Saving...' : 'Save Lesson'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {previewContent && <LessonPreviewModal content={previewContent} onClose={() => setPreviewContent(null)} />}
        </div>
    );
};

export default ManageLessonContentPage;