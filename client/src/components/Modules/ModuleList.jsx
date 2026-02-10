// src/components/Modules/ModuleList.jsx (Conceptual Example)
import React from 'react';
import SortableModuleItem from './SortableModuleItem';


const ModulesList = ({ sectionId, modules, onModulesUpdated, hasPermission, courseId, isReordering }) => {
    return (
        <div className="space-y-4">
            {modules && modules.length > 0 ? (
                modules.map((module, index) => (
                    // The key is essential for Dnd-Kit to work correctly
                    <SortableModuleItem
                        key={module._id}
                        module={module}
                        sectionId={sectionId}
                        onModuleRemoved={onModulesUpdated} // Assuming onModulesUpdated is the remove handler
                        hasPermission={hasPermission}
                        courseId={courseId}
                        index={index}
                        isReordering={isReordering} // Pass down the state here
                    />
                ))
            ) : (
                <p className="text-gray-500 italic p-3">No modules have been added to this section yet.</p>
            )}
        </div>
    );
};

export default ModulesList;