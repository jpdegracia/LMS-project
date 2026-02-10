import React, { useState, useEffect, useCallback, useContext } from 'react';
import Modal from '../Modal/Modal';
import CategoryForm from './CategoryForm'; // Assuming this path is correct
import { PlusCircle, Edit, Trash2, Tag, Calendar } from 'lucide-react'; // Added icons
import UserContext from '../UserContext/UserContext';


const CategoryManagementPage = () => {
    const { hasPermission, loading: userLoading, isLoggedIn } = useContext(UserContext);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const canCreate = hasPermission('category:create');
    const canRead = hasPermission('category:read:all');
    const canUpdate = hasPermission('category:update');
    const canDelete = hasPermission('category:delete');

    const fetchCategories = useCallback(async () => { // Wrapped in useCallback for useEffect dependency
        setLoading(true);
        setError(null);
        try {
            if (!canRead) {
                alert("You don't have permission to view categories.");
                setLoading(false);
                // navigate('/dashboard'); // If you add navigate, make sure to import it
                return;
            }
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || 'Failed to fetch categories.');
            }
            const data = await response.json();
            if (data.success) {
                setCategories(data.data);
            } else {
                throw new Error(data.message || 'Failed to retrieve categories data.');
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError(err.message || 'Failed to load categories.');
            alert(err.message || 'Failed to load categories.');
        } finally {
            setLoading(false);
        }
    }, [canRead, import.meta.env.VITE_BACKEND_URL]); // Add navigate if used inside

    useEffect(() => {
        if (!userLoading && isLoggedIn && canRead) {
            fetchCategories();
        } else if (!userLoading && !isLoggedIn) {
             alert("Please log in to manage categories.");
             // navigate('/login'); // If you add navigate, make sure to import it
        }
    }, [userLoading, isLoggedIn, canRead, fetchCategories]); // Added fetchCategories to dependencies

    const handleAddCategory = async (formData) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create category.');
            }
            alert("Category created successfully!");
            setShowAddModal(false);
            fetchCategories();
        } catch (err) {
            console.error('Error adding category:', err);
            alert(err.message || 'Error adding category.');
        }
    };

    const handleUpdateCategory = async (id, formData) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update category.');
            }
            alert("Category updated successfully!");
            setEditingCategory(null);
            fetchCategories();
        } catch (err) {
            console.error('Error updating category:', err);
            alert(err.message || 'Error updating category.');
        }
    };

    const handleDeleteCategory = async (id, name) => {
        if (!canDelete) {
            alert("You don't have permission to delete categories.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete category "${name}"? This action cannot be undone if used by courses.`)) {
            return;
        }
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete category.');
            }
            alert("Category deleted successfully!");
            fetchCategories();
        } catch (err) {
            console.error('Error deleting category:', err);
            alert(err.message || 'Error deleting category.');
        }
    };

    if (userLoading || loading) {
        return <div className="p-4 text-center text-blue-600">Loading categories...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">Error: {error}</div>;
    }

    if (!isLoggedIn) {
        return <div className="p-4 text-center text-red-500">You must be logged in to manage categories.</div>;
    }
    if (!canRead) {
        return <div className="p-4 text-center text-red-500">Access Denied: You do not have permission to view categories.</div>;
    }

    return (
        <div className="container-2 p-6 bg-gray-50 min-h-screen font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-sm">
                <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Category Management</h1>
                {canCreate && (
                    <button
                        onClick={() => { setEditingCategory(null); setShowAddModal(true); }}
                        className="btn-create flex gap-3"
                    >
                        <PlusCircle size={20} />
                        <span>Add New Category</span>
                    </button>
                )}
            </div>

            {/* Conditional rendering for empty state or table */}
            {categories.length === 0 ? (
                <div className="text-center mt-12 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                    <p className="text-2xl font-semibold text-gray-600 mb-4">No Categories Found</p>
                    <p className="text-lg text-gray-500">It looks like no categories have been added yet.</p>
                    {canCreate && (
                         <p className="text-lg text-gray-500 mt-2">Click "Add New Category" to create your first category!</p>
                    )}
                </div>
            ) : (
                <div className="bg-white shadow-xl rounded-lg overflow-hidden my-4 border border-gray-200">
                    <div className="overflow-x-auto"> {/* Added for horizontal scrolling on small screens */}
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
                                {categories.map(category => (
                                    <tr key={category._id} className="hover:bg-gray-50 transition-colors duration-100">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <span className="inline-flex items-center space-x-1">
                                                <Tag size={16} className="text-purple-500" />
                                                <span>{category.name}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{category.description || 'No description.'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            <span className="inline-flex items-center space-x-1">
                                                <Calendar size={14} className="text-yellow-500" />
                                                <span>{new Date(category.createdAt).toLocaleDateString()}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                {canUpdate && (
                                                    <button
                                                        onClick={() => setEditingCategory(category)}
                                                        className="btn-edit flex"
                                                        title="Edit Category"
                                                    >
                                                        <Edit size={16} /> <span className="ml-1 hidden lg:inline">Edit</span>
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteCategory(category._id, category.name)}
                                                        className="btn-delete flex"
                                                        title="Delete Category"
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

            {/* Add Category Modal */}
            {showAddModal && (
                <CategoryForm
                    onSave={handleAddCategory}
                    onCancel={() => setShowAddModal(false)}
                    initialData={{ name: '', description: '' }}
                    isAdding={true}
                />
            )}

            {/* Edit Category Modal */}
            {editingCategory && (
                <CategoryForm
                    onSave={handleUpdateCategory}
                    onCancel={() => setEditingCategory(null)}
                    initialData={editingCategory}
                    isAdding={false}
                />
            )}
        </div>
    );
};

export default CategoryManagementPage;