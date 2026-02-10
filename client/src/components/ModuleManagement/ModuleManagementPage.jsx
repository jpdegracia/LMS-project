import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, ListChecks, Search, FlaskConical, Zap, BookOpen } from 'lucide-react';
import UserContext from '../UserContext/UserContext';
import Modal from '../Modal/Modal';

const ModuleManagementPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);

    const [modules, setModules] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [moduleToDelete, setModuleToDelete] = useState(null);
    const [filterText, setFilterText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedModuleType, setSelectedModuleType] = useState('all');
    const [sortOrder, setSortOrder] = useState('default');

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setLoadingCategories(true);
        setError(null);
        try {
            const [modulesResponse, categoriesResponse] = await Promise.all([
                fetch(`${BACKEND_URL}/modules`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/categories`, { credentials: 'include' })
            ]);

            const [modulesData, categoriesData] = await Promise.all([
                modulesResponse.json(),
                categoriesResponse.json()
            ]);
            
            if (modulesData.success) {
                setModules(modulesData.data || []);
            } else {
                throw new Error(modulesData.message || 'Failed to retrieve modules data.');
            }

            if (categoriesData.success) {
                setCategories(categoriesData.data || []);
            } else {
                throw new Error(categoriesData.message || 'Failed to retrieve categories data.');
            }

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Failed to load modules or categories.');
        } finally {
            setLoading(false);
            setLoadingCategories(false);
        }
    }, [BACKEND_URL]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConfirmDelete = async () => {
        if (!moduleToDelete || !hasPermission('module:delete')) {
            return;
        }

        setLoading(true);
        setSuccessMessage(null);
        setError(null);
        setShowDeleteModal(false);

        try {
            const response = await fetch(`${BACKEND_URL}/modules/${moduleToDelete._id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete module.');
            }

            setSuccessMessage('Module deleted successfully!');
            fetchData();
        } catch (err) {
            console.error('Error deleting module:', err);
            setError(err.message || 'Error deleting module.');
        } finally {
            setLoading(false);
            setModuleToDelete(null);
        }
    };
    
    const handleDeleteClick = (moduleItem) => {
        if (!hasPermission('module:delete')) {
            console.log("You don't have permission to delete modules.");
            return;
        }
        setModuleToDelete(moduleItem);
        setShowDeleteModal(true);
    };

    const handleAddModuleClick = () => {
        navigate('/add-module');
    };

    const handleManageQuestionsClick = (quizId) => {
        navigate(`/manage-quiz-questions/${quizId}`);
    };

    const handleManageSectionsClick = (testId) => {
        navigate(`/manage-test-sections/${testId}`);
    };

    const filteredAndSortedModules = modules
        .filter(moduleItem =>
            (selectedCategory === 'all' || moduleItem.categoryId?._id === selectedCategory) &&
            (selectedModuleType === 'all' || moduleItem.moduleType === selectedModuleType) &&
            (getCleanPlainText(moduleItem.title).toLowerCase().includes(filterText.toLowerCase()) ||
            getCleanPlainText(moduleItem.description || '').toLowerCase().includes(filterText.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortOrder === 'title-asc') {
                return getCleanPlainText(a.title).localeCompare(getCleanPlainText(b.title));
            } else if (sortOrder === 'title-desc') {
                return getCleanPlainText(b.title).localeCompare(getCleanPlainText(a.title));
            } else if (sortOrder === 'status-asc') {
                return a.status.localeCompare(b.status);
            } else if (sortOrder === 'status-desc') {
                return b.status.localeCompare(a.status);
            }
            return 0;
        });

    const canCreateModule = hasPermission('module:create');
    const canEditModule = hasPermission('module:update');
    const canManageModuleContent = hasPermission('module:update') && (hasPermission('question:update') || hasPermission('lesson_content:update'));
    const canManageModuleQuestions = hasPermission('question:update') || hasPermission('question:read') || hasPermission('question:create');

    if (!hasPermission('module:read:all')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to view module management.</p>
                <button onClick={() => navigate(-1)} className="mt-6 btn-cancel">Go Back</button>
            </div>
        );
    }

    if (loading || loadingCategories) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading modules and categories...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-red-600">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter">
            <main className="mx-auto px-6 max-w-9xl">
                <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-8">
                    <h2 className="text-4xl font-bold text-gray-800 mb-6 text-center">Module Management</h2>
                    
                    {successMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{successMessage}</span>
                            <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setSuccessMessage(null)}>
                                <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.15a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.03a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.15 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                            </span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{error}</span>
                            <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setError(null)}>
                                <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.15a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.03a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.15 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                            </span>
                        </div>
                    )}

                    <div className="flex justify-end mb-6">
                        {canCreateModule && (
                            <button
                                onClick={handleAddModuleClick}
                                className="btn-create flex gap-2"
                            >
                                <PlusCircle size={20} />
                                <span>Add New Module</span>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search modules by title or description..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                disabled={loading}
                            />
                            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        
                        <div className="flex-1">
                            <label htmlFor="moduleTypeFilter" className="sr-only">Filter by Module Type</label>
                            <select
                                id="moduleTypeFilter"
                                value={selectedModuleType}
                                onChange={(e) => setSelectedModuleType(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                disabled={loading}
                            >
                                <option value="all">All Types</option>
                                <option value="lesson">Lesson</option>
                                <option value="quiz">Quiz</option>
                                <option value="test">Test</option>
                            </select>
                        </div>

                        <div className="flex-1">
                            <label htmlFor="categoryFilter" className="sr-only">Filter by Category</label>
                            <select
                                id="categoryFilter"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                disabled={loading || loadingCategories}
                            >
                                <option value="all">All Categories</option>
                                {categories.map(category => (
                                    <option key={category._id} value={category._id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex-1">
                            <label htmlFor="sortOrder" className="sr-only">Sort By</label>
                            <select
                                id="sortOrder"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                disabled={loading}
                            >
                                <option value="default">Default Order</option>
                                <option value="title-asc">Title (A-Z)</option>
                                <option value="title-desc">Title (Z-A)</option>
                                <option value="status-asc">Status (A-Z)</option>
                                <option value="status-desc">Status (Z-A)</option>
                            </select>
                        </div>
                    </div>

                    {filteredAndSortedModules.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg shadow-md">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Title
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Modules/Contents/Questions
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredAndSortedModules.map((moduleItem) => (
                                        <tr key={moduleItem._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                <div className="flex items-center space-x-2">
                                                    {moduleItem.moduleType === 'quiz' ? <Zap size={18} className="text-orange-500" /> : 
                                                    moduleItem.moduleType === 'test' ? <FlaskConical size={18} className="text-purple-600" /> :
                                                    <BookOpen size={18} className="text-green-600" />}
                                                    <span>{moduleItem.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                                {moduleItem.description || 'No description provided.'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {moduleItem.moduleType}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {moduleItem.categoryId?.name || 'Uncategorized'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {moduleItem.moduleType === 'test' ? (
                                                    <span className="font-semibold">{moduleItem.quizModules ? moduleItem.quizModules.length : 0} modules</span>
                                                ) : moduleItem.moduleType === 'lesson' ? (
                                                    <span className="font-semibold">{moduleItem.contents ? moduleItem.contents.length : 0} contents</span>
                                                ) : (
                                                    <span className="font-semibold">{moduleItem.questions ? moduleItem.questions.length : 0} questions</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    moduleItem.status === 'published' ? 'bg-green-100 text-green-800' :
                                                    moduleItem.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {moduleItem.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    {canEditModule && (
                                                        <button
                                                            onClick={() => {
                                                                if (moduleItem.moduleType === 'lesson') {
                                                                    navigate(`/edit-lesson-module/${moduleItem._id}`);
                                                                } else if (moduleItem.moduleType === 'quiz') {
                                                                    navigate(`/edit-quiz/${moduleItem._id}`);
                                                                } else if (moduleItem.moduleType === 'test') {
                                                                    navigate(`/edit-test-module/${moduleItem._id}`);
                                                                } else {
                                                                    navigate(`/edit-module/${moduleItem._id}`);
                                                                }
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                                                            title="Edit Module Settings"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {moduleItem.moduleType === 'test' && (
                                                        <button
                                                            onClick={() => handleManageSectionsClick(moduleItem._id)}
                                                            className="text-purple-600 hover:text-purple-900 p-1 rounded-md hover:bg-purple-50 transition-colors"
                                                            title="Manage Test Sections"
                                                        >
                                                            <ListChecks size={18} />
                                                        </button>
                                                    )}
                                                    {moduleItem.moduleType === 'quiz' && canManageModuleQuestions && (
                                                        <button
                                                            onClick={() => handleManageQuestionsClick(moduleItem._id)}
                                                            className="text-purple-600 hover:text-purple-900 p-1 rounded-md hover:bg-purple-50 transition-colors"
                                                            title="Manage Quiz Questions"
                                                        >
                                                            <ListChecks size={18} />
                                                        </button>
                                                    )}
                                                    {moduleItem.moduleType === 'lesson' && canManageModuleContent && (
                                                        <button
                                                            onClick={() => navigate(`/manage-lesson-content/${moduleItem._id}`)}
                                                            className="text-purple-600 hover:text-purple-900 p-1 rounded-md hover:bg-purple-50 transition-colors"
                                                            title="Manage Lesson Content"
                                                        >
                                                            <ListChecks size={18} />
                                                        </button>
                                                    )}
                                                    {hasPermission('module:delete') && (
                                                        <button
                                                            onClick={() => handleDeleteClick(moduleItem)}
                                                            className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                                                            title="Delete Module"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">No modules found.</p>
                    )}
                </div>
            </main>
            {showDeleteModal && (
                <Modal
                    title="Confirm Deletion"
                    message={`Are you sure you want to permanently delete the module titled "${moduleToDelete?.title}"? This action cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
};

export default ModuleManagementPage;