import { Category } from '../models/CategorySchema.js';
import { Course } from '../models/CourseSchema.js';


// @desc    Get all categories
// @route   GET /category
// @access  Private (category:read:all)
export const getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({});
        res.status(200).json({ success: true, count: categories.length, data: categories });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single category by ID
// @route   GET /category/:id
// @access  Private (category:read)
export const getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new category
// @route   POST /category
// @access  Private (category:create)
export const createCategory = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required.' });
        }

        const newCategory = await Category.create({
            name,
            description
        });

        res.status(201).json({ success: true, message: 'Category created successfully.', data: newCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Category name must be unique.' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// @desc    Update category
// @route   PUT /category/:id
// @access  Private (category:update)
export const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name, description },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, message: 'Category updated successfully.', data: updatedCategory });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Category name must be unique.' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// @desc    Delete category
// @route   DELETE /category/:id
// @access  Private (category:delete)
export const deleteCategory = async (req, res, next) => {
    try {
        const categoryId = req.params.id;

        // NEW: Check if category is used by any courses before deleting
        const coursesUsingCategory = await Course.findOne({ category: categoryId });
        if (coursesUsingCategory) {
            return res.status(409).json({ success: false, message: 'Category is currently in use by one or more courses and cannot be deleted.' });
        }

        const deletedCategory = await Category.findByIdAndDelete(categoryId);

        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        next(error);
    }
};