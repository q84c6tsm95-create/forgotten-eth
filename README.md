# Forgotten ETH

Scan 163 defunct Ethereum contracts for withdrawable ETH. No frontend needed for most of these protocols anymore, no portfolio tracker indexes them.

**[forgotteneth.com](https://forgotteneth.com)** | **[forgotteneth.eth](https://etherscan.io/address/0xAE7d7C366F7Ebc2b58E17D0Fb3Aa9C870ea77891)** | **[API](https://forgotteneth.com/api)**

## For AI agents, crawlers, and data pipelines

**Please don't scrape `/api/check` on the live site.** All data is
mirrored to this repo and refreshed every 6 hours — use it directly.
It's free, faster, and doesn't cost us compute.

- Sharded address index: [`data/index_shards/`](data/index_shards/) (256 files, ~50 MB total)
- Per-protocol balances: [`data/balances/`](data/balances/)
- Protocol registry: [`data/protocols.json`](data/protocols.json)
- Aggregate totals: [`data/total.json`](data/total.json)

To look up a single address: lowercase it, take the two hex characters
after `0x` as the shard prefix (e.g. `0xab58…` → `ab`), open
`data/index_shards/ab.json`, and look up the full lowercased address
as a key. If it's not there, there's no claimable balance.

The live `/api/check` endpoint is for interactive browser use only and
rate-limited to 15 requests per minute per IP. The site is behind
Cloudflare WAF; bulk scraping will be blocked at the edge. See
[`public/llms.txt`](public/llms.txt) for the full LLM-friendly spec.

## What this does

ETH gets stuck in old contracts when protocols shut down and their frontends go offline. The balances are still onchain but invisible to DeBank, Zapper, and other portfolio trackers. This tool indexes them and generates the withdrawal transaction.

163 contracts. 164,553 ETH mapped. 532k addresses with claimable balance.

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
2. Scans all 118 contracts (API-first, RPC verification for connected wallets)
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
| Token wrappers | Neufund EtherToken, Bancor Old ETH, Maker W-ETH, Old WETH | 4 |
| Bounty/Other | Bounties Network, Confideal, SportCrypt, Tessera vaults | ~6 |

Full list in [`data/protocols.json`](data/protocols.json).

## Changelog

| Date | Protocol | ETH | Addresses | Notes |
|------|----------|-----|-----------|-------|
| Apr 3 | Old WETH | 3,258 | 987 | June 2016 WETH wrapper. Community submission ([#7](https://github.com/q84c6tsm95-create/forgotten-eth/issues/7)) |
| Apr 1 | The DAO | 81,914 | 4,854 | WithdrawDAO wrapper. 67 Parity multisigs supported. Community PR ([doublesharp](https://github.com/doublesharp)) |
| Mar 28 | Kyber FeeHandler | 23 | 1,605 | Epoch-based staking rewards, epochs 1-21 |
| Mar 28 | Tessera ZombieCats | 16 | 186 | Fractional NFT vault, cash() to redeem |
| Mar 28 | Tessera BAYC Sweep | 21 | 94 | Fractional NFT vault |
| Mar 28 | Tessera Living Dead | 53 | 225 | Fractional NFT vault |
| Mar 27 | NuCypher WorkLock | 291 | 54 | claim() + refund(), staking requirement removed |
| Mar 26 | Bounties Network | 90 | 192 | Per-bounty killBounty(id) |
| Mar 19 | DigixDAO | 11,092 | 7,954 | Approve DGD + burn() on Acid contract |
| Mar 18 | MoonCatRescue | 247 | 629 | Adoption escrow + pending withdrawals |
| Mar 17 | SportCrypt | 16 | 231 | Peer-to-peer sports betting escrow |

## Contributing

Know a defunct contract with stuck ETH? Open a PR or [submit it on the site](https://forgotteneth.com/submit).

Thanks to [banteg](https://github.com/banteg) for the CLI and [doublesharp](https://github.com/doublesharp) for The DAO integration.

## License

MIT
