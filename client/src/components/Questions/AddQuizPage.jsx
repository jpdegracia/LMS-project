import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../UserContext/UserContext';
import QuizSettingsForm from './QuizSettingsForm';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircle, Trash2, BookOpen, Search, Grab, ArrowLeft, ChevronLeft, ChevronRight, Layers, ListChecks, Settings2, ScanEyeIcon } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { Rnd } from 'react-rnd';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// --- UTILITY ---
const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

// --- HELPER COMPONENTS (Preview & Rendering) ---

// 1. KaTeX Renderer
const KatexRenderer = ({ content, className }) => {
    if (!content) return null;
    const decodedContent = decodeHtml(content);
    let renderedHtml = decodedContent;

    try {
        renderedHtml = renderedHtml.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
            return katex.renderToString(formula, { throwOnError: false, displayMode: true });
        });
        renderedHtml = renderedHtml.replace(/\$([^$]+)\$/g, (match, formula) => {
            return katex.renderToString(formula, { throwOnError: false, displayMode: false });
        });
    } catch (e) {
        // Silent fail
    }

    return <div className={className || ''} dangerouslySetInnerHTML={{ __html: renderedHtml }} />;
};

// 2. Title Renderer
const TitleRenderer = ({ title, fallbackHtml, maxLength = 70 }) => {
    if (title) {
        return <span className="text-gray-800 font-bold truncate">{title}</span>;
    }
    return <KatexRenderer content={fallbackHtml} className="prose prose-sm text-gray-600 truncate max-w-full" />;
};

