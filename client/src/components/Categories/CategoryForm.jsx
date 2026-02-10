import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';

const CategoryForm = ({ onSave, onCancel, initialData, isAdding }) => {
    const [formData, setFormData] = useState(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        if (!isAdding && initialData._id) {
            await onSave(initialData._id, formData);
        } else {
            await onSave(formData);
        }
        setIsSubmitting(false);
    };

    return (
        <Modal onCancel={onCancel} title={isAdding ? "Add New Category" : "Edit Category"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Category Name</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange}
                        rows="2" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
                </div>
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="btn-cancel">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="btn-create">
                        {isSubmitting ? 'Saving...' : 'Save Category'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CategoryForm;