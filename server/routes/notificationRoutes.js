import express from 'express';
import { 
    getMyNotifications, 
    markAsRead, 
    markAllAsRead,
    getAllNotifications,
    createBroadcast,
    updateNotification,
    deleteNotification} from '../controllers/notification-controller.js';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes require being logged in
router.use(verifyToken);

// Student/User Routes
router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

// Admin/Teacher Routes
router.get('/admin/all', authorizePermission('manage_notifications:all'), getAllNotifications);
router.post('/broadcast', authorizePermission('manage_notifications:create'), createBroadcast);
router.put('/:id', authorizePermission('manage_notifications:update'), updateNotification);
router.delete('/:id', authorizePermission('manage_notifications:delete'), deleteNotification);

export default router;