const userModel = require("../models/user.model");

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

    const {
        username,
        phone,
        date_of_birth,
        gender,
        address,
        category,
        family_income,
        state,
        city,
        academic_details
    } = req.body;

    const updatedUser = await userModel.findByIdAndUpdate(
        req.user.id,
        {
            username,
            phone,
            date_of_birth,
            gender,
            address,
            category,
            family_income,
            state,
            city,
            academic_details
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
}

module.exports = { getMyProfile,updateMyProfile };