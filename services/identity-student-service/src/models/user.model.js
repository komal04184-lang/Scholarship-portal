
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    // Student basic details
    username: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase:true,
        trim:true
    },

    password: {
        type: String,
        required: true,
    },

    phone: {
        type: String,
        required: true
    },

    date_of_birth: {
        type: Date,
        required: true
    },

    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },

    // Student personal details
    address: {
        type: String
    },

    category: {
        type: String,
        enum: ['General', 'OBC', 'SC', 'ST', 'EWS']
    },

    family_income: {
        type: Number,
        min: 0
    },

    state: {
        type: String
    },

    city: {
        type: String
    },

    // Academic details
   academic_details: {
    student_uid: {
        type: String,
        unique: true,
        sparse: true
    },

    institution_name: String,

    department: String,

    major: String,

    course: String,

    branch: String,

    degree_level: String,

    current_year: Number,

    semester: Number,

    cgpa: {
        type: Number,
        min: 0,
        max: 10
    },

    passing_year: Number,

    academic_year: String,

    marks_percentage: {
        type: Number,
        min: 0,
        max: 100
    }
},

    role: {
        type: String,
        enum: ['student', 'admin', 'reviewer'],
        default: 'student'
    },
});

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;
