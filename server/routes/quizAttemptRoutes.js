// src/routes/quizAttemptRoutes.js
import express from 'express';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';
import {
    deleteAnnotation,
    deleteQuizAttempt,
    getQuizAttemptById,
    getQuizAttemptsByCourseId,
    getQuizSnapshotById,
    saveAnnotations,
    saveQuizAnswers,
    startQuizAttempt,
    startTimedSession,
    submitQuizAttempt
} from '../controllers/quizAttempt-controller.js';
import { getEnrollmentWithAttempts } from '../controllers/enrollment-controller.js';
import { reviewAttemptItem } from '../controllers/practiceTest-controller.js';

const router = express.Router();

// --- Core User-Facing Routes ---

// @route   POST /quiz-attempts/start
// @desc    Start a new or resume an existing quiz attempt.
// @access  Private (Student)
router.post('/start', verifyToken, authorizePermission('quiz_attempt:create'), startQuizAttempt);

// @route   PUT /quiz-attempts/:id/submit
// @desc    Submit a completed quiz attempt for grading.
// @access  Private (Student)
router.put('/:id/submit', verifyToken, authorizePermission('quiz_attempt:update'), submitQuizAttempt);

// @route   PUT /quiz-attempts/:id/save-answers
// @desc    Save in-progress answers for a quiz attempt without submitting.
// @access  Private (Student)
router.put('/:id/save-answers', verifyToken, authorizePermission('quiz_attempt:update'), saveQuizAnswers);

// @route   GET /quiz-attempts/:id
// @desc    Get a specific quiz attempt by ID.
// @access  Private (Student can view their own; Admin/Instructor can view any).
//          The controller logic is responsible for ownership checks.
router.get('/:id', verifyToken, authorizePermission('quiz_attempt:read'), getQuizAttemptById);

// 🟢 NEW ROUTE: Set the official start time when the user begins the timed session.
// @route   PUT /quiz-attempts/:id/start-timed-session
// @desc    Set the startTime if currently null.
// @access  Private (Student)
router.put('/:id/start-timed-session', verifyToken, authorizePermission('quiz_attempt:update'), startTimedSession);

// @route   PUT /quiz-attempts/:attemptId/review/:itemIndex
// @desc    Allows a teacher to manually grade an SA/FIB question item.
// @access  Private (Admin/Instructor only)
router.put('/:attemptId/review/:itemIndex', verifyToken, authorizePermission('quiz_attempt:update'), reviewAttemptItem);

// --- Consolidated Data & Admin-Facing Routes ---

// @route   GET /enrollments/course/:courseId/with-attempts
// @desc    Get a user's full enrollment details for a course, including all quiz attempts.
//          This single endpoint replaces `getEnrollmentQuizAttempts` and `getUserQuizAttempts` for the student view.
// @access  Private (Student can view their own enrollment; Admin/Instructor can view any).
//          This route belongs in enrollmentRoutes, but is included here for context.
router.get('/enrollment/:courseId/with-attempts', verifyToken, authorizePermission('enrollment:read'), getEnrollmentWithAttempts);

// @route   GET /quiz-attempts/course/:courseId
// @desc    Get all quiz attempts for a specific course across all students.
// @access  Private (Admin/Staff only)
router.get('/course/:courseId', verifyToken, authorizePermission('quiz_attempt:read:all'), getQuizAttemptsByCourseId);

// @route   GET /quiz-snapshots/:id
// @desc    Get a specific quiz snapshot by ID.
// @access  Private (Student/Admin)
router.get('/quiz-snapshots/:id', verifyToken, authorizePermission('quiz_attempt:read'), getQuizSnapshotById);

// @route   DELETE /quiz-attempts/:id
// @desc    Delete a specific quiz attempt by ID.
// @access  Private (Admin/Instructor only)
router.delete('/:id', verifyToken, authorizePermission('quiz_attempt:delete'), deleteQuizAttempt);

// 🟢 NEW ROUTE: Save annotations for a specific question in a quiz attempt
// @route   PUT /quiz-attempts/:quizAttemptId/save-annotations
// @desc    Save Rangy annotations for a question's text or context
// @access  Private (Student)
router.put('/:quizAttemptId/save-annotations', verifyToken, authorizePermission('quiz_attempt:update'), saveAnnotations);

// 🟢 NEW DELETE ROUTE: Delete a specific annotation (note + highlight segment)
// @route   DELETE /quiz-attempts/:attemptId/annotations/:questionId/:areaKey/:highlightId
// @desc    Delete a specific Rangy highlight and its associated note.
// @access  Private (Student)
router.delete('/:attemptId/annotations/:questionId/:areaKey/:highlightId', verifyToken, authorizePermission('quiz_attempt:update'), deleteAnnotation);

export default router;