// src/remote/terminal.service.js
// Web-based SSH terminal proxy.
// Admin opens a WebSocket connection → this service opens an SSH tunnel
// to the router and pipes stdin/stdout bidirectionally.
// Frontend uses xterm.js to render the terminal in the browser.

const { Client: SSHClient } = require('ssh2');
const { v4: uuidv4 } = require('uuid');

// ── WebSocket handler (attach to ws server in app.js) ─────────────────────────
// ws: WebSocket connection from browser
// routerId: router to connect to
// adminId: for audit logging

async function handleTerminalSession(ws, db, redis, { router_id, admin_id, tenant_id }) {
  // 1. Load router credentials
  const routerRows = await db.query(
    `SELECT * FROM routers WHERE id = $1`,
    [router_id]
  );
  if (!routerRows.length) {
    ws.send(JSON.stringify({ type: 'error', message: 'Router not found' }));
    ws.close();
    return;
  }
  const router = routerRows[0];

  if (router.brand !== 'mikrotik') {
    ws.send(JSON.stringify({ type: 'error', message: `SSH terminal not supported for ${router.brand}` }));
    ws.close();
    return;
  }

  // 2. Create session record for audit trail
  const session_token = uuidv4();
  await db.query(`
    INSERT INTO remote_sessions (router_id, admin_id, tenant_id, session_token)
    VALUES ($1,$2,$3,$4)
  `, [router_id, admin_id, tenant_id, session_token]);

  ws.send(JSON.stringify({
    type: 'connected',
    message: `Connecting to ${router.name} (${router.ip_address})...`,
    session_token,
  }));

  // 3. Open SSH connection
  const ssh = new SSHClient();
  let stream = null;
  let commands_run = 0;

  ssh.on('ready', () => {
    ws.send(JSON.stringify({ type: 'ready', message: `Connected to ${router.name}` }));

    ssh.shell({ term: 'xterm-256color', cols: 220, rows: 50 }, (err, sh) => {
      if (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
        ssh.end();
        return;
      }
      stream = sh;

      // Router → browser
      stream.on('data', data => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'data', data: data.toString('base64') }));
        }
      });

      stream.stderr.on('data', data => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'data', data: data.toString('base64') }));
        }
      });

      stream.on('close', () => {
        ws.send(JSON.stringify({ type: 'closed', message: 'Session ended' }));
        ws.close();
        ssh.end();
      });
    });
  });

  // 4. Browser → router
  ws.on('message', async (msg) => {
    try {
      const parsed = JSON.parse(msg);

      if (parsed.type === 'data' && stream) {
        const input = Buffer.from(parsed.data, 'base64').toString();
        stream.write(input);
        commands_run++;

        // Audit every command (debounced — log on Enter key)
        if (input.includes('\n') || input.includes('\r')) {
          await db.query(`
            INSERT INTO audit_logs (tenant_id, actor_id, actor_type, action, entity_type, entity_id, payload)
            VALUES ($1,$2,'admin','router.terminal_command','router',$3,$4)
          `, [tenant_id, admin_id, router_id, JSON.stringify({ session_token })]);
        }
      }

      if (parsed.type === 'resize' && stream) {
        stream.setWindow(parsed.rows || 50, parsed.cols || 220);
      }
    } catch {}
  });

  // 5. Handle disconnect
  ws.on('close', async () => {
    if (stream) stream.end();
    ssh.end();
    await db.query(`
      UPDATE remote_sessions
      SET ended_at = NOW(), commands_run = $1
      WHERE session_token = $2
    `, [commands_run, session_token]);
  });

  ssh.on('error', (err) => {
    ws.send(JSON.stringify({ type: 'error', message: `SSH error: ${err.message}` }));
    ws.close();
  });

  // 6. Connect via SSH
  ssh.connect({
    host:       router.ip_address,
    port:       router.ssh_port || 22,
    username:   router.ssh_username || router.api_username,
    password:   router.ssh_password || router.api_password,
    // privateKey: fs.readFileSync(router.ssh_key_path) — if key-based auth
    readyTimeout: 15000,
    keepaliveInterval: 30000,
  });
}

module.exports = { handleTerminalSession };
