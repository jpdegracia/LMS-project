import React, { useContext, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import UserContext from './components/UserContext/UserContext';


// --- Public Pages ---
import Hero from './components/HeroPage/Hero';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import VerificationEmail from './components/Auth/VerificationEmail';
import ContactNav from './components/HeroPage/ContactNav';
import PracticeExamNav from './components/HeroPage/PracticeExamNav';
import AboutUs from './components/HeroPage/AboutUs';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import ErrorPage from './components/HeroPage/Error';
import Profile from './components/AuthPage/Profile';


// --- Main Layout for Authenticated Users ---
import MainLayout from './components/MainLayout/MainLayout';
import DashboardPage from './components/Dashboard/DashboardPage';
import AdminOverviewPage from './components/AdminLayout/AdminOverviewPage';
import TeacherDashboardPage from './components/TeacherLayout/TeacherDashboardPage';

// --- Protected Route Component ---
import ProtectedRoutes from './components/ProtectedRoutes/ProtectedRoutes';

// --- Authenticated Pages (these will render inside MainLayout's <Outlet />) ---

import MyLearningPage from './components/AuthPage/MyLearning'; 

import CreateUserPage from './components/User/CRUD_USER/CreateUser';
import EditUserPage from './components/User/CRUD_USER/EditUser';

import UpdateUserRolePage from './components/User/CRUD_USER/UpdateUserRole';
import UserManagementPage from './components/AuthCommonPages/UserManagement';


// ROLE management pages 
import RoleManagementPage from './components/AuthCommonPages/RoleManagement';
import CreateRolePage from './components/User/CRUD_ROLE/CreateRole';
import ViewRolePage from './components/User/CRUD_ROLE/ViewRole';
import EditRolePage from './components/User/CRUD_ROLE/EditRole';
import ManageRolePermissionPage from './components/User/CRUD_ROLE/ManageRolePermission';

// PERMISSION page 
import GlobalPermissionTypesPage from './components/AuthCommonPages/GlobalPermissionTypesPage';


// --- NEW LMS CONTENT MANAGEMENT PAGES ---
import CourseManagementPage from './components/Courses/CourseManagementPage';
import CategoryManagementPage from './components/Categories/CategoryManagementPage'; 
import CourseView from './components/Courses/CourseView';
import CourseList from './components/Courses/CourseList';
import CoursesPage from './components/Courses/CoursePage';
import LessonContentManagementPage from './components/LessonContent/LessonContentManagementPage';
import CourseLessonPlayer from './components/Courses/CourseLessonPlayer';
import LessonContentViewer from './components/LessonContent/LessonContentViewer';
import CoursePracticeTestPlayer from './components/Courses/CoursePracticeTestPlayer';
import CourseCompletePage from './components/Courses/CourseCompletePage';
import QuestionBankManagementPage from './components/Questions/QuestionBankManagementPage';
import QuestionViewerPage from './components/Questions/QuestionViewerPage';
import EditModulePage from './components/Modules/CRUD_MODULE/EditModulePage';
import ManageQuizQuestionsPage from './components/Questions/ManageQuizQuestionPage';
import QuizManagementPage from './components/Questions/QuizManagementPage';
import LessonModuleManagementPage from './components/LessonContent/LessonModuleManagementPage';
import AddQuizPage from './components/Questions/AddQuizPage';
import EditQuizModulePage from './components/Questions/EditQuizPage';
import AddOrEditLessonModulePage from './components/LessonContent/AddorEditLessonModulePage';
import ManageLessonContentPage from './components/LessonContent/ManageLessonContentPage';
import AddModulePage from './components/Modules/CRUD_MODULE/AddModulePage';
import ReorderModulesPage from './components/Modules/ReorderModulePage';
import UserProfile from './components/Courses/COURSE_TAB/STUDENT_TAB/UserProfile';
import ViewUserPage from './components/User/CRUD_USER/ViewUser';
import ViewAttemptDetails from './components/Courses/COURSE_TAB/ATTEMPT_TAB/QuizAttemptDetails';

import AddStudentToCoursePage from './components/Courses/COURSE_TAB/STUDENT_TAB/AddStudentToCoursePage';
import AddQuestionPage from './components/Questions/AddQuestionPage';
import EditQuestionPage from './components/Questions/EditQuestionPage';
import SubjectManagementPage from './components/Subject/SubjectManagementPage';
import PracticeTestAttemptDetails from './components/Courses/COURSE_TAB/ATTEMPT_TAB/PracticeTestAttemptDetails';
import PracticeTestSubmissionSuccess from './components/Courses/PracticeTestSubmissionSuccess';
import EditLessonContentPage from './components/LessonContent/CRUD_LESSONCONTENT/EditLessonContentPage';
import AddLessonContentPage from './components/LessonContent/CRUD_LESSONCONTENT/AddLessonContentPage';
import ViewQuizPage from './components/Questions/ViewQuizPage';
import ViewLessonPage from './components/LessonContent/ViewLessonModulePage';
import GeminiAssistant from './components/Ai/AiGeneration';



const RoleBasedDashboardRedirect = () => {
    const { user, loading, isLoggedIn, roleNames, hasRole } = useContext(UserContext);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const isAlreadyOnRoleDashboard =
            location.pathname.startsWith('/admin/') ||
            location.pathname.startsWith('/teacher/') ||
            location.pathname.startsWith('/student/');

        if (!loading && isLoggedIn && user && (location.pathname === '/' || location.pathname === '/dashboard') && !isAlreadyOnRoleDashboard) {
            if (hasRole('admin')) {
                console.log("App.jsx useEffect: Redirecting logged-in admin to /admin/dashboard");
                navigate('/admin/dashboard', { replace: true });
            } else if (hasRole('teacher')) {
                console.log("App.jsx useEffect: Redirecting logged-in teacher to /teacher/dashboard");
                navigate('/teacher/dashboard', { replace: true });
            } else if (hasRole('student')) {
                console.log("App.jsx useEffect: Redirecting logged-in student to /courses");
                navigate('/courses', { replace: true });
            } else {
                console.warn(`App.jsx useEffect: User ${user.email} logged in with unhandled role(s): ${roleNames.join(', ')}. Redirecting to /dashboard.`);
                navigate('/courses', { replace: true });
            }
        }
    }, [user, loading, isLoggedIn, roleNames, hasRole, navigate, location.pathname]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-xl font-semibold text-gray-700">Redirecting to your dashboard...</div>
        </div>
    );
};


