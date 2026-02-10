import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, PlusCircle, BookOpen, Search, Grab, ScanEyeIcon, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Rnd } from 'react-rnd';
import UserContext from '../UserContext/UserContext';
import katex from 'katex'; 
import 'katex/dist/katex.min.css'; 

// --- CONSTANTS ---
const ITEMS_PER_PAGE = 20;

const QUESTION_TYPES = [
    { value: 'multipleChoice', label: 'Multiple Choice' },
    { value: 'trueFalse', label: 'True/False' },
    { value: 'shortAnswer', label: 'Short Answer' },
    { value: 'numerical', label: 'Numerical' },
    { value: 'essay', label: 'Essay' },
];

// --- UTILITY ---
const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

// --- COMPONENTS ---

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
        // Silent fail or simple fallback
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

// 3. Sortable Item (Standard)
const SortableItem = ({ qItem, index, onPointsChange, onRemove, loading, onPreview }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: qItem.question?._id || qItem._id,
    });

    const style = { transform: CSS.Transform.toString(transform), transition };
    const questionId = qItem.question?._id || qItem._id;
    const fullQuestion = qItem.question;

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-gray-100 hover:border-purple-300 transition-all">
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-purple-600 flex-shrink-0"><Grab size={20} /></div>
            <span className="font-medium text-gray-800 flex-shrink-0">{index + 1}.</span>
            <div className="flex-grow flex items-center space-x-2 min-w-0 overflow-hidden">
                <BookOpen size={18} className="text-purple-500 flex-shrink-0" />
                <TitleRenderer title={fullQuestion?.questionTitle} fallbackHtml={fullQuestion?.questionTextHtml} maxLength={60} />
            </div>
            
            {/* Preview */}
            {fullQuestion && (
                <button type="button" onClick={() => onPreview(fullQuestion)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50">
                    <ScanEyeIcon size={18} />
                </button>
            )}

            {/* Points */}
            <input 
                type="number" 
                value={qItem.points || ''} 
                onChange={(e) => onPointsChange(questionId, e.target.value)} 
                className="w-14 px-1 py-1 border rounded text-sm text-center" 
                min="0" disabled={loading} 
            />

            {/* Remove */}
            <button type="button" onClick={() => onRemove(questionId)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50" disabled={loading}>
                <Trash2 size={18} />
            </button>
        </div>
    );
};

