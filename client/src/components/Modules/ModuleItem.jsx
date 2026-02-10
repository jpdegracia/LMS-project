// src/components/ModuleItem.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Video, Image, FileText, Code, HelpCircle, Settings, ListChecks, Edit, Trash2, List, Layers } from 'lucide-react';

const ModuleItem = ({ module, sectionId, onModuleRemoved, hasPermission, courseId, index }) => {
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const canEditModuleDetails = hasPermission('module:update');
    const canDeleteModule = hasPermission('module:delete');
    const canReadLessonContent = hasPermission('lesson_content:read');
    const canManageQuizQuestions = hasPermission('question:update') || hasPermission('question:read');
    const canManageLessonContent = hasPermission('lesson_content:update');

    // --- Helper: Calculate accurate question count ---
    const getQuizStats = (mod) => {
        if (mod.moduleType !== 'quiz') return null;
        
        let count = 0;
        const isSAT = mod.satSettings?.isSAT;

        if (isSAT) {
            // Sum up questions from all strands
            count = mod.satSettings?.strands?.reduce((acc, s) => acc + (s.questions ? s.questions.length : 0), 0) || 0;
        } else {
            // Standard flat list
            count = mod.questions ? mod.questions.length : 0;
        }
        return { count, isSAT };
    };

    const quizStats = getQuizStats(module);

    const handleDeleteModule = async () => {
        if (!canDeleteModule) {
            alert("You don't have permission to remove modules from a section.");
            return;
        }

        const confirmMessage = `Are you sure you want to remove "${module.title || module.moduleType}" from this section? The module will NOT be permanently deleted from your library.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }
        
        try {
            const endpoint = `${BACKEND_URL}/sections/${sectionId}/modules/${module._id}`;
            const response = await fetch(endpoint, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to unlink module.');
            }
            
            // alert('Module successfully unlinked from section!');
            onModuleRemoved();
        } catch (err) {
            console.error('Error unlinking module:', err);
            alert(err.message || 'Error unlinking module.');
        }
    };

    // Updated Display Title Logic
    const moduleDisplayTitle = module.title || (
        module.moduleType === 'lesson'
            ? `Lesson Module (${module.contents ? module.contents.length : 0} parts)`
            : module.moduleType === 'quiz' && quizStats
                ? `Quiz (${quizStats.count} Qs)`
                : `${module.moduleType.charAt(0).toUpperCase() + module.moduleType.slice(1)} Module (No Title)`
    );

    const renderContentPreview = useCallback((contentItem) => {
        if (!contentItem) return <span className="text-red-500 italic">Invalid content item</span>;
        const baseClasses = "flex items-center text-xs text-gray-700 space-x-1";
        const iconSize = 14;
        
        switch (contentItem.type) {
            case 'text':
                const contentHtmlToDisplay = typeof contentItem.contentHTML === 'string' && contentItem.contentHTML.length > 0
                    ? contentItem.contentHTML
                    : 'Empty Text Content';
                return (
                    <span className={`${baseClasses} items-start`}>
                        <BookOpen size={iconSize} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <span className="flex flex-col">
                            <span>Text: {contentItem.title || 'Untitled'}</span>
                            <div className="text-gray-500 text-xs italic mt-0.5 max-h-12 overflow-hidden text-ellipsis" dangerouslySetInnerHTML={{ __html: contentHtmlToDisplay }} />
                        </span>
                    </span>
                );
            case 'video':
                return (<span className={baseClasses}><Video size={iconSize} className="text-red-500" /> <span>Video: {contentItem.title || 'Untitled'}</span></span>);
            case 'image':
                return (<span className={baseClasses}><Image size={iconSize} className="text-green-500" /> <span>Image: {contentItem.title || 'Untitled'}</span></span>);
            case 'document':
                return (<span className={baseClasses}><FileText size={iconSize} className="text-purple-500" /> <span>Doc: {contentItem.title || 'Untitled'}</span></span>);
            case 'interactive':
                return (<span className={baseClasses}><Code size={iconSize} className="text-yellow-500" /> <span>Interactive: {contentItem.title || 'Untitled'}</span></span>);
            default:
                return (<span className={baseClasses}><HelpCircle size={iconSize} className="text-gray-500" /> <span>Unknown Content Type</span></span>);
        }
    }, []);


    const handleManageContentClick = () => {
        if (!module._id) {
            alert("Cannot manage content: Module ID is missing.");
            return;
        }
        if (module.moduleType === 'lesson') {
            navigate(`/manage-lesson-content/${module._id}`);
        } else if (module.moduleType === 'quiz') {
            navigate(`/manage-quiz-questions/${module._id}`);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-300">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span>{(index + 1)}. {module.title || 'Untitled Module'}</span>
                    
                    {/* Module Type Badge */}
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${module.moduleType === 'lesson' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {module.moduleType.toUpperCase()}
                    </span>

                    {/* SAT Badge */}
                    {module.moduleType === 'quiz' && quizStats?.isSAT && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                            <Layers size={10} /> SAT Mode
                        </span>
                    )}
                </h4>
                
                <div className="space-x-2 flex">
                    {/* Manage Content/Questions Button */}
                    {module.moduleType === 'lesson' && canManageLessonContent && (
                        <button
                            onClick={handleManageContentClick}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded-md text-xs transition duration-200 flex items-center space-x-1 cursor-pointer"
                            title="Manage Lesson Content"
                        >
                            <BookOpen size={14} /> <span>Manage Content</span>
                        </button>
                    )}
                    {module.moduleType === 'quiz' && canManageQuizQuestions && (
                        <button
                            onClick={handleManageContentClick}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded-md text-xs transition duration-200 flex items-center space-x-1 cursor-pointer"
                            title="Manage Quiz Questions"
                        >
                            <ListChecks size={14} /> <span>Manage Questions</span>
                        </button>
                    )}

                    {canDeleteModule && (
                        <button
                            onClick={handleDeleteModule}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs transition duration-200 flex items-center space-x-1 cursor-pointer"
                            title="Remove from Section"
                        >
                            <Trash2 size={14} /> <span>Remove</span>
                        </button>
                    )}
                </div>
            </div>

            <p className="text-gray-600 text-sm mb-2">{module.description || 'No description provided for module.'}</p>
            
            {/* Lesson Content Preview */}
            {module.moduleType === 'lesson' && Array.isArray(module.contents) && module.contents.length > 0 && (
                <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium text-gray-700">Contents:</p>
                    {module.contents.map((contentItem, contentIndex) => (
                        <div key={contentItem._id || `lesson-content-${module._id}-${contentIndex}`} className="ml-2 flex items-center space-x-1">
                            {canReadLessonContent ? (
                                <button
                                    onClick={() => { /* Play Lesson Logic (Optional Hook) */ }}
                                    className="text-left w-full hover:bg-gray-100 p-1 rounded transition-colors duration-100"
                                    title={`Play ${contentItem.title || 'Content Item'}`}
                                >
                                    <span className="flex items-center text-xs text-gray-700 space-x-1">
                                        <List size={14} className="text-blue-500" />
                                        <span>{contentItem.title || 'Untitled'}</span>
                                    </span>
                                </button>
                            ) : (
                                <span className="text-left w-full p-1">
                                    <span className="flex items-center text-xs text-gray-700 space-x-1">
                                        <List size={14} className="text-blue-500" />
                                        <span>{contentItem.title || 'Untitled'} (Access Denied)</span>
                                    </span>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {module.moduleType === 'lesson' && (!Array.isArray(module.contents) || module.contents.length === 0) && (
                <p className="text-sm text-gray-500 italic mt-2">No content parts in this lesson module.</p>
            )}
            
            {/* Quiz Info */}
            {module.moduleType === 'quiz' && (
                <div className="text-sm text-gray-600 flex gap-4 mt-2">
                    <p><strong>Total Questions:</strong> {quizStats?.count || 0}</p>
                    <p><strong>Time Limit:</strong> {module.timeLimitMinutes === null ? 'No Limit' : `${module.timeLimitMinutes} mins`}</p>
                </div>
            )}
        </div>
    );
};

export default ModuleItem;