import express from 'express';
import { authorizePermission, verifyToken } from '../middleware/authMiddleware.js';
import { 
    assignUserRoles, 
    createUser, 
    deleteUser, 
    getAllUsers, 
    getUser, 
    updateUser,
    getTeachers,
    getAllStudents
} from '../controllers/user-controller.js';

const router = express.Router();

// Note: No `verifyToken` or `authorizeRole('admin')` here, as they are handled by the parent router.
// Only the granular permission check is needed.

// New route to get a list of all teachers
router.get('/teachers', verifyToken, authorizePermission('user_read:teachers'), getTeachers);

// New route to get a list of all students
router.get('/all-students', verifyToken, authorizePermission('user_read:students'), getAllStudents);

router.post('/', verifyToken, authorizePermission('user:create'), createUser);
router.get('/', verifyToken, authorizePermission('user:read:all'), getAllUsers);
router.get('/:id', verifyToken, authorizePermission('user:read'), getUser);
router.put('/:id', verifyToken, authorizePermission('user:update'), updateUser);
router.delete('/:id', verifyToken, authorizePermission('user:delete'), deleteUser);
router.put('/:userId/roles', verifyToken, authorizePermission('user:assign:roles'), assignUserRoles);



export default router;