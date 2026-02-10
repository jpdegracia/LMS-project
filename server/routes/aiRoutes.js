import express from 'express';
import { askGemini } from '../controllers/aiController.js';
import { authorizePermission, verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate', verifyToken, authorizePermission('ai_assistant:read'), askGemini);

export default router;