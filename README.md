# Forgotten ETH

Scan 193 defunct Ethereum contracts for withdrawable ETH. No frontend needed for most of these protocols anymore, no portfolio tracker indexes them.

**[forgotteneth.com](https://forgotteneth.com)** | **[Donations](https://etherscan.io/address/0x95a708aAAB1D336bB60EF2F40212672F4cf65736)** | **[API](https://forgotteneth.com/api)**

## For AI agents, crawlers, and data pipelines

**Please don't scrape `/api/check` on the live site.** All data is
mirrored to this repo and refreshed on the scheduled refresh cycle — use it directly.
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
rate-limited to 30 requests per minute per IP. The site is behind
Cloudflare WAF; bulk scraping will be blocked at the edge. See
[`public/llms.txt`](public/llms.txt) for the full LLM-friendly spec.

## What this does

ETH gets stuck in old contracts when protocols shut down and their frontends go offline. The balances are still onchain but invisible to DeBank, Zapper, and other portfolio trackers. This tool indexes them and generates the withdrawal transaction.

193 contracts. 157,640 ETH mapped. 552k addresses with claimable balance. 11,497 ETH already withdrawn by 586 unique claimers since launch.

## CLI

By [banteg](https://github.com/banteg).

```bash
npm install
npm run check:address -- 0xe1bdff947510a8e9623cf7f3c6cf6fe5e37c16b8
```

Uses Multicall3 to batch-check all contracts with a direct `view` balance function against a public RPC. Skips protocols where balances are token-derived, multi-item, or require precomputed discovery (ENS old registrar, DigixDAO, The DAO, Aave v1, Augur v1, MoonCatRescue, Kyber FeeHandler, Bounties Network, Tessera vaults, Ethfinex Trustless, KeeperDAO, Celer Payment Channels, etc.). For those, fetch `data/balances/<key>_eth_balances.json` directly.

```
npm run check:address -- vitalik.eth              # ENS resolution
npm run check:address -- 0x... --json             # machine-readable output
npm run check:address -- 0x... --rpc <url>        # custom RPC
```

## Web

1. Paste address or connect wallet
2. Scans all 193 contracts (API-first, RPC verification for connected wallets)
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
| Token wrappers | Neufund EtherToken, W-ETH (Maker), Old WETH (June 2016) | 3 |
| WETH pools | GenesisWethPool, DxMgnPool, Hegic CALL, Mesa, UMA Yield Dollar, Unagii, Opyn v1 | ~8 |
| ICO refund vaults | 17 OpenZeppelin RefundableCrowdsale ICOs (Vuepay, POP, Veil, GavCoin, etc.) | ~17 |
| Options / yield | Opyn v1 / v2 Gamma, KeeperDAO kToken pools | 3 |
| Payment channels | Celer (intendWithdraw → confirmWithdraw) | 1 |
| Bounty/Other | Bounties Network, Confideal, SportCrypt, Tessera vaults | ~6 |

Full list in [`data/protocols.json`](data/protocols.json).

## Changelog

| Date | Protocol | ETH | Addresses | Notes |
|------|----------|-----|-----------|-------|
| Apr 15 | Celer Payment Channels | 151 | 1,551 | Unilateral intendWithdraw → 10k-block window → confirmWithdraw (OSP slice excluded) |
| Apr 13 | GavCoin | 47 | 115 | 2015 bonding-curve ICO, per-user refund |
| Apr 13 | Veil Ether | 57 | 376 | Veil prediction-market WETH escrow |
| Apr 12 | Opyn v1 + Unagii | 56 | 126 | oToken vault collateral + uETH share vault |
| Apr 12 | UMA Yield Dollar | 267 | 185 | 6 ExpiringMultiParty contracts, settleExpired() per-EMP |
| Apr 11 | Mesa / Gnosis Protocol v1 | — | 116 | requestWithdraw → wait one batch (5 min) → withdraw |
| Apr 10 | WETH pools batch | 289 | — | GenesisWethPool + DxMgnPool + Hegic CALL |
| Apr 8 | KeeperDAO | 426 | 296 | Per-kToken approve+withdraw; ETH + WETH bundled |
| Apr 7 | Refund vaults | 201 | — | 17 OZ RefundableCrowdsale ICOs (Vuepay, POP, etc.) |
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

## Notifications

Want a heads-up when a new protocol unlocks ETH for an address you care about? Talk to [@forgottenETH_bot](https://t.me/forgottenETH_bot) on Telegram — `/watch 0x…` and you'll get a DM the next time a new contract matches. Or subscribe to the [RSS feed](https://forgotteneth.com/feed.xml).

## License

MIT
