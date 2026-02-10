import React, { useState, useEffect, useContext } from 'react';
import Modal from '../../Modal/Modal';
import UserContext from '../../UserContext/UserContext';

const EditCourseForm = ({ course, onSave, onCancel }) => {
    // Access the user context to get the current user's role
    const { user } = useContext(UserContext);

    // Check if the user is an admin. Assumes user.roles is an array of objects.
    const isAdmin = user?.roles?.some(role => role.name === 'admin');

    // State to hold form data, initialized with the current course's values
    const [formData, setFormData] = useState({
        title: course.title,
        description: course.description,
        category: course.category ? course.category._id : '',
        difficulty: course.difficulty,
        thumbnail: course.thumbnail,
        contentType: course.contentType,
        status: course.status,
        // Initialize the teacher field.
        // If the course has a teacher, use their _id. Otherwise, an empty string.
        teacher: course.teacher ? course.teacher._id : '',
    });

    // State for fetching categories and teachers
    const [categories, setCategories] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [errorCategories, setErrorCategories] = useState(null);
    const [errorTeachers, setErrorTeachers] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // UseEffect to fetch initial data: categories and teachers (if admin)
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/categories`, {
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch categories.');
                }
                const data = await response.json();
                if (data.success) {
                    setCategories(data.data);
                } else {
                    throw new Error(data.message || 'Failed to retrieve categories data.');
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
                setErrorCategories('Failed to load categories.');
            } finally {
                setLoadingCategories(false);
            }
        };

        const fetchTeachers = async () => {
            // Only fetch the list of teachers if the current user is an admin
            if (isAdmin) {
                setLoadingTeachers(true);
                try {
                    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/teachers`, {
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                    });
                    if (!response.ok) {
                        throw new Error('Failed to fetch teachers.');
                    }
                    const data = await response.json();
                    if (data.success) {
                        setTeachers(data.data);
                    } else {
                        throw new Error(data.message || 'Failed to retrieve teachers data.');
                    }
                } catch (err) {
                    console.error('Error fetching teachers:', err);
                    setErrorTeachers('Failed to load teachers.');
                } finally {
                    setLoadingTeachers(false);
                }
            }
        };

        fetchCategories();
        fetchTeachers();
    }, [isAdmin]); // Re-run effect if admin status changes

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const payload = { ...formData };
        
        // This check is the crucial part for controlling the payload
        // The condition `!isAdmin` is the key.
        if (!isAdmin) {
            delete payload.teacher;
        }

        // --- ADD THIS LINE TO DEBUG THE PAYLOAD ---
        console.log('Payload being sent:', payload);

        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses/${course._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update course.');
        }

        const updatedCourseData = await response.json();
        onSave(updatedCourseData.data);
        
    } catch (err) {
        console.error('Error updating course:', err);
        alert(err.message || 'Error updating course.');
    } finally {
        setIsSaving(false);
    }
};
    // Conditional rendering for loading and error states
    if (loadingCategories || (isAdmin && loadingTeachers)) {
        return <Modal onCancel={onCancel} title="Edit Course"><p>Loading...</p></Modal>;
    }
    if (errorCategories || errorTeachers) {
        return <Modal onCancel={onCancel} title="Edit Course"><p className="text-red-500">{errorCategories || errorTeachers}</p></Modal>;
    }

    return (
        <Modal onCancel={onCancel} title="Edit Course">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Conditionally render the teacher dropdown for admins only */}
                {isAdmin && (
                    <div>
                        <label htmlFor="teacher" className="block text-sm font-medium text-gray-700">Assign Teacher</label>
                        <select
                            id="teacher"
                            name="teacher"
                            value={formData.teacher}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                            <option value="">Select a Teacher</option>
                            {teachers.map(teacher => (
                                <option key={teacher._id} value={teacher._id}>
                                    {teacher.firstName} {teacher.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {/* Other form fields */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange}
                        rows="3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
                </div>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        required
                        disabled
                    >
                        <option value="">Select a Category</option>
                        {categories.map(cat => (
                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">Difficulty</label>
                    <select id="difficulty" name="difficulty" value={formData.difficulty} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" name="status" value={formData.status} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="contentType" className="block text-sm font-medium text-gray-700">Content Type</label>
                    <select id="contentType" name="contentType" value={formData.contentType} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                        <option value="course_lesson">Course Lesson</option>
                        <option value="practice_test">Practice Test</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700">Thumbnail URL</label>
                    <input type="url" id="thumbnail" name="thumbnail" value={formData.thumbnail} onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md transition duration-200">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition duration-200 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditCourseForm;