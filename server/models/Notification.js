import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { 
    type: String, 
    enum: ['GRADE', 'SYSTEM', 'ANNOUNCEMENT', 'PRACTICE_TEST'], 
    default: 'SYSTEM' 
  },
  title: { 
    type: String 
  },
  content: { 
    type: String, 
    required: true 
  },
  
  // Dynamic Linking
  relatedId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'onModel' 
  },
  onModel: { 
    type: String, 
    enum: ['QuizAttempt', 'PracticeTestAttempt', 'Course', 'Module'],
    required: false 
  },
  
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);
