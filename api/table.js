import { readFileSync } from 'fs';
import { join } from 'path';
import { verifyToken } from './token.js';

const EXCHANGE_FILES = {
  idex: 'idex_eth_balances.json',
  etherdelta: 'etherdelta_eth_balances.json',
  tokenstore: 'tokenstore_eth_balances.json',
  singularx: 'singularx_eth_balances.json',
  enclaves: 'unknown_dex_eth_balances.json',
  decentrex: 'decentrex_eth_balances.json',
  joyso: 'joyso_eth_balances.json',
  ethen: 'ethen_eth_balances.json',
  bitcratic: 'bitcratic_eth_balances.json',
  etherc: 'etherc_eth_balances.json',
  enclavesdex: 'enclavesdex_eth_balances.json',
  etherdelta_m1: 'etherdelta_m1_eth_balances.json',
  confideal: 'confideal_eth_balances.json',
  mooncatrescue: 'mooncatrescue_eth_balances.json',
  dada: 'dada_eth_balances.json',
  ens_old: 'ens_old_eth_balances.json',
  fomo3d_long: 'fomo3d_long_eth_balances.json',
  fomo3d_quick: 'fomo3d_quick_eth_balances.json',
  fomo3d_short: 'fomo3d_short_eth_balances.json',
  etherdelta_m0: 'etherdelta_m0_eth_balances.json',
  neufund: 'neufund_eth_balances.json',
  bancor_eth: 'bancor_eth_eth_balances.json',
};

const rateMap = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// Two caches: full data for meta, test data for rows
const metaCache = {};
const testCache = {};

function loadMeta(key) {
  if (metaCache[key]) return metaCache[key];
  const file = EXCHANGE_FILES[key];
  if (!file) return null;
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'balances', file), 'utf8');
    const data = JSON.parse(raw);
    // Top 20 holder balances (amounts only, no addresses exposed)
    const top20 = (data.balances || []).slice(0, 20).map(b => parseFloat(b.balance_eth));
    metaCache[key] = {
      contract: data.contract,
      contract_eth_balance: data.contract_eth_balance,
      total_eth: data.total_eth_in_balances,
      addresses_with_balance: data.addresses_with_balance,
      coverage_pct: data.coverage_pct,
      scan_date: data.scan_date,
      distribution: data.distribution,
      top_holders: top20,
    };
    return metaCache[key];
  } catch (e) {
    return null;
  }
}

function loadTestRows(key) {
  if (testCache[key]) return testCache[key];
  const file = EXCHANGE_FILES[key];
  if (!file) return [];
  try {
    const raw = readFileSync(join(process.cwd(), 'public', file), 'utf8');
    const data = JSON.parse(raw);
    testCache[key] = data.balances || [];
    return testCache[key];
  } catch (e) {
    return [];
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Token verification
  const token = req.query.token || req.headers['x-api-token'];
  if (!verifyToken(token)) {
    return res.status(403).json({ error: 'Invalid or expired token. Request a token from /api/token first.' });
  }

  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',').pop()?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  const { exchange, page: pageStr, pageSize: pageSizeStr, sort, sortDir, search, minBal: minBalStr } = req.query;

  if (!exchange || !EXCHANGE_FILES[exchange]) {
    return res.status(400).json({ error: 'Invalid exchange parameter' });
  }

  const meta = loadMeta(exchange);
  if (!meta) {
    return res.status(404).json({ error: 'Data not available' });
  }

  // Rows come from test data (1 address per contract)
  let filtered = loadTestRows(exchange);

  const page = Math.max(0, parseInt(pageStr) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr) || 50));
  const searchQuery = (search || '').toLowerCase().replace(/[^0-9a-fx]/g, '');
  const minBal = parseFloat(minBalStr) || 0;

  if (searchQuery) {
    filtered = filtered.filter(b => b.address.toLowerCase().includes(searchQuery));
  }
  if (minBal > 0) {
    filtered = filtered.filter(b => parseFloat(b.balance_eth) >= minBal);
  }

  const sortField = sort === 'balance' ? 'balance' : 'rank';
  const sortAsc = sortDir !== 'desc';
  if (sortField === 'balance') {
    filtered = [...filtered].sort((a, b) => {
      const diff = parseFloat(a.balance_eth) - parseFloat(b.balance_eth);
      return sortAsc ? diff : -diff;
    });
  } else {
    filtered = [...filtered].sort((a, b) => sortAsc ? a.rank - b.rank : b.rank - a.rank);
  }

  const totalRows = filtered.length;
  const totalPages = Math.ceil(totalRows / pageSize);
  const start = page * pageSize;
  const rows = filtered.slice(start, start + pageSize).map(b => ({
    rank: b.rank,
    address: b.address,
    balance_eth: b.balance_eth,
    ...(b.deeds ? { deeds: b.deeds } : {}),
  }));

  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex');

  return res.status(200).json({
    exchange,
    meta,
    pagination: { page, pageSize, totalRows, totalPages },
    rows,
  });
}
