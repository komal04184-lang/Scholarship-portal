const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {

    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

module.exports = authMiddleware;
//middleware kya krega?
//login k baad cookie se token lega
//token verify krega
//valid hua toh req.user mein user ki id aur role store krega
//request ko next controller tk bejhega