
const userModel = require("../models/user.model");

async function getMyProfile(req, res) {
    try {
        const user = await userModel
            .findById(req.user.id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const academic = user.academic_details || {};

        return res.status(200).json({
            message: "Profile fetched successfully",

            profile: {
                student_id: user._id,
                name: user.username,
                email: user.email,
                phone: user.phone,
                address: user.address || "",
                gender: user.gender || "",
                date_of_birth: user.date_of_birth,
                category: user.category || "General",
                family_annual_income: user.family_income || 0,
                state: user.state || "",
                city: user.city || ""
            },

            academics: {
                student_uid: academic.student_uid || "",
                department: academic.department || "",
                major: academic.major || "",
                degree_level: academic.degree_level || academic.course || "",
                current_year: academic.current_year || 0,
                cgpa: academic.cgpa || 0,
                institution_name: academic.institution_name || "",
                course: academic.course || "",
                branch: academic.branch || "",
                semester: academic.semester || 0,
                passing_year: academic.passing_year || 0
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch profile",
            error: error.message
        });
    }
}


async function updateMyProfile(req, res) {
    try {
        const {
            name,
            username,
            phone,
            date_of_birth,
            gender,
            address,
            category,
            family_annual_income,
            family_income,
            state,
            city,
            academics,
            academic_details
        } = req.body;

        const updatedUser = await userModel.findByIdAndUpdate(
            req.user.id,
            {
                $set: {
                    username: username || name,
                    phone,
                    date_of_birth,
                    gender,
                    address,
                    category,
                    family_income: family_income ?? family_annual_income,
                    state,
                    city,
                    academic_details: academic_details || academics
                }
            },
            {
                new: true,
                runValidators: true
            }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to update profile",
            error: error.message
        });
    }
}

module.exports = {
    getMyProfile,
    updateMyProfile
};
