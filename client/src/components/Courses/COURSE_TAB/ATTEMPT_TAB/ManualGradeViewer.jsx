import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, UserCheck, MessageSquare, Save } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Utility to decode HTML entities (copied from your existing code)
const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

// ⭐️ Teacher Reviewer Component ⭐️
const ManualGradeReviewer = ({ attemptItem, attemptId, itemIndex, maxPoints, onGradeUpdate, onClose }) => {
    
    // attemptItem is the augmented object from the PracticeTestAttemptDetails memoization
    const snapshot = attemptItem.questionSnapshot;
    
    // Initial state setup based on the item's current (ungraded) status
    const [manualScore, setManualScore] = useState(0); // Starts at 0
    const [teacherNotes, setTeacherNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    
    const maxScore = maxPoints || snapshot.pointsPossibleSnapshot || 1; // Fallback to 1 point
    
    const studentAnswerHtml = decodeHtml(attemptItem.userAnswer);
    
    // Logic to get all acceptable answers (from the existing helper logic)
    const acceptableAnswers = snapshot.correctAnswersSnapshot || [];

    // --- Submission Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        
        // Basic validation
        if (manualScore < 0 || manualScore > maxScore) {
            setError(`Score must be between 0 and ${maxScore}.`);
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/quiz-attempts/${attemptId}/review/${itemIndex}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ manualScore, teacherNotes }),
            });

            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to submit manual grade.');
            }

            // Notify parent component to update data and close modal
            onGradeUpdate(data.data); 
            onClose();

        } catch (err) {
            console.error('Manual Grading Error:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b bg-yellow-100 rounded-t-lg">
                    <h2 className="text-xl font-bold text-yellow-800 flex items-center">
                        <UserCheck className="mr-2" /> Manual Grade Review (Q: {attemptItem.quizModuleQuestionIndex})
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900">Close</button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {error && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded">{error}</div>}

                    {/* --- 1. Question Context & Text --- */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Question Prompt</h3>
                        {attemptItem.questionSnapshot?.questionContextHtml && (
                             <div className="text-sm prose max-w-none p-3 mb-2 bg-gray-50 rounded" dangerouslySetInnerHTML={{ __html: decodeHtml(attemptItem.questionSnapshot.questionContextHtml) }} />
                        )}
                        <div className="prose max-w-none text-gray-900 text-base border-l-4 border-yellow-500 pl-3" 
                             dangerouslySetInnerHTML={{ __html: decodeHtml(attemptItem.questionSnapshot.questionTextHtml) }} />
                    </div>

                    {/* --- 2. Student Answer & Acceptable Answers --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                        <div>
                            <h4 className="text-md font-bold text-gray-800 flex items-center">
                                Student's Submission:
                            </h4>
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-base font-mono whitespace-pre-wrap">
                                {studentAnswerHtml || 'No Answer Provided'}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-md font-bold text-gray-800 mb-2">Acceptable Auto-Grade Answers:</h4>
                            {acceptableAnswers.length > 0 ? (
                                <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                                    {acceptableAnswers.map((ans, index) => (
                                        <li key={index} className="text-green-700">
                                            <span dangerouslySetInnerHTML={{ __html: decodeHtml(ans.answerHtml) }} />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-sm italic">No acceptable answers were specified.</p>
                            )}
                        </div>
                    </div>

                    {/* --- 3. Manual Scoring Input --- */}
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                        <h3 className="text-lg font-bold text-yellow-800 mb-3">Assign Score (Max: {maxScore} Points)</h3>
                        <div className="flex items-center space-x-4">
                            <label className="font-medium text-gray-700">Points Awarded:</label>
                            <input
                                type="number"
                                value={manualScore}
                                onChange={(e) => setManualScore(Number(e.target.value))}
                                min="0"
                                max={maxScore}
                                step="0.5"
                                className="w-24 p-2 border border-gray-300 rounded-md focus:border-yellow-600 focus:ring-yellow-600"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setManualScore(maxScore)}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                                Assign Full ({maxScore})
                            </button>
                        </div>

                        <div className="mt-4">
                            <label htmlFor="teacherNotes" className="font-medium text-gray-700 block mb-1">Teacher Notes (Optional Rationale):</label>
                            <textarea
                                id="teacherNotes"
                                value={teacherNotes}
                                onChange={(e) => setTeacherNotes(e.target.value)}
                                rows="3"
                                className="w-full p-2 border border-gray-300 rounded-md"
                                placeholder="Explain why partial or full credit was given."
                            />
                        </div>
                    </div>
                </form>

                {/* --- Footer (Submit Button) --- */}
                <div className="p-4 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-lg">
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
                    >
                        {isSubmitting ? 'Saving...' : 'Finalize Grade & Review'} <Save className="ml-2" size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualGradeReviewer;