import React, { useState, useEffect, useCallback, useContext } from 'react';
import SubjectForm from './SubjectForm';
import UserContext from '../UserContext/UserContext';
import { PlusCircle, Edit, Trash2, BookOpen, Calendar, Users } from 'lucide-react';

const SubjectManagementPage = () => {
    // Access user context for authentication and permissions
    const { hasPermission, loading: userLoading, isLoggedIn } = useContext(UserContext);

    // State management for subjects, loading, and UI modals
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [deletingSubject, setDeletingSubject] = useState(null);

    // Permission checks based on the provided routes
    const canCreate = hasPermission('subject:create');
    const canRead = hasPermission('subject:read:all');
    const canUpdate = hasPermission('subject:update');
    const canDelete = hasPermission('subject:delete');

    // Fetch subjects from the backend, wrapped in useCallback for dependency array stability
    const fetchSubjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Check if the user has read permission before making the API call
            if (!canRead) {
                setLoading(false);
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/subjects`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || 'Failed to fetch subjects.');
            }

            const data = await response.json();
            if (data.success) {
                setSubjects(data.data);
            } else {
                throw new Error(data.message || 'Failed to retrieve subjects data.');
            }
        } catch (err) {
            console.error('Error fetching subjects:', err);
            setError(err.message || 'Failed to load subjects.');
        } finally {
            setLoading(false);
        }
    }, [canRead]);

    // useEffect hook to trigger data fetching when permissions or login status changes
    useEffect(() => {
        if (!userLoading && isLoggedIn && canRead) {
            fetchSubjects();
        } else if (!userLoading && !isLoggedIn) {
            // UI will handle the message
        }
    }, [userLoading, isLoggedIn, canRead, fetchSubjects]);

    // Handler for creating a new subject
    const handleAddSubject = async (formData) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/subjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create subject.');
            }

            setShowAddForm(false);
            fetchSubjects();
        } catch (err) {
            console.error('Error adding subject:', err);
        }
    };

    // Handler for updating an existing subject
    const handleUpdateSubject = async (id, formData) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/subjects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update subject.');
            }

            setEditingSubject(null);
            fetchSubjects();
        } catch (err) {
            console.error('Error updating subject:', err);
        }
    };

    // Handler for deleting a subject
    const handleDeleteSubject = async (id) => {
        if (!canDelete) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/subjects/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete subject.');
            }

            setDeletingSubject(null);
            fetchSubjects();
        } catch (err) {
            console.error('Error deleting subject:', err);
        }
    };

    // Conditional rendering based on loading and error states
    if (userLoading || loading) {
        return <div className="p-4 text-center text-blue-600">Loading subjects...</div>;
    }

    if (!isLoggedIn) {
        return <div className="p-4 text-center text-red-500">You must be logged in to manage subjects.</div>;
    }

    if (!canRead) {
        return <div className="p-4 text-center text-red-500">Access Denied: You do not have permission to view subjects.</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">Error: {error}</div>;
    }

    // Main component UI
    return (
        <div className="container-2 p-6 bg-gray-50 min-h-screen font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-sm">
                <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Subject Management</h1>
                {canCreate && (
                    <button
                        onClick={() => { setEditingSubject(null); setShowAddForm(true); }}
                        className="btn-create flex gap-3 items-center"
                    >
                        <PlusCircle size={20} />
                        <span>Add New Subject</span>
                    </button>
                )}
            </div>

            {/* Conditional rendering for empty state or table */}
            {subjects.length === 0 ? (
                <div className="text-center mt-12 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                    <p className="text-2xl font-semibold text-gray-600 mb-4">No Subjects Found</p>
                    <p className="text-lg text-gray-500">It looks like no subjects have been added yet.</p>
                    {canCreate && (
                        <p className="text-lg text-gray-500 mt-2">Click "Add New Subject" to create your first subject!</p>
                    )}
                </div>
            ) : (
                <div className="bg-white shadow-xl rounded-lg overflow-hidden my-4 border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {subjects.map(subject => (
                                    <tr key={subject._id} className="hover:bg-gray-50 transition-colors duration-100">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <span className="inline-flex items-center space-x-1">
                                                <BookOpen size={16} className="text-blue-500" />
                                                <span>{subject.name}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                                            {subject.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            <span className="inline-flex items-center space-x-1">
                                                <Calendar size={14} className="text-yellow-500" />
                                                <span>{new Date(subject.createdAt).toLocaleDateString()}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                {canUpdate && (
                                                    <button
                                                        onClick={() => setEditingSubject(subject)}
                                                        className="btn-edit flex items-center"
                                                        title="Edit Subject"
                                                    >
                                                        <Edit size={16} /> <span className="ml-1 hidden lg:inline">Edit</span>
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => setDeletingSubject(subject)}
                                                        className="btn-delete flex items-center"
                                                        title="Delete Subject"
                                                    >
                                                        <Trash2 size={16} /> <span className="ml-1 hidden lg:inline">Delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Subject Form */}
            {showAddForm && (
                <SubjectForm
                    onSave={handleAddSubject}
                    onCancel={() => setShowAddForm(false)}
                    initialData={{ name: '', description: '' }}
                    isAdding={true}
                />
            )}

            {/* Edit Subject Form */}
            {editingSubject && (
                <SubjectForm
                    onSave={handleUpdateSubject}
                    onCancel={() => setEditingSubject(null)}
                    initialData={editingSubject}
                    isAdding={false}
                />
            )}
        </div>
    );
};

export default SubjectManagementPage;
