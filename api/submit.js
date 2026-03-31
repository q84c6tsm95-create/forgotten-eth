import { sql } from '@vercel/postgres';

const rateMap = new Map();

function checkRate(ip) {
  const now = Date.now();
  if (rateMap.size > 500) {
    for (const [k, v] of rateMap) { if (now - v.t > 300000) rateMap.delete(k); }
  }
  const e = rateMap.get(ip);
  if (!e || now - e.t > 300000) { rateMap.set(ip, { t: now, c: 1 }); return true; }
  e.c++;
  return e.c <= 5; // 5 submissions per 5 minutes
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  res.setHeader('X-Content-Type-Options', 'nosniff');

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Too many submissions. Try again in a few minutes.' });
  }

  try {
    const { contract, name, category, details, submitter } = req.body || {};

    if (!contract || !/^0x[0-9a-fA-F]{40}$/i.test(contract)) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }

    const safeName = String(name || '').slice(0, 100);
    const safeCat = String(category || '').slice(0, 50);
    const safeDetails = String(details || '').slice(0, 2000);
    const safeSubmitter = (submitter && /^0x[0-9a-fA-F]{40}$/i.test(submitter)) ? submitter.toLowerCase() : null;

    const host = req.headers.host || '';
    const isDev = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('192.168.');

    if (!isDev) {
      await sql`INSERT INTO submissions (contract, name, category, details, submitter_address)
        VALUES (${contract.toLowerCase()}, ${safeName}, ${safeCat}, ${safeDetails}, ${safeSubmitter})`;
    }

    // Telegram alert
    try {
      const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (token && chatId && !isDev) {
        const msg = `New submission:\n${contract}\nName: ${safeName || '?'}\nCategory: ${safeCat || '?'}\n${safeDetails ? 'Details: ' + safeDetails.slice(0, 200) : ''}`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msg, disable_web_page_preview: true }),
        }).catch(() => {});
      }
    } catch {}

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Submit error:', e.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}
