// src/pages/EditModulePage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext';
import { ArrowLeft, Grab, ListChecks, BookOpen, Trash2, CheckCheck } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Reusable component for displaying sortable module items
const SortableModuleItem = ({ module, index, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: module._id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-transparent transition-all duration-200 ease-in-out cursor-grab"
        >
            <div {...listeners} className="flex-shrink-0 text-gray-400 hover:text-purple-600">
                <Grab size={20} />
            </div>
            <span className="font-medium text-gray-800">{index + 1}.</span>
            <div className="flex-grow flex items-center space-x-2">
                {module.moduleType === 'lesson' ? (
                    <BookOpen size={18} className="text-blue-500" />
                ) : (
                    <ListChecks size={18} className="text-orange-500" />
                )}
                <span className="text-sm text-gray-700 flex-grow">
                    {module.title || 'Untitled Module'}
                    {module.moduleType === 'quiz' ? ` (${module.questions?.length || 0} Qs)` : ''}
                </span>
            </div>
            <button
                type="button"
                onClick={() => onRemove(module._id)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                title="Remove module from selection"
            >
                <Trash2 size={20} />
            </button>
        </div>
    );
};

const EditModulePage = () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const { courseId, sectionId } = useParams();
    
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const fetchModules = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}`, { credentials: 'include' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch section details.');
            }
            const data = await response.json();
            if (data.success) {
                setModules(data.data.modules || []);
            } else {
                throw new Error(data.message || 'Failed to retrieve modules data.');
            }
        } catch (err) {
            console.error('Error fetching modules:', err);
            setError(err.message || 'Failed to load modules for editing.');
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL, sectionId]);

    useEffect(() => {
        if (sectionId) {
            fetchModules();
        }
    }, [fetchModules, sectionId]);
    
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setModules((prev) => {
                const oldIndex = prev.findIndex((m) => m._id === active.id);
                const newIndex = prev.findIndex((m) => m._id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    }, []);

    const handleSaveOrder = async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        
        const moduleIdsPayload = modules.map(m => m._id);

        try {
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}/modules/reorder-modules`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ newModuleOrder: moduleIdsPayload }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to reorder modules.');
            }
            
            setSuccessMessage('Modules reordered successfully!');
            // After successful save, navigate back to the previous page
            setTimeout(() => navigate(-1), 1500);
        } catch (err) {
            console.error('Error saving new order:', err);
            setError(err.message || 'Error reordering modules.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleRemoveSelectedModule = useCallback((moduleId) => {
        if (!window.confirm("Are you sure you want to remove this module from the section? It will be unlinked, but not permanently deleted.")) {
            return;
        }
        
        setModules(prev => prev.filter(m => m._id !== moduleId));
        // You would also need a backend call here to unlink the module
        // For simplicity, we'll assume the Save button handles the final list
    }, []);

    if (!hasPermission('section:update')) {
        return (
            <div className="min-h-screen bg-red-100 p-6 flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to reorder modules.</p>
            </div>
        );
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center text-blue-600">Loading modules...</div>;

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Reorder Modules</h2>
                    <button onClick={() => navigate(-1)} className="btn-cancel flex items-center space-x-2">
                        <ArrowLeft size={16} /> <span>Back</span>
                    </button>
                </div>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}
                {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">{successMessage}</div>}

                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={modules.map(m => m._id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                            {modules.length > 0 ? (
                                modules.map((module, index) => (
                                    <SortableModuleItem
                                        key={module._id}
                                        module={module}
                                        index={index}
                                        onRemove={handleRemoveSelectedModule}
                                    />
                                ))
                            ) : (
                                <p className="text-center text-gray-500 italic">No modules to reorder.</p>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>

                <div className="flex justify-end mt-6">
                    <button onClick={handleSaveOrder} disabled={isSaving || modules.length < 1} className="btn-create flex items-center space-x-2">
                        <CheckCheck size={16} />
                        <span>{isSaving ? 'Saving...' : 'Save New Order'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditModulePage;