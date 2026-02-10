import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "First Name is Required"],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, "Last Name is Required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is Required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    IDnumber: {
        type: String,
    },
    bio: {
        type: String,
        trim: true,
        default: "This user has not provided a bio yet."
    },
    avatar: {
        type: String,
        trim: true,
        default: "" // You can set a default image URL if you have one
    },
    password: {
        type: String,
        required: [true, "Password is Required"],
        minlength: [8, "Password must be at least 8 characters long"],
        select: false
    },
    roles: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: [true, "At least one role is required"],
        },
    ],
    isVerified: {
        type: Boolean,
        default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
}, { timestamps: true });

// --- Pre-save hook for password hashing ---
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// --- Method to compare password ---
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
export default User;