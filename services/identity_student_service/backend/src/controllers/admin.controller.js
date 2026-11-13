const userModel = require("../models/user.model");

async function adminDashboard(req, res) {

    const total_students = await userModel.countDocuments({ role: "student" });

    res.status(200).json({
        message: "Welcome to Admin Dashboard",
        stats: {
            total_students
        }
    });

}

module.exports = { adminDashboard };
