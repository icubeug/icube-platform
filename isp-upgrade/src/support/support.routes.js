// src/support/support.routes.js
const express = require('express');
const router  = express.Router();

// GET /api/v1/support/intelligence
router.get('/intelligence', async (req, res) => {
  const db = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    // Avg login time (mins from payment to voucher activation)
    const avgRows = await db.query(`
      SELECT COALESCE(AVG(
        EXTRACT(EPOCH FROM (v.activated_at - p.created_at)) / 60
      ), 30) AS avg_minutes
      FROM payments p
      JOIN vouchers v ON v.id = p.voucher_id
      WHERE p.tenant_id = $1
        AND p.status = 'completed'
        AND v.activated_at IS NOT NULL
        AND p.created_at > NOW() - INTERVAL '30 days'
    `, [tid]);

    // Login rate (activated / total provisioned last 30d)
    const lrRows = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('active','expired','used')) AS activated,
        COUNT(*) AS total
      FROM vouchers
      WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '30 days'
    `, [tid]);

    // Never logged in (unused, last 7 days)
    const nliRows = await db.query(`
      SELECT COUNT(*) AS cnt FROM vouchers
      WHERE tenant_id = $1 AND status = 'unused'
        AND created_at > NOW() - INTERVAL '7 days'
    `, [tid]);

    // Expired today
    const expRows = await db.query(`
      SELECT COUNT(*) AS cnt FROM vouchers
      WHERE tenant_id = $1 AND status = 'expired'
        AND expires_at >= CURRENT_DATE AND expires_at < CURRENT_DATE + INTERVAL '1 day'
    `, [tid]);

    // Voucher activity feed (last 50)
    const feedRows = await db.query(`
      SELECT v.code, v.status, v.customer_phone, v.use_case,
             p.name AS package_name, v.created_at, v.activated_at
      FROM vouchers v
      LEFT JOIN packages p ON p.id = v.package_id
      WHERE v.tenant_id = $1
      ORDER BY v.created_at DESC LIMIT 50
    `, [tid]);

    // Paid never connected
    const pncRows = await db.query(`
      SELECT pay.customer_phone, pay.customer_name, p.name AS package_name,
             pay.method, pay.created_at
      FROM payments pay
      LEFT JOIN packages p ON p.id = (
        SELECT package_id FROM vouchers WHERE id = pay.voucher_id
      )
      LEFT JOIN vouchers v ON v.id = pay.voucher_id
      WHERE pay.tenant_id = $1
        AND pay.status = 'completed'
        AND (v.id IS NULL OR v.status = 'unused')
        AND pay.created_at > NOW() - INTERVAL '30 days'
      ORDER BY pay.created_at DESC
      LIMIT 30
    `, [tid]);

    // Avg login time chart (last 7 days)
    const chartRows = await db.query(`
      SELECT
        DATE_TRUNC('day', p.created_at)::DATE AS day,
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (v.activated_at - p.created_at)) / 60
        ), 0) AS avg_minutes
      FROM payments p
      JOIN vouchers v ON v.id = p.voucher_id
      WHERE p.tenant_id = $1
        AND v.activated_at IS NOT NULL
        AND p.created_at > NOW() - INTERVAL '7 days'
      GROUP BY 1 ORDER BY 1
    `, [tid]);

    const lr = lrRows[0];
    const loginRate = lr.total > 0 ? ((lr.activated / lr.total) * 100).toFixed(2) : '0.00';

    res.json({
      avg_login_minutes:   Math.round(Number(avgRows[0].avg_minutes) || 30),
      login_rate:          parseFloat(loginRate),
      never_logged_in:     parseInt(nliRows[0].cnt),
      expired_today:       parseInt(expRows[0].cnt),
      feed:                feedRows,
      paid_never_connected: pncRows,
      chart:               chartRows.map(r => ({
        day:         r.day,
        avg_minutes: Math.round(Number(r.avg_minutes)),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
