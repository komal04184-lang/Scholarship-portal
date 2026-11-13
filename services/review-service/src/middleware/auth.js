import crypto from 'node:crypto';

function unauthorized(res, message = 'Authentication required') {
  return res.status(401).json({ success: false, message });
}

function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  if (header.alg !== 'HS256') throw new Error('Unsupported token algorithm');
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  const actual = Buffer.from(parts[2], 'base64url');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (payload.exp && Date.now() >= payload.exp * 1000) throw new Error('Token expired');
  if (payload.nbf && Date.now() < payload.nbf * 1000) throw new Error('Token not active');
  return payload;
}

export function requireServiceToken(req, res, next) {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  const supplied = req.get('x-service-token');
  if (!expected) return res.status(503).json({ success: false, message: 'Internal service authentication is not configured' });
  if (!supplied || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return unauthorized(res, 'Invalid internal service token');
  }
  req.auth = { type: 'service', service: req.get('x-caller-service') || 'unknown' };
  next();
}

export function requireReviewer(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return unauthorized(res);
  try {
    const payload = decodeJwt(token);
    const role = String(payload.role || payload.user?.role || '').toLowerCase();
    if (!['reviewer', 'admin'].includes(role)) return res.status(403).json({ success: false, message: 'Reviewer or admin role required' });
    req.user = { id: payload.id || payload.userId || payload.user?.id || payload.sub, role };
    if (!req.user.id) return unauthorized(res, 'Token does not contain a user ID');
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired access token');
  }
}
