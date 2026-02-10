import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../../components/UserContext/UserContext';
import { ArrowLeft, PlusCircle, Trash2, Search, Grab, FlaskConical, Zap, Loader2 } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Modal from '../Modal/Modal';

const SortableQuizItem = ({ quizItem, index, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: quizItem._id,
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-transparent transition-all duration-200 ease-in-out"
        >
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-purple-600 flex-shrink-0">
                <Grab size={20} />
            </div>
            <span className="font-medium text-gray-800">{index + 1}.</span>
            <div className="flex-grow flex items-center space-x-2">
                <Zap size={18} className="text-orange-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-grow">
                    {quizItem.title}
                </span>
            </div>
            <button
                type="button"
                onClick={() => onRemove(quizItem._id)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                title="Remove quiz from test"
            >
                <Trash2 size={20} />
            </button>
        </div>
    );
};

const ManageTestSectionsPage = () => {
    const { testModuleId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [testModule, setTestModule] = useState(null);
    const [availableQuizzes, setAvailableQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const [filterText, setFilterText] = useState('');

    const fetchResources = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!hasPermission('module:update')) {
                throw new Error("You don't have permission to manage this module.");
            }
            
            const [testRes, quizzesRes] = await Promise.all([
                fetch(`${BACKEND_URL}/modules/${testModuleId}`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/modules?moduleType=quiz`, { credentials: 'include' }),
            ]);

            const testJson = await testRes.json();
            const quizzesJson = await quizzesRes.json();

            console.log("FRONTEND LOG - Received Test Module Data:", testJson.data);
            console.log("FRONTEND LOG - Received Available Quizzes Data:", quizzesJson.data);

            if (!testRes.ok || !testJson.success || testJson.data.moduleType !== 'test') {
                throw new Error(testJson.message || 'Failed to fetch test module or invalid module type.');
            }
            if (!quizzesRes.ok || !quizzesJson.success) {
                throw new Error(quizzesJson.message || 'Failed to fetch quizzes.');
            }

            setTestModule(testJson.data);

            const filteredQuizzes = (quizzesJson.data || []).filter(q => q.moduleType === 'quiz');
            setAvailableQuizzes(filteredQuizzes);

        } catch (err) {
            console.error('Error fetching resources:', err);
            setError(err.message || 'Failed to load data for the form.');
        } finally {
            setLoading(false);
        }
    }, [BACKEND_URL, testModuleId, hasPermission]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]); // <-- Corrected dependency array

    const handleAddQuizToTest = useCallback((quizToAdd) => {
        setTestModule(prev => {
            const isAlreadyAdded = (prev.quizModules || []).some(q => q._id === quizToAdd._id);
            if (!isAlreadyAdded) {
                return {
                    ...prev,
                    quizModules: [...(prev.quizModules || []), quizToAdd]
                };
            }
            return prev;
        });
        setFormErrors(prev => ({ ...prev, quizModules: '' }));
    }, []);

    const handleRemoveQuizFromTest = useCallback((quizIdToRemove) => {
        setTestModule(prev => ({
            ...prev,
            quizModules: (prev.quizModules || []).filter(q => q._id !== quizIdToRemove)
        }));
        setFormErrors(prev => ({ ...prev, quizModules: '' }));
    }, []);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setTestModule((prev) => {
                const oldIndex = prev.quizModules.findIndex(q => q._id === active.id);
                const newIndex = prev.quizModules.findIndex(q => q._id === over.id);
                return { ...prev, quizModules: arrayMove(prev.quizModules, oldIndex, newIndex) };
            });
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage(null);
        setError(null);
        
        if (!testModule.quizModules || testModule.quizModules.length === 0) {
             setFormErrors(prev => ({ ...prev, quizModules: "A test module requires at least one quiz section." }));
             setIsSubmitting(false);
             return;
        }

        const payload = {
            quizModules: (testModule.quizModules || []).map(q => q._id),
        };
        
        try {
            const response = await fetch(`${BACKEND_URL}/modules/${testModuleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update test sections.');
            }
            setSuccessMessage("Test sections updated successfully!");
            
            await fetchResources();

        } catch (err) {
            console.error('Error updating test sections:', err);
            setError(err.message || 'Error updating test sections.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!hasPermission('module:update')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to manage this module.</p>
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

    const selectedQuizIds = (testModule?.quizModules || []).map(q => q._id);
    const quizzesAvailable = availableQuizzes
        .filter(quiz => !selectedQuizIds.includes(quiz._id))
        .filter(quiz => quiz.title.toLowerCase().includes(filterText.toLowerCase()));

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
                            <span>Manage Sections for: {testModule?.title}</span>
                        </h2>
                    </div>
                    {successMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{successMessage}</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5 border-t pt-5 mt-6 border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">Manage Test Sections</h3>
                            {formErrors.quizModules && <p className="mt-2 text-sm text-red-600 mb-5">{formErrors.quizModules}</p>}
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
                                    <h4 className="text-md font-semibold text-gray-700 mb-4">Sections in this Test: ({testModule?.quizModules.length})</h4>
                                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                        {testModule?.quizModules.length > 0 ? (
                                            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                                <SortableContext items={testModule.quizModules.map(q => q._id)} strategy={verticalListSortingStrategy}>
                                                    {testModule.quizModules.map((quiz, index) => (
                                                        <SortableQuizItem
                                                            key={quiz._id}
                                                            quizItem={quiz}
                                                            index={index}
                                                            onRemove={handleRemoveQuizFromTest}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>
                                        ) : (
                                            <p className="text-gray-500 italic p-3">No quizzes added yet. Add some from the right panel.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 p-6 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
                                    <h4 className="text-md font-semibold text-gray-700 mb-4">Available Quizzes: ({quizzesAvailable.length})</h4>
                                    <div className="relative mb-4">
                                        <input
                                            type="text"
                                            placeholder="Filter quizzes by title..."
                                            value={filterText}
                                            onChange={(e) => setFilterText(e.target.value)}
                                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm"
                                        />
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                        {quizzesAvailable.length > 0 ? (
                                            quizzesAvailable.map(quiz => (
                                                <div key={quiz._id} className="flex items-center space-x-2 p-3 bg-white rounded-md shadow-sm">
                                                    <div className="flex-grow flex items-center space-x-2">
                                                        <Zap size={18} className="text-orange-500 flex-shrink-0" />
                                                        <span className="text-sm text-gray-700 flex-grow">{quiz.title}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddQuizToTest(quiz)}
                                                        className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 transition-colors"
                                                        title="Add quiz to test"
                                                    >
                                                        <PlusCircle size={20} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-gray-500 italic p-3">No quizzes available or matching your filter.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => navigate('/module-management')}
                                className="btn-cancel px-5 py-2 rounded-md transition duration-200"
                                disabled={isSubmitting}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-create px-5 py-2 rounded-md transition duration-200 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Sections'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ManageTestSectionsPage;