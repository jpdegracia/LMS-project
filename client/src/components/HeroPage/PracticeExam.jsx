import React from 'react'

const PracticeExam = () => {
  return (
    <section className=' rounded-2xl bg-blend-color mx-4'>

      <div className="text-center mb-10">
        <div className="inline-block bg-orange-600 px-6 py-2 rounded shadow-lg mt-6">
          <h2 className="font-secondary h2 text-white text-xl uppercase">Practice Exam:</h2>
        </div>
      </div>

      <div className="flex justify-center gap-8 mb-10">

        {/* Card 1 */}

        <div className="bg-white p-6 rounded-2xl shadow w-64 mb-10">
          <h3 className="font-bold mb-2">Card 1</h3>
          <p className="mb-1"><strong>Course:</strong> Sample Exam</p>
          <p className="mb-4 text-sm">This is a short description of the practice exam.</p>
          <button className="btn-b font-secondary font-normal">
            Enroll
          </button>
        </div>

        {/* Card 2 */}

        <div className="bg-white p-6 rounded-2xl shadow w-64 mb-10">
          <h3 className="font-bold mb-2">Card 2</h3>
          <p className="mb-1"><strong>Course:</strong> Sample Exam</p>
          <p className="mb-4 text-sm">This is a short description of the practice exam.</p>
          <button className="btn-b font-secondary font-normal">
            Enroll
          </button>
        </div>

      </div>


    </section>
  )
}

export default PracticeExam;