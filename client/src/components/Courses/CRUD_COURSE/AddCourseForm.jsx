import React, { useState, useEffect, useCallback, useContext } from 'react';
import Modal from '../../Modal/Modal';
import UserContext from '../../UserContext/UserContext';

const AddCourseForm = ({ onCourseAdded, onCancel }) => {
    const { user } = useContext(UserContext);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [formData, setFormData] = useState({
        category: '',
        contentType: 'course_lesson',
        title: '',
        description: '',
        difficulty: 'beginner',
        thumbnail: '',
        status: 'draft',
        teacher: '',
    });
    
    const [categories, setCategories] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [error, setError] = useState(null); // Consolidated main error state
    const [isSaving, setIsSaving] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const isAdmin = user?.roleNames?.includes('admin');

    // --- Data Fetching ---
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const response = await fetch(`${BACKEND_URL}/categories`, {
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                if (!response.ok) { throw new Error('Failed to fetch categories.'); }
                const data = await response.json();
                if (data.success) { setCategories(data.data); } 
                else { throw new Error(data.message || 'Failed to retrieve categories data.'); }
            } catch (err) {
                console.error('Error fetching categories:', err);
                setError(prev => prev ? `${prev} | Failed to load categories.` : 'Failed to load categories.');
            } finally {
                setLoadingCategories(false);
            }
        };

        const fetchTeachers = async () => {
            if (isAdmin) {
                setLoadingTeachers(true);
                try {
                    const response = await fetch(`${BACKEND_URL}/users/teachers`, { credentials: 'include' });
                    if (!response.ok) { throw new Error('Failed to fetch teachers.'); }
                    const data = await response.json();
                    if (data.success) { setTeachers(data.data); }
                    else { throw new Error(data.message || 'Failed to retrieve teachers data.'); }
                } catch (err) {
                    console.error('Error fetching teachers:', err);
                    setError(prev => prev ? `${prev} | Failed to load teachers.` : 'Failed to load teachers.');
                } finally {
                    setLoadingTeachers(false);
                }
            }
        };

        fetchCategories();
        fetchTeachers();
    }, [user, isAdmin, BACKEND_URL]);
    // --- End Data Fetching ---

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setFormErrors({});

        let errors = {};
        if (!formData.category) errors.category = 'Category is required.';
        if (!formData.title.trim()) errors.title = 'Title is required.';
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setIsSaving(false);
            return;
        }

        const payload = { ...formData };
        if (!isAdmin || !payload.teacher) {
            delete payload.teacher;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create course.');
            }

            alert('Course created successfully!');
            onCourseAdded();
        } catch (err) {
            console.error('Error creating course:', err);
            alert(err.message || 'Error creating course.');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Loading/Error Renders ---
    if (loadingCategories || (isAdmin && loadingTeachers)) {
        // Return a loading state wrapped in a div/p, the outer Modal is handled by the parent
        return <p className="text-center text-blue-600">Loading categories and teachers...</p>;
    }

    if (error) {
        // Return error message if data fetching failed
        return <p className="text-center text-red-500">{error}</p>;
    }
    // --- End Loading/Error Renders ---


    return (
        // NOTE: The outer <Modal> wrapping is now the responsibility of the parent component (CoursesListPage)
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category <span className="text-red-500">*</span>
                </label>
                <select id="category" name="category" value={formData.category} onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                    <option value="">Select a Category</option>
                    {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                </select>
                {formErrors.category && <p className="mt-1 text-xs text-red-600">{formErrors.category}</p>}
            </div>
            
            {/* Assign Teacher (Admin Only) */}
            {isAdmin && (
                <div>
                    <label htmlFor="teacher" className="block text-sm font-medium text-gray-700">
                        Assign Teacher
                    </label>
                    <select id="teacher" name="teacher" value={formData.teacher} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        <option value="">Select a Teacher</option>
                        {teachers.map(teacher => (
                            <option key={teacher._id} value={teacher._id}>
                                {teacher.firstName} {teacher.lastName}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            
            {/* Content Type */}
            <div>
                <label htmlFor="contentType" className="block text-sm font-medium text-gray-700">
                    Content Type <span className="text-red-500">*</span>
                </label>
                <select id="contentType" name="contentType" value={formData.contentType} onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                    <option value="course_lesson">Course Lesson</option>
                    <option value="practice_test">Practice Test</option>
                </select>
            </div>

            {/* Title */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title <span className="text-red-500">*</span>
                </label>
                <input type="text" id="title" name="title" value={formData.title} onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                {formErrors.title && <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>}
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="description" name="description" value={formData.description} onChange={handleChange}
                    rows="3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
            </div>

            {/* Difficulty */}
            <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                    Difficulty <span className="text-red-500">*</span>
                </label>
                <select id="difficulty" name="difficulty" value={formData.difficulty} onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                </select>
            </div>

            {/* Status */}
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Initial Status <span className="text-red-500">*</span>
                </label>
                <select id="status" name="status" value={formData.status} onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Thumbnail */}
            <div>
                <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700">Thumbnail URL (Optional)</label>
                <input type="url" id="thumbnail" name="thumbnail" value={formData.thumbnail} onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>

            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="btn-cancel cursor-pointer">
                    Cancel
                </button>
                <button type="submit" disabled={isSaving} className="btn-create cursor-pointer">
                    {isSaving ? 'Creating...' : 'Create Course'}
                </button>
            </div>
        </form>
    );
};

export default AddCourseForm;