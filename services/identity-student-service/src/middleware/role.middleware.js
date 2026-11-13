function allowRoles(...roles) {

    return function (req, res, next) {

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        next();
    };
}
//req.user.role  JWT authentication middleware se aayega
//Agar user ka role allowed hai toh API access milega
//Agar role allowed nahi hai toh 403 Access denied response milega

module.exports = allowRoles;