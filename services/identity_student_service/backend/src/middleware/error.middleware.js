function errorHandler(err, req, res, next) {
    if (err.name === "ValidationError") {
        const message = Object.values(err.errors).map((e) => e.message).join(", ");
        return res.status(400).json({ message });
    }

    if (err.code === 11000) {
        return res.status(409).json({ message: "User already exists with this email" });
    }

    if (err.name === "CastError") {
        return res.status(400).json({ message: "Invalid value for " + err.path });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
}

module.exports = errorHandler;
