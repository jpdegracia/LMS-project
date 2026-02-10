import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Grab, BookOpen, ListChecks } from 'lucide-react';
import UserContext from '../UserContext/UserContext';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PropTypes from 'prop-types';

// The SortableModuleItem component is a visual representation of a draggable module.
const SortableModuleItem = ({ module, index }) => {
    // useSortable hook provides the necessary props for drag and drop functionality.
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module._id });

    // Apply CSS to the component to handle dragging state and animation.
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
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
        </div>
    );
};

// Add prop-types for better component documentation and validation.
SortableModuleItem.propTypes = {
    module: PropTypes.object.isRequired,
    index: PropTypes.number.isRequired,
};

// The main page component for reordering modules.
const ReorderModulesPage = () => {
    const { courseId, sectionId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);

    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Fetches the modules for the specified section.
    const fetchModules = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}/modules`, { credentials: 'include' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch modules for section.');
            }
            const data = await response.json();
            if (data.success) {
                setModules(data.data || []);
            } else {
                throw new Error(data.message || 'Failed to retrieve modules data.');
            }
        } catch (err) {
            console.error('Error fetching modules:', err);
            setError(err.message || 'Failed to load modules.');
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL, sectionId]);

    // Fetch modules on component mount and whenever sectionId changes.
    useEffect(() => {
        if (sectionId) {
            fetchModules();
        }
    }, [fetchModules, sectionId]);

    // Handles the end of a drag event to update the local state.
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setModules((prev) => {
                const oldIndex = prev.findIndex((m) => m._id === active.id);
                const newIndex = prev.findIndex((m) => m._id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    };

    // Submits the new module order to the backend.
    const handleSaveOrder = async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        // Before sending the request, let's get the most up-to-date order from the local state.
        const moduleIdsPayload = modules.map(m => m._id);

        try {
            // This is a common point of failure. Let's make sure the data we're sending is exactly what the backend expects.
            // The backend is validating that the list of IDs matches what's in the section.
            // We're now sending the correct payload key.
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}/modules/reorder-modules`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ moduleIdsInOrder: moduleIdsPayload }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to reorder modules.');
            }
            
            setSuccessMessage('Modules reordered successfully!');
            // Re-fetch to ensure the local state is in sync with the backend
            await fetchModules();
            setTimeout(() => navigate(-1), 1500); // Navigate back after a delay
        } catch (err) {
            console.error('Error saving new order:', err);
            setError(err.message || 'Error reordering modules.');
        } finally {
            setIsSaving(false);
        }
    };
    
    // Check for user permission to reorder modules.
    if (!hasPermission('module:update')) {
        return (
            <div className="min-h-screen bg-red-100 p-6 flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to reorder modules.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-blue-600">Loading modules...</div>;
    }

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Reorder Modules in Section</h2>
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
                                    <SortableModuleItem key={module._id} module={module} index={index} />
                                ))
                            ) : (
                                <p className="text-center text-gray-500 italic">No modules to reorder.</p>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={handleSaveOrder}
                        disabled={isSaving || modules.length < 2}
                        className="btn-create"
                    >
                        {isSaving ? 'Saving...' : 'Save New Order'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReorderModulesPage;
