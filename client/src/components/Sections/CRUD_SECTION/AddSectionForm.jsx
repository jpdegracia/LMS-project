import React, { useState } from 'react';
import Modal from '../../Modal/Modal';
import { PlusCircle, XCircle, Loader2 } from 'lucide-react';

const AddSectionForm = ({ courseId, onSectionAdded, onCancel }) => {
    const [formData, setFormData] = useState({
        sectionTitle: '',
        sectionDescription: '',
        order: 0,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        // Basic client-side validation
        if (!formData.sectionTitle || !formData.order) {
            setError('Section Title and Order are required.');
            setIsSaving(false);
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/sections/by-course/${courseId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add section.');
            }

            onSectionAdded();
        } catch (err) {
            console.error('Error adding section:', err);
            setError(err.message || 'Error adding section.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 w-full max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Add New Section</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500">{error}</p>}
                
                <div>
                    <label htmlFor="sectionTitle" className="block text-sm font-medium text-gray-700">Section Title <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="sectionTitle"
                        name="sectionTitle"
                        value={formData.sectionTitle}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                    />
                </div>
                
                <div>
                    <label htmlFor="sectionDescription" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                    <textarea
                        id="sectionDescription"
                        name="sectionDescription"
                        value={formData.sectionDescription}
                        onChange={handleChange}
                        rows="2"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 resize-none"
                    ></textarea>
                </div>

                <div>
                    <label htmlFor="order" className="block text-sm font-medium text-gray-700">Order</label>
                    <input
                        type="number"
                        id="order"
                        name="order"
                        value={formData.order}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        min="1"
                        required
                    />
                </div>
                
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="btn-cancel flex gap-3">
                        <span>Cancel</span>
                    </button>
                    <button type="submit" disabled={isSaving} className="btn-create flex gap-3">
                        {isSaving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Adding...</span>
                            </>
                        ) : (
                            <>
                                <PlusCircle size={18} />
                                <span>Add Section</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddSectionForm;