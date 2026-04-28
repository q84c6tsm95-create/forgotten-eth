# Changelog

All protocol additions and notable changes to [Forgotten ETH](https://forgotteneth.com).

---

## 🟢 April 2026

### P4RTY DAO Vault — `+0.43 ETH` · 56 addresses
> **Category:** Dividend Vault · **Contract:** [`0x9465A...E1ef878`](https://etherscan.io/address/0x9465A32618a9172b3c14d82cecdCa788dE1ef878) · **Added:** April 28

2018 p4rty.io staking vault. P4RTY holders staked tokens into the DAO vault; ETH sent to the vault was distributed pro-rata as dividends. The old frontend is gone, but accumulated dividends are still a clean `withdraw()` call. Staked P4RTY itself stays in the vault — only dividend ETH is recovered here.

---

### Aave v1 — `+941 ETH` · 3,509 addresses
> **Category:** DeFi Lending · **Contract:** [`0x3a3A65...d37d08c04`](https://etherscan.io/address/0x3a3A65aAb0dd2A17E3F1947bA16138cd37d08c04) · **Added:** April 4

Original Aave lending pool (January 2020). Users redeem aETH tokens for ETH via `redeem()`. Official UI dropped v1 support — deposits only accessible through direct contract interaction.

---

### Augur v1 — `+437 ETH` · 973 addresses
> **Category:** Prediction Market · **Contract:** [`0xd5524...76B96b`](https://etherscan.io/address/0xd5524179cB7AE012f5B642C1D6D700Bbaa76B96b) · **Added:** April 3

Ethereum's first decentralized prediction market (July 2018). Three claim paths: mailbox Cash withdrawals, open order cancellations via `cancelOrder()`, and winning share redemptions via `claimTradingProceeds()`.

---

### Old WETH — `+3,258 ETH` · 987 addresses
> **Category:** Token Wrapper · **Contract:** [`0xECF8F...501d6A7`](https://etherscan.io/address/0xECF8F87f810EcF450940c9f60066b4a7a501d6A7) · **Added:** April 3

June 2016 WETH wrapper — one of the first attempts at wrapping native ETH into an ERC-20 token. Predates both Maker W-ETH and the canonical WETH9. Simple `withdraw(uint256)`. 100% coverage. Community submission ([#7](https://github.com/q84c6tsm95-create/forgotten-eth/issues/7)).

---

### The DAO — `+81,914 ETH` · 4,854 addresses
> **Category:** DAO Refund · **Contract:** [`0xbf4ed...ca754`](https://etherscan.io/address/0xbf4ed7b27f1d666546e30d74d50d173d20bca754) · **Added:** April 1

WithdrawDAO wrapper for the 2016 DAO hack recovery. Approve DAO tokens to WithdrawDAO, then `withdraw()` for 1:1 ETH. 67 Parity multisig wallets (3,101 ETH) auto-detected via Multicall3 `isOwner()` — owners see dedicated recovery buttons. Community PR by [doublesharp](https://github.com/doublesharp).

---

## 🟢 March 2026

### Kyber FeeHandler — `+23 ETH` · 1,605 addresses
> **Category:** DeFi Staking · **Contract:** [`0xd3d2b...1c257b4`](https://etherscan.io/address/0xd3d2b4906276b80e20a73345c67f0aa8e87ab500) · **Added:** March 28

Epoch-based KNC staking rewards from Kyber Network. `claimStakerReward(staker, epoch)` for epochs 1 through 21. Contracts are immutable — rewards never expire.

---

### Tessera Vaults — `+89 ETH` · 505 addresses
> **Category:** Fractional NFT · **Added:** March 28

Three fractional NFT vaults from Tessera (formerly Fractional Art):
- 🖼 **Party of Living Dead** — 53 ETH, 225 holders
- 🐒 **Dingaling BAYC Sweep** — 21 ETH, 94 holders
- 🐱 **ZombieCats** — 16 ETH, 186 holders

Burn fraction tokens via `cash()` for proportional ETH from the vault.

---

### NuCypher WorkLock — `+291 ETH` · 54 addresses
> **Category:** Staking Refund · **Contract:** [`0xe9778...d998c0`](https://etherscan.io/address/0xe9778e69a961e64d3cdbb34cf6778281d34667c2) · **Added:** March 27

WorkLock participants deposited ETH to receive NU tokens for staking. After the Threshold Network merger, the staking requirement was removed (escrow stub returns `totalSupply`). All 291 ETH is fully refundable via `claim()` + `refund()`.

---

### Bounties Network — `+90 ETH` · 192 addresses
> **Category:** Bounty Platform · **Contract:** [`0x2af47...8e0400`](https://etherscan.io/address/0x2af47a65da8cd66729b4209c22017d6a5c2d2400) · **Added:** March 26

ConsenSys bounty platform (December 2017). Bounty issuers who never killed or fulfilled their bounties have ETH locked. Per-bounty withdrawal via `killBounty(bountyId)` — each user has unique bounty IDs.

---

### DigixDAO — `+11,092 ETH` · 7,954 addresses
> **Category:** DAO Dissolution · **Contract:** [`0x23Ea...10CC`](https://etherscan.io/address/0x23Ea10CC1e6EBdB499D24E45369A35f43627062f) · **Added:** March 19

DAO dissolution refund. DGD token holders approve tokens to the Acid contract, then call `burn()`. Fixed rate: 0.193 ETH per DGD. The DAO voted to dissolve and return remaining ETH to token holders.

---

### MoonCatRescue — `+247 ETH` · 629 addresses
> **Category:** NFT · **Contract:** [`0x60cd8...4ab6`](https://etherscan.io/address/0x60cd862c9c687a9de49aecdc3a99b74a4fc54ab6) · **Added:** March 18

2017 generative NFT contract with adoption escrow deposits and pending withdrawals. Note: 100.8 ETH at `address(0)` is permanently stuck due to a genesis cat assignment bug.

---

### SportCrypt — `+16 ETH` · 231 addresses
> **Category:** Betting · **Contract:** [`0x37304...19232`](https://etherscan.io/address/0x37304b0ab297f13f5520c523102797121182fb5b) · **Added:** March 17

Peer-to-peer sports betting escrow. Standard `withdraw(amount)` pattern.

---

### DADA Collectible — `+11 ETH` · 476 addresses
> **Category:** NFT Art · **Contract:** [`0x06869...4ab6`](https://etherscan.io/address/0x068696a3cf3c4676b65f1c9975dd094260109d02) · **Added:** March 16

Early NFT art marketplace. Pending auction withdrawals from unsold art.

---

### Neufund — `+3,418 ETH` · 500 addresses
> **Category:** Token Wrapper · **Added:** March 15

EtherToken wrapper + LockedAccount. Two claim paths:
- **EtherToken** — simple WETH-style `withdraw()`, 3 addresses
- **LockedAccount** — 2-step: `approveAndCall()` on NEU token (burns NEU + returns ETH-T), then `withdraw()` on EtherToken. ⚠️ 44% of depositors (1,501 ETH) are blocked — they don't hold enough NEU tokens.

---

*For the full list of all 194 tracked contracts, see [`data/protocols.json`](data/protocols.json).*
