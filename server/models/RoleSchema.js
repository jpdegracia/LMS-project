import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Role name is required"],
        unique: true,
        trim: true,
    },
    permissions: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Permission', 
        },
    ],
}, { timestamps: true });

export const Role = mongoose.model("Role", roleSchema);