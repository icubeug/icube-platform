// src/services/ai.context.js
// Fetches live ISP metrics and builds the system prompt dynamically.
// This is the core of the AI layer — the model only knows what you inject here.

async function buildSystemPrompt(db, redis) {
  const [sites, metrics, revenue, vouchers] = await Promise.all([
    fetchSiteStatus(db, redis),
    fetchNetworkMetrics(db, redis),
    fetchRevenueSummary(db),
    fetchVoucherSummary(db),
  ]);

  return `You are an AI control assistant for an ISP and WiFi hotspot management system in Uganda.
You have real-time access to the network data below. Use it to answer admin questions directly and accurately.
Keep responses concise and practical — think like a network engineer.

=== LIVE NETWORK DATA (as of ${new Date().toISOString()}) ===

SITES & ACCESS POINTS:
${sites}

NETWORK METRICS:
${metrics}

REVENUE (TODAY):
${revenue}

VOUCHERS:
${vouchers}

=== CAPABILITIES ===
- Answer questions about site load, active users, offline routers
- Generate voucher package definitions (include suggested codes, pricing in UGX, duration)
- Provide MikroTik-specific troubleshooting steps (RouterOS commands where relevant)
- Summarise revenue and usage patterns
- Flag anomalies (offline APs, high latency, capacity warnings)
- Suggest load balancing or configuration changes

Always answer from the live data above. If something isn't in the data, say so clearly.
Never make up metrics. For router commands, prefix with "Run on MikroTik:" to make them scannable.`;
}

async function fetchSiteStatus(db, redis) {
  // Check Redis cache first (60s TTL) to avoid hammering DB on every query
  const cached = await redis.get('ai:site_status');
  if (cached) return cached;

  const rows = await db.query(`
    SELECT
      s.name                                    AS site,
      s.location,
      COUNT(DISTINCT r.id)                      AS router_count,
      COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'online')  AS routers_online,
      COUNT(DISTINCT ss.id) FILTER (WHERE ss.ended_at IS NULL) AS active_users,
      ROUND(AVG(rm.latency_ms))                 AS avg_latency_ms,
      s.max_users,
      CASE
        WHEN COUNT(DISTINCT ss.id) FILTER (WHERE ss.ended_at IS NULL)::float
             / NULLIF(s.max_users, 0) > 0.90 THEN 'OVERLOADED'
        WHEN COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'online') = 0 THEN 'OFFLINE'
        ELSE 'OK'
      END AS health
    FROM sites s
    LEFT JOIN routers r       ON r.site_id = s.id
    LEFT JOIN sessions ss     ON ss.site_id = s.id
    LEFT JOIN router_metrics rm ON rm.router_id = r.id
      AND rm.recorded_at > NOW() - INTERVAL '5 minutes'
    GROUP BY s.id, s.name, s.location, s.max_users
    ORDER BY s.name
  `);

  const text = rows.map(r =>
    `- ${r.site} (${r.location}): ${r.active_users}/${r.max_users} users, ` +
    `${r.routers_online}/${r.router_count} routers online, ` +
    `${r.avg_latency_ms ?? 'N/A'}ms latency — ${r.health}`
  ).join('\n');

  await redis.setex('ai:site_status', 60, text);
  return text;
}

async function fetchNetworkMetrics(db, redis) {
  const cached = await redis.get('ai:network_metrics');
  if (cached) return cached;

  const [totals, offline] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*) FILTER (WHERE ended_at IS NULL) AS active_sessions,
        COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') AS sessions_today
      FROM sessions
    `),
    db.query(`
      SELECT r.name, s.name AS site, r.last_seen_at
      FROM routers r
      JOIN sites s ON s.id = r.site_id
      WHERE r.status = 'offline'
      ORDER BY r.last_seen_at DESC
    `),
  ]);

  const t = totals[0];
  let text = `Active sessions: ${t.active_sessions}\nSessions today: ${t.sessions_today}`;

  if (offline.length > 0) {
    text += `\nOffline routers (${offline.length}):\n` +
      offline.map(r => `  - ${r.name} at ${r.site}, offline since ${r.last_seen_at}`).join('\n');
  } else {
    text += '\nAll routers online.';
  }

  await redis.setex('ai:network_metrics', 60, text);
  return text;
}

async function fetchRevenueSummary(db) {
  const rows = await db.query(`
    SELECT
      SUM(amount) FILTER (WHERE paid_at > NOW() - INTERVAL '24 hours')  AS today_ugx,
      SUM(amount) FILTER (WHERE paid_at > NOW() - INTERVAL '7 days')    AS week_ugx,
      COUNT(*)    FILTER (WHERE paid_at > NOW() - INTERVAL '24 hours')  AS txns_today,
      p.name AS top_package,
      COUNT(*) AS top_count
    FROM payments pay
    JOIN vouchers v  ON v.id = pay.voucher_id
    JOIN packages p  ON p.id = v.package_id
    WHERE pay.status = 'completed'
    GROUP BY p.name
    ORDER BY top_count DESC
    LIMIT 1
  `);

  if (!rows.length) return 'No revenue data available.';
  const r = rows[0];
  return `Today: UGX ${Number(r.today_ugx || 0).toLocaleString()}, ` +
    `${r.txns_today} transactions\n` +
    `This week: UGX ${Number(r.week_ugx || 0).toLocaleString()}\n` +
    `Top package: ${r.top_package} (${r.top_count} sales today)`;
}

async function fetchVoucherSummary(db) {
  const rows = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')  AS active_vouchers,
      COUNT(*) FILTER (WHERE status = 'used')    AS used_today,
      COUNT(*) FILTER (
        WHERE status = 'active'
        AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      ) AS expiring_soon
    FROM vouchers
    WHERE created_at > NOW() - INTERVAL '24 hours'
       OR status IN ('active', 'used')
  `);

  const r = rows[0];
  return `Active: ${r.active_vouchers}, Used today: ${r.used_today}, ` +
    `Expiring in 24h: ${r.expiring_soon}`;
}

module.exports = { buildSystemPrompt };
