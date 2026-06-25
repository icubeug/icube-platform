// src/auth/admin.middleware.js
// Validates the admin JWT and ensures the caller belongs to the resolved tenant.
// Use after resolveTenant — requires req.tenant_id to already be set.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    // Cross-tenant guard: JWT tenant must match the resolved tenant
    if (req.tenant_id && payload.tenant_id !== req.tenant_id) {
      return res.status(403).json({ error: 'Token does not match tenant' });
    }
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAdmin };
