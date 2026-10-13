const ScholarshipModel = require('../models/scholarshipModel');
const StudentModel = require('../models/studentModel');

class EligibilityService {
  /**
   * Evaluate if a student meets all eligibility criteria for a given scholarship
   */
  static async evaluate(studentId, scholarshipId) {
    const scholarship = await ScholarshipModel.findById(scholarshipId);
    if (!scholarship) {
      throw new Error('Scholarship not found');
    }

    const student = await StudentModel.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    const profile = await StudentModel.getProfile(studentId) || {};
    const academicsList = await StudentModel.getAcademicDetails(studentId);
    const topAcademic = academicsList[0] || {};

    const criteria = [];
    const missing = [];
    let eligible = true;

    // 1. CGPA Criterion
    if (scholarship.minimum_cgpa !== null && scholarship.minimum_cgpa !== undefined) {
      const requiredCgpa = parseFloat(scholarship.minimum_cgpa);
      const studentCgpa = topAcademic.cgpa !== undefined && topAcademic.cgpa !== null ? parseFloat(topAcademic.cgpa) : null;

      if (studentCgpa === null || isNaN(studentCgpa)) {
        missing.push('Academic CGPA (Update Academic Details)');
        eligible = false;
      } else if (studentCgpa >= requiredCgpa) {
        criteria.push({
          criterion: 'Minimum CGPA',
          required: requiredCgpa,
          studentValue: studentCgpa,
          met: true,
        });
      } else {
        criteria.push({
          criterion: 'Minimum CGPA',
          required: requiredCgpa,
          studentValue: studentCgpa,
          met: false,
        });
        eligible = false;
      }
    }

    // 2. Annual Income Criterion
    if (scholarship.maximum_income !== null && scholarship.maximum_income !== undefined) {
      const maxIncome = parseFloat(scholarship.maximum_income);
      const studentIncome = profile.annual_income !== undefined && profile.annual_income !== null ? parseFloat(profile.annual_income) : null;

      if (studentIncome === null || isNaN(studentIncome)) {
        missing.push('Annual Family Income (Update Student Profile)');
        eligible = false;
      } else if (studentIncome <= maxIncome) {
        criteria.push({
          criterion: 'Maximum Family Income',
          required: `₹${maxIncome.toLocaleString('en-IN')}`,
          studentValue: `₹${studentIncome.toLocaleString('en-IN')}`,
          met: true,
        });
      } else {
        criteria.push({
          criterion: 'Maximum Family Income',
          required: `₹${maxIncome.toLocaleString('en-IN')}`,
          studentValue: `₹${studentIncome.toLocaleString('en-IN')}`,
          met: false,
        });
        eligible = false;
      }
    }

    // 3. Eligible Course Criterion
    if (scholarship.eligible_course) {
      const studentCourse = topAcademic.course || topAcademic.branch;
      if (!studentCourse) {
        missing.push('Course / Branch (Update Academic Details)');
        eligible = false;
      } else if (
        studentCourse.toLowerCase().includes(scholarship.eligible_course.toLowerCase()) ||
        scholarship.eligible_course.toLowerCase().includes(studentCourse.toLowerCase()) ||
        scholarship.eligible_course.toLowerCase() === 'all'
      ) {
        criteria.push({
          criterion: 'Eligible Course',
          required: scholarship.eligible_course,
          studentValue: studentCourse,
          met: true,
        });
      } else {
        criteria.push({
          criterion: 'Eligible Course',
          required: scholarship.eligible_course,
          studentValue: studentCourse,
          met: false,
        });
        eligible = false;
      }
    }

    // 4. Eligible Social Category Criterion
    if (scholarship.eligible_category && scholarship.eligible_category.toLowerCase() !== 'all') {
      const studentCategory = profile.category;
      if (!studentCategory) {
        missing.push('Category (Update Student Profile)');
        eligible = false;
      } else if (studentCategory.toLowerCase() === scholarship.eligible_category.toLowerCase()) {
        criteria.push({
          criterion: 'Eligible Category',
          required: scholarship.eligible_category,
          studentValue: studentCategory,
          met: true,
        });
      } else {
        criteria.push({
          criterion: 'Eligible Category',
          required: scholarship.eligible_category,
          studentValue: studentCategory,
          met: false,
        });
        eligible = false;
      }
    }

    // 5. Age Limits
    if (scholarship.minimum_age || scholarship.maximum_age) {
      if (!student.date_of_birth) {
        missing.push('Date of Birth');
        eligible = false;
      } else {
        const dob = new Date(student.date_of_birth);
        const diffMs = Date.now() - dob.getTime();
        const age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));

        if (scholarship.minimum_age && age < scholarship.minimum_age) {
          criteria.push({ criterion: 'Minimum Age', required: scholarship.minimum_age, studentValue: age, met: false });
          eligible = false;
        } else if (scholarship.minimum_age) {
          criteria.push({ criterion: 'Minimum Age', required: scholarship.minimum_age, studentValue: age, met: true });
        }

        if (scholarship.maximum_age && age > scholarship.maximum_age) {
          criteria.push({ criterion: 'Maximum Age', required: scholarship.maximum_age, studentValue: age, met: false });
          eligible = false;
        } else if (scholarship.maximum_age) {
          criteria.push({ criterion: 'Maximum Age', required: scholarship.maximum_age, studentValue: age, met: true });
        }
      }
    }

    return {
      eligible: eligible && missing.length === 0,
      scholarship_id: scholarship.scholarship_id,
      scholarship_name: scholarship.name,
      criteria,
      missing,
    };
  }
}

module.exports = EligibilityService;
