// src/analytics/analytics.routes.js — RADIUS usage analytics
const express = require('express');
const router  = express.Router();

const EMPTY = {
  total_data_gb: 0, unique_users: 0, avg_session_minutes: 0, total_sessions: 0,
  prev_total_data_gb: 0, prev_unique_users: 0, prev_avg_session_minutes: 0, prev_total_sessions: 0,
  daily_usage: [], termination_reasons: [], top_users: [], package_usage: [], recent_sessions: [],
};

// GET /api/v1/analytics/usage?from=&to=
router.get('/usage', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;

  const toDate   = req.query.to   ? new Date(req.query.to)   : new Date();
  const fromDate = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 86400_000);
  const duration = toDate - fromDate;
  const prevFrom = new Date(fromDate - duration);
  const prevTo   = fromDate;

  try {
    // Get tenant's router IPs (used to filter radacct by NAS IP)
    const routerRows = await db.query(
      `SELECT ip_address FROM routers WHERE tenant_id = $1`, [tid]
    );
    const nasIps = routerRows.map(r => r.ip_address);

    if (nasIps.length === 0) return res.json(EMPTY);

    // All queries share these params
    const p = [nasIps, fromDate.toISOString(), toDate.toISOString()];
    const pp = [nasIps, prevFrom.toISOString(), prevTo.toISOString()];
    const NAS = `nasipaddress = ANY($1::inet[]) AND acctstarttime >= $2 AND acctstarttime < $3`;

    const [current, prev, daily, termination, topUsers, pkgUsage, recentSessions] = await Promise.all([

      // ── Current period overview ──────────────────────────────────────────────
      db.query(`
        SELECT
          COALESCE(SUM(acctinputoctets + acctoutputoctets), 0) / 1073741824.0 AS total_data_gb,
          COUNT(DISTINCT username) AS unique_users,
          COALESCE(AVG(acctsessiontime), 0) / 60.0 AS avg_session_minutes,
          COUNT(*) AS total_sessions
        FROM radacct WHERE ${NAS}
      `, p),

      // ── Previous period overview ─────────────────────────────────────────────
      db.query(`
        SELECT
          COALESCE(SUM(acctinputoctets + acctoutputoctets), 0) / 1073741824.0 AS total_data_gb,
          COUNT(DISTINCT username) AS unique_users,
          COALESCE(AVG(acctsessiontime), 0) / 60.0 AS avg_session_minutes,
          COUNT(*) AS total_sessions
        FROM radacct WHERE ${NAS}
      `, pp),

      // ── Daily data usage ─────────────────────────────────────────────────────
      db.query(`
        SELECT
          DATE_TRUNC('day', acctstarttime AT TIME ZONE 'Africa/Kampala')::date AS date,
          COALESCE(SUM(acctinputoctets + acctoutputoctets), 0) / 1073741824.0 AS gb
        FROM radacct WHERE ${NAS}
        GROUP BY 1 ORDER BY 1
      `, p),

      // ── Termination reasons ──────────────────────────────────────────────────
      db.query(`
        SELECT
          COALESCE(NULLIF(TRIM(acctterminatecause), ''), 'Unknown') AS reason,
          COUNT(*) AS count
        FROM radacct WHERE ${NAS}
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10
      `, p),

      // ── Top users by data ────────────────────────────────────────────────────
      db.query(`
        SELECT
          username,
          ROUND((SUM(acctinputoctets + acctoutputoctets) / 1073741824.0)::numeric, 3) AS data_gb,
          COUNT(*) AS sessions,
          MAX(acctstarttime) AS last_seen
        FROM radacct WHERE ${NAS}
        GROUP BY username ORDER BY data_gb DESC LIMIT 10
      `, p),

      // ── Package usage ─────────────────────────────────────────────────────────
      db.query(`
        SELECT
          COALESCE(pk.name, 'Unknown') AS package_name,
          ROUND((SUM(r.acctinputoctets + r.acctoutputoctets) / 1073741824.0)::numeric, 3) AS data_gb
        FROM radacct r
        LEFT JOIN vouchers v  ON LOWER(v.code) = LOWER(r.username)
        LEFT JOIN packages pk ON pk.id = v.package_id
        WHERE ${NAS.replace(/\$1/g,'$1').replace(/\$2/g,'$2').replace(/\$3/g,'$3')}
        GROUP BY package_name ORDER BY data_gb DESC LIMIT 10
      `, p),

      // ── Recent sessions ───────────────────────────────────────────────────────
      db.query(`
        SELECT
          r.username,
          r.callingstationid   AS mac_address,
          r.framedipaddress    AS ip_address,
          r.acctsessiontime    AS duration_seconds,
          ROUND(((r.acctinputoctets + r.acctoutputoctets) / 1048576.0)::numeric, 2) AS data_mb,
          COALESCE(pk.name, 'Unknown') AS package_name,
          r.acctstarttime      AS started,
          r.acctstoptime       AS ended,
          CASE WHEN r.acctstoptime IS NULL THEN 'active' ELSE 'ended' END AS status,
          r.acctterminatecause AS terminate_cause
        FROM radacct r
        LEFT JOIN vouchers v  ON LOWER(v.code) = LOWER(r.username)
        LEFT JOIN packages pk ON pk.id = v.package_id
        WHERE ${NAS}
        ORDER BY r.acctstarttime DESC LIMIT 50
      `, p),
    ]);

    const cur  = current[0]  || {};
    const prv  = prev[0]     || {};
    const tot  = parseInt(termination.reduce((s: number, t: any) => s + parseInt(t.count, 10), 0), 10) || 1;

    res.json({
      total_data_gb:          parseFloat(cur.total_data_gb   || 0),
      unique_users:           parseInt(cur.unique_users      || 0, 10),
      avg_session_minutes:    parseFloat(cur.avg_session_minutes || 0),
      total_sessions:         parseInt(cur.total_sessions    || 0, 10),
      prev_total_data_gb:     parseFloat(prv.total_data_gb   || 0),
      prev_unique_users:      parseInt(prv.unique_users      || 0, 10),
      prev_avg_session_minutes: parseFloat(prv.avg_session_minutes || 0),
      prev_total_sessions:    parseInt(prv.total_sessions    || 0, 10),
      daily_usage:            daily.map(d => ({ date: d.date, gb: parseFloat(d.gb) })),
      termination_reasons:    termination.map((t: any) => ({
        reason: t.reason, count: parseInt(t.count, 10),
        pct: Math.round(parseInt(t.count, 10) / tot * 100),
      })),
      top_users:    topUsers.map((u: any) => ({
        username:  u.username,
        data_gb:   parseFloat(u.data_gb),
        sessions:  parseInt(u.sessions, 10),
        last_seen: u.last_seen,
      })),
      package_usage: pkgUsage.map((p: any) => ({
        package_name: p.package_name,
        data_gb:      parseFloat(p.data_gb),
      })),
      recent_sessions: recentSessions.map((s: any) => ({
        username:       s.username,
        mac_address:    s.mac_address,
        ip_address:     s.ip_address,
        duration_seconds: parseInt(s.duration_seconds || 0, 10),
        data_mb:        parseFloat(s.data_mb || 0),
        package_name:   s.package_name,
        started:        s.started,
        ended:          s.ended,
        status:         s.status,
        terminate_cause: s.terminate_cause,
      })),
    });
  } catch (err) {
    console.error('[Analytics]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
