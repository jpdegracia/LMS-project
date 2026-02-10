import React from 'react';
import { Link } from 'react-router-dom';
import { MdPreview, MdAssignment, MdCheckCircleOutline } from "react-icons/md";
import { FaHourglassHalf } from "react-icons/fa";

const PracticeExamMainContent = () => {
  return (
    <main className="space-y-8 p-10 bg-gray-50 rounded-lg shadow-md">
      <div className="bg-gradient-to-br from-blue-100 to-blue-300 p-6 rounded-lg shadow-inner">
        <h2 className="text-xl font-semibold text-blue-700 mb-2">
          Welcome to Practice Exams!
        </h2>
        <p className="text-blue-500">
          Ready to sharpen your skills? Dive into our practice tests to prepare for success.
        </p>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Explore Practice Exams:</h3>
        <p className="text-gray-500 text-sm mt-1">Choose the practice mode that suits your learning style.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Link
          to="/practice/test-preview"
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition duration-200 ease-in-out p-6 flex flex-col items-center justify-center text-center"
        >
          <div className="bg-indigo-100 text-indigo-500 rounded-full p-3 mb-2">
            <MdPreview className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Test Preview</h3>
          <p className="text-sm text-gray-500">Quick overview of the exam format.</p>
        </Link>

        <Link
          to="/practice/full"
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition duration-200 ease-in-out p-6 flex flex-col items-center justify-center text-center"
        >
          <div className="bg-green-100 text-green-500 rounded-full p-3 mb-2">
            <MdAssignment className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Full Practice</h3>
          <p className="text-sm text-gray-500">Simulate the complete exam experience.</p>
        </Link>

        <Link
          to="/practice/in-progress"
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition duration-200 ease-in-out p-6 flex flex-col items-center justify-center text-center"
        >
          <div className="bg-yellow-100 text-yellow-500 rounded-full p-3 mb-2">
          <FaHourglassHalf className="w-6 h-6" /> 
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">In Progress Exams</h3>
          <p className="text-sm text-gray-500">Continue your saved practice sessions.</p>
        </Link>

        <Link
          to="/practice/completed"
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition duration-200 ease-in-out p-6 flex flex-col items-center justify-center text-center"
        >
          <div className="bg-teal-100 text-teal-500 rounded-full p-3 mb-2">
            <MdCheckCircleOutline className="w-6 h-6" /> 
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Completed Exams</h3>
          <p className="text-sm text-gray-500">Review your finished practice tests.</p>
        </Link>
      </div>
    </main>
  );
};

export default PracticeExamMainContent;