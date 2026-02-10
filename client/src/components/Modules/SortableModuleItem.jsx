// src/components/Modules/SortableModuleItem.jsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Grab } from 'lucide-react';
import ModuleItem from './ModuleItem';

const SortableModuleItem = ({ module, sectionId, onModuleRemoved, hasPermission, courseId, index, isReordering }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: module._id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
        borderLeft: isDragging ? '4px solid #8B5CF6' : '4px solid transparent',
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
    };

    return (
        <div ref={setNodeRef} style={style} className="relative transition-all duration-200">
            {/* Grab handle is now conditionally rendered */}
            {isReordering && (
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-l-lg text-gray-400 hover:text-purple-600 cursor-grab"
                    {...listeners}
                    {...attributes}
                >
                    <Grab size={20} />
                </div>
            )}
            {/* Conditionally add padding based on reordering state */}
            <div className={isReordering ? "pl-8" : "pl-0"}> 
                <ModuleItem
                    module={module}
                    sectionId={sectionId}
                    onModuleRemoved={onModuleRemoved}
                    hasPermission={hasPermission}
                    courseId={courseId}
                    index={index}
                />
            </div>
        </div>
    );
};

export default SortableModuleItem;