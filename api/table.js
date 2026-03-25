import { readFileSync } from 'fs';
import { join } from 'path';

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
  neufund_locked: 'neufund_locked_eth_balances.json',
  bancor_eth: 'bancor_eth_eth_balances.json',
  switchdex: 'switchdex_eth_balances.json',
  coinchangex: 'coinchangex_eth_balances.json',
  etherdelta_v3: 'etherdelta_v3_eth_balances.json',
  swisscryptoexchange: 'swisscryptoexchange_eth_balances.json',
  lscx: 'lscx_eth_balances.json',
  switcheo: 'switcheo_eth_balances.json',
  bitcratic_v1: 'bitcratic_v1_eth_balances.json',
  marketplace: 'marketplace_eth_balances.json',
  bitox: 'bitox_eth_balances.json',
  ed_fork_6_9eth: 'ed_fork_6_9eth_eth_balances.json',
  ethernext: 'ethernext_eth_balances.json',
  seeddex_v2: 'seeddex_v2_eth_balances.json',
  seeddex_v3: 'seeddex_v3_eth_balances.json',
  polarisdex: 'polarisdex_eth_balances.json',
  ethmall: 'ethmall_eth_balances.json',
  extoke: 'extoke_eth_balances.json',
  algodex: 'algodex_eth_balances.json',
  ndex: 'ndex_eth_balances.json',
  edex: 'edex_eth_balances.json',
  tradexone: 'tradexone_eth_balances.json',
  afrodex: 'afrodex_eth_balances.json',
  readyplayerone: 'readyplayerone_eth_balances.json',
  fomo3d_lightning: 'fomo3d_lightning_eth_balances.json',
  gandhiji: 'gandhiji_eth_balances.json',
  zethr: 'zethr_eth_balances.json',
  zethr_main: 'zethr_main_eth_balances.json',
  ethpyramid: 'ethpyramid_eth_balances.json',
  fomogame: 'fomogame_eth_balances.json',
  ageofdinos: 'ageofdinos_eth_balances.json',
  personabid: 'personabid_eth_balances.json',
  powh3d: 'powh3d_eth_balances.json',
  maker_weth: 'maker_weth_eth_balances.json',
  powm: 'powm_eth_balances.json',
  pooh: 'pooh_eth_balances.json',
  powtf: 'powtf_eth_balances.json',
  powh_clone1: 'powh_clone1_eth_balances.json',
  powh_clone2: 'powh_clone2_eth_balances.json',
  lockedin: 'lockedin_eth_balances.json',
  stronghold: 'stronghold_eth_balances.json',
  powh_clone3: 'powh_clone3_eth_balances.json',
  powh_clone4: 'powh_clone4_eth_balances.json',
  unkoin: 'unkoin_eth_balances.json',
  acedapp: 'acedapp_eth_balances.json',
  cryptominertoken: 'cryptominertoken_eth_balances.json',
  bluechip: 'bluechip_eth_balances.json',
  rev1: 'rev1_eth_balances.json',
  potj: 'potj_eth_balances.json',
  lynia: 'lynia_eth_balances.json',
  blackgold: 'blackgold_eth_balances.json',
  proofofcraiggrant: 'proofofcraiggrant_eth_balances.json',
  sportcrypt: 'sportcrypt_eth_balances.json',

  ethplatinum: 'ethplatinum_eth_balances.json',
  divsnetwork: 'divsnetwork_eth_balances.json',
  ethercenter: 'ethercenter_eth_balances.json',
  redchip: 'redchip_eth_balances.json',
  cxxmain: 'cxxmain_eth_balances.json',
  familyonly: 'familyonly_eth_balances.json',
  spw: 'spw_eth_balances.json',
  ethdiamond: 'ethdiamond_eth_balances.json',
  ethershares: 'ethershares_eth_balances.json',
  twelvehour: 'twelvehour_eth_balances.json',
  neutrino81: 'neutrino81_eth_balances.json',
  hourglassx: 'hourglassx_eth_balances.json',
  fairexchange: 'fairexchange_eth_balances.json',
  pomda: 'pomda_eth_balances.json',
  decentether: 'decentether_eth_balances.json',
  bitconnect3: 'bitconnect3_eth_balances.json',
  furious: 'furious_eth_balances.json',
  etherdiamond: 'etherdiamond_eth_balances.json',
  powh_clone5: 'powh_clone5_eth_balances.json',
  cryptosurge: 'cryptosurge_eth_balances.json',
  hourglass_clone6: 'hourglass_clone6_eth_balances.json',
  upower: 'upower_eth_balances.json',
  hourglass_clone7: 'hourglass_clone7_eth_balances.json',
  redchip2: 'redchip2_eth_balances.json',
  omnidex: 'omnidex_eth_balances.json',
  spw2: 'spw2_eth_balances.json',
  bounties: 'bounties_eth_balances.json',
  dailydivs: 'dailydivs_eth_balances.json',
  proofofcommunity: 'proofofcommunity_eth_balances.json',
  bitconnect_powh: 'bitconnect_powh_eth_balances.json',
  eightherbank: 'eightherbank_eth_balances.json',
  nexgen: 'nexgen_eth_balances.json',
  diamonddividend: 'diamonddividend_eth_balances.json',
  e25: 'e25_eth_balances.json',
  bitconnect2: 'bitconnect2_eth_balances.json',
};


// Cache: pre-computed meta (tiny files)
const metaCache = {};

function loadMeta(key) {
  if (metaCache[key]) return metaCache[key];
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'table_meta', key + '.json'), 'utf8');
    const meta = JSON.parse(raw);
    try {
      const tvlRaw = readFileSync(join(process.cwd(), 'data', 'tvl', key + '.json'), 'utf8');
      meta.tvl = JSON.parse(tvlRaw).history;
    } catch (_) {}
    metaCache[key] = meta;
    return meta;
  } catch (e) {
    return null;
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // No rate limiting needed — table only serves public metadata (no addresses).
  // Individual address lookups are rate-limited via /api/check.

  const { exchange } = req.query;

  if (!exchange || !EXCHANGE_FILES[exchange]) {
    return res.status(400).json({ error: 'Invalid exchange parameter' });
  }

  const meta = loadMeta(exchange);
  if (!meta) {
    return res.status(404).json({ error: 'Data not available' });
  }

  // No individual addresses served — privacy protection.
  // Users check their own address via /api/check.

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex');

  // Round scan_date to date-only to avoid disclosing operational timing patterns
  const sanitizedMeta = { ...meta };
  if (sanitizedMeta.scan_date) {
    sanitizedMeta.scan_date = sanitizedMeta.scan_date.replace(/\s\d{2}:\d{2}:\d{2}\s*UTC$/, ' UTC');
  }

  return res.status(200).json({
    exchange,
    meta: sanitizedMeta,
  });
}
