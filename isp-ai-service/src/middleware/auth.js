// src/middleware/auth.js
// JWT middleware — validates admin token before allowing AI queries.
// Also attaches db and redis from app.locals for convenience.

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;

    // Attach shared DB and Redis clients (set in app.js via app.locals)
    req.db = req.app.locals.db;
    req.redis = req.app.locals.redis;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

module.exports = { requireAuth };
