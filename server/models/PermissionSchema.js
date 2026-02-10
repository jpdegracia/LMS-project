import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Permission name is required"],
        unique: true, 
        trim: true,
        lowercase: true, 
    },
    description: {
        type: String,
        trim: true,
        default: '' 
        
    },
    category: {
        type: String,
        trim: true,
        default: '' 
    },
}, { timestamps: true }); 

export const Permission = mongoose.model('Permission', permissionSchema);