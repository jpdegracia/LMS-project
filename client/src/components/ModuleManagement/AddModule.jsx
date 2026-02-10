import React, { useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../components/UserContext/UserContext';
import { ArrowLeft, BookOpen, FlaskConical, Zap, PlusCircle } from 'lucide-react';
import AddLessonModuleForm from './AddLessonModuleForm';
import AddQuizModuleForm from './AddQuizModuleForm';
import AddTestModuleForm from './AddTestModuleForm';

const AddModulePage = () => {
    const navigate = useNavigate();
    const { hasPermission } = useContext(UserContext);
    const [selectedModuleType, setSelectedModuleType] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [error, setError] = useState(null);
    
    const onSave = useCallback(() => {
        setSuccessMessage('Module saved successfully!');
        setTimeout(() => {
            navigate('/module-management');
        }, 1500);
    }, [navigate]);

    const onCancel = useCallback(() => {
        navigate('/module-management');
    }, [navigate]);

    if (!hasPermission('module:create')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6 font-inter flex flex-col items-center justify-center text-center">
                <p className="text-xl text-red-800 mb-4">Access Denied</p>
                <p className="text-gray-700">You do not have permission to create modules.</p>
                <button onClick={() => navigate(-1)} className="mt-6 btn-cancel">Go Back</button>
            </div>
        );
    }

    const renderForm = () => {
        switch (selectedModuleType) {
            case 'lesson':
                return <AddLessonModuleForm onSave={onSave} onCancel={onCancel} />;
            case 'quiz':
                return <AddQuizModuleForm onSave={onSave} onCancel={onCancel} />;
            case 'test':
                return <AddTestModuleForm onSave={onSave} onCancel={onCancel} />;
            default:
                return (
                    <div className="relative bg-white rounded-2xl shadow-xl p-10 md:p-16 space-y-10 text-center">
                        <h2 className="text-4xl font-bold text-gray-800 mb-6 flex items-center justify-center space-x-4">
                            <PlusCircle size={36} className="text-purple-600" />
                            <span>Add New Module</span>
                        </h2>
                        <p className="text-gray-600 text-lg">Please select the type of module you would like to create.</p>
                        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8 items-center justify-center pt-8">
                            <button 
                                onClick={() => setSelectedModuleType('lesson')}
                                className="w-full md:w-auto p-6 flex flex-col items-center space-y-3 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-lg shadow-md transition-colors duration-200"
                            >
                                <BookOpen size={36} />
                                <span>Lesson Module</span>
                            </button>
                            <button
                                onClick={() => setSelectedModuleType('quiz')}
                                className="w-full md:w-auto p-6 flex flex-col items-center space-y-3 bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold rounded-lg shadow-md transition-colors duration-200"
                            >
                                <Zap size={36} />
                                <span>Quiz Module</span>
                            </button>
                            <button
                                onClick={() => setSelectedModuleType('test')}
                                className="w-full md:w-auto p-6 flex flex-col items-center space-y-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg shadow-md transition-colors duration-200"
                            >
                                <FlaskConical size={36} />
                                <span>Test Module</span>
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8 font-inter">
            <main className="mx-auto px-6 max-w-9xl">
                {renderForm()}
            </main>
        </div>
    );
};

export default AddModulePage;
