// src/components/Modules/SortableLessonItem.jsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Grab, BookOpen, Trash2 } from 'lucide-react';

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

export default SortableLessonItem;