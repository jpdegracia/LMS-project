import express from 'express';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';
import { 
    createQuestion, 
    deleteQuestion, 
    getQuestionById, 
    getQuestions, 
    updateQuestion,
    updateAnnotations // ⬅️ NEW IMPORT
} from '../controllers/courseQuestion-controller.js';


const router = express.Router();

router.get('/add', verifyToken, authorizePermission('question:create'), (req, res) => {
    // This is the correct backend endpoint path for the ADD page view/process.
    // It prevents the request from falling through to the next dynamic route.
    res.status(200).json({ success: true, message: 'Ready to load new question form.' });
    });

router.route('/')
  .post(verifyToken, authorizePermission('question:create'), createQuestion)
  .get(verifyToken, authorizePermission('question:read:all'), getQuestions);

router.route('/:id')
  .get(verifyToken, authorizePermission('question:read'), getQuestionById)
  .put(verifyToken, authorizePermission('question:update'), updateQuestion)
  .delete(verifyToken, authorizePermission('question:delete'), deleteQuestion);

// 🚀 NEW ROUTE FOR ANNOTATION UPDATES
// This uses a specific permission that controls who can save highlights.
router.put('/:id/annotations', verifyToken, authorizePermission('question:annotate'), updateAnnotations); 

export default router;