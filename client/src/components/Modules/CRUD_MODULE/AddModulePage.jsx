import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext';
import { PlusCircle, ArrowLeft, Search, Grab, ListChecks, BookOpen, Trash2, FastForward, Layers } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- HELPER: Calculate Stats ---
const getModuleStats = (module) => {
    if (module.moduleType !== 'quiz') return null;
    const isSAT = module.satSettings?.isSAT;
    let count = 0;
    if (isSAT) {
        count = module.satSettings?.strands?.reduce((acc, s) => acc + (s.questions ? s.questions.length : 0), 0) || 0;
    } else {
        count = module.questions ? module.questions.length : 0;
    }
    return { isSAT, count };
};

// Reusable component for displaying sortable module items
const SortableModuleItem = ({ module, index, onRemove, isNewModule }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: module._id,
        disabled: !isNewModule,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const stats = getModuleStats(module);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-transparent transition-all duration-200 ease-in-out ${isNewModule ? 'cursor-grab' : 'cursor-default'}`}
        >
            {isNewModule ? (
                <div {...listeners} className="cursor-grab text-gray-400 hover:text-purple-600 flex-shrink-0">
                    <Grab size={20} />
                </div>
            ) : (
                <div className="text-gray-400 flex-shrink-0">
                    <Grab size={20} />
                </div>
            )}
            <span className="font-medium text-gray-800">{index + 1}.</span>
            <div className="flex-grow flex items-center space-x-2">
                {module.moduleType === 'lesson' ? (
                    <BookOpen size={18} className="text-blue-500" />
                ) : (
                    // Show Layers icon for SAT, ListChecks for Standard
                    stats?.isSAT ? <Layers size={18} className="text-purple-600" /> : <ListChecks size={18} className="text-orange-500" />
                )}
                <span className="text-sm text-gray-700 flex-grow">
                    {module.title || 'Untitled Module'}
                    {module.moduleType === 'quiz' && stats && (
                        <span className="text-xs text-gray-500 ml-2">
                            ({stats.isSAT ? 'SAT' : 'Std'} • {stats.count} Qs)
                        </span>
                    )}
                </span>
            </div>
            {isNewModule && (
                <button
                    type="button"
                    onClick={() => onRemove(module._id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
                    title="Remove module from selection"
                >
                    <Trash2 size={20} />
                </button>
            )}
        </div>
    );
};

const AddModulePage = () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const { courseId, sectionId } = useParams();
    
    const [formData, setFormData] = useState({
        moduleType: 'lesson',
        selectedModules: [],
    });
    
    const [existingLessonModules, setExistingLessonModules] = useState([]);
    const [existingQuizModules, setExistingQuizModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [filterText, setFilterText] = useState('');
    const [courseData, setCourseData] = useState(null);
    const [initialModuleIds, setInitialModuleIds] = useState(new Set());

    const fetchResources = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [modulesRes, courseRes, sectionRes] = await Promise.all([
                fetch(`${BACKEND_URL}/modules`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/courses/${courseId}`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/sections/${sectionId}`, { credentials: 'include' })
            ]);

            const [modulesData, courseDataJson, sectionDataJson] = await Promise.all([
                modulesRes.json(),
                courseRes.json(),
                sectionRes.json()
            ]);

            if (modulesRes.ok && modulesData.success) {
                const allModules = modulesData.data || [];
                const publishedLessons = allModules.filter(mod => mod.moduleType === 'lesson' && mod.status === 'published');
                const publishedQuizzes = allModules.filter(mod => mod.moduleType === 'quiz' && mod.status === 'published');

                setExistingLessonModules(publishedLessons);
                setExistingQuizModules(publishedQuizzes);
            } else {
                throw new Error(modulesData.message || 'Failed to fetch modules.');
            }

            if (courseRes.ok && courseDataJson.success) {
                setCourseData(courseDataJson.data);
                // Set default moduleType based on course contentType
                if (courseDataJson.data.contentType === 'practice_test') {
                    setFormData(prev => ({ ...prev, moduleType: 'quiz' }));
                }
            } else {
                throw new Error(courseDataJson.message || 'Failed to fetch course data.');
            }

            if (sectionRes.ok && sectionDataJson.success) {
                const existingModulesInSection = sectionDataJson.data.modules || [];
                setFormData(prev => ({
                    ...prev,
                    selectedModules: existingModulesInSection,
                }));
                setInitialModuleIds(new Set(existingModulesInSection.map(m => m._id)));
            } else {
                throw new Error(sectionDataJson.message || 'Failed to fetch section modules.');
            }

        } catch (err) {
            console.error('Error fetching resources:', err);
            setError(err.message || 'Failed to load existing modules.');
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL, courseId, sectionId]);

    useEffect(() => {
        if (courseId && sectionId) {
            fetchResources();
        }
    }, [fetchResources, courseId, sectionId]);

    const getFilteredExistingModules = useCallback(() => {
        const moduleList = formData.moduleType === 'lesson' ? existingLessonModules : existingQuizModules;
        if (!courseData || !Array.isArray(moduleList)) return [];

        const selectedModuleIds = new Set((formData.selectedModules || []).map(m => m._id.toString()));
        const filteredBySelection = moduleList.filter(mod => !selectedModuleIds.has(mod._id.toString()));

        if (filterText) {
            return filteredBySelection.filter(mod =>
                mod.title?.toLowerCase().includes(filterText.toLowerCase())
            );
        }
        return filteredBySelection;
    }, [courseData, existingLessonModules, existingQuizModules, formData.moduleType, filterText, formData.selectedModules]);

    const handleModuleTypeChange = useCallback((moduleType) => {
        setFormData(prev => ({
            ...prev,
            moduleType: moduleType,
        }));
        setFilterText('');
    }, []);

    const handleSelectModule = useCallback((module) => {
        setFormData(prev => ({
            ...prev,
            selectedModules: [...prev.selectedModules, module],
        }));
        setFormErrors(prev => ({ ...prev, selectedModules: '' }));
    }, []);

    const handleAddAllModules = useCallback(() => {
        const modulesToAdd = getFilteredExistingModules();
        if (modulesToAdd.length > 0) {
            setFormData(prev => ({
                ...prev,
                selectedModules: [...prev.selectedModules, ...modulesToAdd],
            }));
            setFormErrors(prev => ({ ...prev, selectedModules: '' }));
        }
    }, [getFilteredExistingModules]);

    const handleRemoveSelectedModule = useCallback((moduleId) => {
        setFormData(prev => {
            const newSelectedModules = prev.selectedModules.filter(m => m._id !== moduleId);
            return {
                ...prev,
                selectedModules: newSelectedModules,
            };
        });
    }, []);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.selectedModules.findIndex((m) => m._id === active.id);
                const newIndex = prev.selectedModules.findIndex((m) => m._id === over.id);
                const newOrderedModules = arrayMove(prev.selectedModules, oldIndex, newIndex);
                return { ...prev, selectedModules: newOrderedModules };
            });
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newErrors = {};

        if (!formData.selectedModules || formData.selectedModules.length === 0) {
            newErrors.selectedModules = `Please select at least one module to add.`;
        }

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        const newModuleIdsPayload = formData.selectedModules
            .filter(m => !initialModuleIds.has(m._id))
            .map(m => m._id);
        
        const endpoint = `${BACKEND_URL}/sections/${sectionId}/add-existing-modules`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ moduleIds: newModuleIdsPayload }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to link modules.');
            }

            navigate(`/courses-manage/${courseId}`, { state: { refresh: true } });

        } catch (err) {
            console.error('Error linking modules:', err);
            setError(err.message || 'Error linking modules.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!hasPermission('section:create')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to add modules to a section.</p>
                <button onClick={() => navigate(-1)} className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg">Go Back</button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading resources...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-red-600">Error: {error}</p>
                <button onClick={() => navigate(-1)} className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg">Go Back</button>
            </div>
        );
    }

    const modulesToDisplay = getFilteredExistingModules();

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter">
            <main className="mx-auto px-6 max-w-9xl w-full flex-grow flex flex-col">
                <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-10 flex flex-col flex-grow">

                    <div className="flex items-center space-x-4">
                        <h2 className="text-4xl font-bold text-gray-800 flex-1">
                            Manage Learning Modules
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 flex-grow flex flex-col">
                        <div className="flex flex-col md:flex-row gap-8 flex-grow">
                            {/* Left Block: Selected Modules */}
                            <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm flex flex-col">
                                <h4 className="text-md font-semibold text-gray-700 mb-4">Modules to Add: ({formData.selectedModules?.length || 0})</h4>
                                {formErrors.selectedModules && <p className="mt-2 text-sm text-red-600 mb-5">{formErrors.selectedModules}</p>}
                                <div className="space-y-3 flex-grow overflow-y-auto pr-2">
                                    {formData.selectedModules?.length > 0 ? (
                                        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                            <SortableContext items={formData.selectedModules.map(m => m._id)} strategy={verticalListSortingStrategy}>
                                                {formData.selectedModules.map((module, index) => (
                                                    <SortableModuleItem
                                                        key={module._id}
                                                        module={module}
                                                        index={index}
                                                        onRemove={handleRemoveSelectedModule}
                                                        isNewModule={!initialModuleIds.has(module._id)}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    ) : (
                                        <p className="text-gray-500 italic p-3">Select modules from the right to add them to this section.</p>
                                    )}
                                </div>
                            </div>

                            {/* Right Block: Available Modules */}
                            <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm flex flex-col">
                                <h4 className="text-md font-semibold text-gray-700 mb-4">Available Modules</h4>
                                <div className="md:col-span-2 mb-4">
                                    <div className="flex space-x-4">
                                        {courseData?.contentType === 'course_lesson' && (
                                            <button
                                                type="button"
                                                onClick={() => handleModuleTypeChange('lesson')}
                                                className={`px-6 py-3 rounded-lg font-medium transition-colors ${formData.moduleType === 'lesson' ? 'bg-blue-600 text-white shadow-md cursor-pointer' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer'}`}
                                                disabled={isSubmitting}
                                            >
                                                Lesson Modules
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleModuleTypeChange('quiz')}
                                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${formData.moduleType === 'quiz' ? 'bg-orange-600 text-white shadow-md cursor-pointer' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer'}`}
                                            disabled={isSubmitting}
                                        >
                                            Quiz Modules
                                        </button>
                                    </div>
                                </div>
                                <div className="relative mb-4 flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder={`Search available ${formData.moduleType} modules...`}
                                        value={filterText}
                                        onChange={(e) => setFilterText(e.target.value)}
                                        className="flex-grow px-4 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm text-sm"
                                        disabled={isSubmitting}
                                    />
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <button
                                        type="button"
                                        onClick={handleAddAllModules}
                                        disabled={isSubmitting || modulesToDisplay.length === 0}
                                        className="flex-shrink-0 px-4 py-2 bg-green-500 text-white rounded-lg shadow-sm hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm cursor-pointer"
                                    >
                                        <FastForward size={18} />
                                        <span>Add All ({modulesToDisplay.length})</span>
                                    </button>
                                </div>

                                <div className="space-y-3 flex-grow overflow-y-auto pr-2">
                                    {modulesToDisplay.length > 0 ? (
                                        modulesToDisplay.map(mod => {
                                            const stats = getModuleStats(mod);
                                            return (
                                                <div
                                                    key={mod._id}
                                                    className="flex items-center space-x-2 p-3 bg-white rounded-md shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
                                                    onClick={() => handleSelectModule(mod)}
                                                >
                                                    <div className="flex-grow flex items-center space-x-2">
                                                        {mod.moduleType === 'lesson' ? (
                                                            <BookOpen size={18} className="text-blue-500" />
                                                        ) : (
                                                            stats?.isSAT ? <Layers size={18} className="text-purple-600" /> : <ListChecks size={18} className="text-orange-500" />
                                                        )}
                                                        <span className="text-sm text-gray-700 flex-grow">
                                                            {mod.title || 'Untitled Module'}
                                                            {mod.moduleType === 'quiz' && stats && (
                                                                <span className="text-xs text-gray-500 ml-2">
                                                                    ({stats.isSAT ? 'SAT' : 'Std'} • {stats.count} Qs)
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <PlusCircle size={20} className="text-green-500" />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-center text-gray-500 italic p-3">No published {formData.moduleType} modules found.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-auto">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="btn-cancel px-5 py-2 rounded-md transition duration-200 cursor-pointer"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.selectedModules || formData.selectedModules.length === 0}
                                className="btn-create px-5 py-2 rounded-md transition duration-200 disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? 'Updating...' : 'Save Modules'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AddModulePage;