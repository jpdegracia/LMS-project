import React, { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
import QuizSettingsForm from './QuizSettingsForm';
import { ListChecks, Settings2, ArrowLeft } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';

const EditQuizPage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- FORM STATE ---
    const [formData, setFormData] = useState({
        title: '',
        description: '', // Description state
        subjectId: '',
        categoryId: '',
        status: 'draft',
        
        questionsPerPage: 1,
        questionNavigation: 'sequence',
        questionShuffle: false,
        shuffleOptions: false,
        maxAttempts: -1,
        timeLimitMinutes: '',
        passingScorePercentage: 0,
        availableFrom: '',
        availableUntil: '',
        timerEndBehavior: 'auto-submit',
        
        direction: '',
        
        // Critical: Preserve full object structure
        satSettings: { isSAT: false, strands: [] },
        questions: [] 
    });

    const [subjects, setSubjects] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [satCategoryId, setSatCategoryId] = useState(null);

    // --- 1. FETCH RESOURCES ---
    const fetchResources = useCallback(async () => {
        try {
            const [sRes, cRes] = await Promise.all([
                fetch(`${BACKEND_URL}/subjects`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/categories`, { credentials: 'include' }),
            ]);
            const [sJson, cJson] = await Promise.all([sRes.json(), cRes.json()]);

            if (sJson.success) setSubjects(sJson.data);
            if (cJson.success) {
                setCategories(cJson.data);
                const satCat = cJson.data?.find(cat => cat.name === 'SAT');
                if (satCat) setSatCategoryId(satCat._id);
            }
        } catch (err) {
            setError('Failed to load form resources.');
        }
    }, [BACKEND_URL]);

    // --- 2. FETCH QUIZ DATA ---
    const fetchQuizData = useCallback(async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/modules/${moduleId}`, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                const quiz = data.data;
                setFormData({
                    title: quiz.title || '',
                    description: quiz.description || '', // Map description
                    subjectId: quiz.subjectId?._id || quiz.subjectId || '',
                    categoryId: quiz.categoryId?._id || quiz.categoryId || '',
                    status: quiz.status || 'draft',
                    
                    questionsPerPage: quiz.questionsPerPage || 1,
                    questionNavigation: quiz.questionNavigation || 'sequence',
                    questionShuffle: quiz.questionShuffle || false,
                    shuffleOptions: quiz.shuffleOptions || false,
                    maxAttempts: quiz.maxAttempts,
                    timeLimitMinutes: quiz.timeLimitMinutes,
                    passingScorePercentage: quiz.passingScorePercentage || 0,
                    availableFrom: quiz.availableFrom ? new Date(quiz.availableFrom).toISOString().slice(0, 16) : '',
                    availableUntil: quiz.availableUntil ? new Date(quiz.availableUntil).toISOString().slice(0, 16) : '',
                    timerEndBehavior: quiz.timerEndBehavior || 'auto-submit',
                    
                    direction: quiz.direction || '',
                    
                    satSettings: quiz.satSettings || { isSAT: false, strands: [] },
                    
                    questions: (quiz.questions || []).map(q => ({
                        question: q.question?._id || q._id || q.question,
                        points: q.points
                    }))
                });
            } else {
                throw new Error(data.message || 'Failed to load quiz.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [moduleId, BACKEND_URL]);

    useEffect(() => {
        fetchResources();
        fetchQuizData();
    }, [fetchResources, fetchQuizData]);

    const isSATMode = useMemo(() => formData.categoryId === satCategoryId, [formData.categoryId, satCategoryId]);

    useEffect(() => {
        setFormData(prev => {
            if (prev.satSettings.isSAT === isSATMode) return prev;
            return { ...prev, satSettings: { ...prev.satSettings, isSAT: isSATMode } };
        });
    }, [isSATMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (value === 'true' ? true : value === 'false' ? false : value)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const errors = {};

        if (!formData.title.trim()) errors.title = "Title is required";
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setIsSubmitting(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const payload = {
            title: formData.title,
            description: formData.description, // Include description
            status: formData.status,
            subjectId: formData.subjectId,
            categoryId: formData.categoryId,
            
            questionShuffle: formData.questionShuffle,
            shuffleOptions: formData.shuffleOptions,
            questionsPerPage: parseInt(formData.questionsPerPage, 10),
            passingScorePercentage: parseInt(formData.passingScorePercentage, 10),
            maxAttempts: formData.maxAttempts === 'unlimited' ? -1 : parseInt(formData.maxAttempts, 10),
            timeLimitMinutes: formData.timeLimitMinutes === '' ? null : parseInt(formData.timeLimitMinutes, 10),
            questionNavigation: formData.questionNavigation,
            availableFrom: formData.availableFrom ? new Date(formData.availableFrom) : null,
            availableUntil: formData.availableUntil ? new Date(formData.availableUntil) : null,
            timerEndBehavior: formData.timerEndBehavior,

            direction: isSATMode ? formData.direction : '',
            
            // Preserve existing questions/strands
            questions: isSATMode ? [] : formData.questions,
            satSettings: isSATMode ? {
                isSAT: true,
                strands: formData.satSettings.strands.map(s => ({
                    strandName: s.strandName,
                    shuffleStrandQuestions: s.shuffleStrandQuestions,
                    questions: s.questions.map(q => ({
                        question: q.question?._id || q._id || q.question,
                        points: q.points
                    }))
                }))
            } : { isSAT: false, strands: [] }
        };

        try {
            const res = await fetch(`${BACKEND_URL}/modules/${moduleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok) {
                setSuccessMessage("Quiz Settings Updated!");
                setTimeout(() => navigate('/quiz-management'), 1500);
            } else {
                setError(data.message || "Failed to update quiz.");
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-lg font-medium text-gray-500">Loading settings...</p></div>;
    }

    if (!hasPermission('module:update')) return <div className="p-10 text-center text-red-600">Access Denied</div>;

    return (
        <div className="container-2 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter text-gray-800">
            <main className="w-full flex-grow flex flex-col bg-white rounded-2xl shadow-xl p-8 md:p-12">
                <div className="flex items-center space-x-4 mb-10 border-b pb-6">
                    <ListChecks className="text-purple-600" size={36} />
                    <h2 className="text-3xl font-bold">Edit Quiz Settings</h2>
                </div>

                {successMessage && <div className="bg-green-100 p-4 rounded-lg mb-6 text-green-700 font-medium border border-green-200">{successMessage}</div>}
                {error && <div className="bg-red-50 p-4 rounded-lg mb-6 text-red-600 font-medium border border-red-100">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-10">
                    {/* Basic Info */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-2">Quiz Title <span className='text-red-500'>*</span></label>
                            <input name="title" value={formData.title} onChange={handleChange} className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none ${formErrors.title ? 'border-red-500' : ''}`} required />
                        </div>
                        
                        {/* ⭐ NEW: Description Field */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-2">Description</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none resize-none" 
                                rows={3}
                                placeholder="Enter quiz description..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">Category</label>
                            <select name="categoryId" value={formData.categoryId} disabled className="w-full border p-3 rounded-lg bg-gray-100 cursor-not-allowed">
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Category cannot be changed.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Subject</label>
                            <select name="subjectId" value={formData.subjectId} onChange={handleChange} className="w-full border p-3 rounded-lg bg-white cursor-pointer">
                                <option value="">Select Subject</option>
                                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                    </section>

                    {/* Standard Settings */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                        <div>
                            <label className="block text-sm font-bold mb-2">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm bg-white cursor-pointer">
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Shuffle Questions</label>
                            <select name="questionShuffle" value={formData.questionShuffle} onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm bg-white cursor-pointer">
                                <option value={false}>No</option>
                                <option value={true}>Yes</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Shuffle Options</label>
                            <select name="shuffleOptions" value={formData.shuffleOptions} onChange={handleChange} className="w-full border p-2.5 rounded-lg text-sm bg-white cursor-pointer">
                                <option value={false}>No</option>
                                <option value={true}>Yes</option>
                            </select>
                        </div>
                    </section>

                    {/* SAT Conditional Block */}
                    {isSATMode && (
                        <section className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                            <div className="pt-6 border-t">
                                <label className="block text-sm font-bold mb-3 text-purple-700">Quiz Direction</label>
                                <Editor apiKey='dpd6dld04b51jyqhuze4ik03um8y07n98w0bzavbou4on3dm' value={formData.direction} onEditorChange={(content) => setFormData(p => ({...p, direction: content}))} init={{ height: 250, menubar: false, plugins: ['link', 'image', 'code'], toolbar: 'undo redo | bold italic | link image | code' }} />
                            </div>
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-purple-800 mb-6 flex items-center gap-2"><Settings2 size={20} /> Advanced Quiz Settings</h3>
                                <QuizSettingsForm formData={formData} handleChange={handleChange} formErrors={formErrors} isSubmitting={isSubmitting} isEditForm={true} />
                            </div>
                        </section>
                    )}

                    <div className="flex justify-end gap-4 border-t pt-10"> 
                        <div className="flex gap-4">
                            <button type="button" onClick={() => navigate(-1)} className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition cursor-pointer">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-10 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-xl disabled:opacity-50 transition active:scale-95 cursor-pointer">
                                {isSubmitting ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default EditQuizPage;