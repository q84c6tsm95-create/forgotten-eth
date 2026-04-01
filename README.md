# Forgotten ETH

Scan 117 defunct Ethereum contracts for withdrawable ETH. No frontend needed for most of these protocols anymore, no portfolio tracker indexes them.

**[forgotteneth.com](https://forgotteneth.com)** | **[forgotteneth.eth](https://etherscan.io/address/0xAE7d7C366F7Ebc2b58E17D0Fb3Aa9C870ea77891)** | **[API](https://forgotteneth.com/api-docs)**

## What this does

ETH gets stuck in old contracts when protocols shut down and their frontends go offline. The balances are still onchain but invisible to DeBank, Zapper, and other portfolio trackers. This tool indexes them and generates the withdrawal transaction.

117 contracts. 155,000+ ETH. 521k addresses with claimable balance.

## CLI

By [banteg](https://github.com/banteg).

```bash
npm install
npm run check:address -- 0xe1bdff947510a8e9623cf7f3c6cf6fe5e37c16b8
```

Uses Multicall3 to batch-check all contracts with a direct `view` balance function against a public RPC. Skips protocols that need precomputed discovery (ENS old registrar, Kyber FeeHandler, Bounties Network).

```
npm run check:address -- vitalik.eth              # ENS resolution
npm run check:address -- 0x... --json             # machine-readable output
npm run check:address -- 0x... --rpc <url>        # custom RPC
```

## Web

1. Paste address or connect wallet
2. Scans all 117 contracts (API-first, RPC verification for connected wallets)
3. Click Withdraw — tx goes directly from the original contract to your wallet

No custody. No intermediary contracts. No token approvals for standard withdrawals (The DAO, DigixDAO, and Neufund require token burns as part of their original contract design). Every withdrawal is reproducible on Etherscan.

## Contracts

| Category | Examples | Count |
|----------|----------|-------|
| Defunct DEXes | EtherDelta v0-v3, IDEX v1, Token.Store, SingularX, Joyso, ETHEN, 30+ forks | ~40 |
| Dividend tokens | PoWH3D, 30+ Hourglass clones (Zethr, GandhiJi, DailyDivs, etc.) | ~35 |
| Fomo3D family | Long, Quick, Short, FoMoGame, ReadyPlayerONE, Last Winner | ~8 |
| ENS old registrar | Unreleased deed deposits from the 2017 .eth auction | 1 |
| NFT auctions | MoonCatRescue, DADA, Age of Dinos, PersonaBid | 4 |
| DAO refunds | The DAO WithdrawDAO, DigixDAO Acid, NuCypher WorkLock | 3 |
| Token wrappers | Neufund EtherToken, Bancor Old ETH, Maker W-ETH | 3 |
| Bounty/Other | Bounties Network, Confideal, SportCrypt, Tessera vaults | ~6 |

Full list in [`data/protocols.json`](data/protocols.json).

---

## Technical Details

<details>
<summary><strong>Data Pipeline</strong></summary>

Balance data is refreshed every 6 hours via GitHub Actions CI.

**Standard contracts** are scanned using [Multicall3](https://www.multicall3.com/) batch calls against public RPC endpoints. For each contract, the scanner calls the appropriate `view` function (`tokens(address,address)` for EtherDelta-style DEXes, `balanceOf(address)` for token contracts, `dividendsOf(address)` for Hourglass clones, etc.) for every known depositor address.

**Address discovery** uses multiple methods depending on the contract type:
- Etherscan event logs (`Deposit`, `Transfer`, `TokenPurchase`) for most contracts
- Player ID enumeration for Fomo3D-style contracts (`plyr_` mapping with sequential IDs)
- Token holder scans via `tokentx` API for PoWH3D clones
- ENS subgraph queries for deed owner resolution

**ENS deeds** are checked incrementally. Rather than re-scanning all deeds, the pipeline queries `HashReleased` events since the last run and only re-checks affected deeds. Full scan available via `--full` flag.

**TVL history** is reconstructed by querying `eth_getBalance` at the first block of each month via an archive node (Tenderly RPC). This produces the "ETH Balance Over Time" chart on each protocol page.

**Safety guards:**
- If an RPC returns 0 for a contract that previously held >1 ETH, the scan is skipped and a Telegram alert is sent (likely RPC glitch)
- If mapped ETH drops >20% while the contract balance remains stable, the write is aborted (partial RPC failure)
- If >10% of Multicall batches fail, the entire scan aborts
- All balance file writes are atomic (temp file + `os.replace`)

</details>

<details>
<summary><strong>Withdrawal Patterns</strong></summary>

The 117 contracts use three distinct withdrawal patterns:

**Single-step** (~105 contracts): The depositor calls a `withdraw(amount)` or equivalent function directly on the contract. The contract transfers ETH to `msg.sender`. This covers all EtherDelta-style DEXes, PoWH3D dividend tokens, Fomo3D games, and most other contracts.

**Token-burn** (3 contracts): The depositor must first approve their tokens to a withdrawal contract, then call a burn/withdraw function. The original deposit was in ETH, but the contract issued tokens that must be burned to reclaim it.
- **The DAO**: Approve DAO tokens to WithdrawDAO (`0xbf4ed7b2...`), then `withdraw()`. 1:1 token-to-ETH. 81,914 ETH across 4,854 addresses.
- **DigixDAO**: Approve DGD to Acid contract (`0x23Ea10CC...`), then `burn()`. Fixed rate: 0.193 ETH per DGD.
- **NuCypher WorkLock**: `claim()` to stake NU tokens, then `refund()` to return ETH. Staking requirement removed after Threshold merger.

**Multi-step** (~9 contracts): Various contract-specific flows.
- **Neufund LockedAccount**: `approveAndCall()` on NEU token (burns NEU, returns ETH-T), then `withdraw()` on EtherToken. 44% of depositors are blocked (insufficient NEU).
- **Joyso**: `lockMe()` initiates a 30-day withdrawal lock, then `withdraw()` after the timer expires.
- **ENS Old Registrar**: `releaseDeed(hash)` on the registrar. ETH is held in individual Deed proxy contracts, not the registrar itself.
- **Bounties Network**: `killBounty(bountyId)` per bounty. Each user may have multiple bounties with separate IDs.
- **Kyber FeeHandler**: `claimStakerReward(staker, epoch)` for each of epochs 1-21. Epoch-based staking rewards with no expiration.

All withdrawal paths are verified via Tenderly simulation before a contract is added to the index. The test suite simulates the actual `withdraw()` call from a real depositor address and confirms no revert.

</details>

<details>
<summary><strong>Verification Model</strong></summary>

The system is designed so that every claim can be independently verified without trusting the site.

**No intermediary contracts.** Withdrawal transactions call the original contract directly. The site generates the transaction; the user's wallet executes it. There is no proxy, relay, or router contract involved.

**Independent verification.** For any address in the index:
1. Look up the contract on Etherscan
2. Call the `view` balance function with the address as argument (the function name is listed in `data/protocols.json`)
3. If nonzero, call the `withdraw` function from that address

The CLI (`npm run check:address`) performs exactly this flow using Multicall3 against a public RPC. No API dependency.

**Balance data is derived entirely from public onchain state.** The pipeline reads from:
- `eth_getBalance` for contract balances
- Contract `view` functions for depositor balances
- Etherscan API for address discovery (event logs, token transfers)
- Dune Analytics for transaction activity data

No off-chain databases, no proprietary data sources.

**Privacy:** No IP addresses, browser fingerprints, or device identifiers are stored. Event logging tracks aggregate actions (checks, balances found, claims) without tying them to identifiable users. Addresses checked on the site are logged for aggregate stats only; they are not shared, sold, or used for tracking.

**Security measures:**
- Content Security Policy: `default-src 'none'`, no `unsafe-eval`
- Subresource Integrity on all CDN scripts (ethers.js, Chart.js)
- Wallet keystore decryption is client-side only; private keys never leave the browser
- Rate limiting: 30 requests/min per IP on the address lookup API
- Timing-safe comparison for all authentication secrets

</details>

<details>
<summary><strong>Coverage</strong></summary>

Coverage percentage represents the fraction of a contract's ETH balance that is mapped to known depositor addresses.

Most contracts achieve 95-100% coverage. The gap between mapped ETH and contract balance comes from:
- **Depositors not found via event scanning** — some early contracts emitted non-standard events or no events at all
- **Direct ETH transfers** — ETH sent to a contract via `send()` or `transfer()` without calling a deposit function
- **Contract self-references** — balance files must exclude the contract's own address (contracts cannot call `withdraw()` on themselves)

Coverage gaps are addressed using multiple discovery methods:
- **PID enumeration** for Fomo3D contracts: iterate `plyr_(uint256)` from 1 to the last known player ID
- **Token transfer scanning** for PoWH3D clones: `tokentx` API returns all token holders, which maps to depositors
- **Bytecode matching** for DEX forks: contracts sharing EtherDelta's bytecode use the same `Deposit` event signature

The index currently tracks 521,000+ unique addresses across all contracts. Balance data is stored in per-protocol JSON files under `data/balances/`, sharded into 256 prefix files under `data/index_shards/` for fast address lookup (O(1) by first two hex characters of the address).

</details>

<details>
<summary><strong>Architecture</strong></summary>

```
Frontend
  public/app.js          Vanilla JS, ethers.js v6, Chart.js
  public/index.html      Single page with Yume Nikki theme
  public/protocol.js     Subpage chart rendering

API (Vercel serverless)
  api/check.js           Address lookup: loads 1 shard (~200KB) per query
  api/table.js           Protocol metadata + TVL + activity charts
  api/protocol.js        SSR protocol subpages (/:slug routes)
  api/stats.js           Aggregate usage stats (public)
  api/summary.js         All-contracts overview
  api/total.js           Total ETH + contract count (lightweight)
  api/log.js             Event logging (Postgres)
  api/telegram-bot.js    /check, /watch, /subscribe commands

Data
  data/balances/         Full balance files per protocol (JSON)
  data/index_shards/     256 address-prefix shards + meta.json
  data/table_meta/       Pre-computed per-protocol stats
  data/tvl/              Monthly ETH balance history per contract
  data/activity/         Monthly transaction counts per contract
  data/protocols.json    Protocol registry (single source of truth)
  data/protocol_info.json  Descriptions, colors, deploy dates

Pipeline (Python, GitHub Actions CI)
  data/smart_refresh.py  Orchestrator: refreshes all standard contracts
  data/refresh.py        Multicall3 balance scanner
  data/refresh_ens.py    Incremental ENS deed scanner
  data/build_index.py    Shard builder + table_meta + total.json
  data/test_withdrawals.py  Tenderly simulation test suite
```

The address lookup path is optimized for cold starts: the API loads only `meta.json` (12KB) plus one shard file (~200KB average) per request, rather than the full 47MB index. Shards are keyed by the first two hex characters of the address (`0x3f...` → `3f.json`).

Protocol subpages are server-side rendered with embedded JSON data for TVL and activity charts, avoiding additional API calls after page load.

</details>

## Contributing

Know a defunct contract with stuck ETH? Open a PR or [submit it on the site](https://forgotteneth.com/submit).

Thanks to [banteg](https://github.com/banteg) for the CLI and [doublesharp](https://github.com/doublesharp) for The DAO integration.

## License

MIT