// 3. Question Preview Modal
const QuestionPreviewModal = ({ question, onClose }) => {
    if (!question) return null;
    const contextContent = question.questionContextRaw || question.questionContextHtml || '';
    const hasContext = contextContent.trim() !== '';

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <Rnd
                default={{ x: window.innerWidth / 2 - 400, y: 80, width: 900, height: 700 }}
                minWidth={400} minHeight={300} bounds="window" dragHandleClassName="modal-handle"
                className="pointer-events-auto shadow-2xl" style={{ zIndex: 101 }}
            >
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full w-full overflow-hidden shadow-2xl">
                    <div className="modal-handle flex justify-between items-center p-4 border-b bg-gray-800 cursor-grab active:cursor-grabbing">
                        <h3 className="text-lg font-bold text-white">Question Preview</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><span className="text-2xl">&times;</span></button>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white select-text p-6 gap-6">
                        {hasContext && (
                            <div className="w-full md:w-1/2 overflow-y-auto border-r pr-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Context</h4>
                                <KatexRenderer content={contextContent} className="prose prose-sm" />
                            </div>
                        )}
                        <div className={`overflow-y-auto ${hasContext ? 'w-full md:w-1/2' : 'w-full'}`}>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Question</h4>
                            <KatexRenderer content={question.questionTextHtml || question.questionTextRaw} className="prose max-w-none text-gray-900" />
                            {question.questionType === 'multipleChoice' && (
                                <ul className="mt-4 space-y-2">
                                    {question.options?.map((opt, i) => (
                                        <li key={i} className={`p-2 rounded border ${opt.isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                            <KatexRenderer content={opt.optionTextRaw} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </Rnd>
        </div>
    );
};

// --- SortableItem (Standard Quiz) ---
const SortableItem = ({ qItem, index, onRemove, loading, onPreview }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: qItem.question?._id || qItem._id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const questionId = qItem.question?._id || qItem._id;
    const fullQuestion = qItem.question;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-gray-100 hover:border-purple-300 transition-all duration-200"
        >
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-purple-600 flex-shrink-0">
                <Grab size={20} />
            </div>
            <span className="font-medium text-gray-800">{index + 1}.</span>
            <div className="flex-grow flex items-center space-x-2 overflow-hidden">
                <BookOpen size={18} className="text-purple-500 flex-shrink-0" />
                <TitleRenderer title={fullQuestion?.questionTitle} fallbackHtml={fullQuestion?.questionTextHtml} maxLength={60} />
            </div>
            
            {/* Preview Button */}
            <button 
                type="button" 
                onClick={() => onPreview(fullQuestion)} 
                className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50 transition-colors"
                title="Preview"
            >
                <ScanEyeIcon size={18} />
            </button>

            <button
                type="button"
                onClick={() => onRemove(questionId)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                disabled={loading}
                title="Remove"
            >
                <Trash2 size={20} />
            </button>
        </div>
    );
};

const AddQuizPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- FORM STATE ---
    const [formData, setFormData] = useState({
        moduleType: 'quiz',
        title: '',
        description: '',
        subjectId: '',
        categoryId: '',
        questionsPerPage: 1,
        questionNavigation: 'sequence',
        questionShuffle: false,
        shuffleOptions: false,
        questions: [],
        satSettings: { isSAT: false, strands: [] },
        maxAttempts: -1,
        timeLimitMinutes: '',
        passingScorePercentage: 0,
        availableFrom: '',
        availableUntil: '',
        status: 'draft',
        direction: '',
        timerEndBehavior: 'auto-submit',
    });

    // --- UI & DATA STATE ---
    const [questionsBank, setQuestionsBank] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // Preview State
    const [previewQuestion, setPreviewQuestion] = useState(null);

    // --- FILTERING STATE ---
    const [filterText, setFilterText] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [sortOrder, setSortOrder] = useState('default');
    const [currentPageBank, setCurrentPageBank] = useState(1);
    const questionsPerPageBank = 15;
    const [satCategoryId, setSatCategoryId] = useState(null);

    const getCleanPlainText = useCallback((htmlString) => {
        if (!htmlString) return '';
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        return div.textContent || div.innerText || '';
    }, []);

    const fetchResources = useCallback(async () => {
        setLoadingResources(true);
        try {
            const [qRes, sRes, cRes] = await Promise.all([
                fetch(`${BACKEND_URL}/questions`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/subjects`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/categories`, { credentials: 'include' }),
            ]);
            const [qJson, sJson, cJson] = await Promise.all([qRes.json(), sRes.json(), cRes.json()]);

            if (qJson.success) setQuestionsBank(qJson.data.filter(q => q.status === 'published'));
            if (sJson.success) setSubjects(sJson.data);
            if (cJson.success) {
                setCategories(cJson.data);
                const satCat = cJson.data?.find(cat => cat.name === 'SAT');
                if (satCat) setSatCategoryId(satCat._id);
            }
        } catch (err) {
            setError('Failed to load resources.');
        } finally {
            setLoadingResources(false);
        }
    }, [BACKEND_URL]);

    useEffect(() => { fetchResources(); }, [fetchResources]);

    useEffect(() => { setCurrentPageBank(1); }, [filterText, selectedSubject, selectedType, sortOrder]);

    const isSATMode = useMemo(() => formData.categoryId === satCategoryId, [formData.categoryId, satCategoryId]);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            satSettings: { ...prev.satSettings, isSAT: isSATMode }
        }));
    }, [isSATMode]);

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (value === 'true' ? true : value === 'false' ? false : value)
        }));
    };

    // --- STRAND MANAGEMENT (SAT) ---
    const addStrand = () => {
        setFormData(prev => ({
            ...prev,
            satSettings: {
                ...prev.satSettings,
                strands: [...prev.satSettings.strands, { strandName: '', shuffleStrandQuestions: false, questions: [] }]
            }
        }));
    };

    const removeStrand = (index) => {
        setFormData(prev => {
            const newStrands = [...prev.satSettings.strands];
            newStrands.splice(index, 1);
            return { ...prev, satSettings: { ...prev.satSettings, strands: newStrands } };
        });
    };

    const updateStrandField = (index, field, value) => {
        setFormData(prev => {
            const newStrands = [...prev.satSettings.strands];
            newStrands[index][field] = value;
            return { ...prev, satSettings: { ...prev.satSettings, strands: newStrands } };
        });
    };

    const addQuestionToStrand = (strandIndex, questionObj) => {
        setFormData(prev => {
            const newStrands = [...prev.satSettings.strands];
            const exists = newStrands[strandIndex].questions.some(q => (q.question?._id || q._id) === questionObj._id);
            if (!exists) newStrands[strandIndex].questions.push({ question: questionObj, points: 1 });
            return { ...prev, satSettings: { ...prev.satSettings, strands: newStrands } };
        });
    };

    const removeQuestionFromStrand = (strandIndex, questionId) => {
        setFormData(prev => {
            const newStrands = [...prev.satSettings.strands];
            newStrands[strandIndex].questions = newStrands[strandIndex].questions.filter(q => (q.question?._id || q._id) !== questionId);
            return { ...prev, satSettings: { ...prev.satSettings, strands: newStrands } };
        });
    };

    // --- STANDARD QUESTION HANDLERS ---
    const handleAddQuestionToQuiz = (q) => {
        setFormData(prev => {
            if (prev.questions.some(sq => (sq.question?._id || sq._id) === q._id)) return prev;
            return { ...prev, questions: [...prev.questions, { question: q, points: 1 }] };
        });
    };

    const handleRemoveQuestionFromQuiz = (id) => {
        setFormData(prev => ({ ...prev, questions: prev.questions.filter(q => (q.question?._id || q._id) !== id) }));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.questions.findIndex((q) => (q.question?._id || q._id) === active.id);
                const newIndex = prev.questions.findIndex((q) => (q.question?._id || q._id) === over.id);
                return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) };
            });
        }
    };

    // --- FILTERING LOGIC ---
    const allFilteredQuestions = useMemo(() => {
        return questionsBank
            .filter(q => {
                const inStandard = formData.questions.some(sq => (sq.question?._id || sq._id) === q._id);
                const inStrands = formData.satSettings.strands.some(s => s.questions.some(sq => (sq.question?._id || sq._id) === q._id));
                return !inStandard && !inStrands;
            })
            .filter(q => {
                const searchStr = (q.questionTitle || getCleanPlainText(q.questionTextRaw)).toLowerCase();
                return searchStr.includes(filterText.toLowerCase());
            })
            .filter(q => selectedSubject === '' || (q.subject && q.subject._id === selectedSubject))
            .filter(q => selectedType === '' || q.questionType === selectedType)
            .sort((a, b) => {
                const titleA = (a.questionTitle || getCleanPlainText(a.questionTextRaw)).toLowerCase();
                const titleB = (b.questionTitle || getCleanPlainText(b.questionTextRaw)).toLowerCase();
                if (sortOrder === 'title-asc') return titleA.localeCompare(titleB);
                if (sortOrder === 'title-desc') return titleB.localeCompare(titleA);
                return 0;
            });
    }, [questionsBank, formData, filterText, selectedSubject, selectedType, sortOrder, getCleanPlainText]);

    const totalFilteredCountBank = allFilteredQuestions.length;
    const totalPagesBank = Math.ceil(totalFilteredCountBank / questionsPerPageBank);
    const paginatedQuestions = useMemo(() => {
        const start = (currentPageBank - 1) * questionsPerPageBank;
        return allFilteredQuestions.slice(start, start + questionsPerPageBank);
    }, [allFilteredQuestions, currentPageBank]);

    // --- PAGINATION RENDERERS ---
    const renderPaginationButton = (page) => {
        const isCurrent = page === currentPageBank;
        return (
            <button key={page} type="button" onClick={() => setCurrentPageBank(page)} className={`w-8 h-8 rounded-full font-medium transition-colors duration-150 text-sm ${isCurrent ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200'}`} disabled={isSubmitting}>
                {page}
            </button>
        );
    };

    const renderPaginationControls = () => {
        if (totalPagesBank <= 1) return null;
        const pages = [];
        const startPage = Math.max(1, currentPageBank - 1);
        const endPage = Math.min(totalPagesBank, currentPageBank + 1);
        if (startPage > 1) {
            pages.push(renderPaginationButton(1));
            if (startPage > 2) pages.push(<span key="start-ellipsis" className="text-gray-500 font-bold px-1 select-none">...</span>);
        }
        for (let i = startPage; i <= endPage; i++) { pages.push(renderPaginationButton(i)); }
        if (endPage < totalPagesBank) {
            if (endPage < totalPagesBank - 1) pages.push(<span key="end-ellipsis" className="text-gray-500 font-bold px-1 select-none">...</span>);
            pages.push(renderPaginationButton(totalPagesBank));
        }
        return (
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500">{totalFilteredCountBank} total questions</div>
                <div className="flex items-center space-x-1">
                    <button type="button" onClick={() => setCurrentPageBank(prev => Math.max(1, prev - 1))} disabled={currentPageBank === 1 || isSubmitting} className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"><ChevronLeft size={16} /></button>
                    {pages}
                    <button type="button" onClick={() => setCurrentPageBank(prev => Math.min(totalPagesBank, prev + 1))} disabled={currentPageBank === totalPagesBank || isSubmitting} className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
            </div>
        );
    };

    // --- SUBMIT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const errors = {};

        if (!formData.title.trim()) errors.title = "Title is required";
        if (!formData.subjectId) errors.subjectId = "Subject is required";
        if (!formData.categoryId) errors.categoryId = "Category is required";

        if (isSATMode) {
            if (formData.satSettings.strands.length === 0) {
                errors.questions = "SAT Quiz requires at least one strand.";
            } else {
                const hasQuestions = formData.satSettings.strands.some(s => s.questions.length > 0);
                if (!hasQuestions) errors.questions = "SAT Quiz requires at least one question in a strand.";
            }
        } else {
            if (formData.questions.length === 0) errors.questions = "Standard Quiz requires at least one question.";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setIsSubmitting(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const payload = {
            ...formData,
            questionsPerPage: parseInt(formData.questionsPerPage, 10),
            passingScorePercentage: parseInt(formData.passingScorePercentage, 10),
            maxAttempts: formData.maxAttempts === 'unlimited' ? -1 : parseInt(formData.maxAttempts, 10),
            timeLimitMinutes: formData.timeLimitMinutes === '' ? null : parseInt(formData.timeLimitMinutes, 10),
            questions: isSATMode ? [] : formData.questions.map(q => ({ question: q.question?._id || q._id, points: q.points })),
            satSettings: {
                isSAT: isSATMode,
                strands: isSATMode ? formData.satSettings.strands.map(s => ({
                    strandName: s.strandName,
                    shuffleStrandQuestions: s.shuffleStrandQuestions,
                    questions: s.questions.map(q => ({ question: q.question?._id || q._id, points: q.points }))
                })) : []
            }
        };

        try {
            const res = await fetch(`${BACKEND_URL}/modules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok) {
                setSuccessMessage("Quiz Module Created Successfully!");
                setTimeout(() => navigate('/quiz-management'), 1500);
            } else {
                setError(data.message || "Failed to create quiz.");
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            setError(err.message || "An unexpected error occurred.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter text-gray-800">
            <main className="w-full flex-grow flex flex-col bg-white rounded-2xl shadow-xl p-8 md:p-12">
                <div className="flex items-center space-x-4 mb-10 border-b pb-6">
                    <h2 className="text-3xl font-bold">Add New Quiz Module</h2>
                </div>

                {successMessage && <div className="bg-green-100 p-4 rounded-lg mb-6 text-green-700 font-medium border border-green-200">{successMessage}</div>}
                {error && <div className="bg-red-50 p-4 rounded-lg mb-6 text-red-600 font-medium border border-red-100">{error}</div>}
                {formErrors.questions && <div className="bg-red-50 p-4 rounded-lg mb-6 text-red-600 font-medium border border-red-100">{formErrors.questions}</div>}

                <form onSubmit={handleSubmit} className="space-y-10">
                    {/* Basic Info */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-2">Quiz Title <span className='text-red-500'>*</span></label>
                            <input name="title" value={formData.title} onChange={handleChange} className={`w-1/2 border p-3 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none ${formErrors.title ? 'border-red-500' : ''}`} required />
                            {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
                        </div>
                        
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
                            <label className="block text-sm font-bold mb-2">Category <span className='text-red-500'>*</span></label>
                            <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={`w-2/3 border p-3 rounded-lg bg-gray-50 cursor-pointer ${formErrors.categoryId ? 'border-red-500' : ''}`}>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                            {formErrors.categoryId && <p className="text-red-500 text-xs mt-1">{formErrors.categoryId}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Subject <span className='text-red-500'>*</span></label>
                            <select name="subjectId" value={formData.subjectId} onChange={handleChange} className={`w-2/3 border p-3 rounded-lg bg-gray-50 cursor-pointer ${formErrors.subjectId ? 'border-red-500' : ''}`}>
                                <option value="">Select Subject</option>
                                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                            {formErrors.subjectId && <p className="text-red-500 text-xs mt-1">{formErrors.subjectId}</p>}
                        </div>
                    </section>

                    {/* Settings */}
                    <section className="grid grid-cols-1 md:grid-cols-5 gap-1 border-gray-100">
                        <div>
                            <label className="block text-sm font-bold mb-2">Status <span className='text-red-500'>*</span></label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-2/3 border p-2.5 rounded-lg text-sm bg-white cursor-pointer">
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Shuffle Questions</label>
                            <select name="questionShuffle" value={formData.questionShuffle} onChange={handleChange} className="w-2/3 border p-2.5 rounded-lg text-sm bg-white cursor-pointer">
                                <option value={false}>No</option>
                                <option value={true}>Yes</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Shuffle Options</label>
                            <select name="shuffleOptions" value={formData.shuffleOptions} onChange={handleChange} className="w-2/3 border p-2.5 rounded-lg text-sm bg-white cursor-pointer">
                                <option value={false}>No</option>
                                <option value={true}>Yes</option>
                            </select>
                        </div>
                    </section>

                    {/* SAT Conditional */}
                    {isSATMode && (
                        <section className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                            <div className="pt-6 border-t">
                                <label className="block text-sm font-bold mb-3 text-purple-700">Quiz Direction</label>
                                <Editor apiKey='dpd6dld04b51jyqhuze4ik03um8y07n98w0bzavbou4on3dm' value={formData.direction} onEditorChange={(content) => setFormData(p => ({...p, direction: content}))} init={{ height: 250, menubar: false, plugins: ['link', 'image', 'code'], toolbar: 'undo redo | bold italic | link image | code' }} />
                            </div>
                            <div className=" p-6">
                                <h3 className="text-lg font-bold text-purple-800 mb-6 flex items-center gap-2"><Settings2 size={20} /> Advanced Quiz Settings</h3>
                                <QuizSettingsForm formData={formData} handleChange={handleChange} formErrors={formErrors} isSubmitting={isSubmitting} isEditForm={false} />
                            </div>
                        </section>
                    )}

                    {/* Question UI */}
                    <section className="border-t pt-10">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold text-gray-800">{isSATMode ? "Strand Groupings" : "Questions List"}</h3>
                            {isSATMode && (
                                <button type="button" onClick={addStrand} className="bg-purple-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-purple-700 shadow-lg"><Layers size={18} /> Add Strand</button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Selected Questions */}
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 min-h-[500px]">
                                {isSATMode ? (
                                    <div className="space-y-6">
                                        {formData.satSettings.strands.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20 border-2 border-dashed border-gray-200 rounded-xl">
                                                <Layers size={48} className="mb-3 opacity-20" />
                                                <p>No strands added yet. Click "Add Strand" to begin.</p>
                                            </div>
                                        ) : (
                                            formData.satSettings.strands.map((s, idx) => (
                                                <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-purple-500 animate-in zoom-in-95 duration-200">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <input placeholder="Strand Name (e.g. Algebra)" value={s.strandName} onChange={(e) => updateStrandField(idx, 'strandName', e.target.value)} className="flex-grow font-bold border-b focus:border-purple-500 outline-none p-1 transition" />
                                                        <label className="flex items-center gap-1 text-xs font-medium text-gray-500 cursor-pointer"><input type="checkbox" checked={s.shuffleStrandQuestions} onChange={(e) => updateStrandField(idx, 'shuffleStrandQuestions', e.target.checked)} /> Shuffle</label>
                                                        <button type="button" onClick={() => removeStrand(idx)} className="text-red-400 hover:text-red-600 transition cursor-pointer"><Trash2 size={18}/></button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {s.questions.map((q, qIdx) => (
                                                            <div key={qIdx} className="flex justify-between items-center text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 group">
                                                                <div className="flex-grow overflow-hidden pr-2">
                                                                    <TitleRenderer title={q.question?.questionTitle} fallbackHtml={q.question?.questionTextHtml} maxLength={60} />
                                                                </div>
                                                                
                                                                <div className='flex gap-4'>
                                                                    <button type="button" onClick={() => setPreviewQuestion(q.question)} className="text-blue-400 hover:text-blue-600 transition cursor-pointer"><ScanEyeIcon size={14}/></button>
                                                                    <button type="button" onClick={() => removeQuestionFromStrand(idx, q.question?._id || q._id)} className="text-red-400 group-hover:scale-110 transition cursor-pointer"><Trash2 size={14}/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {s.questions.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">No questions. Add from bank.</p>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={formData.questions.map(q => q.question?._id || q._id)} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-3">
                                                {formData.questions.length === 0 ? <p className="text-center text-gray-400 py-20 italic">No questions added yet.</p> : formData.questions.map((q, i) => (
                                                    <SortableItem 
                                                        key={q.question?._id || q._id} 
                                                        qItem={q} index={i} 
                                                        onRemove={handleRemoveQuestionFromQuiz} 
                                                        onPreview={setPreviewQuestion}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>

                            {/* Question Bank */}
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <div className="space-y-4 mb-6">
                                    <div className="relative">
                                        <input placeholder="Search question title or text..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="w-full pl-10 p-3 border rounded-xl shadow-sm bg-white outline-none focus:ring-2 focus:ring-purple-200" />
                                        <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="text-xs border p-2 rounded-lg bg-white cursor-pointer"><option value="">All Subjects</option>{subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select>
                                        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="text-xs border p-2 rounded-lg bg-white cursor-pointer"><option value="">All Types</option><option value="multipleChoice">MCQ</option><option value="trueFalse">T/F</option><option value="shortAnswer">Short</option></select>
                                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="text-xs border p-2 rounded-lg bg-white cursor-pointer"><option value="default">Default</option><option value="title-asc">A-Z</option><option value="title-desc">Z-A</option></select>
                                    </div>
                                </div>

                                <div className="space-y-3 min-h-[300px]">
                                    {paginatedQuestions.map(q => (
                                        <div key={q._id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center text-sm hover:shadow-md transition">
                                            <div className="flex flex-col truncate pr-4 max-w-[70%]">
                                                <TitleRenderer title={q.questionTitle} fallbackHtml={q.questionTextHtml} maxLength={60} />
                                                {/* <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">{q.questionType}</span> */}
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <button type="button" onClick={() => setPreviewQuestion(q)} className="text-purple-400 hover:text-purple-600 transition cursor-pointer"><ScanEyeIcon size={20}/></button>
                                                
                                                {isSATMode ? (
                                                    <select className="border rounded-lg p-1.5 text-xs bg-purple-50 font-bold text-purple-700 outline-none cursor-pointer hover:bg-purple-100 transition" onChange={(e) => { if(e.target.value !== "") addQuestionToStrand(Number(e.target.value), q); e.target.value = ""; }}>
                                                        <option value="">+ Add to...</option>
                                                        {formData.satSettings.strands.map((s, i) => <option key={i} value={i}>{s.strandName || `Strand ${i+1}`}</option>)}
                                                    </select>
                                                ) : (
                                                    <button type="button" onClick={() => handleAddQuestionToQuiz(q)} className="text-green-500 hover:scale-110 transition-transform p-1 cursor-pointer" title="Add to Quiz"><PlusCircle size={26} /></button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {paginatedQuestions.length === 0 && <p className="text-center text-gray-400 text-xs py-10">No questions found matching filters.</p>}
                                </div>
                                {renderPaginationControls()}
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end gap-4 border-t pt-10">
                        <button type="button" onClick={() => navigate(-1)} className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition cursor-pointer">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-10 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-xl disabled:opacity-50 transition active:scale-95 cursor-pointer">{isSubmitting ? 'Creating Module...' : 'Create Quiz Module'}</button>
                    </div>
                </form>
            </main>

            {/* Preview Modal */}
            {previewQuestion && (
                <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
            )}
        </div>
    );
};

export default AddQuizPage;