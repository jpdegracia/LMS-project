import { Notification } from '../models/Notification.js';
import { User } from '../models/UserSchema.js';

// --- USER ACTIONS ---

export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate('sender', 'firstName lastName avatar') // Added this line
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
        res.status(200).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ success: true, message: `Marked ${result.modifiedCount} notifications as read.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- INTERNAL HELPER (No route needed) ---

export const createGradingNotification = async (recipientId, teacherId, attemptId, modelType, quizTitle) => {
    try {
        await Notification.create({
            recipient: recipientId,
            sender: teacherId,
            type: 'GRADE',
            content: `Your manual questions for "${quizTitle}" have been graded.`,
            relatedId: attemptId,
            onModel: modelType,
        });
    } catch (error) {
        console.error("Internal Notification Error:", error.message);
    }
};

// --- ADMIN ACTIONS ---

export const createBroadcast = async (req, res) => {
    const { title, message, targetId, targetModel, type } = req.body;
    try {
        const users = await User.find({ isVerified: true }).select('_id');
        const notifications = users.map(user => ({
            recipient: user._id,
            sender: req.user._id,
            type: type || 'ANNOUNCEMENT',
            title: title,
            content: message,
            relatedId: targetId || null,
            onModel: targetModel || null,
        }));
        await Notification.insertMany(notifications);
        res.status(201).json({ success: true, message: `Broadcast sent to ${users.length} users.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find()
            .populate('recipient', 'firstName lastName email')
            .populate('sender', 'firstName lastName avatar')
            .sort({ createdAt: -1 })
            .limit(100);
        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateNotification = async (req, res) => {
    const { id } = req.params;
    const { title, message } = req.body; // message comes from TinyMCE

    try {
        const originalNotification = await Notification.findById(id);
        
        if (!originalNotification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        // Logic: If it's an announcement, update EVERYONE'S copy
        if (originalNotification.type === 'ANNOUNCEMENT') {
            await Notification.updateMany(
                { 
                    // Find all copies by matching the old title and content
                    title: originalNotification.title,
                    content: originalNotification.content,
                    type: 'ANNOUNCEMENT' 
                },
                { 
                    // ✅ Correct: Update title and content separately
                    $set: { 
                        title: title, 
                        content: message 
                    } 
                }
            );
            
            return res.status(200).json({ 
                success: true, 
                message: "Announcement updated for all recipients." 
            });
        }

        // Fallback for private notifications
        const updated = await Notification.findByIdAndUpdate(
            id,
            { title, content: message },
            { new: true }
        );

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteNotification = async (req, res) => {
    const { id } = req.params;

    try {
        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        // Check if it's a broadcasted announcement
        if (notification.type === 'ANNOUNCEMENT') {
            // Delete ALL notifications with the same content and type
            // This removes it for the Admin AND all Recipients
            await Notification.deleteMany({ 
                content: notification.content, 
                type: 'ANNOUNCEMENT' 
            });
            return res.status(200).json({ success: true, message: "Announcement deleted for all users." });
        }

        // Otherwise, it's a private notification (like a grade), delete only this one
        await Notification.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Notification deleted." });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};