import { Section } from '../models/SectionSchema.js';
import { Course } from '../models/CourseSchema.js';
import { Module } from '../models/ModuleSchema.js';
import mongoose from 'mongoose';
import { shiftSectionOrderUp, reorderSection } from '../utils/orderHelpers.js';

// Helper function for consistent error handling and response structure
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`Error ${statusCode}: ${message}`, errorDetails);
    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};

// Helper function to get the next sequential order number for a new section in a course
const getNextSectionOrder = async (courseId, session) => {
    const lastSection = await Section.findOne({ course: courseId })
                                      .sort({ order: -1 })
                                      .session(session);
    return lastSection ? lastSection.order + 1 : 1;
};

// @desc    Create a new section for a course
// @route   POST /sections/by-course/:courseId
// @access  Private (admin/teacher)
export const createSection = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const { courseId } = req.params;
        const { sectionTitle, sectionDescription } = req.body;

        const course = await Course.findById(courseId).session(session);
        if (!course) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Course not found.');
        }

        const order = await getNextSectionOrder(courseId, session);

        const section = new Section({
            sectionTitle,
            sectionDescription,
            order,
            course: courseId,
            modules: []
        });

        const createdSection = await section.save({ session });
        await Course.updateOne(
            { _id: courseId },
            { $push: { sections: createdSection._id } },
            { session }
        );

        await session.commitTransaction();

        res.status(201).json({ success: true, data: createdSection });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error("Error in createSection:", error);
        if (error.name === 'MongoServerError' && error.code === 11000) {
            return sendErrorResponse(res, 400, 'Section order must be unique within this course.');
        }
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, error.message);
        }
        sendErrorResponse(res, 500, "Failed to create section.", error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

// @desc    Get all sections for a specific course
// @route   GET /sections/by-course/:courseId
// @access  Public (or private)
export const getSectionsByCourseId = async (req, res) => {
    try {
        const sections = await Section.find({ course: req.params.courseId })
            .populate({
                path: 'modules',
                populate: [
                    { path: 'contents', model: 'LessonContent', select: 'title type contentHtml videoUrl imageUrl documentUrl' },
                    { path: 'questions.question', model: 'Question', select: 'questionText questionType options correctAnswer explanation' }
                ]
            })
            .sort({ order: 1 });
        res.status(200).json({ success: true, data: sections });
    } catch (error) {
        console.error("Error in getSectionsByCourseId:", error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid course ID format.');
        }
        sendErrorResponse(res, 500, "Failed to retrieve sections.", error.message);
    }
};

// @desc    Get single section by ID
// @route   GET /sections/:sectionId
// @access  Public (or private)
export const getSectionById = async (req, res) => {
    try {
        const section = await Section.findById(req.params.sectionId)
            .populate({
                path: 'modules',
                model: 'Module',
                populate: [
                    { path: 'contents', model: 'LessonContent', select: 'title' },
                    { path: 'questions.question', model: 'Question', select: 'questionText' }
                ]
            });
        if (!section) {
            return res.status(404).json({ success: false, message: 'Section not found.' });
        }
        res.status(200).json({ success: true, data: section });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid section ID format.' });
        }
        res.status(500).json({ success: false, message: 'Failed to retrieve section.' });
    }
};

