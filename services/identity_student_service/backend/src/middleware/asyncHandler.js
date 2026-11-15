// Express 4 async errors ko khud nahi pakadta, isliye har controller isse wrap hota hai
module.exports = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
