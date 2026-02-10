import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ModulesList from '../Modules/ModuleList';
import { Edit2, Trash2, Plus, GripVertical, Save, Grab } from 'lucide-react';
import EditSectionForm from './CRUD_SECTION/EditSectionForm';

import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';

const SectionItem = ({ section: initialSection, courseId, onSectionUpdated, hasPermission, course }) => {
    const navigate = useNavigate();

    // Use a single state for the section data, but only for drag-and-drop
    const [sectionData, setSectionData] = useState(initialSection);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isReordering, setIsReordering] = useState(false);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const canEditSection = hasPermission('section:update');
    const canDeleteSection = hasPermission('section:delete');
    const canAddModules = hasPermission('section:create');
    const canReorderModules = hasPermission('module:update');

    // Sync prop with local state for DND purposes
    useEffect(() => {
        setSectionData(initialSection);
    }, [initialSection]);


    const handleDeleteSection = async () => {
        if (!canDeleteSection) {
            alert("You don't have permission to delete sections.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete section "${sectionData.sectionTitle}"? All modules within it will be unlinked, but not permanently deleted.`)) {
            return;
        }
        try {
            const response = await fetch(`${BACKEND_URL}/sections/${sectionData._id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete section.');
            }
            alert('Section deleted successfully! Modules are now standalone.');
            onSectionUpdated(); // This will trigger a re-render of the parent component
        } catch (err) {
            console.error('Error deleting section:', err);
            alert(err.message || 'Error deleting section.');
        }
    };
    
    const handleAddModuleClick = () => {
        if (!canAddModules) {
            alert("You do not have permission to add modules to a section.");
            return;
        }
        navigate(`/courses/${courseId}/sections/${sectionData._id}/add-module`);
    };
    
    const handleEditSectionClick = () => {
        if (canEditSection) {
            setShowEditModal(true);
        } else {
            alert("You don't have permission to edit this section.");
        }
    };
    
    const handleEditSave = () => {
        setShowEditModal(false);
        onSectionUpdated();
        setSuccessMessage('Section updated successfully! 🎉');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
    };
    
    const handleEditCancel = () => {
        setShowEditModal(false);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setSectionData(prevSectionData => {
                const oldIndex = prevSectionData.modules.findIndex(m => m._id === active.id);
                const newIndex = prevSectionData.modules.findIndex(m => m._id === over.id);
                const newModules = arrayMove(prevSectionData.modules, oldIndex, newIndex);
                return { ...prevSectionData, modules: newModules };
            });
        }
    };

    const handleReorderModules = async () => {
        if (!isReordering) {
            setIsReordering(true);
        } else {
            const newModuleOrder = sectionData.modules.map(m => m._id);
            try {
                const response = await fetch(`${BACKEND_URL}/sections/${sectionData._id}/modules/reorder-modules`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ newModuleOrder }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save new module order.');
                }
                
                // Trigger the parent's re-fetch function
                onSectionUpdated();

                setSuccessMessage('Module order saved successfully! ✅');
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);
            } catch (err) {
                console.error('Error saving new module order:', err);
                setSuccessMessage(err.message || 'Error saving new module order.');
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 5000);
            } finally {
                setIsReordering(false);
            }
        }
    };
    
    if (!sectionData) {
        return <p>Section data missing.</p>;
    }

    const moduleIds = sectionData.modules.map(m => m._id);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-indigo-500">
            {showSuccessMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-center mb-4" role="alert">
                    <span className="block sm:inline">{successMessage}</span>
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                    {sectionData.order}. {sectionData.sectionTitle}
                </h3>
                <div className="space-x-2 flex">
                    {canEditSection && (
                        <button onClick={handleEditSectionClick} className="btn-edit flex gap-2 cursor-pointer">
                            <Edit2 size={16} />
                            <span>Edit</span>
                        </button>
                    )}
                    {canDeleteSection && (
                        <button onClick={handleDeleteSection} className="btn-delete flex gap-2 cursor-pointer">
                            <Trash2 size={16} />
                            <span>Delete</span>
                        </button>
                    )}
                </div>
            </div>
            <p className="text-gray-600 mb-4">{sectionData.sectionDescription || 'No description.'}</p>
            <div className="flex justify-start space-x-2 mb-4">
                {canAddModules && !isReordering && (
                    <button onClick={handleAddModuleClick} className="btn-create flex items-center gap-2 cursor-pointer">
                        <Plus size={16} />
                        <span>Add Module</span>
                    </button>
                )}
                {canReorderModules && sectionData.modules.length > 1 && (
                    <button onClick={handleReorderModules} className={`flex items-center gap-2 transition-colors duration-200 px-4 py-2 rounded-md ${isReordering ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}>
                        {isReordering ? (
                            <Save size={16} />
                        ) : (
                            <>
                                <GripVertical size={16} />
                            </>
                        )}
                        <span className='flex gap-2'>
                            {isReordering ? (
                                'Save Order'
                            ) : (
                                <>
                                    Re-Order Modules <Grab size={16} />
                                </>
                            )}
                        </span>
                    </button>
                )}
            </div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Modules:</h4>
            <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={moduleIds}
                    strategy={verticalListSortingStrategy}
                >
                    <ModulesList
                        sectionId={sectionData._id}
                        modules={sectionData.modules || []}
                        course={course}
                        onModulesUpdated={onSectionUpdated} // This is already good
                        hasPermission={hasPermission}
                        courseId={courseId}
                        isReordering={isReordering}
                    />
                </SortableContext>
            </DndContext>
            {showEditModal && (
                <EditSectionForm
                    section={sectionData}
                    courseId={courseId}
                    onSave={handleEditSave}
                    onCancel={handleEditCancel}
                />
            )}
        </div>
    );
};

export default SectionItem;