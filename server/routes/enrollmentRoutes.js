import express from 'express';
import { deleteEnrollment, enrollByAdmin, enrollInCourse, getAllUserEnrollments, getEnrolleesByCourseId, getEnrollmentByCourseId, getEnrollmentForSpecificUser, getEnrollmentWithAttempts, markProgress, resetProgress, updateAnyEnrollment, updateEnrollmentStatus, updateLastAccess } from '../controllers/enrollment-controller.js';
import { verifyToken, authorizePermission } from '../middleware/authMiddleware.js';


const router = express.Router();

// @desc    Enroll a user in a course
// @route   POST /enrollments/enroll
// @access  Private (User requires 'enrollment:create' permission)
router.post('/enroll', verifyToken, authorizePermission('enrollment:create'), enrollInCourse);

// @desc    Mark progress in a course (complete content, update last active module, complete quiz)
// @route   POST /enrollments/mark-progress
// @access  Private (User requires 'enrollment:update' permission)
router.post('/mark-progress', verifyToken, authorizePermission('enrollment:update'), markProgress);

// @desc    Reset user progress for a specific course
// @route   POST /enrollments/reset-progress
// @access  Private (User requires 'enrollment:update' permission)
router.post('/reset-progress', verifyToken, authorizePermission('enrollment:update'), resetProgress);

// @desc    Get all enrollments for the authenticated user
// @route   GET /enrollments/my-courses
// @access  Private (User requires 'enrollment:read' permission)
// Note: This route implicitly uses req.user._id from verifyToken, ensuring a user only gets their own data.
router.get('/my-courses', verifyToken, authorizePermission('enrollment:read'), getAllUserEnrollments);

// @desc    Get a user's enrollment details for a specific course
// @route   GET /enrollments/:courseId
// @access  Private (User requires 'enrollment:read' permission)
// Note: This route also implicitly uses req.user._id, ensuring a user only gets their own enrollment.
router.get('/:courseId', verifyToken, authorizePermission('enrollment:read'), getEnrollmentByCourseId);


// --- Admin/Staff-Facing Routes ---
// @desc    Admin/Staff-controlled enrollment of a user in a course
// @route   POST /enrollments/admin/enroll
// @access  Private (Admin/Staff requires 'admin:enrollment:create' permission)
router.post('/admin/enroll', verifyToken, authorizePermission('admin:enrollment:create'), enrollByAdmin);

// @desc    Get a list of all enrollees for a specific course
// @route   GET /enrollments/course/:courseId/enrollees
// @access  Private (Admin/Staff requires 'admin:enrollment:read' permission)
router.get('/course/:courseId/enrollees', verifyToken, authorizePermission('admin:enrollment:read:all'), getEnrolleesByCourseId);

// @desc    Get a specific user's enrollment details (Admin/Staff only)
// @route   GET /enrollments/user/:userId/course/:courseId
// @access  Private (Requires 'admin:enrollment:read' permission)
router.get('/user/:userId/course/:courseId', verifyToken, authorizePermission('admin:enrollment:read'), getEnrollmentForSpecificUser);

// @desc    Update any enrollment record (Admin/Staff only)
// @route   PUT /enrollments/:enrollmentId
// @access  Private (Requires 'admin:enrollment:update' permission)
router.put('/:enrollmentId', verifyToken, authorizePermission('admin:enrollment:update'), updateAnyEnrollment);

// @desc    Delete any enrollment record (Admin/Staff only)
// @route   DELETE /enrollments/:enrollmentId
// @access  Private (Requires 'admin:enrollment:delete' permission)
router.delete('/:enrollmentId', verifyToken, authorizePermission('admin:enrollment:delete'), deleteEnrollment);

// @desc    Update the user's last access date for a course
// @route   POST /enrollments/update-last-access
// @access  Private (User requires 'enrollment:update' permission)
router.post('/update-last-access', verifyToken, authorizePermission('enrollment:update'), updateLastAccess);

// @desc    Explicitly update an enrollment status (e.g., to 'in-progress')
// @route   PUT /enrollments/:enrollmentId/update-status
// @access  Private (User requires 'enrollment:update' permission)
router.put('/:enrollmentId/update-status', verifyToken, authorizePermission('enrollment:update'), updateEnrollmentStatus);

// @route   GET /api/enrollments/:courseId/with-attempts
// @desc    Get enrollment details along with quiz attempts for a specific course
// @access  Private (User requires 'enrollment:read' permission)
router.get('/course/:courseId/with-attempts', verifyToken, authorizePermission('enrollment:read'), getEnrollmentWithAttempts);

export default router;