import React, { useState } from 'react';
import SectionItem from './SectionItem';



const SectionsList = ({ courseId, sections, onSectionsUpdated, hasPermission, course }) => {
    const [showAddSectionModal, setShowAddSectionModal] = useState(false);

    const canAddSections = hasPermission('section:create');

    return (
        <div className="space-y-6">
            {sections && sections.length > 0 ? (
                sections.map(section => (
                    <SectionItem
                        key={section._id}
                        section={section}
                        courseId={courseId}
                        course={course}
                        onSectionUpdated={onSectionsUpdated}
                        hasPermission={hasPermission}
                    />
                ))
            ) : (
                <p className="text-gray-600 text-center">No sections added to this course yet.</p>
            )}

            {/* Optional: Add Section button directly in this list if not on CourseManagementPage */}
            {/* {canAddSections && (
                <div className="text-center mt-6">
                    <button
                        onClick={() => setShowAddSectionModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md transition duration-200"
                    >
                        + Add New Section
                    </button>
                </div>
            )} */}

            {/* Add Section Modal (if not rendered by parent CourseManagementPage) */}
            {/* {showAddSectionModal && (
                <AddSectionForm
                    courseId={courseId}
                    onSectionAdded={() => {
                        setShowAddSectionModal(false);
                        onSectionsUpdated();
                        alert("Section added successfully!"); // Replaced toast
                    }}
                    onCancel={() => setShowAddSectionModal(false)}
                />
            )} */}
        </div>
    );
};

export default SectionsList;