// 4. Preview Modal
const QuestionPreviewModal = ({ question, onClose }) => {
    if (!question) return null;
    const contextContent = question.questionContextRaw || question.questionContextHtml || '';
    const hasContext = contextContent.trim() !== '';

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <Rnd
                default={{ x: window.innerWidth / 2 - 400, y: 80, width: 1100, height: 700 }}
                minWidth={400} minHeight={300} bounds="window" dragHandleClassName="modal-handle"
                className="pointer-events-auto shadow-2xl" style={{ zIndex: 101 }}
            >
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full w-full overflow-hidden shadow-2xl">
                    <div className="modal-handle flex justify-between items-center p-4 border-b bg-gray-800 cursor-grab active:cursor-grabbing">
                        <h3 className="text-lg font-bold text-white">Question Preview</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer"><span className="text-2xl">&times;</span></button>
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
                                    {question.options.map((opt, i) => (
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


// --- MAIN PAGE COMPONENT ---
const ManageQuizQuestionsPage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Data State
    const [moduleData, setModuleData] = useState(null);
    const [satSettings, setSatSettings] = useState({ isSAT: false, strands: [] });
    
    // UI State
    const [loadingModule, setLoadingModule] = useState(true);
    const [questionsBank, setQuestionsBank] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [previewQuestion, setPreviewQuestion] = useState(null);
    const [errorModule, setErrorModule] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // Filters
    const [filterText, setFilterText] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [sortOrder, setSortOrder] = useState('default');
    const [currentPage, setCurrentPage] = useState(1);

    // --- FETCH DATA ---
    const fetchInitialData = useCallback(async () => {
        setLoadingModule(true);
        try {
            const [modRes, qRes, subRes] = await Promise.all([
                fetch(`${BACKEND_URL}/modules/${moduleId}`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/questions`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/subjects`, { credentials: 'include' })
            ]);

            const modData = await modRes.json();
            const qData = await qRes.json();
            const subData = await subRes.json();

            if (modData.success) {
                setModuleData(modData.data);
                if (modData.data.satSettings?.isSAT) {
                    setSatSettings(modData.data.satSettings);
                }
            }
            if (qData.success) setQuestionsBank(qData.data.filter(q => q.status === 'published'));
            if (subData.success) setSubjects(subData.data);

        } catch (err) {
            setErrorModule("Failed to load data.");
        } finally {
            setLoadingModule(false);
        }
    }, [moduleId, BACKEND_URL]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
    useEffect(() => { setCurrentPage(1); }, [filterText, selectedSubject, selectedType, sortOrder]);

    const isSATMode = satSettings.isSAT;

    // --- STRAND HANDLERS (SAT) ---
    const addStrand = () => {
        setSatSettings(prev => ({
            ...prev,
            strands: [...prev.strands, { strandName: '', shuffleStrandQuestions: false, questions: [] }]
        }));
    };

    const removeStrand = (index) => {
        setSatSettings(prev => {
            const newStrands = [...prev.strands];
            newStrands.splice(index, 1);
            return { ...prev, strands: newStrands };
        });
    };

    const updateStrandField = (index, field, value) => {
        setSatSettings(prev => {
            const newStrands = [...prev.strands];
            newStrands[index][field] = value;
            return { ...prev, strands: newStrands };
        });
    };

    const addQuestionToStrand = (strandIndex, questionObj) => {
        setSatSettings(prev => {
            const newStrands = [...prev.strands];
            const exists = newStrands[strandIndex].questions.some(q => (q.question?._id || q._id) === questionObj._id);
            if (!exists) {
                newStrands[strandIndex].questions.push({ question: questionObj, points: 1 });
            }
            return { ...prev, strands: newStrands };
        });
    };

    const removeQuestionFromStrand = (strandIndex, questionId) => {
        setSatSettings(prev => {
            const newStrands = [...prev.strands];
            newStrands[strandIndex].questions = newStrands[strandIndex].questions.filter(q => (q.question?._id || q._id) !== questionId);
            return { ...prev, strands: newStrands };
        });
    };

    // --- STANDARD HANDLERS ---
    const handleAddQuestionToQuiz = (questionToAdd) => {
        setModuleData(prev => {
            if (prev.questions.some(q => (q.question?._id || q._id) === questionToAdd._id)) return prev;
            return { ...prev, questions: [...prev.questions, { question: questionToAdd, points: 1 }] };
        });
    };

    const handleRemoveQuestionFromQuiz = (id) => {
        setModuleData(prev => ({ ...prev, questions: prev.questions.filter(q => (q.question?._id || q._id) !== id) }));
    };

    const handleQuestionPointsChange = (id, points) => {
        setModuleData(prev => ({
            ...prev,
            questions: prev.questions.map(q => (q.question?._id || q._id) === id ? { ...q, points: parseInt(points) || 0 } : q)
        }));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setModuleData(prev => {
                const oldIndex = prev.questions.findIndex(q => (q.question?._id || q._id) === active.id);
                const newIndex = prev.questions.findIndex(q => (q.question?._id || q._id) === over.id);
                return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) };
            });
        }
    };

    // --- FILTER LOGIC ---
    const getCleanText = (q) => q.questionTitle || decodeHtml(q.questionTextRaw);

    const filteredQuestions = useMemo(() => {
        return questionsBank.filter(q => {
            const inStandard = (moduleData?.questions || []).some(sq => (sq.question?._id || sq._id) === q._id);
            const inStrands = satSettings.strands.some(s => s.questions.some(sq => (sq.question?._id || sq._id) === q._id));
            if (isSATMode) return !inStrands;
            return !inStandard;
        }).filter(q => {
            const text = getCleanText(q).toLowerCase();
            return text.includes(filterText.toLowerCase());
        }).filter(q => 
            (selectedSubject === '' || q.subject?._id === selectedSubject) &&
            (selectedType === '' || q.questionType === selectedType)
        ).sort((a, b) => {
            const tA = getCleanText(a).toLowerCase();
            const tB = getCleanText(b).toLowerCase();
            if (sortOrder === 'title-asc') return tA.localeCompare(tB);
            if (sortOrder === 'title-desc') return tB.localeCompare(tA);
            return 0;
        });
    }, [questionsBank, moduleData, satSettings, isSATMode, filterText, selectedSubject, selectedType, sortOrder]);

    const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);

    // --- SAVE LOGIC ---
    const handleSave = async (e) => {
        e.preventDefault();
        setLoadingModule(true);
        const payload = {};
        
        if (isSATMode) {
            payload.satSettings = {
                isSAT: true,
                strands: satSettings.strands.map(s => ({
                    strandName: s.strandName,
                    shuffleStrandQuestions: s.shuffleStrandQuestions,
                    questions: s.questions.map(q => ({
                        question: q.question?._id || q._id,
                        points: q.points || 1
                    }))
                }))
            };
            payload.questions = []; 
        } else {
            payload.questions = moduleData.questions.map(q => ({
                question: q.question?._id || q._id,
                points: q.points || 1
            }));
            payload.satSettings = { isSAT: false, strands: [] };
        }

        try {
            const res = await fetch(`${BACKEND_URL}/modules/${moduleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage("Questions updated successfully!");
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                throw new Error(data.message || "Failed to update.");
            }
        } catch (err) {
            setErrorModule(err.message);
        } finally {
            setLoadingModule(false);
        }
    };

    // --- PAGINATION COMPONENT (Reformatted) ---
    const renderPaginationButton = (page) => {
        const isCurrent = page === currentPage;
        return (
            <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-full font-medium transition-colors duration-150 text-sm ${isCurrent ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                disabled={loadingModule}
            >
                {page}
            </button>
        );
    };

    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        const pages = [];
        const startPage = Math.max(1, currentPage - 1);
        const endPage = Math.min(totalPages, currentPage + 1);

        if (startPage > 1) {
            pages.push(renderPaginationButton(1));
            if (startPage > 2) pages.push(<span key="start-ellipsis" className="text-gray-500 font-bold px-1 select-none">...</span>);
        }
        for (let i = startPage; i <= endPage; i++) { pages.push(renderPaginationButton(i)); }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pages.push(<span key="end-ellipsis" className="text-gray-500 font-bold px-1 select-none">...</span>);
            pages.push(renderPaginationButton(totalPages));
        }

        return (
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">{filteredQuestions.length} Questions</span>
                <div className="flex items-center space-x-1">
                    <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || loadingModule}
                        className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    {pages}
                    <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || loadingModule}
                        className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    if (loadingModule) return <div className="p-10 text-center text-blue-600 font-medium">Loading questions...</div>;
    if (!hasPermission('question:update')) return <div className="p-10 text-center text-red-500">Access Denied</div>;

    return (
        <div className="container-4 flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-inter min-h-screen">
            <main className="w-full flex-grow flex flex-col">
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 flex flex-col flex-grow">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 border-b pb-4 gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800">Manage Questions: <span className='text-purple-700'>{moduleData?.title}</span></h2>
                            <p className="text-sm text-gray-500 mt-1 flex items-center">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${isSATMode ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {isSATMode ? "SAT Mode" : "Standard Mode"}
                                </span>
                            </p>
                        </div>
                        
                    </div>

                    {successMessage && <div className="bg-green-100 text-green-700 p-3 rounded mb-6 text-center border border-green-200">{successMessage}</div>}
                    {errorModule && <div className="bg-red-100 text-red-700 p-3 rounded mb-6 text-center border border-red-200">{errorModule}</div>}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow">
                        
                        {/* LEFT COLUMN: Active Questions/Strands */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col h-[1000px]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-gray-700">Selected Questions</h3>
                                {isSATMode && (
                                    <button onClick={addStrand} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-700 shadow-sm transition cursor-pointer">
                                        <Layers size={14} /> Add Strand
                                    </button>
                                )}
                            </div>

                            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                                {isSATMode ? (
                                    // SAT STRANDS VIEW
                                    satSettings.strands.length === 0 ? (
                                        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center h-full">
                                            <Layers size={32} className="mb-2 opacity-30"/>
                                            <p>No strands created yet.</p>
                                            <p className="text-xs">Click "Add Strand" to begin.</p>
                                        </div>
                                    ) : (
                                        satSettings.strands.map((s, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500 animate-in zoom-in-95 duration-200">
                                                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
                                                    <input 
                                                        value={s.strandName} 
                                                        onChange={(e) => updateStrandField(idx, 'strandName', e.target.value)} 
                                                        placeholder="Strand Name (e.g. Reading)"
                                                        className="flex-grow font-bold text-gray-800 border-b border-transparent focus:border-purple-300 outline-none transition"
                                                    />
                                                    <label className="text-xs flex items-center gap-1 text-gray-500 cursor-pointer hover:text-purple-600">
                                                        <input type="checkbox" checked={s.shuffleStrandQuestions} onChange={(e) => updateStrandField(idx, 'shuffleStrandQuestions', e.target.checked)} /> Shuffle
                                                    </label>
                                                    <button onClick={() => removeStrand(idx)} className="text-red-400 hover:text-red-600 transition cursor-pointer"><Trash2 size={16}/></button>
                                                </div>
                                                <div className="space-y-2 pl-1">
                                                    {s.questions.map((q, qIdx) => (
                                                        <div key={qIdx} className="flex justify-between items-center text-xs bg-gray-50 p-2.5 rounded border border-gray-100 hover:border-purple-200 transition group">
                                                            <div className="truncate max-w-[80%] pr-2">
                                                                <TitleRenderer title={q.question?.questionTitle} fallbackHtml={q.question?.questionTextHtml} maxLength={45} />
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <button onClick={() => setPreviewQuestion(q.question)} className="text-blue-400 hover:text-blue-600 cursor-pointer"><ScanEyeIcon size={16}/></button>
                                                                <button onClick={() => removeQuestionFromStrand(idx, q.question?._id || q._id)} className="text-red-400 hover:text-red-600 group-hover:scale-110 transition cursor-pointer"><Trash2 size={16}/></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {s.questions.length === 0 && <div className="text-xs italic text-gray-400 text-center py-4 bg-gray-50 rounded border border-dashed">Empty Strand</div>}
                                                </div>
                                            </div>
                                        ))
                                    )
                                ) : (
                                    // STANDARD SORTABLE LIST
                                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={(moduleData?.questions || []).map(q => q.question?._id || q._id)} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-3">
                                                {(moduleData?.questions || []).map((q, i) => (
                                                    <SortableItem 
                                                        key={q.question?._id || q._id} 
                                                        qItem={q} index={i} 
                                                        onPointsChange={handleQuestionPointsChange}
                                                        onRemove={handleRemoveQuestionFromQuiz}
                                                        onPreview={setPreviewQuestion}
                                                    />
                                                ))}
                                                {(!moduleData?.questions || moduleData.questions.length === 0) && (
                                                    <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                                                        <p>No questions added.</p>
                                                        <p className="text-xs">Select questions from the bank.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Question Bank */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col h-[1000px]">
                            <h3 className="font-bold text-lg text-gray-700 mb-4">Question Bank</h3>
                            
                            {/* Search & Filter */}
                            <div className="space-y-3 mb-4">
                                <div className="relative">
                                    <input 
                                        placeholder="Search..." 
                                        value={filterText} 
                                        onChange={(e) => setFilterText(e.target.value)} 
                                        className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                                    />
                                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                </div>
                                <div className="flex gap-2">
                                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-1/3 p-2 border rounded text-xs bg-white cursor-pointer">
                                        <option value="">All Subjects</option>
                                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                    <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="w-1/3 p-2 border rounded text-xs bg-white cursor-pointer">
                                        <option value="">All Types</option>
                                        <option value="multipleChoice">MCQ</option>
                                        <option value="trueFalse">T/F</option>
                                        <option value="shortAnswer">Short</option>
                                        <option value="numerical">Numerical</option>
                                        <option value="essay">Essay</option>
                                    </select>
                                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-1/3 p-2 border rounded text-xs bg-white cursor-pointer">
                                        <option value="default">Default Sort</option>
                                        <option value="title-asc">A-Z</option>
                                    </select>
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                                {paginatedQuestions.map(q => (
                                    <div key={q._id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center hover:border-purple-200 transition hover:shadow-md">
                                        <div className="truncate max-w-[65%]">
                                            <TitleRenderer title={q.questionTitle} fallbackHtml={q.questionTextHtml} />
                                            <div className="text-[10px] text-gray-400 uppercase mt-1 font-semibold">{q.questionType}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setPreviewQuestion(q)} className="text-gray-400 hover:text-blue-500 transition cursor-pointer"><ScanEyeIcon size={18}/></button>
                                            
                                            {isSATMode ? (
                                                <select 
                                                    className="w-28 text-[10px] p-1.5 border rounded bg-purple-50 text-purple-700 font-bold focus:ring-2 focus:ring-purple-200 outline-none cursor-pointer"
                                                    value=""
                                                    onChange={(e) => { 
                                                        if(e.target.value !== "") addQuestionToStrand(Number(e.target.value), q);
                                                    }}
                                                >
                                                    <option value="" disabled>+ Add to...</option>
                                                    {satSettings.strands.map((s, i) => (
                                                        <option key={i} value={i}>{s.strandName || `Strand ${i+1}`}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <button onClick={() => handleAddQuestionToQuiz(q)} className="text-green-500 hover:scale-110 transition p-1"><PlusCircle size={24}/></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {paginatedQuestions.length === 0 && <p className="text-center text-gray-400 text-sm mt-20 italic">No matching questions found.</p>}
                            </div>

                            {/* Pagination Controls */}
                            <PaginationControls />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
                        <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-semibold transition cursor-pointer">Cancel</button>
                        <button onClick={handleSave} className="px-8 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 font-semibold transition active:scale-95 cursor-pointer">Save Changes</button>
                    </div>

                </div>
            </main>

            {/* Modal */}
            {previewQuestion && (
                <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
            )}
        </div>
    );
};

export default ManageQuizQuestionsPage;