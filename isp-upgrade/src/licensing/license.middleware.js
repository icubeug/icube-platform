// src/licensing/license.middleware.js
// Drop-in Express middleware that blocks a route when the tenant is at capacity.
//
// Usage:
//   router.post('/', requireLicense('sites'), handler)
//   router.post('/', requireLicense('routers'), handler)

const { assertUnderLimit } = require('./license.service');

function requireLicense(resource) {
  return async (req, res, next) => {
    const tenant_id = req.tenant_id || req.tenant?.id;
    if (!tenant_id) return next(); // no tenant context — skip (e.g. superadmin)
    try {
      const check = await assertUnderLimit(req.app.locals.db, tenant_id, resource);
      req.license_check = check;
      next();
    } catch (err) {
      if (err.code === 'LICENSE_LIMIT_EXCEEDED') {
        return res.status(403).json({
          error: err.message,
          code:  err.code,
          limit: err.check,
        });
      }
      next(err);
    }
  };
}

module.exports = { requireLicense };
