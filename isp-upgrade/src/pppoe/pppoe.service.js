// src/pppoe/pppoe.service.js
// PPPoE subscriber billing — home broadband users on fixed plans.
// Handles: subscriber CRUD, auto-invoice generation, RADIUS sync,
//          MikroTik PPPoE profile push, suspension on non-payment.

const bcrypt   = require('bcrypt');
const { pushPPPoEUser, suspendPPPoEUser } = require('../multirouter/mikrotik.adapter');
const { sendSMS } = require('../notifications/sms.service');
const { normalizePhone } = require('../utils/phone');

// ── Create subscriber ─────────────────────────────────────────────────────────
async function createSubscriber(db, redis, {
  tenant_id, site_id, router_id,
  full_name, phone, email,
  username, password, plan_id,
  ip_address = null,
}) {
  phone = normalizePhone(phone);

  // Validate plan
  const planRows = await db.query(
    `SELECT * FROM pppoe_plans WHERE id = $1 AND active = true`, [plan_id]
  );
  if (!planRows.length) throw new Error('Plan not found');
  const plan = planRows[0];

  // Hash password for DB storage (push plaintext to RADIUS separately)
  const password_hash = await bcrypt.hash(password, 10);

  // Calculate first billing date
  const next_billing_date = computeNextBillingDate(plan.billing_cycle);

  const rows = await db.query(`
    INSERT INTO pppoe_subscribers
      (tenant_id, site_id, router_id, full_name, phone, email,
       username, password_hash, plan_id, ip_address, next_billing_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `, [tenant_id, site_id, router_id, full_name, phone, email,
      username, password_hash, plan_id, ip_address, next_billing_date]);

  const subscriber = rows[0];

  // Push to RADIUS (FreeRADIUS radcheck / radreply tables)
  await syncSubscriberToRADIUS(db, subscriber, plan, password);

  // Push PPPoE profile to MikroTik
  await pushPPPoEUser(router_id, {
    username,
    password,
    profile: buildMikroTikProfile(plan),
    comment: `${full_name} | ${phone} | ${plan.name}`,
  });

  // Generate first invoice
  await generateInvoice(db, subscriber.id, plan);

  // Welcome SMS
  await sendSMS(phone,
    `Welcome ${full_name}! Your internet is active.\n` +
    `Plan: ${plan.name} (${plan.download_mbps}/${plan.upload_mbps} Mbps)\n` +
    `Username: ${username}\n` +
    `Next payment: UGX ${plan.price_ugx} due ${next_billing_date}`
  );

  await redis.del('ai:network_metrics');
  return subscriber;
}

// ── Generate invoice ──────────────────────────────────────────────────────────
async function generateInvoice(db, subscriber_id, plan) {
  const subRows = await db.query(
    `SELECT * FROM pppoe_subscribers WHERE id = $1`, [subscriber_id]
  );
  const sub = subRows[0];
  const due_date = sub.next_billing_date;

  const rows = await db.query(`
    INSERT INTO pppoe_invoices (subscriber_id, plan_id, amount_ugx, due_date)
    VALUES ($1,$2,$3,$4) RETURNING *
  `, [subscriber_id, plan.id, plan.price_ugx, due_date]);

  return rows[0];
}

// ── Auto-billing scheduler (called by cron job daily at 07:00) ───────────────
async function runBillingCycle(db, redis) {
  const due = await db.query(`
    SELECT s.*, p.price_ugx, p.name AS plan_name, p.billing_cycle, p.id AS plan_id
    FROM pppoe_subscribers s
    JOIN pppoe_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.next_billing_date <= CURRENT_DATE
  `);

  let billed = 0, failed = 0;
  for (const sub of due) {
    try {
      // Attempt mobile money collection (MTN or Airtel based on phone prefix)
      const collected = await attemptAutoCollection(sub.phone, sub.price_ugx, sub.id);
      if (collected) {
        await db.query(`
          UPDATE pppoe_subscribers
          SET next_billing_date = $1, updated_at = NOW()
          WHERE id = $2
        `, [computeNextBillingDate(sub.billing_cycle), sub.id]);
        billed++;
      } else {
        // Grace period: 3 days before suspension
        await handlePaymentFailure(db, sub);
        failed++;
      }
    } catch (err) {
      console.error(`[PPPoE billing] Failed for ${sub.username}:`, err.message);
      failed++;
    }
  }

  await redis.del('ai:network_metrics');
  console.log(`[PPPoE billing] Cycle complete: ${billed} billed, ${failed} failed`);
  return { billed, failed };
}

