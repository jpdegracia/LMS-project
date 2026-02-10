import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
import { PlusCircle, Edit, Trash2, ListChecks, Search, Filter, ArrowDownNarrowWide, ArrowUpWideNarrow, ScanEyeIcon } from 'lucide-react';

const LessonModuleManagementPage = () => {
    const navigate = useNavigate();
    const { isLoggedIn, userLoading, hasPermission } = useContext(UserContext);

    const [lessonModules, setLessonModules] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSections, setLoadingSections] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [filterText, setFilterText] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const canCreateModule = hasPermission('module:create');
    const canReadModules = hasPermission('module:read:all');
    const canUpdateModule = hasPermission('module:update');
    const canDeleteModule = hasPermission('module:delete');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setLoadingSections(true);
        setError(null);
        try {
            if (!canReadModules) {
                throw new Error("You do not have permission to view lesson modules.");
            }
            const modulesResponse = await fetch(`${BACKEND_URL}/modules`, { credentials: 'include' });
            if (!modulesResponse.ok) {
                const errorData = await modulesResponse.json();
                throw new Error(errorData.message || 'Failed to fetch modules.');
            }
            const modulesData = await modulesResponse.json();
            if (modulesData.success) {
                const lessons = (modulesData.data || []).filter(mod => mod.moduleType === 'lesson');
                
                // FIX: Use a Map to filter out duplicate modules
                const uniqueLessons = new Map();
                lessons.forEach(lesson => {
                    uniqueLessons.set(lesson._id, lesson);
                });

                setLessonModules(Array.from(uniqueLessons.values()));

            } else {
                throw new Error(modulesData.message || "Failed to retrieve lesson modules.");
            }
            const sectionsResponse = await fetch(`${BACKEND_URL}/sections`, { credentials: 'include' });
            if (!sectionsResponse.ok) {
                const errorData = await sectionsResponse.json();
                throw new Error(errorData.message || 'Failed to fetch sections.');
            }
            const sectionsData = await sectionsResponse.json();
            if (sectionsData.success) {
                setSections(sectionsData.data || []);
            } else {
                throw new Error(sectionsData.message || 'Failed to retrieve sections data.');
            }
        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err.message || "Failed to load lesson modules or sections.");
        } finally {
            setLoading(false);
            setLoadingSections(false);
        }
    }, [canReadModules, BACKEND_URL]);

    const handleDeleteModule = async (moduleId, moduleTitle) => {
        if (!canDeleteModule) {
            alert("You do not have permission to delete lesson modules.");
            return;
        }
        if (!window.confirm(`Are you sure you want to PERMANENTLY delete the lesson module "${moduleTitle}"?`)) {
            return;
        }
        try {
            const response = await fetch(`${BACKEND_URL}/modules/${moduleId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete lesson module.');
            }
            alert('Lesson module deleted successfully!');
            fetchData();
        } catch (err) {
            console.error('Error deleting lesson module:', err);
            alert(err.message || 'Error deleting lesson module.');
        }
    };

    useEffect(() => {
        if (!userLoading) {
            if (isLoggedIn && canReadModules) {
                fetchData();
            } else if (!isLoggedIn) {
                alert("Please log in to manage lesson modules.");
                navigate('/login');
            } else if (!canReadModules) {
                alert("Access Denied: You do not have permission to view lesson modules.");
                navigate('/dashboard');
            }
        }
    }, [userLoading, isLoggedIn, canReadModules, fetchData, navigate]);

    const filteredAndSortedModules = useMemo(() => {
        let currentModules = [...lessonModules];
        if (filterText) {
            currentModules = currentModules.filter(mod =>
                mod.title?.toLowerCase().includes(filterText.toLowerCase()) ||
                mod.description?.toLowerCase().includes(filterText.toLowerCase())
            );
        }
        currentModules.sort((a, b) => {
            let valA, valB;
            switch (sortBy) {
                case 'title':
                    valA = a.title?.toLowerCase() || '';
                    valB = b.title?.toLowerCase() || '';
                    return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'createdAt':
                    valA = new Date(a.createdAt).getTime();
                    valB = new Date(b.createdAt).getTime();
                    return sortOrder === 'asc' ? valA - valB : valB - a;
                default:
                    return 0;
            }
        });
        return currentModules;
    }, [lessonModules, filterText, sortBy, sortOrder]);


    if (loading || userLoading || loadingSections) {
        return <div className="p-6 text-center text-blue-600">Loading lesson modules and sections...</div>;
    }
    if (error) {
        return <div className="p-6 text-center text-red-500">Error: {error}</div>;
    }
    if (!isLoggedIn || !canReadModules) {
        return <div className="p-6 text-center text-red-500">Access Denied.</div>;
    }
    
    return (
        <div className="container-2 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter">
            <main className="mx-auto px-6 max-w-9xl">
                <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-8">
                    <h2 className="text-4xl font-bold text-gray-800 mb-6 text-center">Lesson Module Management</h2>
                    {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" onClick={() => setSuccessMessage(null)}><span className="block sm:inline">{successMessage}</span></div>}
                    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" onClick={() => setError(null)}><span className="block sm:inline">{error}</span></div>}
                    
                    <div className="flex justify-end mb-6">
                        {canCreateModule && (
                            <button
                                onClick={() => navigate('/add-lesson-module')}
                                className="btn-create flex gap-2 cursor-pointer"
                            >
                                <PlusCircle size={20} />
                                <span>Add New Lesson Module</span>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search lessons by title or description..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                disabled={loading}
                            />
                            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Parts</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredAndSortedModules.map((module) => (
                                        <tr key={module._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {module.title}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {module.description ? module.description.substring(0, 70) + (module.description.length > 70 ? '...' : '') : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {module.contents ? module.contents.length : 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    module.status === 'published' ? 'bg-green-100 text-green-800' :
                                                    module.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {module.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(module.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2"> 
                                                    <button
                                                        onClick={() => navigate(`/view-lesson-module/${module._id}`)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
                                                        title="View Lesson Preview"
                                                    >
                                                        <ScanEyeIcon size={18} />
                                                    </button>
                                                    {canUpdateModule &&  (
                                                        <>
                                                            <button
                                                                onClick={() => navigate(`/edit-lesson-module/${module._id}`)}
                                                                className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                                                                title="Edit Lesson Module Details"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(`/manage-lesson-content/${module._id}`)}
                                                                className="text-purple-600 hover:text-purple-900 p-1 rounded-md hover:bg-purple-50 transition-colors cursor-pointer"
                                                                title="Manage Lesson Content"
                                                            >
                                                                <ListChecks size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {canDeleteModule && (
                                                        <button
                                                            onClick={() => handleDeleteModule(module._id, module.title)}
                                                            className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                                            title="Delete Lesson Module"
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
                        <p className="text-center text-gray-500">No lesson modules found.</p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LessonModuleManagementPage;
