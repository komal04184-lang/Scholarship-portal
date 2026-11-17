const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_k9x2m4p7';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase();
    if (!allowedRoles.map(r => r.toLowerCase()).includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
