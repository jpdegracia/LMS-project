import React, { useEffect, useState, useCallback, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Clock, Target, List, Layers, ShieldCheck, ChevronLeft, 
    Eye, BookOpen, Lock, Grab, ScanEyeIcon, Info, ListChecks, Infinity 
} from 'lucide-react';
import { Rnd } from 'react-rnd';
import UserContext from '../UserContext/UserContext';
import katex from 'katex'; 
import 'katex/dist/katex.min.css';

// --- UTILITY ---
const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

// --- RENDERERS ---
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
    } catch (e) { /* Silent fallback */ }
    return <div className={className || ''} dangerouslySetInnerHTML={{ __html: renderedHtml }} />;
};

const TitleRenderer = ({ title, fallbackHtml }) => {
    if (title) return <span className="text-gray-800 font-bold truncate">{title}</span>;
    return <KatexRenderer content={fallbackHtml} className="prose prose-sm text-gray-600 truncate max-w-full" />;
};

// --- PREVIEW MODAL ---
const QuestionPreviewModal = ({ question, onClose }) => {
    if (!question) return null;
    const contextContent = question.questionContextRaw || question.questionContextHtml || '';
    const hasContext = contextContent.trim() !== '';

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none font-inter">
            <Rnd
                default={{ x: window.innerWidth / 2 - 450, y: 80, width: 900, height: 600 }}
                minWidth={400} minHeight={300} bounds="window" dragHandleClassName="modal-handle"
                className="pointer-events-auto shadow-2xl" style={{ zIndex: 101 }}
            >
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full w-full overflow-hidden shadow-2xl">
                    <div className="modal-handle flex justify-between items-center p-4 border-b bg-gray-800 cursor-grab active:cursor-grabbing">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Eye size={16}/> Question Preview</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer"><span className="text-2xl">&times;</span></button>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white select-text p-6 gap-6">
                        {hasContext && (
                            <div className="w-full md:w-1/2 overflow-y-auto border-r pr-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Context</h4>
                                <KatexRenderer content={contextContent} className="prose prose-sm" />
                            </div>
                        )}
                        <div className={`overflow-y-auto ${hasContext ? 'w-full md:w-1/2' : 'w-full'}`}>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Question</h4>
                            <KatexRenderer content={question.questionTextHtml || question.questionTextRaw} className="prose max-w-none text-gray-900 mb-4" />
                            {question.options && (
                                <ul className="space-y-2">
                                    {question.options.map((opt, i) => (
                                        <li key={i} className={`p-3 rounded-lg border flex items-center gap-3 text-sm ${opt.isCorrect ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                            <span className="font-bold opacity-50">{String.fromCharCode(65 + i)}</span>
                                            <KatexRenderer content={opt.optionTextRaw || opt.text} />
                                            {opt.isCorrect && <ShieldCheck size={14} className="ml-auto text-green-600" />}
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

// --- MAIN PAGE ---
const ViewQuizPage = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [satCategoryId, setSatCategoryId] = useState(null);
    const [previewQuestion, setPreviewQuestion] = useState(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const fetchResources = useCallback(async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/categories`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                const satCat = json.data?.find(cat => cat.name === 'SAT');
                if (satCat) setSatCategoryId(satCat._id);
            }
        } catch (err) { console.error(err); }
    }, [BACKEND_URL]);

    const fetchQuizData = useCallback(async () => {
        if (!moduleId || moduleId === 'undefined') return;
        try {
            const response = await fetch(`${BACKEND_URL}/modules/${moduleId}`, { credentials: 'include' });
            const result = await response.json();
            if (result.success) setQuiz(result.data);
            else setError(result.message || "Quiz not found.");
        } catch (err) { setError("Failed to connect to server."); }
        finally { setLoading(false); }
    }, [moduleId, BACKEND_URL]);

    useEffect(() => {
        if (hasPermission('quiz:read')) {
            fetchResources();
            fetchQuizData();
        }
    }, [fetchResources, fetchQuizData, hasPermission]);

    const isSATMode = useMemo(() => {
        if (!quiz || !satCategoryId) return false;
        const currentCatId = quiz.categoryId?._id || quiz.categoryId;
        return currentCatId === satCategoryId;
    }, [quiz, satCategoryId]);

    const totalPoints = useMemo(() => {
        if (!quiz) return 0;
        if (isSATMode && quiz.satSettings?.strands?.length > 0) {
            return quiz.satSettings.strands.reduce((acc, s) => 
                acc + (s.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0), 0);
        }
        return quiz.questions?.reduce((acc, q) => acc + (q.points || 0), 0) || 0;
    }, [quiz, isSATMode]);

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center animate-pulse text-purple-600 font-inter font-bold">Loading Preview...</div>;
    if (error) return <div className="min-h-screen bg-white flex items-center justify-center p-10 text-red-500 font-bold">{error}</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-8 font-inter">
            <main className="container-2 mx-auto flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden py-2 h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b bg-white flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-100 rounded-xl text-purple-600"><Eye size={24} /></div>
                        <div className="flex flex-col space-y-2">
                            <h2 className="text-2xl font-bold text-gray-800 leading-tight">{quiz.title}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider italic">
                                    {quiz.subjectId?.name} • {quiz.categoryId?.name}
                                </p>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border h-fit flex-shrink-0 ${
                                    quiz.status === 'published' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                }`}>
                                    {quiz.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => navigate(-1)} className="flex items-center btn-b cursor-pointer gap-2">
                        <ChevronLeft size={18}/> Back
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x overflow-hidden flex-grow">
                    
                    {/* Sidebar */}
                    <aside className="p-6 bg-gray-50/50 space-y-8 overflow-y-auto flex flex-col justify-between h-full">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={14}/> Quiz Stats</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-s">
                                        <span className="text-gray-500 font-medium">Questions :</span>
                                        <span className="font-bold">{isSATMode ? quiz.satSettings?.strands?.reduce((a,b)=>a+(b.questions?.length || 0),0) : quiz.questions?.length || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-s">
                                        <span className="text-gray-500 font-medium">Total Points :</span>
                                        <span className="font-bold text-blue-500">{totalPoints} pts</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Time Limit :</span>
                                        <span className="font-bold text-blue-500">
                                            {quiz.timeLimitMinutes ? (
                                                `${quiz.timeLimitMinutes} minutes`
                                            ) : (
                                                <Infinity size={18} className="inline-block"/>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Info size={14}/> Configuration</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-500 text-s">Navigation</span><span className="font-bold capitalize">{quiz.questionNavigation}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500 text-s">Shuffle Questions</span><span className="font-bold">{quiz.questionShuffle ? 'Yes' : 'No'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500 text-s">Shuffle Options</span><span className="font-bold">{quiz.shuffleOptions ? 'Yes' : 'No'}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3 pt-6 border-t border-gray-200">
                            {hasPermission('module:update') && (
                                <>
                                    <button 
                                        onClick={() => navigate(`/manage-quiz-questions/${moduleId}`)}
                                        className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ListChecks size={18} /> Manage Questions
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/edit-quiz/${moduleId}`)} 
                                        className="w-full py-3 bg-white border border-purple-200 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-50 transition shadow-sm cursor-pointer"
                                    >
                                        Edit Settings
                                    </button>
                                </>
                            )}
                        </div>
                    </aside>

                    {/* Content Area */}
                    <div className="lg:col-span-3 px-6 mt-4 bg-white overflow-y-auto">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4 border-b pb-4 sticky top-0 bg-white z-10">
                            {isSATMode ? <Layers size={18} className="text-purple-600" /> : <List size={18} className="text-purple-600" />}
                            Content Breakdown
                        </h3>

                        <div className="space-y-2">
                            {isSATMode && quiz.satSettings?.strands?.length > 0 ? (
                                quiz.satSettings.strands.map((strand, sIdx) => (
                                    <div key={sIdx} className="mb-6">
                                        <div className="flex items-center gap-2 mb-2 bg-purple-50 p-2 rounded-lg border border-purple-100">
                                            <h4 className="font-bold text-purple-900 text-sm">{strand.strandName || "Unnamed Strand"}</h4>
                                            <span className="text-[9px] font-bold text-purple-400 ml-auto uppercase tracking-tighter">{strand.questions?.length} Questions</span>
                                        </div>
                                        <div className="space-y-1.5 ml-2">
                                            {strand.questions?.map((qObj, qIdx) => (
                                                <QuestionInlineRow key={qIdx} data={qObj} index={qIdx} onPreview={setPreviewQuestion} />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="space-y-1.5">
                                    {quiz.questions?.map((qObj, idx) => (
                                        <QuestionInlineRow key={idx} data={qObj} index={idx} onPreview={setPreviewQuestion} />
                                    ))}
                                    {(!quiz.questions || quiz.questions.length === 0) && (
                                        <div className="text-center py-20 text-gray-400 border-2 border-dashed rounded-xl italic">No questions found.</div>
                                    )}
                                </div>
                            )}
                        </div>
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

// --- ROW ITEM ---
const QuestionInlineRow = ({ data, index, onPreview }) => {
    const q = data.question;
    if (!q) return null;
    return (
        <div className="flex items-center space-x-3 p-2.5 bg-white rounded-lg border w-[900px] border-gray-100 hover:border-purple-300 hover:shadow-sm transition-all group">
            <span className="font-bold text-gray-800 text-xs w-6">{index + 1}.</span>
            <div className="flex-grow flex items-center space-x-3 min-w-0 overflow-hidden text-sm font-medium">
                <BookOpen size={14} className="text-purple-400 flex-shrink-0" />
                <TitleRenderer title={q.questionTitle} fallbackHtml={q.questionTextHtml || q.questionTextRaw} />
            </div>
            <button 
                onClick={() => onPreview(q)} 
                className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50 transition cursor-pointer"
                title="Preview"
            >
                <ScanEyeIcon size={16} />
            </button>
            <span className="text-[9px] font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-200 uppercase whitespace-nowrap">
                {data.points} Pts
            </span>
        </div>
    );
};

export default ViewQuizPage;