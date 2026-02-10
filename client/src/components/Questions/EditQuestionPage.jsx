import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { Plus, Minus, CheckCircle, XCircle, Trash2, ArrowLeft, HelpCircle } from 'lucide-react';
import splitScreen from '../../assets/splitScreen.jpg';


// Help Modal Component (Unchanged)
const HelpModal = ({ isOpen, onClose, imageUrl }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50 font-inter">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 shadow-lg transform transition-all scale-100 ease-out duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Split Screen View</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
                        <XCircle size={24} />
                    </button>
                </div>
                <div className="text-center">
                    <img src={imageUrl} alt="Dual screen quiz view example" className="w-full h-auto max-h-96 rounded-lg shadow-md border border-gray-200 object-contain" />
                    <p className="mt-4 text-sm text-gray-600">This is an example of the split-screen view for questions with a separate context.</p>
                </div>
            </div>
        </div>
    );
};

const EditQuestionPage = () => {
    const { id: questionId } = useParams();
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [questionData, setQuestionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false); 
    const [showHelpModal, setShowHelpModal] = useState(false);

    // 🚀 1. UPDATED STATE: Includes 'questionTitle'
    const [formData, setFormData] = useState({
        questionTitle: '', // 🚀 ADDED: Initial state
        questionTextRaw: '',
        questionType: 'multipleChoice',
        questionContext: '', 
        options: [{ optionTextRaw: '', isCorrect: false }],
        correctAnswers: [], 
        trueFalseAnswer: null,
        numericalAnswer: null, 
        tolerance: 0, 
        feedback: '',
        difficulty: 'medium',
        tags: [],
        subject: '',
        status: 'draft',
        requiresManualGrading: false,
        caseSensitive: false,
    });
    
    const [subjects, setSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [errorSubjects, setErrorSubjects] = useState(null);

    // ... (Katex plugin registration logic - Unchanged)
    const registerKatexPlugin = useCallback(() => {
        if (window.tinymce && !window.tinymce.PluginManager.get('katex')) {
            window.tinymce.PluginManager.add('katex', (editor, url) => {
                const insertKatexEquation = () => {
                    editor.windowManager.open({
                        title: 'Insert KaTeX Equation',
                        body: {
                            type: 'panel',
                            items: [
                                {
                                    type: 'input',
                                    name: 'latexCode',
                                    label: 'LaTeX Code (e.g., \\frac{a}{b})',
                                    placeholder: '\\int_0^1 x^2 dx'
                                }
                            ]
                        },
                        buttons: [
                            { type: 'cancel', text: 'Close' },
                            { type: 'submit', text: 'Save', primary: true }
                        ],
                        onSubmit: (api) => {
                            const data = api.getData();
                            const latex = data.latexCode;
                            const mathElement = ` $${latex}$ `;
                            editor.insertContent(mathElement);
                            api.close();
                        }
                    });
                };

                editor.ui.registry.addButton('katexbutton', {
                    text: 'fx Math',
                    tooltip: 'Insert KaTeX Equation',
                    onAction: insertKatexEquation
                });
            });
        }
    }, []); 

    useEffect(() => {
        const timer = setTimeout(registerKatexPlugin, 100); 
        return () => clearTimeout(timer);
    }, [registerKatexPlugin]);


    // --- DATA FETCHING AND MAPPING (CRITICAL UPDATE) ---
    const fetchQuestionData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/questions/${questionId}`, { credentials: 'include' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success && data.data) {
                const question = data.data;

                setFormData({
                    // 🚀 2. MAPPING: Map questionTitle from fetched data
                    questionTitle: question.questionTitle || '', 
                    questionTextRaw: question.questionTextRaw || '', 
                    questionType: question.questionType,
                    questionContext: question.questionContext || '', 
                    
                    options: question.options?.map(opt => ({
                        optionTextRaw: opt.optionTextRaw || '',
                        isCorrect: opt.isCorrect,
                    })) || [],

                    correctAnswers: question.correctAnswers || [],

                    numericalAnswer: question.numericalAnswer?.answer ?? null,
                    tolerance: question.numericalAnswer?.tolerance ?? 0,
                    
                    trueFalseAnswer: question.trueFalseAnswer ?? null,
                    feedback: question.feedback || '', 
                    difficulty: question.difficulty,
                    tags: question.tags || [],
                    subject: question.subject?._id || question.subject || '', 
                    status: question.status,
                    requiresManualGrading: question.requiresManualGrading || false,
                    caseSensitive: question.caseSensitive || false, 
                });
                setQuestionData(question); 
            } else {
                throw new Error(data.message || "Failed to retrieve question details.");
            }
        } catch (err) {
            setError(err.message || "Failed to load question for editing.");
        } finally {
            setLoading(false);
        }
    }, [questionId, BACKEND_URL]);

    const fetchSubjects = useCallback(async () => {
        setLoadingSubjects(true);
        setErrorSubjects(null);
        try {
            const response = await fetch(`${BACKEND_URL}/subjects`, { credentials: 'include' });
            if (!response.ok) { throw new Error('Failed to fetch subjects.'); }
            const data = await response.json();
            if (data.success) { setSubjects(data.data); } 
            else { throw new Error(data.message || 'Failed to retrieve subjects data.'); }
        } catch (err) {
            setErrorSubjects('Failed to load subjects.');
        } finally { setLoadingSubjects(false); }
    }, [BACKEND_URL]);

    useEffect(() => {
        if (questionId) {
            fetchQuestionData();
            fetchSubjects();
        }
    }, [questionId, fetchQuestionData, fetchSubjects]);

    // 🎯 FIX: Effect to lock 'requiresManualGrading' for Essay type
    useEffect(() => {
        if (formData.questionType === 'essay' && !formData.requiresManualGrading) {
            setFormData(prev => ({ ...prev, requiresManualGrading: true }));
        }
    }, [formData.questionType, formData.requiresManualGrading]);
    
    // --- FORM HANDLERS (Unchanged - already handles questionTitle via generic handleChange) ---
    
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        
        // Handle boolean fields: requiresManualGrading and caseSensitive
        if (name === 'requiresManualGrading' || name === 'caseSensitive') {
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }
        
        // Handler for numerical answer field
        if (name === 'numericalAnswer' || name === 'tolerance') {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'number' ? (value === '' ? null : Number(value)) : value
            }));
            return;
        }
        
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        
        // Type change logic (Only reset fields if the *type is actually changing*)
        if (name === 'questionType' && value !== formData.questionType) {
            const isTextAnswer = value === 'shortAnswer';
            
            setFormData(prev => ({
                ...prev,
                questionType: value,
                options: value === 'multipleChoice' ? [{ optionTextRaw: '', isCorrect: false }] : [],
                
                correctAnswers: isTextAnswer ? [{ answer: '' }] : [], 
                
                numericalAnswer: null, 
                tolerance: 0,
                
                trueFalseAnswer: null,
                
                // Set default for manual grading based on new type
                requiresManualGrading: (value === 'essay' || value === 'shortAnswer'), 
                caseSensitive: false, 
            }));
        }
    }, [formData.questionType]); 

    const handleCorrectAnswerListChange = useCallback((index, value) => {
        setFormData(prev => {
            const newAnswers = [...prev.correctAnswers];
            newAnswers[index] = { answer: value }; 
            return { ...prev, correctAnswers: newAnswers };
        });
    }, []);

    const handleAddCorrectAnswer = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            correctAnswers: [...prev.correctAnswers, { answer: '' }]
        }));
    }, []);

    const handleRemoveCorrectAnswer = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            correctAnswers: prev.correctAnswers.filter((_, i) => i !== index)
        }));
    }, []);
    
    const handleFeedbackChange = useCallback((content) => {
        setFormData(prev => ({ ...prev, feedback: content }));
    }, []);
    
    const handleMainQuestionChange = useCallback((content) => {
        setFormData(prev => ({ ...prev, questionTextRaw: content }));
    }, []);

    const handleQuestionContextChange = useCallback((content) => {
        setFormData(prev => ({ ...prev, questionContext: content }));
    }, []);

    const handleTrueFalseAnswerChange = useCallback((value) => {
        setFormData(prev => ({
            ...prev,
            trueFalseAnswer: value === 'true' ? true : (value === 'false' ? false : null)
        }));
    }, []);

    const handleOptionChange = useCallback((index, field, value) => {
        setFormData(prev => {
            const newOptions = [...prev.options];
            newOptions[index] = { ...newOptions[index], [field === 'optionText' ? 'optionTextRaw' : field]: value };
            return { ...prev, options: newOptions };
        });
    }, []);

    const handleAddOption = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            options: [...prev.options, { optionTextRaw: '', isCorrect: false }]
        }));
    }, []);

    const handleRemoveOption = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }));
    }, []);

    const handleTagChange = useCallback((e) => {
        const tagsString = e.target.value;
        setFormData(prev => ({ ...prev, tags: tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) }));
    }, []);


    // --- SUBMIT LOGIC (CRITICAL PAYLOAD ADJUSTMENT) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const filteredAnswers = formData.correctAnswers
            .filter(ans => ans.answer && ans.answer.trim().length > 0)
            .map(ans => ({ answer: ans.answer }));

        const payload = {
            // 🚀 3. PAYLOAD: Include questionTitle
            questionTitle: formData.questionTitle,
            questionTextRaw: formData.questionTextRaw,
            questionType: formData.questionType,
            questionContext: formData.questionContext,
            feedback: formData.feedback,
            difficulty: formData.difficulty,
            tags: formData.tags,
            subject: formData.subject,
            status: formData.status,
            requiresManualGrading: formData.requiresManualGrading,
            
            // Default to undefined, populated below
            options: undefined,
            correctAnswers: undefined,
            trueFalseAnswer: undefined,
            numericalAnswer: undefined,
            tolerance: undefined,
            caseSensitive: undefined,
        };

        // Ensure subject ID is just the ID string/ObjectId
        if (typeof payload.subject === 'object' && payload.subject !== null) {
            payload.subject = payload.subject._id;
        }
        
        // CRITICAL: Clean up and populate fields based on type
        switch (payload.questionType) {
            case 'multipleChoice':
                payload.options = formData.options;
                payload.requiresManualGrading = false;
                payload.caseSensitive = undefined; 
                break;

            case 'trueFalse':
                payload.trueFalseAnswer = formData.trueFalseAnswer;
                payload.requiresManualGrading = false;
                payload.caseSensitive = undefined; 
                break;

            case 'numerical':
                payload.numericalAnswer = formData.numericalAnswer;
                payload.tolerance = formData.tolerance;
                payload.requiresManualGrading = false; // Enforced auto-grade
                payload.caseSensitive = undefined;
                break;

            case 'shortAnswer':
            case 'essay':
                payload.correctAnswers = filteredAnswers;
                // requiresManualGrading is left as user-defined (or locked true for essay)
                // 🎯 Include caseSensitive in payload for text answers
                payload.caseSensitive = formData.caseSensitive; 
                break;
        }

        // Basic validation check: Add questionTitle check here
        if (!payload.questionTitle || !payload.questionTextRaw || payload.questionTextRaw.trim() === '<p></p>' || !payload.subject) {
            alert("Question title, question text, and subject are required.");
            setIsSubmitting(false);
            return;
        }
        
        // --- FIX: Client-Side Pre-Validation for Auto-Graded Text Answers ---
        const isTextQuestion = payload.questionType === 'shortAnswer' || payload.questionType === 'essay';
        const isAutoGradedText = isTextQuestion && payload.questionType !== 'essay' && !payload.requiresManualGrading;
        
        if (isAutoGradedText && payload.correctAnswers.length === 0) {
            alert("Short Answer questions must have at least one acceptable answer key unless manual grading is explicitly selected.");
            setIsSubmitting(false);
            return;
        }
        // --- END FIX ---

        try {
            const response = await fetch(`${BACKEND_URL}/questions/${questionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error ? 
                                     `Validation Error: ${Object.values(errorData.error).map(e => e.message || e).join(', ')}` :
                                     errorData.message || 'Failed to update question.';
                throw new Error(errorMessage);
            }

            setSuccessMessage(true);
            setTimeout(() => {
                navigate(-1);
            }, 3000);

        } catch (err) {
            console.error('Error updating question:', err);
            alert(err.message || 'Error saving changes.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    // --- Answer Input Renderer (Unchanged) ---
    const renderAnswerInput = () => {
        const type = formData.questionType;
        const isShortAnswer = type === 'shortAnswer';
        const isEssay = type === 'essay';

        // ... (rest of renderAnswerInput logic) ...
        if (type === 'multipleChoice') {
            return (
                <div className="space-y-3 border p-4 rounded-md bg-gray-50">
                    <h4 className="text-lg font-semibold text-gray-800">Options <span className="text-red-500 text-sm ml-1">(at least one correct)*</span></h4>
                    {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <input type="text" value={option.optionTextRaw} onChange={(e) => handleOptionChange(index, 'optionText', e.target.value)} className="flex-grow border border-gray-300 rounded-md shadow-sm p-2" placeholder={`Option ${index + 1}`} required />
                            <label className="flex items-center space-x-1 cursor-pointer">
                                <input type="checkbox" checked={option.isCorrect} onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)} className="form-checkbox h-4 w-4 text-green-600 rounded" />
                                <CheckCircle size={18} className="text-green-600" />
                                <span>Correct</span>
                            </label>
                            {formData.options.length > 1 && (<button type="button" onClick={() => handleRemoveOption(index)} className="text-red-600 hover:text-red-800 p-1 rounded-full"><Trash2 size={20} /></button>)}
                        </div>
                    ))}
                    <button type="button" onClick={handleAddOption} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2">
                        <Plus size={18} /> <span>Add Option</span>
                    </button>
                </div>
            );
        }

        if (type === 'trueFalse') {
            return (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Correct Answer <span className="text-red-500">*</span></label>
                    <div className="mt-2 flex items-center space-x-4">
                        <label className="inline-flex items-center">
                            <input type="radio" name="trueFalse" value="true" checked={formData.trueFalseAnswer === true} onChange={() => handleTrueFalseAnswerChange('true')} className="form-radio h-5 w-5 text-green-600" required />
                            <span className="ml-2 text-gray-700">True</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="trueFalse" value="false" checked={formData.trueFalseAnswer === false} onChange={() => handleTrueFalseAnswerChange('false')} className="form-radio h-5 w-5 text-red-600" required />
                            <span className="ml-2 text-gray-700">False</span>
                        </label>
                    </div>
                </div>
            );
        }
        
        if (type === 'numerical') {
            return (
                <div className="space-y-3 border p-4 rounded-md bg-gray-50">
                    <h4 className="text-lg font-semibold text-gray-800">Numerical Answer Key <span className="text-red-500 text-sm ml-1"> (Required)*</span></h4>
                    
                    <p className="text-sm font-medium text-blue-700">
                        📌 Instruction: Enter the answer as a **decimal or integer**. Do NOT use fractions.
                    </p>
                    <p className="text-xs text-gray-500">
                        Define the exact correct value and the acceptable margin of error (tolerance) for the student's answer.
                    </p>
                    
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Correct Value</label>
                            <input
                                type="number"
                                name="numericalAnswer"
                                value={formData.numericalAnswer === null ? '' : formData.numericalAnswer}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="e.g., 0.75 or 12"
                                step="any"
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Tolerance (<span className="font-mono">+/-</span>)</label>
                            <input
                                type="number"
                                name="tolerance"
                                value={formData.tolerance}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="e.g., 0.1"
                                step="any"
                                min="0"
                                required
                            />
                            <p className='text-xs text-gray-500 mt-1'>Range: <span className="font-semibold">{formData.numericalAnswer === null ? 'N/A' : (formData.numericalAnswer - formData.tolerance).toFixed(3)}</span> to <span className="font-semibold">{formData.numericalAnswer === null ? 'N/A' : (formData.numericalAnswer + formData.tolerance).toFixed(3)}</span></p>
                        </div>
                    </div>
                </div>
            );
        }

        if (isShortAnswer || isEssay) {
            
            const manualGradingIsLocked = isEssay;
            
            // --- Manual Grading Toggle (Available for SA/Essay) ---
            const manualGradingToggle = (
                <label className={`flex items-center space-x-2 p-2 bg-white rounded-md shadow-sm border ${manualGradingIsLocked ? 'border-indigo-200' : 'border-yellow-200'} flex-1 min-w-[280px]`}>
                    <input
                        type="checkbox"
                        name="requiresManualGrading"
                        checked={formData.requiresManualGrading}
                        disabled={manualGradingIsLocked} 
                        onChange={handleChange}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded cursor-pointer"
                    />
                    <span className={`text-sm font-medium ${manualGradingIsLocked ? 'text-red-700' : 'text-gray-700'}`}>
                        Require Manual Grading 
                        <span className='text-gray-500 ml-1'>
                            ({isShortAnswer ? 'Bypasses automated matching' : 'Must be enabled for Essay'})
                        </span>
                        {manualGradingIsLocked && (
                            <span className="text-red-500 ml-2 font-bold">(Locked)</span>
                        )}
                    </span>
                </label>
            );

            // 🎯 NEW: Case Sensitive Checkbox
            const caseSensitiveToggle = (
                <label className="flex items-center space-x-2 p-2 bg-white rounded-md shadow-sm border border-indigo-200 flex-1 min-w-[280px]">
                    <input
                        type="checkbox"
                        name="caseSensitive"
                        checked={formData.caseSensitive}
                        // Only disable if manual grading is required and it's an Essay (where strict case is usually irrelevant/internal)
                        disabled={isEssay && formData.requiresManualGrading} 
                        onChange={handleChange}
                        className="form-checkbox h-5 w-5 text-indigo-600 rounded cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                        <span>Strict Case Matching</span>
                    </span>
                </label>
            );


            // --- Answer List (Only shown for Short Answer if NOT manually graded) ---
            const answerList = isShortAnswer && !formData.requiresManualGrading && (
                <div className="space-y-2 pt-2">
                    <p className="text-xs text-red-500 font-semibold">
                        * This question is set to auto-grade. You must provide at least one acceptable answer.
                    </p>
                    <p className="text-xs text-gray-500">
                        Enter all acceptable text variations (case-insensitive unless strict case is enabled).
                    </p>
                    {formData.correctAnswers.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={item.answer || ''}
                                onChange={(e) => handleCorrectAnswerListChange(index, e.target.value)}
                                className="flex-grow border border-gray-300 bg-white rounded-md shadow-sm p-2"
                                placeholder={`Acceptable Answer ${index + 1}`}
                            />
                            <button type="button" onClick={() => handleRemoveCorrectAnswer(index)} className="text-red-600 hover:text-red-800 p-1 rounded-full">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddCorrectAnswer} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer flex items-center space-x-2">
                        <Plus size={18} /> <span>Add Acceptable Answer</span>
                    </button>
                </div>
            );

            // --- Final Render ---
            return (
                <div className="space-y-3 border p-4 rounded-md w-2/3 bg-gray-100">
                    <h4 className="text-lg font-semibold text-gray-800">
                        {isShortAnswer ? 'Short Answer Key' : 'Essay Key (Internal Notes)'}
                    </h4>
                    
                    {/* 🎯 NEW: Wrap both toggles in a flex container */}
                    <div className="flex flex-wrap gap-4">
                        {manualGradingToggle}
                        {caseSensitiveToggle}
                    </div>

                    {answerList}
                    
                    {isShortAnswer && (
                        <p className="text-xs text-blue-600 pt-2">
                            <strong>Tip for Fill-in-the-Blank:</strong> Use the <code className='bg-blue-100 p-1 rounded'>[BLANK]</code> placeholder in the Question Text.
                        </p>
                    )}
                    
                    {/* Essay Tip */}
                    {isEssay && (
                        <p className="text-xs text-red-600 pt-2">
                            Essay questions are designed for detailed text input and **require manual grading**.
                        </p>
                    )}
                </div>
            );
        }

        return null;
    };
    
    // ... (Loading/Error JSX - Unchanged)
    if (loading || loadingSubjects) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex items-center justify-center">
                <p className="text-xl text-blue-600">Loading question...</p>
            </div>
        );
    }

    if (error || errorSubjects) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter flex flex-col items-center justify-center">
                <p className="text-xl text-red-600 mb-6">Error: {error || errorSubjects}</p>
                <button
                    onClick={handleCancel}
                    className="mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 font-inter">
            <main className="container-2 py-8 bg-white rounded-2xl shadow-xl">
                <div className="flex items-center space-x-3 mb-6 border-b pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 capitalize flex-grow">Edit Question</h1>
                </div>
                
                {successMessage && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <strong className="font-bold">Success!</strong>
                        <span className="block sm:inline ml-2">Question successfully updated.</span>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* --- 🚀 4. NEW FIELD: Question Title (Before Context) --- */}
                    <div className="max-w-2/3">
                        <label 
                            htmlFor="questionTitle" 
                            className="block text-sm font-medium text-gray-700"
                        >Question Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="questionTitle"
                            id="questionTitle"
                            value={formData.questionTitle}
                            onChange={handleChange}
                            required
                            placeholder="e.g., Kinematics: Acceleration in 1D"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    {/* --- Question Context Editor (Following the new Title field) --- */}
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <label htmlFor="questionContext" className="block text-sm font-medium text-gray-700">Question Context (Optional)</label>
                            <button type="button" onClick={() => setShowHelpModal(true)} className="text-blue-500 hover:text-blue-700 transition-colors">
                                <HelpCircle size={14} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-2"><i>Add passages or images for split-view questions.</i></p>
                        <Editor
                            apiKey='dpd6dld04b51jyqhuze4ik03um8y07n98w0bzavbou4on3dm'
                            value={formData.questionContext}
                            onEditorChange={handleQuestionContextChange}
                            init={{
                                height: 200, menubar: false, plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table code help wordcount katex',
                                toolbar: 'undo redo | formatselect | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | katexbutton | removeformat | help',
                                external_plugins: { katex: '/plugins/katex/katex_plugin.js' }, noneditable_class: 'mceNonEditable', extended_valid_elements: 'span[*]',
                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:18px; }',
                            }}
                        />
                    </div>
                    
                    {/* --- Question Text Editor --- */}
                    <div>
                        <label htmlFor="questionTextRaw" className="block text-sm font-medium text-gray-700">Question Text <span className="text-red-500">*</span></label>
                        <Editor
                            apiKey='dpd6dld04b51jyqhuze4ik03um8y07n98w0bzavbou4on3dm'
                            value={formData.questionTextRaw}
                            onEditorChange={handleMainQuestionChange}
                            init={{
                                height: 250, menubar: false, plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table code help wordcount katex',
                                toolbar: 'undo redo | formatselect | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | katexbutton | removeformat | help',
                                external_plugins: { katex: '/plugins/katex/katex_plugin.js' }, noneditable_class: 'mceNonEditable', extended_valid_elements: 'span[*]',
                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:18px; }',
                            }}
                        />
                    </div>
                    
                    {/* --- Question Type (Disabled) --- */}
                    <div>
                        <label htmlFor="questionType" className="block text-sm font-medium text-gray-700">Question Type <span className="text-red-500">*</span></label>
                        <input type="text" name="questionType" value={formData.questionType} className="mt-1 block w-1/3 border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 capitalize" disabled />
                    </div>

                    {/* --- Answer Input Rendering (Conditional on Type) --- */}
                    {renderAnswerInput()}

                    {/* --- Feedback, Subject, Difficulty, Status, Tags (Unchanged) --- */}
                    <div>
                        <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">Feedback/Rationale (Optional)</label>
                        <p className="text-xs text-gray-500 mb-2"><i>This content is shown to the student after they answer.</i></p>
                        <Editor
                            apiKey='dpd6dld04b51jyqhuze4ik03um8y07n98w0bzavbou4on3dm'
                            value={formData.feedback}
                            onEditorChange={handleFeedbackChange}
                            init={{
                                height: 150, menubar: false, plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table code help wordcount katex',
                                toolbar: 'undo redo | formatselect | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | katexbutton | removeformat | help',
                                external_plugins: { katex: '/plugins/katex/katex_plugin.js' }, noneditable_class: 'mceNonEditable', extended_valid_elements: 'span[*]',
                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:16px; }',
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject <span className="text-red-500">*</span></label>
                            <select id="subject" name="subject" value={formData.subject} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                                <option value="">Select a Subject</option>
                                {subjects.map(sub => (<option key={sub._id} value={sub._id}>{sub.name}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">Difficulty <span className="text-red-500">*</span></label>
                            <select id="difficulty" name="difficulty" value={formData.difficulty} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status <span className="text-red-500">*</span></label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                        <input type="text" id="tags" name="tags" value={formData.tags.join(', ')} onChange={handleTagChange} className="mt-1 block min-w-2/3 border border-gray-300 rounded-md shadow-sm p-2" placeholder="e.g., algebra, geometry, history" />
                    </div>

                    <div className="flex justify-end space-x-2 border-t pt-4">
                        <button type="button" onClick={handleCancel} className="btn-cancel cursor-pointer">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-create cursor-pointer">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </main>
            <HelpModal
                isOpen={showHelpModal}
                onClose={() => setShowHelpModal(false)}
                imageUrl={splitScreen}
            />
        </div>
    );
};

export default EditQuestionPage;