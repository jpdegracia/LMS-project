import React, { useState, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import UserContext from '../../UserContext/UserContext';


const AddModulePage = () => {
    const { courseId, sectionId } = useParams(); // Get both courseId and sectionId
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext); // For permission checks, if needed

    const [newModuleData, setNewModuleData] = useState({
        moduleType: 'lesson',
        title: '',
        description: '',
        order: '',
        progressBar: false, // Lesson specific
        content: '',        // Lesson specific (LessonContent _id)
        questionsPerPage: 1, // Quiz specific
        questionNavigation: 'sequence', // Quiz specific
        questionShuffle: false, // Quiz specific
        questions: ''        // Quiz specific (comma-separated Question _ids)
    });
    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const handleAddModule = useCallback(async (e) => {
        e.preventDefault();
        const errors = {};
        if (!newModuleData.title.trim()) errors.title = 'Module title is required.';
        if (!newModuleData.order || isNaN(newModuleData.order) || newModuleData.order < 1) errors.order = 'Order is required and must be a positive number.';
        if (!newModuleData.moduleType) errors.moduleType = 'Module type is required.';

        let payloadQuestions = []; // Will hold the array of question IDs for the payload

        if (newModuleData.moduleType === 'lesson') {
            if (!newModuleData.content.trim()) errors.content = 'Lesson content ID is required.';
        } else if (newModuleData.moduleType === 'quiz') {
            const questionsString = typeof newModuleData.questions === 'string'
                                    ? newModuleData.questions
                                    : '';
            payloadQuestions = questionsString.split(',').map(id => id.trim()).filter(id => id);

            if (payloadQuestions.length === 0) errors.questions = 'At least one question ID is required for a quiz.';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const finalPayload = { ...newModuleData };
            if (newModuleData.moduleType === 'quiz') {
                finalPayload.questions = payloadQuestions; // Assign the parsed array
            }
            
            const response = await fetch(`${BACKEND_URL}/sections/${sectionId}/modules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(finalPayload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || "Failed to add module.");
            }

            setSuccessMessage("Module added successfully!");
            // Optionally reset form or navigate back
            setNewModuleData({
                moduleType: 'lesson', title: '', description: '', order: '',
                progressBar: false, content: '',
                questionsPerPage: 1, questionNavigation: 'sequence', questionShuffle: false, questions: ''
            });
            setFormErrors({});
            setTimeout(() => navigate(`/course-management/${courseId}`), 1500); // Navigate back to CourseBuilder

        } catch (err) {
            console.error("Error adding module:", err);
            setError(err.message || "Failed to add module.");
        } finally {
            setLoading(false);
        }
    }, [newModuleData, courseId, sectionId, navigate, BACKEND_URL]);

    // Check permission (optional, route should ideally be protected)
    if (!hasPermission('module:create')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to create modules.</p>
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
            <main className="container mx-auto px-6 max-w-2xl">
                <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">

                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center pt-10">
                        ADD MODULE FOR Section ID: 
                    </h2>
                    <p className="font-medium font-secondary text-[15px] text-blue-600 text-center">( {sectionId} )</p>

                    {loading && <p className="text-center text-lg text-blue-600">Adding module...</p>}
                    {error && <p className="text-center text-lg text-red-600">{error}</p>}
                    {successMessage && <p className="text-center text-lg text-green-600">{successMessage}</p>}

                    <form onSubmit={handleAddModule} className="space-y-6">
                        <div>
                            <label htmlFor="moduleType" className="block text-lg font-medium text-gray-700 mb-2">Module Type <span className="text-red-500">*</span></label>
                            <select
                                id="moduleType"
                                name="moduleType"
                                value={newModuleData.moduleType}
                                onChange={(e) => {
                                    setNewModuleData({
                                        ...newModuleData,
                                        moduleType: e.target.value,
                                        progressBar: false, content: '', // Reset lesson-specific
                                        questionsPerPage: 1, questionNavigation: 'sequence', questionShuffle: false, questions: '' // Reset quiz-specific
                                    });
                                    setFormErrors(prev => ({ ...prev, moduleType: '' }));
                                }}
                                className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                                disabled={loading}
                            >
                                <option value="lesson">Lesson</option>
                                <option value="quiz">Quiz</option>
                            </select>
                            {formErrors.moduleType && <p className="mt-2 text-sm text-red-600">{formErrors.moduleType}</p>}
                        </div>
                        <div>
                            <label htmlFor="moduleTitle" className="block text-lg font-medium text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="moduleTitle"
                                name="title"
                                value={newModuleData.title}
                                onChange={(e) => { setNewModuleData({ ...newModuleData, title: e.target.value }); setFormErrors(prev => ({ ...prev, title: '' })); }}
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="e.g., Introduction to JSX"
                                disabled={loading}
                            />
                            {formErrors.title && <p className="mt-2 text-sm text-red-600">{formErrors.title}</p>}
                        </div>
                        <div>
                            <label htmlFor="moduleDescription" className="block text-lg font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                id="moduleDescription"
                                name="description"
                                value={newModuleData.description}
                                onChange={(e) => setNewModuleData({ ...newModuleData, description: e.target.value })}
                                rows="2"
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="Brief description of the module"
                                disabled={loading}
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="moduleOrder" className="block text-lg font-medium text-gray-700 mb-2">Order <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                id="moduleOrder"
                                name="order"
                                value={newModuleData.order}
                                onChange={(e) => { setNewModuleData({ ...newModuleData, order: parseInt(e.target.value) }); setFormErrors(prev => ({ ...prev, order: '' })); }}
                                min="1"
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="e.g., 1"
                                disabled={loading}
                            />
                            {formErrors.order && <p className="mt-2 text-sm text-red-600">{formErrors.order}</p>}
                        </div>

                        {/* Discriminator-specific fields */}
                        {newModuleData.moduleType === 'lesson' && (
                            <>
                                <div>
                                    <label htmlFor="lessonContent" className="block text-lg font-medium text-gray-700 mb-2">Lesson Content ID <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        id="lessonContent"
                                        name="content"
                                        value={newModuleData.content}
                                        onChange={(e) => { setNewModuleData({ ...newModuleData, content: e.target.value }); setFormErrors(prev => ({ ...prev, content: '' })); }}
                                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                        placeholder="e.g., 65b7c8d9e0f1a2b3c4d5e6f7"
                                        disabled={loading}
                                    />
                                    <p className="mt-2 text-sm text-gray-500">You'll need to create Lesson Content separately and provide its ID here.</p>
                                    {formErrors.content && <p className="mt-2 text-sm text-red-600">{formErrors.content}</p>}
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="progressBar"
                                        name="progressBar"
                                        checked={newModuleData.progressBar}
                                        onChange={(e) => setNewModuleData({ ...newModuleData, progressBar: e.target.checked })}
                                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        disabled={loading}
                                    />
                                    <label htmlFor="progressBar" className="ml-3 block text-base text-gray-900">Show Progress Bar</label>
                                </div>
                            </>
                        )}

                        {newModuleData.moduleType === 'quiz' && (
                            <>
                                <div>
                                    <label htmlFor="questionsPerPage" className="block text-lg font-medium text-gray-700 mb-2">Questions Per Page</label>
                                    <input
                                        type="number"
                                        id="questionsPerPage"
                                        name="questionsPerPage"
                                        value={newModuleData.questionsPerPage}
                                        onChange={(e) => setNewModuleData({ ...newModuleData, questionsPerPage: parseInt(e.target.value) })}
                                        min="1" max="10"
                                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                        placeholder="e.g., 5"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="questionNavigation" className="block text-lg font-medium text-gray-700 mb-2">Question Navigation</label>
                                    <select
                                        id="questionNavigation"
                                        name="questionNavigation"
                                        value={newModuleData.questionNavigation}
                                        onChange={(e) => setNewModuleData({ ...newModuleData, questionNavigation: e.target.value })}
                                        className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                                        disabled={loading}
                                    >
                                        <option value="sequence">Sequence</option>
                                        <option value="free">Free</option>
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="questionShuffle"
                                        name="questionShuffle"
                                        checked={newModuleData.questionShuffle}
                                        onChange={(e) => setNewModuleData({ ...newModuleData, questionShuffle: e.target.checked })}
                                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        disabled={loading}
                                    />
                                    <label htmlFor="questionShuffle" className="ml-3 block text-base text-gray-900">Shuffle Questions</label>
                                </div>
                                <div>
                                    <label htmlFor="quizQuestions" className="block text-lg font-medium text-gray-700 mb-2">Quiz Question IDs (comma-separated) <span className="text-red-500">*</span></label>
                                    <textarea
                                        id="quizQuestions"
                                        name="questions"
                                        value={newModuleData.questions}
                                        onChange={(e) => { setNewModuleData({ ...newModuleData, questions: e.target.value }); setFormErrors(prev => ({ ...prev, questions: '' })); }}
                                        rows="3"
                                        className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                        placeholder="e.g., ID1, ID2, ID3"
                                        disabled={loading}
                                    ></textarea>
                                    <p className="mt-2 text-sm text-gray-500">Enter comma-separated IDs of questions from your question bank.</p>
                                    {formErrors.questions && <p className="mt-2 text-sm text-red-600">{formErrors.questions}</p>}
                                </div>
                            </>
                        )}

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
                                Add Module
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AddModulePage;
