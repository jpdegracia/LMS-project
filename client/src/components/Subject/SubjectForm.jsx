import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { PlusCircle, Edit } from 'lucide-react';

/**
 * A form component for adding or editing subjects, wrapped in a reusable Modal.
 * It follows the same pattern as the CategoryForm.
 *
 * @param {object} props
 * @param {function} props.onSave - Callback to save the subject data.
 * @param {function} props.onCancel - Callback to close the modal.
 * @param {object} props.initialData - The initial data for the form (for editing).
 * @param {boolean} props.isAdding - A flag to determine if the form is for adding or editing.
 */
const SubjectForm = ({ onSave, onCancel, initialData, isAdding }) => {
    // State to hold form data, initialized with initialData.
    const [formData, setFormData] = useState(initialData);
    // State to manage the submission state for UI feedback.
    const [isSubmitting, setIsSubmitting] = useState(false);

    // useEffect hook to update the form data when initialData changes.
    // This is crucial for resetting the form when switching from 'add' to 'edit'
    // or when editing a different subject.
    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    // Handles changes to any form input by updating the corresponding
    // key in the formData object.
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handles the form submission.
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Determine whether to pass the ID based on the 'isAdding' flag.
        if (!isAdding && initialData._id) {
            await onSave(initialData._id, formData);
        } else {
            await onSave(formData);
        }
        setIsSubmitting(false);
    };

    return (
        <Modal onCancel={onCancel} title={isAdding ? "Add New Subject" : "Edit Subject"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Subject Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        rows="2"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    ></textarea>
                </div>
                <div className="flex justify-end space-x-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : (isAdding ? 'Add Subject' : 'Save Changes')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default SubjectForm;
