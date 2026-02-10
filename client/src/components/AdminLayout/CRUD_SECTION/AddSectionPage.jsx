import React, { useState, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import UserContext from '../../UserContext/UserContext';


const AddSectionPage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext); // For permission checks, if needed

    const [newSectionData, setNewSectionData] = useState({ sectionTitle: '', sectionDescription: '', order: '' });
    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const handleAddSection = useCallback(async (e) => {
        e.preventDefault();
        const errors = {};
        if (!newSectionData.sectionTitle.trim()) errors.sectionTitle = 'Section title is required.';
        if (!newSectionData.order || isNaN(newSectionData.order) || newSectionData.order < 1) errors.order = 'Order is required and must be a positive number.';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`${BACKEND_URL}/courses/${courseId}/sections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    sectionTitle: newSectionData.sectionTitle,
                    sectionDescription: newSectionData.sectionDescription,
                    order: newSectionData.order
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || "Failed to add section.");
            }

            setSuccessMessage("Section added successfully!");
            setNewSectionData({ sectionTitle: '', sectionDescription: '', order: '' }); // Clear form
            setFormErrors({});
            // Optionally navigate back to CourseBuilder after a short delay
            setTimeout(() => navigate(`/course-management/${courseId}`), 1500); 

        } catch (err) {
            console.error("Error adding section:", err);
            setError(err.message || "Failed to add section.");
        } finally {
            setLoading(false);
        }
    }, [newSectionData, courseId, navigate, BACKEND_URL]);

    // Check permission (optional, route should ideally be protected)
    if (!hasPermission('section:create')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to create sections.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-md"
                >
                    <ArrowLeft size={20} />
                    <span>Go Back</span>
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter">
            <main className="mx-auto px-6 max-w-6xl">
                <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">

                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center pt-10">
                       ADD SECTION For Course ID:
                    </h2>
                    <p className="font-medium font-secondary text-[15px] text-blue-600 text-center">( {courseId} )</p>

                    {loading && <p className="text-center text-lg text-blue-600">Adding section...</p>}
                    {error && <p className="text-center text-lg text-red-600">{error}</p>}
                    {successMessage && <p className="text-center text-lg text-green-600">{successMessage}</p>}

                    <form onSubmit={handleAddSection} className="space-y-6">
                        <div>
                            <label htmlFor="sectionTitle" className="block text-lg font-medium text-gray-700 mb-2">Section Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="sectionTitle"
                                name="sectionTitle"
                                value={newSectionData.sectionTitle}
                                onChange={(e) => { setNewSectionData({ ...newSectionData, sectionTitle: e.target.value }); setFormErrors(prev => ({ ...prev, sectionTitle: '' })); }}
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base"
                                placeholder="e.g., Chapter 1: Fundamentals of AI"
                                disabled={loading}
                            />
                            {formErrors.sectionTitle && <p className="mt-2 text-sm text-red-600">{formErrors.sectionTitle}</p>}
                        </div>
                        <div>
                            <label htmlFor="sectionDescription" className="block text-lg font-medium text-gray-700 mb-2">Section Description</label>
                            <textarea
                                id="sectionDescription"
                                name="sectionDescription"
                                value={newSectionData.sectionDescription}
                                onChange={(e) => setNewSectionData({ ...newSectionData, sectionDescription: e.target.value })}
                                rows="3"
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base"
                                placeholder="A brief overview of what this section covers."
                                disabled={loading}
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="sectionOrder" className="block text-lg font-medium text-gray-700 mb-2">Order <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                id="sectionOrder"
                                name="order"
                                value={newSectionData.order}
                                onChange={(e) => { setNewSectionData({ ...newSectionData, order: parseInt(e.target.value) }); setFormErrors(prev => ({ ...prev, order: '' })); }}
                                min="1"
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base"
                                placeholder="e.g., 1"
                                disabled={loading}
                            />
                            {formErrors.order && <p className="mt-2 text-sm text-red-600">{formErrors.order}</p>}
                        </div>
                        <div className="flex justify-end space-x-4 mt-8">
                            <button
                                type="button"
                                onClick={() => navigate(-1)} // Navigate back on cancel
                                className="px-6 py-3 btn-cancel"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 btn-create"
                            >
                                Add Section
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AddSectionPage;
