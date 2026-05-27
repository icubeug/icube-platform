// src/features/features.routes.js
const express = require('express');
const router  = express.Router();

// GET /api/v1/features
router.get('/', async (req, res) => {
  res.json({
    limits: {
      hotspot: { current: 2, max: 20, label: 'Hotspot Limit' },
      routers: { current: 1, max: 3,  label: 'Router Limit' },
    },
    optional: [
      { key: 'pppoe', label: 'PPPoE Capabilities', enabled: true,
        description: 'Manage PPPoE subscribers, plans, and billing.' },
      { key: 'sms',   label: 'SMS Notifications',  enabled: true,
        description: 'Send automated SMS messages to customers.' },
      { key: 'ai',    label: 'AI Assistant',        enabled: false,
        description: 'AI-powered support and analytics.' },
    ],
  });
});

// POST /api/v1/features/request
router.post('/request', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { category, feature, reason } = req.body;
  if (!category || !feature) return res.status(400).json({ error: 'category and feature required' });
  try {
    const [row] = await db.query(`
      INSERT INTO feature_requests (tenant_id, category, feature, reason)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [tid, category, feature, reason]);
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
