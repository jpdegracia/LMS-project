import React, { useCallback } from 'react';
import { HelpCircle } from 'lucide-react';

const QuizSettingsForm = ({ formData, handleChange, formErrors, isSubmitting }) => {

    const handleUnlimitedChange = useCallback((e) => {
        const isUnlimited = e.target.checked;
        const newMaxAttempts = isUnlimited ? -1 : 1;
        handleChange({
            target: {
                name: 'maxAttempts',
                value: newMaxAttempts,
                type: 'number'
            }
        });
    }, [handleChange]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                    <label htmlFor="questionsPerPage" className="block text-sm font-medium text-gray-700 mb-1">
                        Questions Per Page <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="questionsPerPage"
                        name="questionsPerPage"
                        value={formData.questionsPerPage || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                        min="1"
                        required
                        disabled={isSubmitting}
                    />
                    {formErrors.questionsPerPage && <p className="mt-1 text-xs text-red-600">{formErrors.questionsPerPage}</p>}
                </div>

                <div>
                    <label htmlFor="questionNavigation" className="block text-sm font-medium text-gray-700 mb-1">
                        Question Navigation
                    </label>
                    <select
                        id="questionNavigation"
                        name="questionNavigation"
                        value={formData.questionNavigation || 'sequence'}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                        disabled={isSubmitting}
                    >
                        <option value="sequence">Sequential</option>
                        <option value="free">Free</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="maxAttempts" className="block text-sm font-medium text-gray-700 mb-1">
                        Max Attempts
                        <span className="ml-1 text-gray-400" title="Check the box for unlimited attempts, or enter a number.">
                            <HelpCircle size={14} />
                        </span>
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="number"
                            id="maxAttempts"
                            name="maxAttempts"
                            value={formData.maxAttempts === -1 ? '' : formData.maxAttempts}
                            onChange={handleChange}
                            disabled={formData.maxAttempts === -1 || isSubmitting}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                            min="1"
                            placeholder="Enter a number"
                        />
                        <div className="flex-shrink-0 flex items-center">
                            <input
                                id="unlimitedAttempts"
                                type="checkbox"
                                checked={formData.maxAttempts === -1}
                                onChange={handleUnlimitedChange}
                                disabled={isSubmitting}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="unlimitedAttempts" className="ml-2 block text-sm text-gray-900">
                                Unlimited
                            </label>
                        </div>
                    </div>
                    {formErrors.maxAttempts && <p className="mt-1 text-xs text-red-600">{formErrors.maxAttempts}</p>}
                </div>

                <div>
                    <label htmlFor="timeLimitMinutes" className="block text-sm font-medium text-gray-700 mb-1">
                        Time Limit (Minutes)
                    </label>
                    <input
                        type="number"
                        id="timeLimitMinutes"
                        name="timeLimitMinutes"
                        value={formData.timeLimitMinutes === null ? '' : formData.timeLimitMinutes}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                        min="0"
                        disabled={isSubmitting}
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave blank for no limit.</p>
                    {formErrors.timeLimitMinutes && <p className="mt-1 text-xs text-red-600">{formErrors.timeLimitMinutes}</p>}
                </div>
                
                {/* ⭐ Conditional field for timer end behavior based on time limit */}
                {formData.timeLimitMinutes > 0 && (
                    <div>
                        <label htmlFor="timerEndBehavior" className="block text-sm font-medium text-gray-700 mb-1">
                            On Timer End
                        </label>
                        <select
                            id="timerEndBehavior"
                            name="timerEndBehavior"
                            value={formData.timerEndBehavior || 'auto-submit'}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                            disabled={isSubmitting}
                        >
                            <option value="auto-submit">Auto-Submit</option>
                            <option value="strict-zero-score">Strict (Zero Score)</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Choose what happens if the time limit is reached.
                        </p>
                    </div>
                )}

                <div>
                    <label htmlFor="passingScorePercentage" className="block text-sm font-medium text-gray-700 mb-1">
                        Passing Score (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="passingScorePercentage"
                        name="passingScorePercentage"
                        value={formData.passingScorePercentage === null ? '' : formData.passingScorePercentage}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                        min="0"
                        max="100"
                        required
                        disabled={isSubmitting}
                    />
                    {formErrors.passingScorePercentage && <p className="mt-1 text-xs text-red-600">{formErrors.passingScorePercentage}</p>}
                </div>

                <div>
                    <label htmlFor="availableFrom" className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
                    <input
                        type="date"
                        id="availableFrom"
                        name="availableFrom"
                        value={formData.availableFrom || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                        disabled={isSubmitting}
                    />
                </div>

                <div>
                    <label htmlFor="availableUntil" className="block text-sm font-medium text-gray-700 mb-1">Available Until</label>
                    <input
                        type="date"
                        id="availableUntil"
                        name="availableUntil"
                        value={formData.availableUntil || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                        disabled={isSubmitting}
                    />
                </div>
            </div>
        </div>
    );
};

export default QuizSettingsForm;