// @desc    Update a section (for non-order fields or simple order update)
// @route   PUT /sections/:sectionId
// @access  Private (admin/teacher)
export const updateSection = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const { sectionTitle, sectionDescription, order } = req.body;
        const section = await Section.findById(req.params.sectionId).session(session);
        if (!section) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Section not found.');
        }
        section.sectionTitle = sectionTitle !== undefined ? sectionTitle : section.sectionTitle;
        section.sectionDescription = sectionDescription !== undefined ? sectionDescription : section.sectionDescription;
        if (order !== undefined && order !== section.order) {
            await reorderSection(
                new mongoose.Types.ObjectId(req.params.sectionId),
                section.course,
                order,
                session
            );
            section.order = order;
        }
        const updatedSection = await section.save({ session });
        await session.commitTransaction();
        res.status(200).json({ success: true, data: updatedSection });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error("Error in updateSection:", error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid section ID format.');
        }
        if (error.name === 'MongoServerError' && error.code === 11000) {
            return sendErrorResponse(res, 400, 'Section order must be unique within its course.');
        }
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, error.message);
        }
        sendErrorResponse(res, 500, "Failed to update section.", error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

// @desc    Delete a section and unlink its modules
// @route   DELETE /sections/:sectionId
// @access  Private (admin/teacher)
export const deleteSectionAndUnlinkModules = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const section = await Section.findById(req.params.sectionId).session(session);
        if (!section) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Section not found.');
        }
        if (section.modules && section.modules.length > 0) {
            await Module.updateMany(
                { _id: { $in: section.modules } },
                { $unset: { section: 1 } },
                { session }
            );
        }
        const courseId = section.course;
        await Course.updateOne(
            { _id: courseId },
            { $pull: { sections: section._id } },
            { session }
        );
        await section.deleteOne({ session });
        const deletedOrder = section.order;
        await shiftSectionOrderUp(courseId, deletedOrder, session);
        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Section deleted and modules unlinked successfully.' });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error("Error in deleteSectionAndUnlinkModules:", error);
        sendErrorResponse(res, 500, "Failed to delete section and unlink modules.", error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

export const reorderSectionEndpoint = async (req, res) => {
    const { sectionId } = req.params;
    const { newOrder, courseId } = req.body;
    if (!newOrder || !courseId) {
        return sendErrorResponse(res, 400, 'newOrder and courseId are required.');
    }
    if (typeof newOrder !== 'number' || newOrder < 1) {
        return sendErrorResponse(res, 400, 'newOrder must be a positive number.');
    }
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        await reorderSection(new mongoose.Types.ObjectId(sectionId), new mongoose.Types.ObjectId(courseId), newOrder, session);
        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Section reordered successfully.' });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error("Error reordering section:", error);
        sendErrorResponse(res, 500, "Failed to reorder section.", error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

export const getAllSections = async (req, res) => {
    try {
        const sections = await Section.find({});
        res.status(200).json({
            success: true,
            message: 'Sections fetched successfully',
            data: sections
        });
    } catch (error) {
        console.error('Error fetching all sections:', error);
        sendErrorResponse(res, 500, 'Failed to retrieve sections.', error.message);
    }
};

export const addMultipleExistingModulesToSection = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const { sectionId } = req.params;
        const { moduleIds } = req.body;

        if (!moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 400, "Invalid request. 'moduleIds' must be a non-empty array.");
        }

        const section = await Section.findById(sectionId).session(session);
        if (!section) {
            await session.abortTransaction();
            session.endSession();
            return sendErrorResponse(res, 404, 'Target section not found.');
        }

        // Use $push with $each to add multiple IDs to the array
        // FIX: The update should also unset the section for the module being moved.
        await Section.updateOne(
            { _id: sectionId },
            { $push: { modules: { $each: moduleIds } } },
            { session }
        );
        
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: 'Modules added to section successfully.' });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        console.error("[Module Controller] Error in addExistingModulesToSection:", error);
        sendErrorResponse(res, 500, 'Failed to add modules to section.', error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};



export const unlinkModuleFromSection = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const { sectionId, id: moduleId } = req.params;
        const updatedSection = await Section.findByIdAndUpdate(
            sectionId,
            { $pull: { modules: new mongoose.Types.ObjectId(moduleId) } },
            { new: true, runValidators: true, session }
        ).populate('modules');
        if (!updatedSection) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Section not found.');
        }
        await Module.updateOne(
            { _id: moduleId, section: new mongoose.Types.ObjectId(sectionId) },
            { $unset: { section: 1 } },
            { session }
        );
        await session.commitTransaction();
        res.status(200).json({
            success: true,
            message: 'Module unlinked from section successfully.',
            data: updatedSection
        });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error('Error unlinking module from section:', error);
        if (error.name === 'CastError') {
            return sendErrorResponse(res, 400, 'Invalid ID format for section or module.');
        }
        sendErrorResponse(res, 500, 'Failed to unlink module from section.', error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

// @desc    Endpoint for reordering modules within a specific section
// @route   PUT /sections/:sectionId/modules/reorder-modules
// @access  Private (admin/teacher)
export const updateModuleOrderInSection = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const { sectionId } = req.params;
        const { newModuleOrder } = req.body;
        if (!Array.isArray(newModuleOrder) || newModuleOrder.length === 0) {
            await session.abortTransaction();
            return sendErrorResponse(res, 400, "Invalid payload. 'newModuleOrder' must be a non-empty array.");
        }
        const section = await Section.findById(sectionId).session(session);
        if (!section) {
            await session.abortTransaction();
            return sendErrorResponse(res, 404, 'Section not found.');
        }

        // Check if all provided IDs are valid ObjectIds
        if (!newModuleOrder.every(mongoose.Types.ObjectId.isValid)) {
             await session.abortTransaction();
             return sendErrorResponse(res, 400, 'Invalid module ID format provided.');
        }
        
        // --- FIX 1: Ensure provided IDs match existing modules in the section ---
        const existingModuleIds = section.modules.map(m => m.toString());
        const areAllIdsValid = newModuleOrder.every(id => existingModuleIds.includes(id));
        if (!areAllIdsValid || newModuleOrder.length !== existingModuleIds.length) {
            await session.abortTransaction();
            return sendErrorResponse(res, 400, 'Invalid module list provided. The list must contain all original modules.');
        }

        // --- FIX 2: Directly update the array. Order is implicit in the array's position. ---
        section.modules = newModuleOrder.map(id => new mongoose.Types.ObjectId(id));

        const updatedSection = await section.save({ session });

        // --- FIX 3: Remove redundant update of Module.order field ---
        // The Module model's `order` field is not needed if the Section.modules array's order is the source of truth.
        // This makes your data model simpler and less error-prone.
        // You can remove this loop entirely:
        // await Promise.all(newModuleOrder.map((moduleId, index) =>
        //      Module.findByIdAndUpdate(moduleId, { order: index + 1 }, { new: true, session })
        // ));

        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Modules reordered successfully.', data: updatedSection });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        sendErrorResponse(res, 500, 'Failed to reorder modules.', error.message);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};
