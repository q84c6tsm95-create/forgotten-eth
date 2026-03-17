# Forgotten ETH

A free tool to find and recover ETH stuck in defunct smart contracts on Ethereum.

**Live site:** [forgotten-eth.vercel.app](https://forgotten-eth.vercel.app)

## What is this?

Thousands of ETH remain locked in old DEXes, ENS auctions, ICO contracts, NFT marketplaces, and gambling games that shut down years ago. Portfolio trackers like DeBank, Zerion, and Zapper do not detect these balances.

This tool scans 22 contracts and lets you withdraw directly — no fees, no middlemen. Your ETH goes straight from the original contract to your wallet.

## Contracts tracked

**DEX:** IDEX v1, EtherDelta v0/v1/v2, Token.Store, SingularX, Joyso, ETHEN, Decentrex, Bitcratic, EtherC, EnclavesDex, Unknown DEX

**ENS:** Old Registrar (deed release)

**Gambling:** Fomo3D Long, Fomo3D Quick, Fomo3D Short

**ICO / Token Wrappers:** Confideal, Neufund EtherToken, Bancor Old ETH Token

**NFT / Collectibles:** DADA, MoonCatRescue

## How it works

1. Connect your wallet or enter any Ethereum address
2. The tool checks all 22 contracts for unclaimed balances
3. If a balance is found, click Withdraw to sign a transaction directly with the original contract
4. ETH is sent to your wallet — we never have custody of your funds

## Tech stack

- Pure static SPA (vanilla HTML/CSS/JS, no framework)
- ethers.js v6 for wallet interaction
- Vercel serverless functions for API
- Balance data pre-computed via onchain scanning

## Security

- All withdraw calls go directly to the original smart contracts
- No proxy contracts, no intermediary
- API rate-limited and session-authenticated
- Source code is fully open for audit

## License

MIT
