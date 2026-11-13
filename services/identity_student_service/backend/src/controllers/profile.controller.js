const userModel = require("../models/user.model");

const TOP_LEVEL_FIELDS = [
    "username",
    "phone",
    "date_of_birth",
    "gender",
    "address",
    "category",
    "family_income",
    "family_size",
    "state",
    "city"
];

const ACADEMIC_FIELDS = [
    "institution_name",
    "course",
    "branch",
    "academic_year",
    "semester",
    "cgpa",
    "passing_year",
    "marks_percentage"
];

async function getMyProfile(req, res) {

    const user = await userModel
        .findById(req.user.id)
        .select("-password");

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    return res.status(200).json({
        message: "Profile fetched successfully",
        user
    });
}

async function updateMyProfile(req, res) {

    // Sirf bheje gaye fields update hote hain (dot-notation se),
    // taaki partial update se baaki academic_details delete na ho.
    // email, password aur role yahan se kabhi change nahi hote.
    const updates = {};

    for (const key of TOP_LEVEL_FIELDS) {
        if (req.body[key] !== undefined) {
            updates[key] = req.body[key];
        }
    }

    const academic = req.body.academic_details || {};
    for (const key of ACADEMIC_FIELDS) {
        if (academic[key] !== undefined) {
            updates[`academic_details.${key}`] = academic[key];
        }
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({
            message: "No valid fields to update"
        });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
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
}

module.exports = { getMyProfile, updateMyProfile };
