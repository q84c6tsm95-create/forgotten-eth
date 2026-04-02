import { sql } from '@vercel/postgres';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

function fetchWithTimeout(url, opts = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Telegram admin alerts via separate admin bot
async function notifyTelegram(msg) {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch (_) {}
}

// Initialize tables on first call (Promise-based lock prevents race condition)
let initPromise = null;
async function ensureTables() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      ts TIMESTAMPTZ DEFAULT NOW(),
      type VARCHAR(50) NOT NULL,
      address VARCHAR(66),
      contract VARCHAR(50),
      amount_eth NUMERIC,
      tx_hash VARCHAR(66),
      block_num BIGINT,
      contracts_found INT,
      total_eth NUMERIC,
      ip VARCHAR(45),
      ua TEXT,
      extra JSONB
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_address ON events(address)`;
  })();
  return initPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  // Skip logging in dev mode — keep only production stats
  const host = req.headers.host || '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('192.168.')) {
    return res.status(200).json({ ok: true, dev: true });
  }

  // Origin check — only accept events from our own site (defense-in-depth, CORS is the primary gate)
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  if (origin && !origin.startsWith('https://forgotteneth.com')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!origin && referer && !referer.startsWith('https://forgotteneth.com')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Reject oversized payloads
    const bodyStr = JSON.stringify(req.body || {});
    if (bodyStr.length > 2048) {
      return res.status(413).json({ error: 'Payload too large' });
    }

    // Strip prototype pollution keys (top-level + nested extra)
    const body = req.body || {};
    delete body.__proto__;
    delete body.constructor;
    delete body.prototype;
    if (body.extra && typeof body.extra === 'object') {
      delete body.extra.__proto__;
      delete body.extra.constructor;
      delete body.extra.prototype;
    }

    await ensureTables();

    const { type, address, contract, amount_eth, tx_hash, block_num, contracts_found, total_eth, extra } = body;

    // Whitelist known event types — reject anything unexpected
    const ALLOWED_TYPES = ['check', 'found', 'claim_started', 'claim_confirmed', 'claim_failed', 'page_view', 'frontend_error'];
    if (!type || typeof type !== 'string' || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // Sanitize address (accepts raw Ethereum addresses: 0x + 40 hex chars)
    const cleanAddr = address && /^0x[a-fA-F0-9]{40}$/.test(address) ? address.toLowerCase() : null;
    const cleanTx = tx_hash && /^0x[a-fA-F0-9]{64}$/.test(tx_hash) ? tx_hash.toLowerCase() : null;
    const cleanContract = contract && typeof contract === 'string' && /^[a-z0-9_]{1,50}$/.test(contract) ? contract : null;

    // Validate numeric fields — reject garbage, cap to sane ranges
    const safeNum = (v, max = 1e12) => { const n = Number(v); return (Number.isFinite(n) && n >= 0 && n <= max) ? n : null; };
    const cleanAmountEth = safeNum(amount_eth, 1e8);
    const cleanTotalEth = safeNum(total_eth, 1e8);
    const cleanBlockNum = safeNum(block_num, 1e10);
    const cleanContractsFound = safeNum(contracts_found, 1000);

    const ip = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null;

    // Store hashed IP (for dedup/abuse detection) — not raw IP (PII reduction)
    // Derive salt from any available secret env var (IP_HASH_SALT preferred, ANALYTICS_SECRET as fallback)
    const salt = process.env.IP_HASH_SALT || process.env.ANALYTICS_SECRET || process.env.TOKEN_SECRET;
    const ipHash = ip && salt ? createHash('sha256').update(ip + salt).digest('hex').substring(0, 16) : null;

    // Rate limit: max 20 events per IP per minute (prevents database flooding)
    if (ipHash) {
      const recent = await sql`
        SELECT COUNT(*) AS cnt FROM events
        WHERE ip = ${ipHash} AND ts > NOW() - INTERVAL '1 minute'
      `;
      if (parseInt(recent.rows[0].cnt, 10) >= 20) {
        return res.status(429).json({ error: 'Too many requests' });
      }
    }
    const ua = req.headers['user-agent']?.substring(0, 200) || null;

    await sql`
      INSERT INTO events (type, address, contract, amount_eth, tx_hash, block_num, contracts_found, total_eth, ip, ua, extra)
      VALUES (${type}, ${cleanAddr}, ${cleanContract}, ${cleanAmountEth}, ${cleanTx}, ${cleanBlockNum}, ${cleanContractsFound}, ${cleanTotalEth}, ${ipHash}, ${ua}, ${extra ? (() => { try { const s = JSON.stringify(extra); return s.length > 1024 ? null : s; } catch { return null; } })() : null})
    `;

    // Real-time Telegram alert on successful claims — verify tx exists onchain first
    if (type === 'claim_confirmed' && cleanAddr && cleanTx) {
      let txVerified = false;
      try {
        const rpcResp = await fetch('https://ethereum.publicnode.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [cleanTx] }),
          signal: AbortSignal.timeout(5000),
        });
        const rpcData = await rpcResp.json();
        txVerified = !!(rpcData.result && rpcData.result.blockNumber);
      } catch { /* RPC timeout/error — skip alert rather than send unverified */ }

      if (txVerified) {
        const ethStr = cleanAmountEth ? `${cleanAmountEth} ETH` : 'unknown amount';
        const txLink = `<a href="https://etherscan.io/tx/${cleanTx}">tx</a>`;
        const addrLink = `<a href="https://etherscan.io/address/${cleanAddr}">${cleanAddr.slice(0, 8)}...${cleanAddr.slice(-4)}</a>`;
        await notifyTelegram(`🎉 <b>Claim confirmed!</b>\n\n${addrLink} withdrew <b>${ethStr}</b> from ${cleanContract || 'unknown'}\n${txLink}`);
      }
    }

    // Alert when someone finds 5+ ETH — verify address exists in our index first
    if (type === 'found' && cleanTotalEth >= 5 && cleanAddr) {
      let addrVerified = false;
      try {
        const prefix = cleanAddr.slice(2, 4);
        const shardPath = join(process.cwd(), 'data', 'index_shards', prefix + '.json');
        const shard = JSON.parse(readFileSync(shardPath, 'utf8'));
        addrVerified = !!(shard[cleanAddr]);
      } catch { /* shard read failed — skip alert */ }

      if (addrVerified) {
        const addrLink = `<a href="https://etherscan.io/address/${cleanAddr}">${cleanAddr.slice(0, 8)}...${cleanAddr.slice(-4)}</a>`;
        await notifyTelegram(`👀 <b>Big fish found!</b>\n\n${addrLink} has <b>${cleanTotalEth} ETH</b> across ${cleanContractsFound || '?'} contract(s)`);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Log error:', e.message || 'unknown');
    // Don't fail the user experience if logging fails
    return res.status(200).json({ ok: true });
  }
}
