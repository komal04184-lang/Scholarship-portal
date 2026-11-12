async function adminDashboard(req, res) {

    res.status(200).json({
        message: "Welcome to Admin Dashboard"
    });

}

module.exports = { adminDashboard };