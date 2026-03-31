# Forgotten ETH

Find and recover ETH stuck in defunct smart contracts on Ethereum.

**[forgotten-eth.vercel.app](https://forgotten-eth.vercel.app)**

## What is this?

Thousands of ETH sit forgotten in old DEXes, NFT marketplaces, ENS auctions, and ICO contracts that shut down years ago. Portfolio trackers like DeBank, Zerion, and Zapper don't index these balances. The ETH is still onchain — it just doesn't show up.

This tool checks 116 defunct contracts for unclaimed balances and facilitates withdrawals directly to the user's wallet.

## How it works

1. Paste any Ethereum address or connect a wallet
2. 116 defunct contracts are checked for unclaimed balances
3. If found, click Withdraw — the transaction goes directly from the original contract to the wallet

No custody of funds at any point. Every withdrawal can also be done manually on Etherscan.

## Contracts tracked

- **Defunct DEXes** — EtherDelta (v0/v1/v2/v3), IDEX v1, Token.Store, SingularX, Joyso, ETHEN, Decentrex, Bitcratic, and 30+ forks
- **Dividend tokens** — PoWH3D and 30+ clones (CryptoMinerToken, DailyDivs, GandhiJi, Zethr, etc.)
- **Fomo3D family** — Fomo3D Long/Quick/Short, FoMoGame, ReadyPlayerONE, Lightning
- **NFT auctions** — MoonCatRescue, DADA Collectible, Age of Dinos, PersonaBid
- **ENS old registrar** — Unreleased deed deposits from the original .eth auction system
- **Bounty platforms** — Bounties Network (StandardBounties v1)
- **Token wrappers** — Neufund EtherToken, Bancor Old ETH Token, Maker W-ETH
- **Other** — Confideal ICO refunds, SportCrypt

## Security

- No token approvals for most withdrawals. A few contracts require a token burn or two-step process — the UI explains each case.
- No proxy contracts or intermediaries
- Withdrawals go directly from the original contract to the wallet
- Fully open source — audit the code yourself

## Contributing

Know a defunct contract with stuck ETH that should be added? Open a PR or file an issue.

## License

MIT
