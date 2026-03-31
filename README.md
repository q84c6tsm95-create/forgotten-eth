# Forgotten ETH

Find and recover ETH stuck in defunct smart contracts on Ethereum.

**[forgotteneth.com](https://forgotteneth.com)**

> This is the public mirror of the private development repo. Code and data are synced after each release. The data pipeline and outreach tooling are not included.

## What is this?

Thousands of ETH sit forgotten in old DEXes, NFT marketplaces, ENS auctions, and ICO contracts that shut down years ago. Portfolio trackers like DeBank and Zapper don't index these balances. The ETH is still onchain, it just doesn't show up.

This tool checks 116 defunct contracts for unclaimed balances and facilitates withdrawals directly to the user's wallet.

## How it works

1. Paste any Ethereum address or connect a wallet
2. 116 defunct contracts are checked for unclaimed balances
3. If found, click Withdraw — the transaction goes directly from the original contract to the wallet

No custody of funds at any point. Every withdrawal can also be done manually on Etherscan.

## CLI

Check the direct-view contracts locally with a public mainnet RPC:

```bash
npm install
npm run check:address -- 0xe1bdff947510a8e9623cf7f3c6cf6fe5e37c16b8
```

Notes:

- The CLI uses `Multicall3` for contracts that expose a direct per-address `view` balance function.
- It skips protocols that need precomputed or offchain discovery, such as ENS old registrar, Kyber FeeHandler, and Bounties Network.
- Add `--json` for machine-readable output or `--rpc <url>` to override the public RPC.

## Data

The `data/` directory contains the full balance dataset:

- `data/balances/` — 116 JSON files with per-address ETH balances for each protocol
- `data/index_shards/` — address lookup index (256 prefix-sharded files)
- `data/table_meta/` — per-protocol statistics, distribution, activity charts, TVL history
- `data/protocols.json` — protocol metadata (contract addresses, categories)
- `data/total.json` — aggregate totals

All data is derived from public onchain state via Multicall3 balance queries.

## Contracts tracked

- **Defunct DEXes** — EtherDelta (v0/v1/v2/v3), IDEX v1, Token.Store, SingularX, Joyso, ETHEN, Decentrex, Bitcratic, and 30+ forks
- **Dividend tokens** — PoWH3D and 30+ clones (CryptoMinerToken, DailyDivs, GandhiJi, Zethr, etc.)
- **Fomo3D family** — Fomo3D Long/Quick/Short, FoMoGame, ReadyPlayerONE, Lightning, Last Winner
- **NFT auctions** — MoonCatRescue, DADA Collectible, Age of Dinos, PersonaBid
- **ENS old registrar** — Unreleased deed deposits from the original .eth auction system
- **DAO refunds** — DigixDAO (Acid burn contract), NuCypher WorkLock
- **Token wrappers** — Neufund EtherToken + LockedAccount, Bancor Old ETH Token, Maker W-ETH
- **Other** — Bounties Network, Confideal, SportCrypt, Tessera/Fractional Art vaults

## Contributing

Know a defunct contract with stuck ETH? [Open an issue](https://github.com/q84c6tsm95-create/forgotten-eth/issues/new) with the contract address or protocol name.

## License

MIT
