import React, { useState, useEffect } from 'react';
import Modal from '../../Modal/Modal';

const EditSectionForm = ({ section, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        sectionTitle: section.sectionTitle,
        sectionDescription: section.sectionDescription,
        order: section.order,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData({
            sectionTitle: section.sectionTitle,
            sectionDescription: section.sectionDescription,
            order: section.order,
        });
    }, [section]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/sections/${section._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update section.');
            }

            onSave();
        } catch (err) {
            console.error('Error updating section:', err);
            alert(err.message || 'Error updating section.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal onCancel={onCancel} title={`Edit Section: ${section.sectionTitle}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="sectionTitle" className="block text-sm font-medium text-gray-700">Section Title</label>
                    <input type="text" id="sectionTitle" name="sectionTitle" value={formData.sectionTitle} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label htmlFor="sectionDescription" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="sectionDescription" name="sectionDescription" value={formData.sectionDescription} onChange={handleChange}
                        rows="10" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
                </div>
                <div>
                    <label htmlFor="order" className="block text-sm font-medium text-gray-700">Order</label>
                    <input type="number" id="order" name="order" value={formData.order} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" min="1" required />
                </div>
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="btn-cancel">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="btn-create">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditSectionForm;