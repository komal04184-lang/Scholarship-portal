
const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Cookie options
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
};

// Register user
async function registerUser(req, res) {
    const {
        username,
        email,
        password,
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

    // Check required fields
    if (!username || !email || !password || !phone || !date_of_birth || !gender) {
        return res.status(400).json({
            message: "Please provide all required fields"
        });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const isUserAlreadyExists = await userModel.findOne({
        email: normalizedEmail
    });

    if (isUserAlreadyExists) {
        return res.status(409).json({
            message: "User already exists with this email"
        });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create user
    // Role is not accepted from req.body
    const user = await userModel.create({
        username,
        email: normalizedEmail,
        password: hash,
        phone,
        date_of_birth,
        gender,
        address,
        category,
        family_income,
        state,
        city,
        academic_details
    });

    // Create JWT token with expiry
    const token = jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.cookie("token", token, cookieOptions);

    return res.status(201).json({
        message: "User registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
}


// Login API
async function loginUser(req, res) {

    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
        return res.status(400).json({
            message: "Please provide username/email and password"
        });
    }

    // Find user using username or email
    const user = await userModel.findOne(
        email
            ? { email: email.trim().toLowerCase() }
            : { username: username.trim() }
    );

    if (!user) {
        return res.status(401).json({
            message: "Invalid credentials"
        });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordValid) {
        return res.status(401).json({
            message: "Invalid credentials"
        });
    }

    // Create JWT token with expiry
    const token = jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
        message: "User logged in successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
}


// Logout API
async function logoutUser(req, res) {

    res.clearCookie("token", cookieOptions);

    return res.status(200).json({
        message: "User logged out successfully"
    });
}


module.exports = {
    registerUser,
    loginUser,
    logoutUser
};
