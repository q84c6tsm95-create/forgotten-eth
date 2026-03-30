# Forgotten ETH

Find and recover ETH stuck in defunct smart contracts on Ethereum.

**[forgotteneth.com](https://forgotteneth.com)**

## What is this?

Thousands of ETH sit forgotten in old DEXes, NFT marketplaces, ENS auctions, and ICO contracts that shut down years ago. Portfolio trackers like DeBank, Zerion, and Zapper don't index these balances. The ETH is still onchain — it just doesn't show up.

This tool checks 116 defunct contracts for unclaimed balances and facilitates withdrawals directly to the user's wallet.

## How it works

1. Paste any Ethereum address or connect a wallet
2. 116 defunct contracts are checked for unclaimed balances
3. If found, click Withdraw — the transaction goes directly from the original contract to the wallet

Every withdrawal can also be done manually on Etherscan.

## Contracts tracked

- **Defunct DEXes** — EtherDelta (v0/v1/v2/v3), IDEX v1, Token.Store, SingularX, Joyso, ETHEN, Decentrex, Bitcratic, and 30+ forks
- **Dividend tokens** — PoWH3D and 30+ clones (CryptoMinerToken, DailyDivs, GandhiJi, Zethr, etc.)
- **Fomo3D family** — Fomo3D Long/Quick/Short, FoMoGame, ReadyPlayerONE, Lightning
- **NFT auctions** — MoonCatRescue, DADA Collectible, Age of Dinos, PersonaBid
- **ENS old registrar** — Unreleased deed deposits from the original .eth auction system
- **DAO treasuries** — DigixDAO dissolution refund (DGD burn for ETH)
- **ICO escrows** — NuCypher WorkLock, Neufund LockedAccount, Confideal
- **Bounty platforms** — Bounties Network (StandardBounties v1)
- **Token wrappers** — Neufund EtherToken, Bancor Old ETH Token, Maker W-ETH
- **Other** — Tessera vaults, Kyber FeeHandler, SportCrypt

## Security

- No token approvals for most withdrawals. A few contracts require a token burn or two-step process — the UI explains each case.
- No proxy contracts or intermediaries
- Withdrawals go directly from the original contract to the wallet
- Fully open source — audit the code yourself

## Submit a contract

Know a defunct contract with stuck ETH that should be added? [Open an issue](https://github.com/q84c6tsm95-create/forgotten-eth/issues/new).

## License

MIT
