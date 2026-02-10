import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../../components/UserContext/UserContext';
import { ArrowLeft, Edit, FlaskConical, Loader2 } from 'lucide-react';
import Modal from '../Modal/Modal';

const EditTestModulePage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'draft',
    });

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const fetchModule = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!hasPermission('module:update')) {
                throw new Error("You don't have permission to edit modules.");
            }
            
            const moduleRes = await fetch(`${BACKEND_URL}/modules/${moduleId}`, { credentials: 'include' });
            const moduleJson = await moduleRes.json();

            if (!moduleRes.ok || !moduleJson.success || moduleJson.data.moduleType !== 'test') {
                throw new Error(moduleJson.message || 'Failed to fetch test module or invalid module type.');
            }

            setFormData({
                title: moduleJson.data.title || '',
                description: moduleJson.data.description || '',
                status: moduleJson.data.status || 'draft',
            });
            
        } catch (err) {
            console.error('Error fetching resources:', err);
            setError(err.message || 'Failed to load data for the form.');
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL, moduleId, hasPermission]);

    useEffect(() => {
        fetchModule();
    }, [fetchModule]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormErrors(prev => ({ ...prev, [name]: '' }));
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage(null);
        setError(null);

        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = "Test Title is required.";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        const payload = {
            title: formData.title,
            description: formData.description,
            status: formData.status,
            moduleType: 'test'
        };

        try {
            const response = await fetch(`${BACKEND_URL}/modules/${moduleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update test module.');
            }
            setSuccessMessage("Test module updated successfully!");
        } catch (err) {
            console.error('Error updating test module:', err);
            setError(err.message || 'Error updating test module.');
        } finally {
            setIsSubmitting(false);
            if (successMessage) {
                 setTimeout(() => navigate('/module-management'), 1500);
            }
        }
    };
    
    if (!hasPermission('module:update')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to edit this module.</p>
                <button onClick={() => navigate(-1)} className="mt-6 btn-cancel">Go Back</button>
            </div>
        );
    }
    
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600 flex items-center space-x-2">
                    <Loader2 size={24} className="animate-spin" />
                    <span>Loading test module...</span>
                </p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="p-6 text-center text-red-500">Error: {error}</div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter">
            <main className="mx-auto px-6 max-w-9xl">
                <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-10">
                    <div className="flex items-center space-x-4 mb-8">
                        <button
                            onClick={() => navigate('/module-management')}
                            className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                            title="Go back"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-4xl font-bold text-gray-800 flex items-center space-x-4">
                            <FlaskConical size={36} className="text-purple-600" />
                            <span>Edit Test Module: {formData.title}</span>
                        </h2>
                    </div>
                    {successMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{successMessage}</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <div className="md:col-span-2">
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                    Test Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                    required
                                    disabled={isSubmitting}
                                />
                                {formErrors.title && <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="2"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                    disabled={isSubmitting}
                                ></textarea>
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                    Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                                {formErrors.status && <p className="mt-1 text-xs text-red-600">{formErrors.status}</p>}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
                            <button
                                type="button"
                                onClick={() => navigate('/module-management')}
                                className="btn-cancel px-5 py-2 rounded-md transition duration-200"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-create px-5 py-2 rounded-md transition duration-200 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Test Module'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EditTestModulePage;