async function handlePaymentFailure(db, sub) {
  const graceDays = 3;
  const suspendDate = new Date(sub.next_billing_date);
  suspendDate.setDate(suspendDate.getDate() + graceDays);

  if (new Date() >= suspendDate) {
    // Suspend on MikroTik
    await suspendPPPoEUser(sub.router_id, sub.username);
    await db.query(
      `UPDATE pppoe_subscribers SET status = 'suspended' WHERE id = $1`,
      [sub.id]
    );
    await sendSMS(sub.phone,
      `Your internet (${sub.username}) has been suspended due to non-payment.\n` +
      `Pay UGX ${sub.price_ugx} to reactivate. Call support or visit our office.`
    );
  } else {
    // Send reminder
    await sendSMS(sub.phone,
      `Reminder: Your internet payment of UGX ${sub.price_ugx} is due.\n` +
      `Pay via MTN: *165*...\n` +
      `Service suspends in ${graceDays} days if unpaid.`
    );
  }
}

// ── RADIUS sync ───────────────────────────────────────────────────────────────
async function syncSubscriberToRADIUS(db, subscriber, plan, plaintext_password) {
  // FreeRADIUS radcheck — authentication
  await db.query(`
    INSERT INTO radcheck (username, attribute, op, value)
    VALUES ($1, 'Cleartext-Password', ':=', $2)
    ON CONFLICT (username, attribute) DO UPDATE SET value = $2
  `, [subscriber.username, plaintext_password]);

  // FreeRADIUS radreply — bandwidth limits via Mikrotik-Speed-Limit or WISPr
  await db.query(`
    INSERT INTO radreply (username, attribute, op, value)
    VALUES
      ($1, 'Mikrotik-Rate-Limit', '=', $2),
      ($1, 'Session-Timeout',     '=', '0'),
      ($1, 'Idle-Timeout',        '=', '3600')
    ON CONFLICT (username, attribute) DO UPDATE SET value = EXCLUDED.value
  `, [
    subscriber.username,
    `${plan.download_mbps}M/${plan.upload_mbps}M`,
  ]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeNextBillingDate(billing_cycle) {
  const d = new Date();
  if (billing_cycle === 'weekly')    d.setDate(d.getDate() + 7);
  if (billing_cycle === 'monthly')   d.setMonth(d.getMonth() + 1);
  if (billing_cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
  return d.toISOString().split('T')[0];
}

function buildMikroTikProfile(plan) {
  let profile = `rate-limit=${plan.download_mbps}M/${plan.upload_mbps}M`;
  if (plan.burst_download_mbps) {
    profile += ` burst-limit=${plan.burst_download_mbps}M/${plan.burst_upload_mbps}M`;
    profile += ` burst-threshold=${Math.round(plan.download_mbps * 0.8)}M/${Math.round(plan.upload_mbps * 0.8)}M`;
    profile += ` burst-time=10s/10s`;
  }
  return profile;
}

async function attemptAutoCollection(phone, amount_ugx, subscriber_id) {
  // Determine network from phone prefix
  const mtn_prefixes    = ['077','078','076','039'];
  const airtel_prefixes = ['070','075','074'];
  const prefix = phone.replace('+256', '0').slice(0, 3);

  try {
    if (mtn_prefixes.includes(prefix)) {
      const { collectMTN } = require('../payments/mtn.service');
      return await collectMTN(phone, amount_ugx, `PPPoE renewal ${subscriber_id}`);
    } else if (airtel_prefixes.includes(prefix)) {
      const { collectAirtel } = require('../payments/airtel.service');
      return await collectAirtel(phone, amount_ugx, `PPPoE renewal ${subscriber_id}`);
    }
    return false;
  } catch {
    return false;
  }
}

module.exports = {
  createSubscriber,
  generateInvoice,
  runBillingCycle,
  syncSubscriberToRADIUS,
};
