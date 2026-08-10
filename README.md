# Forgotten ETH

Forgotten ETH indexes old Ethereum contracts that still owe users withdrawable ETH, WETH, stablecoins, or other recoverable tokens after the original frontend disappeared.

**[forgotteneth.com](https://forgotteneth.com)** · **[API](https://forgotteneth.com/api)** · **[Changelog](https://forgotteneth.com/changelog)** · **[RSS](https://forgotteneth.com/feed.xml)** · **[forgotten-eth.eth](https://etherscan.io/address/0x95a708aAAB1D336bB60EF2F40212672F4cf65736)**

Current public index:

- 290 tracked recovery contracts
- 168,031.68 ETH mapped to claimable balances
- 645,569 addresses with at least one mapped balance
- 17,689.77 ETH already claimed by 9,579 wallets since launch

Totals are generated from [`data/total.json`](data/total.json).

## What it does

Many protocols shut down before every user withdrew. Their contracts are still onchain, but the balances are usually invisible to portfolio trackers because each protocol used its own accounting model.

Forgotten ETH keeps a public recovery index for those contracts:

1. Find an address on the site or through the public data files.
2. Review the protocol and claim path.
3. Send the original contract's withdrawal transaction from your wallet.

There is no custody layer and no intermediate recovery contract. Standard claims do not require token approvals. A few legacy protocols, such as The DAO, DigixDAO, Neufund, and some token vaults, require the same token burn, approval, or multi-step flow designed into the original contract.

## Public data

The mirror repo contains the data needed to check balances without hitting the live `/api/check` endpoint:

- [`data/index_shards/`](data/index_shards/) — address lookup shards
- [`data/balances/`](data/balances/) — per-protocol balance files
- [`data/protocols.json`](data/protocols.json) — protocol registry
- [`data/protocol_info.json`](data/protocol_info.json) — descriptions and display metadata
- [`data/total.json`](data/total.json) — aggregate totals

For a single-address lookup, lowercase the address, take the two hex characters after `0x` as the shard prefix, and read `data/index_shards/<prefix>.json`. If the full lowercase address is absent from that shard, the public index has no mapped balance for it.

Example: `0xab58…` lives in `data/index_shards/ab.json`.

The live `/api/check` endpoint is rate-limited and intended for interactive site use. Bulk users should read the repository data or the documented public endpoints instead.

## Public API

API docs are at [forgotteneth.com/api](https://forgotteneth.com/api).

Common endpoints:

- `GET /api/check?address=0x...`
- `GET /api/summary`
- `GET /api/table`
- `GET /api/total`
- `GET /api/stats`
- `GET /api/claims`

The address index is usually better than `/api/check` for crawlers, agents, and repeated lookups.

## Coverage

The index covers several old-contract families:

- EtherDelta-style DEXes and forks
- PoWH3D / Hourglass / FoMo3D-style dividend and game contracts
- old registrars, refund vaults, and ICO recovery contracts
- WETH, aETH, stETH, and other wrapper or vault positions
- abandoned DeFi reward pools and staking contracts
- old NFT marketplaces, auction escrows, and fractional vaults
- DAO, bridge, and exploit-recovery claim contracts

The full contract list is in [`data/protocols.json`](data/protocols.json). User-facing protocol notes live in [`data/protocol_info.json`](data/protocol_info.json).

## Changelog

Protocol additions are tracked outside this README:

- [`CHANGELOG.md`](CHANGELOG.md)
- [forgotteneth.com/changelog](https://forgotteneth.com/changelog)
- [RSS feed](https://forgotteneth.com/feed.xml)

## Notifications

Telegram watch alerts are available through [@forgottenETH_bot](https://t.me/forgottenETH_bot):

```text
/watch 0x...
```

The bot sends a DM when a future protocol addition makes that address eligible.

## Contributing

Know a defunct contract with stuck user balances? Open a PR or submit it at [forgotteneth.com/submit](https://forgotteneth.com/submit).

Useful evidence for a candidate:

- contract address
- source or ABI, if available
- current token/ETH balance
- ordinary-user withdrawal path
- event or storage evidence for user balances
- any reason a claim might be blocked, partial, admin-only, or insolvent

## Contributors

- [banteg](https://github.com/banteg)
- [doublesharp](https://github.com/doublesharp)
- [webmixgamer](https://github.com/webmixgamer)
- [ylasgamers](https://github.com/ylasgamers)

## For agents, crawlers, and data pipelines

Do not scrape `/api/check` for bulk work. Use the mirrored data files instead.

Recommended lookup path:

1. Lowercase the target address.
2. Load `data/index_shards/<first-two-hex-chars>.json`.
3. Look up the full lowercase address as a key.
4. Follow each returned protocol key to `data/balances/<key>_..._balances.json` and `data/protocols.json` for details.

See [`public/llms.txt`](public/llms.txt) for the LLM-oriented data contract.

## License

MIT
