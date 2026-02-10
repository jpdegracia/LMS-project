import express from 'express';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';
import {
    startPracticeTest,
    submitPracticeTest,
    savePracticeTestProgress,
    getCoursePracticeTestAttempts,
    getPracticeTestAttemptDetails,
} from '../controllers/practiceTest-controller.js';

const router = express.Router();

// @route   POST /practice-tests/start/:sectionId
// @desc    Start a new practice test attempt for a specific course section.
// @access  Private (Student)
router.post('/start/:sectionId', verifyToken, authorizePermission('practice_test:create'), startPracticeTest);

// @route   PUT /practice-tests/:id/submit
// @desc    Submit a completed practice test attempt and calculate the final score.
// @access  Private (Student)
router.put('/:id/submit', verifyToken, authorizePermission('practice_test:update'), submitPracticeTest);

// @route   PUT /practice-tests/:id/save-progress
// @desc    Save the user's progress for the entire practice test session.
// @access  Private (Student)
router.put('/:id/save-progress', verifyToken, authorizePermission('practice_test:update'), savePracticeTestProgress);

// @route   GET /practice-tests/:id
// @desc    Get a specific practice test attempt by ID for review.
// @access  Private (Student can view their own)
router.get('/:id/details', verifyToken, authorizePermission('practice_test:read'), getPracticeTestAttemptDetails);

// @route   GET /practice-tests/course/:courseId/attempts
// @desc    Get all practice test attempts for a course (for admin/staff review)
// @access  Private (Admin/Staff with 'practice_test:read' permission)
router.get('/course/:courseId/attempts', verifyToken, authorizePermission('practice_test:read'), getCoursePracticeTestAttempts);

// @route   POST /practice-tests/:id/start-break
// @desc    Initiate a break period for the practice test.
// @access  Private (Student)
// router.post('/:id/start-break', verifyToken, authorizePermission('practice_test:update'), startBreak);

export default router;