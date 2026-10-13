const StudentModel = require('../models/studentModel');

const studentService = {
  StudentPort: {
    GetStudent: async (args) => {
      const studentId = args.student_id;
      const student = await StudentModel.findById(studentId);
      if (!student) {
        return { status: 'NOT_FOUND', student: null };
      }

      const profile = (await StudentModel.getProfile(studentId)) || {};
      const academicsList = await StudentModel.getAcademicDetails(studentId);
      const topAcademic = academicsList[0] || {};

      return {
        status: 'SUCCESS',
        student: {
          student_id: student.student_id,
          name: student.name,
          email: student.email,
          phone: student.phone || '',
          gender: student.gender || '',
          category: profile.category || '',
          annual_income: profile.annual_income ? parseFloat(profile.annual_income) : 0,
          cgpa: topAcademic.cgpa ? parseFloat(topAcademic.cgpa) : 0,
          course: topAcademic.course || topAcademic.branch || '',
        },
      };
    },
  },
};

module.exports = studentService;
