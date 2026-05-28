// src/router-requests/requests.routes.js
// Tenants submit router setup requests → saved to DB + email to support
const express = require('express');
const router  = express.Router();

// POST /api/v1/router-requests
router.post('/', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  const { router_name, router_model, site_name, notes } = req.body;
  if (!router_name) return res.status(400).json({ error: 'router_name required' });

  try {
    const [tenant] = await db.query(
      `SELECT name, owner_email FROM tenants WHERE id = $1`, [tid]
    );

    const [row] = await db.query(`
      INSERT INTO router_requests
        (tenant_id, tenant_name, tenant_email, router_name, router_model, site_name, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [tid, tenant?.name || '', tenant?.owner_email || '',
        router_name, router_model || null, site_name || null, notes || null]);

    // Email support
    try {
      const nodemailer = require('nodemailer');
      if (process.env.EMAIL_FROM && process.env.EMAIL_PASSWORD) {
        const t = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.zoho.com',
          port: Number(process.env.EMAIL_PORT || 465),
          secure: true,
          auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASSWORD },
        });
        await t.sendMail({
          from:    `"iCube Requests" <${process.env.EMAIL_FROM}>`,
          to:      'support@icubeug.net',
          subject: `Router Request: ${router_name} — ${tenant?.name}`,
          text:    `New router request from ${tenant?.name} (${tenant?.owner_email}):\n\nRouter: ${router_name}\nModel: ${router_model || 'Not specified'}\nSite: ${site_name || 'Not specified'}\nNotes: ${notes || 'None'}\n\nReview at: https://app.icubeug.net/superadmin/tenants`,
        }).catch(() => {});
      }
    } catch {}

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/router-requests — tenant sees their own requests
router.get('/', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  try {
    const rows = await db.query(
      `SELECT * FROM router_requests WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