const App = () => {
    const { loading: userContextLoading } = useContext(UserContext);

    if (userContextLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-700">Loading application...</div>
            </div>
        );
    }

    return (
        <div className="app min-h-screen flex flex-col">
            <Routes>
                {/* --- Public Routes --- */}
                <Route path="/home" element={<Hero />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email/:token" element={<VerificationEmail />} />

                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/contact-nav" element={<ContactNav />} />
                <Route path="/services-nav" element={<PracticeExamNav />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="*" element={<ErrorPage />} />


                {/* Course Lesson Player Page (for playing lessons within a course context) */}
                <Route path="courses/:courseId/play/:moduleId" element={<ProtectedRoutes requiredPermission="lesson_content:read" element={CourseLessonPlayer} />} />
                <Route path="/courses/:courseId/practice-test/:sectionId/:quizModuleId" element={<ProtectedRoutes requiredPermission="question:read" element={CoursePracticeTestPlayer} />} />
                <Route path="/courses/:courseId/complete" element={<ProtectedRoutes requiredPermission="course:read" element={CourseCompletePage} />} />
                <Route path="practice-tests/submission-complete" element={<ProtectedRoutes requiredPermission='practice_test:read' element={PracticeTestSubmissionSuccess} />} />

                


                {/* --- Authenticated Routes (Wrapped by ProtectedRoutes and MainLayout) --- */}
                <Route element={<ProtectedRoutes />}>
                    <Route element={<MainLayout />}>

                        {/* Initial Redirect for Authenticated Users */}
                        <Route index element={<RoleBasedDashboardRedirect />} />
                        <Route path="dashboard" element={<RoleBasedDashboardRedirect />} />

                        


                        {/* Common Authenticated User Pages */}
                        <Route path="profile" element={<Profile />} />
                        {/* FIX: Use UserProfile for viewing any user's profile and protect it */}
                        <Route path="users/:userId" element={<ProtectedRoutes requiredPermission="user:read" element={UserProfile} />} />
                        {/* FIX: Use a more specific path for viewing a user from the management page */}
                        <Route path="user-management/view/:userId" element={<ProtectedRoutes requiredPermission="user:read" element={ViewUserPage} />} />
                        <Route path="attempts/:id" element={<ProtectedRoutes requiredPermission="quiz_attempt:read" element={ViewAttemptDetails} />} />

                        <Route path="my-learning" element={<MyLearningPage />} />
                        <Route path="courses" element={<ProtectedRoutes requiredPermission="course:read:all" element={CoursesPage} />} />
                        <Route path="courses/:id" element={<ProtectedRoutes requiredPermission="course:read" element={CourseView} />} />
                        <Route path="lesson-content/:id" element={<ProtectedRoutes requiredPermission="lesson_content:read" element={LessonContentViewer} />} />
                        <Route path="edit-module/:moduleId" element={<ProtectedRoutes requiredPermission='module:update' element={EditModulePage} />} />
                        
                        

                        {/* USER MANAGEMENT ROUTES */}
                        <Route path="user-management" element={<ProtectedRoutes requiredPermission="user:read:all" element={UserManagementPage} />} />
                        <Route path="user-management/create/:roleType?" element={<ProtectedRoutes requiredPermission="user:create" element={CreateUserPage} />} />
                        <Route path="user-management/edit/:userId" element={<ProtectedRoutes requiredPermission="user:update" element={EditUserPage} />} />
                        <Route path="user-management/change-role/:userId" element={<ProtectedRoutes requiredPermission="user:assign:roles" element={UpdateUserRolePage} />} />

                        {/* ROLE & PERMISSION MANAGEMENT ROUTES */}
                        <Route path="roles" element={<ProtectedRoutes requiredPermission="role:read:all" element={RoleManagementPage} />} />
                        <Route path="roles/create" element={<ProtectedRoutes requiredPermission="role:create" element={CreateRolePage} />} />
                        <Route path="roles/view/:id" element={<ProtectedRoutes requiredPermission="role:read" element={ViewRolePage} />} />
                        <Route path="roles/edit/:id" element={<ProtectedRoutes requiredPermission="role:update" element={EditRolePage} />} />
                        <Route path="roles/permissions/:roleId" element={<ProtectedRoutes requiredPermission="role:update" element={ManageRolePermissionPage} />} />

                        {/* PERMISSION page */}
                        <Route path="permissions" element={<ProtectedRoutes requiredPermission="permission:read:all" element={GlobalPermissionTypesPage} />} />


                        {/* --- NEW LMS CONTENT MANAGEMENT ROUTES --- */}

                        <Route path="courses-list" element={<ProtectedRoutes requiredPermission="course:read:all" element={CourseList} />} />
                        <Route path="courses-manage/:id" element={<ProtectedRoutes requiredPermission="course:read" element={CourseManagementPage} />} />
                        <Route path="courses/:courseId/add-student" element={<ProtectedRoutes requiredPermission="admin:enrollment:create" element={AddStudentToCoursePage} />} />
                        

                        {/* Category Management Page */}
                        <Route path="category-management" element={<ProtectedRoutes requiredPermission="category:read:all" element={CategoryManagementPage} />} />

                        {/* Subject Management Page */}
                        <Route path="subject-management" element={<ProtectedRoutes requiredPermission="subject:read:all" element={SubjectManagementPage} />} />

                        {/* Lesson Content and Module Management Pages */}
                        <Route path="courses/:courseId/sections/:sectionId/add-module" element={<ProtectedRoutes requiredPermission="module:create" element={AddModulePage} />} />
                        <Route path="lesson-content-management" element={<ProtectedRoutes requiredPermission="lesson_content:read:all" element={LessonContentManagementPage} />} />
                        <Route path="lesson-module-management" element={<ProtectedRoutes requiredPermission="module:read:all" element={LessonModuleManagementPage} />} />
                        <Route path="add-lesson-module" element={<ProtectedRoutes requiredPermission="module:create" element={AddOrEditLessonModulePage} />} />
                        <Route path="edit-lesson-module/:moduleId" element={<ProtectedRoutes requiredPermission="module:update" element={AddOrEditLessonModulePage} />} />
                        <Route path="view-lesson-module/:moduleId" element={<ProtectedRoutes requiredPermission="module:read" element={ViewLessonPage} />} />
                        <Route path="manage-lesson-content/:moduleId" element={<ProtectedRoutes requiredPermission="module:update" element={ManageLessonContentPage} />} />
                        <Route path="courses/:courseId/sections/:sectionId/reorder" element={<ProtectedRoutes requiredPermission="module:update" element={ReorderModulesPage} />} />
                        <Route path="/lesson-content/add" element={<ProtectedRoutes requiredPermission="lesson_content:create" element={AddLessonContentPage} />} />
                        <Route path="/lesson-content/:lessonContentId/edit" element={<ProtectedRoutes requiredPermission="lesson_content:update" element={EditLessonContentPage} />} />


                        {/* Question Bank Management Page */}
                        <Route path="question-bank-management" element={<ProtectedRoutes requiredPermission="question:read:all" element={QuestionBankManagementPage} />} />
                        <Route path="questions/:id" element={<ProtectedRoutes requiredPermission="question:read" element={QuestionViewerPage} />} />
                        <Route path="question-bank-management/add" element={<ProtectedRoutes requiredPermission="question:create" element={AddQuestionPage} />} />
                        <Route path="questions/edit/:id" element={<ProtectedRoutes requiredPermission="question:update" element={EditQuestionPage} />} />
                        
                        

                        {/* Quiz Management Page */}
                        <Route path="quiz-management" element={<ProtectedRoutes requiredPermission='quiz:update' element={QuizManagementPage} />} />
                        <Route path="add-quiz" element={<ProtectedRoutes requiredPermission='quiz:create' element={AddQuizPage} />} />
                        <Route path="view-quiz/:moduleId" element={<ProtectedRoutes requiredPermission='quiz:read' element={ViewQuizPage} />} />
                        <Route path="edit-quiz/:moduleId" element={<ProtectedRoutes requiredPermission='quiz:update' element={EditQuizModulePage} />} />
                        <Route path="manage-quiz-questions/:moduleId" element={<ProtectedRoutes requiredPermission='module:update' element={ManageQuizQuestionsPage} />} />

                        {/* Practice Test Page */}
                        <Route path="practice-tests/:id/details" element={<ProtectedRoutes requiredPermission='practice_test:read' element={PracticeTestAttemptDetails} />} />

                        {/* AI Assistant Page */}
                        <Route path="/ai-helper" element={<ProtectedRoutes requiredPermission="ai_assistant:read" element={GeminiAssistant} />} />
                        
                        



                        {/* --- Role-Specific Nested Routes --- */}

                        {/* Admin Routes */}
                        <Route path="admin" element={<ProtectedRoutes allowedRoles={['admin']} />}>
                            <Route path="dashboard" element={<AdminOverviewPage />} />
                            <Route path="*" element={<Navigate to="dashboard" replace />} />
                        </Route>

                        {/* Student Routes */}
                        <Route path="student" element={<ProtectedRoutes allowedRoles={['student']} />}>
                            {/* Update: Redirect student catch-all to /courses */}
                            <Route path="*" element={<Navigate to="/courses" replace />} />
                        </Route>

                        {/* Teacher Routes */}
                        <Route path="teacher" element={<ProtectedRoutes allowedRoles={['teacher']} />}>
                            <Route path="dashboard" element={<TeacherDashboardPage />} />
                            <Route path="*" element={<Navigate to="dashboard" replace />} />
                        </Route>

                        <Route path="*" element={<ErrorPage message="Page not found or you don't have permission to view it." />} />

                    </Route>
                </Route>
            </Routes>
        </div>
    );
};

export default App;