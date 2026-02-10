// src/components/QuestionBank/AddQuestionForm.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import Modal from '../Modal/Modal';
import UserContext from '../UserContext/UserContext';
import { Editor } from '@tinymce/tinymce-react';
import { Plus, Minus, CheckCircle, XCircle, Trash2 } from 'lucide-react';


const AddQuestionForm = ({ onSave, onCancel }) => {
    const { user } = useContext(UserContext);

    const [formData, setFormData] = useState({
        questionText: '',
        questionType: 'multipleChoice',
        options: [{ optionText: '', isCorrect: false }],
        correctAnswer: '',
        trueFalseAnswer: null,
        feedback: '',
        difficulty: 'medium',
        tags: [],
        category: '',
        status: 'draft',
        createdBy: user?.id || null,
    });
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [errorCategories, setErrorCategories] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user && !formData.createdBy) {
            setFormData(prev => ({ ...prev, createdBy: user.id }));
        }
        const fetchCategories = async () => {
            setLoadingCategories(true);
            setErrorCategories(null);
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories`, { credentials: 'include' });
                if (!response.ok) { throw new Error('Failed to fetch categories.'); }
                const data = await response.json();
                if (data.success) { setCategories(data.data); }
                else { throw new Error(data.message || 'Failed to retrieve categories data.'); }
            } catch (err) {
                console.error('Error fetching categories:', err);
                setErrorCategories('Failed to load categories.');
                alert('Failed to load categories for question creation.');
            } finally { setLoadingCategories(false); }
        };
        fetchCategories();
    }, [user, formData.createdBy]);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));

        if (name === 'questionType') {
            setFormData(prev => ({
                ...prev,
                questionType: value,
                options: value === 'multipleChoice' ? [{ optionText: '', isCorrect: false }] : [],
                correctAnswer: '',    
                trueFalseAnswer: null,
            }));
        }
    }, []);

    const handleEditorChange = useCallback((content, editor) => {
        setFormData(prev => ({ ...prev, questionText: content }));
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
            newOptions[index] = { ...newOptions[index], [field]: value };
            return { ...prev, options: newOptions };
        });
    }, []);

    const handleAddOption = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            options: [...prev.options, { optionText: '', isCorrect: false }]
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


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = { ...formData };
        
        if (payload.questionType === 'multipleChoice') {
            payload.correctAnswer = undefined;    
            payload.trueFalseAnswer = undefined;  
        } else if (payload.questionType === 'trueFalse') {
            payload.options = undefined;          
            payload.correctAnswer = undefined;    
        } else if (['shortAnswer', 'fillInTheBlank'].includes(payload.questionType)) {
            payload.options = undefined;          
            payload.trueFalseAnswer = undefined;  
        }
        
        payload.tags = Array.isArray(payload.tags) ? payload.tags : (typeof payload.tags === 'string' ? payload.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []);

        if (!payload.questionText || payload.questionText.trim() === '<p></p>' || !payload.category || !payload.createdBy) {
            alert("Question text, category, and creator are required.");
            setIsSubmitting(false);
            return;
        }
        if (payload.questionType === 'multipleChoice' && (!payload.options || payload.options.length < 2)) {
            alert("Multiple choice questions require at least 2 options.");
            setIsSubmitting(false);
            return;
        }
        if (payload.questionType === 'multipleChoice' && !payload.options.some(opt => opt.isCorrect)) {
            alert("Multiple choice questions require at least one correct option.");
            setIsSubmitting(false);
            return;
        }
        if (payload.questionType === 'trueFalse' && typeof payload.trueFalseAnswer !== 'boolean') {
            alert("True/False questions require a 'True' or 'False' selection.");
            setIsSubmitting(false);
            return;
        }
        if (['shortAnswer', 'fillInTheBlank'].includes(payload.questionType) && !payload.correctAnswer) {
            alert(`${payload.questionType} questions require a correct answer.`);
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add question.');
            }

            onSave(); 
        } catch (err) {
            console.error('Error adding question:', err);
            alert(err.message || 'Error adding question.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingCategories) { return <Modal onCancel={onCancel} title="Add New Question"><p>Loading categories...</p></Modal>; }
    if (errorCategories) { return <Modal onCancel={onCancel} title="Add New Question"><p className="text-red-500">{errorCategories}</p></Modal>; }

    return (
        <Modal onCancel={onCancel} title="Add New Question">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Question Text --- ADDED ASTERISK --- */}
                <div>
                    <label htmlFor="questionText" className="block text-sm font-medium text-gray-700">
                        Question Text <span className="text-red-500">*</span>
                    </label>
                    <Editor
                        apiKey='dpd6dld04b51jyqhuze4ik03um8y07n98w0bzavbou4on3dm' // <<< IMPORTANT: Replace with your TinyMCE API key
                        value={formData.questionText}
                        onEditorChange={handleEditorChange}
                        init={{
                            height: 200,
                            menubar: false,
                            plugins: [
                                'advlist autolink lists link image charmap print preview anchor',
                                'searchreplace visualblocks code fullscreen',
                                'insertdatetime media table paste code help wordcount'
                            ],
                            toolbar:
                                'undo redo | formatselect | ' +
                                'bold italic forecolor | alignleft aligncenter ' +
                                'alignright alignjustify | bullist numlist outdent indent | ' +
                                'removeformat | help',
                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                        }}
                    />
                </div>

                {/* Question Type --- ADDED ASTERISK --- */}
                <div>
                    <label htmlFor="questionType" className="block text-sm font-medium text-gray-700">
                        Question Type <span className="text-red-500">*</span>
                    </label>
                    <select id="questionType" name="questionType" value={formData.questionType} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                        <option value="multipleChoice">Multiple Choice</option>
                        <option value="trueFalse">True/False</option>
                        <option value="shortAnswer">Short Answer</option>
                        <option value="fillInTheBlank">Fill-in-the-Blank</option>
                    </select>
                </div>

                {/* Category --- ADDED ASTERISK --- */}
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select id="category" name="category" value={formData.category} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                        <option value="">Select a Category</option>
                        {categories.map(cat => ( <option key={cat._id} value={cat._id}>{cat.name}</option> ))}
                    </select>
                </div>

                {/* Difficulty --- ADDED ASTERISK --- */}
                <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                        Difficulty <span className="text-red-500">*</span>
                    </label>
                    <select id="difficulty" name="difficulty" value={formData.difficulty} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>

                {/* Tags (optional - no asterisk) */}
                <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                    <input type="text" id="tags" name="tags" value={formData.tags.join(', ')} onChange={handleTagChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="e.g., algebra, geometry, history" />
                </div>

                {/* Status Field --- ADDED ASTERISK --- */}
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                        Status <span className="text-red-500">*</span>
                    </label>
                    <select id="status" name="status" value={formData.status} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                {/* Options (for multipleChoice) - individual optionText is required */}
                {formData.questionType === 'multipleChoice' && (
                    <div className="space-y-3 border p-4 rounded-md bg-gray-50">
                        <h4 className="text-lg font-semibold text-gray-800">
                            Options <span className="text-red-500 text-sm ml-1">(at least one correct)*</span>
                        </h4>
                        {formData.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <input type="text" value={option.optionText} onChange={(e) => handleOptionChange(index, 'optionText', e.target.value)}
                                    className="flex-grow border border-gray-300 rounded-md shadow-sm p-2" placeholder={`Option ${index + 1}`} required />
                                <label className="flex items-center space-x-1 cursor-pointer">
                                    <input type="checkbox" checked={option.isCorrect} onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                                        className="form-checkbox h-4 w-4 text-green-600 rounded" />
                                    <CheckCircle size={18} className="text-green-600" />
                                    <span>Correct</span>
                                </label>
                                {formData.options.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveOption(index)} className="text-red-600 hover:text-red-800 p-1 rounded-full">
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={handleAddOption} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2">
                            <Plus size={18} /> <span>Add Option</span>
                        </button>
                    </div>
                )}

                {/* Correct Answer (for trueFalse, shortAnswer, fillInTheBlank) - now with asterisks */}
                {formData.questionType === 'trueFalse' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Correct Answer <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1 flex items-center space-x-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="trueFalseAnswer"
                                    value="true"
                                    checked={formData.trueFalseAnswer === true}
                                    onChange={(e) => handleTrueFalseAnswerChange(e.target.value)}
                                    className="form-radio h-4 w-4 text-blue-600"
                                    required
                                />
                                <span className="ml-2 text-gray-700">True</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="trueFalseAnswer"
                                    value="false"
                                    checked={formData.trueFalseAnswer === false}
                                    onChange={(e) => handleTrueFalseAnswerChange(e.target.value)}
                                    className="form-radio h-4 w-4 text-red-600"
                                    required
                                />
                                <span className="ml-2 text-gray-700">False</span>
                            </label>
                        </div>
                    </div>
                )}
                
                {['shortAnswer', 'fillInTheBlank'].includes(formData.questionType) && (
                    <div>
                        <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700">
                            Correct Answer <span className="text-red-500">*</span>
                        </label>
                        <input type="text" id="correctAnswer" name="correctAnswer" value={formData.correctAnswer} onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                    </div>
                )}

                {/* Feedback (Optional - no asterisk) */}
                <div>
                    <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">Feedback (Optional)</label>
                    <textarea id="feedback" name="feedback" value={formData.feedback} onChange={handleChange}
                        rows="2" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
                </div>

                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md transition duration-200">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition duration-200 disabled:opacity-50">
                        {isSubmitting ? 'Adding...' : 'Add Question'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddQuestionForm;