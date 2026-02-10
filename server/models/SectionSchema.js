import mongoose from 'mongoose';

const CourseSectionSchema = new mongoose.Schema({
    sectionTitle: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    sectionDescription: {
        type: String,
        trim: true,
    },
    modules: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Module',
        }
    ],
    order: {
        type: Number,
        required: true,
        min: 1
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }
}, { timestamps: true });

CourseSectionSchema.index({ course: 1, order: 1 }, { unique: true });


export const Section = mongoose.model('Section', CourseSectionSchema);