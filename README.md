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

## Contributing

Know a defunct contract with stuck ETH? Open a PR or [submit it on the site](https://forgotteneth.com/submit).

Thanks to [banteg](https://github.com/banteg) for the CLI and [doublesharp](https://github.com/doublesharp) for The DAO integration.

## License

MIT
