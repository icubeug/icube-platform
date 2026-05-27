// src/auth/auth.routes.js — Tenant login & registration
const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const router   = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

// POST /api/auth/register — create new tenant + admin account
router.post('/register', async (req, res) => {
  const db = req.app.locals.db;
  const {
    business_name, subdomain, owner_name, owner_phone,
    email, password, plan = 'starter'
  } = req.body;

  if (!business_name || !email || !password) {
    return res.status(400).json({ error: 'business_name, email and password are required' });
  }

  try {
    // Check email uniqueness
    const existing = await db.query(
      `SELECT id FROM admins WHERE email = $1`, [email]
    );
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });

    // Create tenant
    const slug = (subdomain || business_name.toLowerCase().replace(/[^a-z0-9]/g, '-')).substring(0, 30);
    const [tenant] = await db.query(`
      INSERT INTO tenants (name, slug, plan, status, owner_name, owner_phone, trial_ends_at)
      VALUES ($1, $2, $3, 'trial', $4, $5, NOW() + INTERVAL '14 days')
      RETURNING *
    `, [business_name, slug, plan, owner_name || null, owner_phone || null]);

    // Create admin
    const hash = await bcrypt.hash(password, 10);
    const [admin] = await db.query(`
      INSERT INTO admins (tenant_id, email, name, password_hash, password_hash_bcrypt, role)
      VALUES ($1, $2, $3, $4, $4, 'admin')
      RETURNING id, email, name, role
    `, [tenant.id, email, owner_name || business_name, hash]);

    // Issue JWT
    const token = jwt.sign(
      { admin_id: admin.id, tenant_id: tenant.id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, admin, tenant });
  } catch (err) {
    console.error('[Auth] register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — tenant admin login
router.post('/login', async (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  try {
    const rows = await db.query(`
      SELECT a.*, t.name AS tenant_name, t.status AS tenant_status
      FROM admins a
      JOIN tenants t ON t.id = a.tenant_id
      WHERE a.email = $1
    `, [email]);

    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const admin = rows[0];
    const hashToCheck = admin.password_hash_bcrypt || admin.password_hash;
    const valid = await bcrypt.compare(password, hashToCheck);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (admin.tenant_status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    const token = jwt.sign(
      { admin_id: admin.id, tenant_id: admin.tenant_id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      tenant: { id: admin.tenant_id, name: admin.tenant_name, status: admin.tenant_status }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/me — validate token + return current user
router.get('/me', async (req, res) => {
  const db = req.app.locals.db;
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const rows = await db.query(`
      SELECT a.id, a.email, a.name, a.role, a.tenant_id,
             t.name AS tenant_name, t.status AS tenant_status, t.plan
      FROM admins a
      JOIN tenants t ON t.id = a.tenant_id
      WHERE a.id = $1
    `, [payload.admin_id]);

    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
