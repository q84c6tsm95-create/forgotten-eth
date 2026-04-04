# Changelog

All protocol additions and notable changes to [Forgotten ETH](https://forgotteneth.com).

## April 2026

### Augur v1 — +437 ETH
*April 3, 2026*

Ethereum's first prediction market (July 2018). 437 ETH across mailbox Cash withdrawals, open order cancellations, and winning share redemptions. 973 addresses.

### Old WETH — +3,258 ETH
*April 3, 2026*

June 2016 ETH wrapper predating Maker W-ETH and WETH9. Simple `withdraw(uint256)`. 987 addresses, 100% coverage. Community submission ([#7](https://github.com/q84c6tsm95-create/forgotten-eth/issues/7)).

### The DAO — +81,914 ETH
*April 1, 2026*

WithdrawDAO wrapper. Approve DAO tokens, then `withdraw()` for 1:1 ETH. 4,854 addresses. 67 Parity multisigs (3,101 ETH) auto-detected. Community PR ([doublesharp](https://github.com/doublesharp)).

### Aave v1 — +941 ETH
*April 4, 2026*

Original Aave lending pool (January 2020). Users redeem aETH tokens for ETH via `redeem()`. Official UI dropped v1 support. 3,509 addresses.

## March 2026

### Kyber FeeHandler — +23 ETH
*March 28, 2026*

Epoch-based staking rewards. `claimStakerReward(staker, epoch)` for epochs 1-21. 1,605 addresses.

### Tessera Vaults — +89 ETH
*March 28, 2026*

Three fractional NFT vaults (Party of Living Dead, Dingaling BAYC Sweep, ZombieCats). Burn fraction tokens via `cash()` for proportional ETH. 505 addresses total.

### NuCypher WorkLock — +291 ETH
*March 27, 2026*

WorkLock staking refunds. `claim()` then `refund()`. Staking requirement removed after Threshold merger. 54 addresses, 100% refundable.

### Bounties Network — +90 ETH
*March 26, 2026*

Decentralized bounty platform. Per-bounty `killBounty(bountyId)`. 192 addresses with unique bounty IDs.

### DigixDAO — +11,092 ETH
*March 19, 2026*

DAO dissolution refund. Approve DGD to Acid contract, then `burn()`. Fixed rate 0.193 ETH per DGD. 7,954 addresses.

### MoonCatRescue — +247 ETH
*March 18, 2026*

2017 NFT contract with adoption escrow and pending withdrawals. 629 addresses.

### SportCrypt — +16 ETH
*March 17, 2026*

Peer-to-peer sports betting escrow. Standard `withdraw(amount)`. 231 addresses.

### DADA Collectible — +11 ETH
*March 16, 2026*

Early NFT art marketplace. Pending auction withdrawals. 476 addresses.

### Neufund — +3,418 ETH
*March 15, 2026*

EtherToken wrapper + LockedAccount. 2-step flow for locked deposits (approveAndCall + withdraw). 44% of depositors blocked (no NEU tokens). 500 addresses.

---

For the full list of all 120 tracked contracts, see [`data/protocols.json`](data/protocols.json).
