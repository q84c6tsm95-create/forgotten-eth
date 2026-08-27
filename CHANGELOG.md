# Changelog

Protocol additions and notable Forgotten ETH changes live here instead of in the README.

Canonical web page: https://forgotteneth.com/changelog
RSS: https://forgotteneth.com/feed.xml

## August 2026

### Aug 27 — AimBot (+66 ETH)
Added the dividend tracker behind AimBot, an August 2023 Telegram trading-bot token that paid holders a share of revenue in ETH. Revenue deposits stopped that October, but the tracker was never closed. 66.02 ETH across 4,029 addresses; the sum of individual claims matches the tracker balance to the wei. Selling AIMBOT never forfeited accrued dividends. A further 2.29 ETH accrued to the burn address and is excluded as unclaimable.

### Aug 6 — Set Protocol (TokenSets) (+527 ETH)
Added the Set Protocol vault behind TokenSets, the automated portfolio product that ran from 2019 to 2021. Redemption was never disabled. 526.58 of the vault's 530.54 WETH is mapped across 1,382 addresses (99.25% coverage). Holdings nest three deep — wallet holds a rebalancing Set, which holds a collateral Set, which owns the WETH — so each position redeems separately.

### Aug 6 — dYdX Solo Margin (+1,692 ETH)
Added dYdX's original 2019 lending and margin market. All four markets remain solvent and every supplier balance is still withdrawable: 1,692 WETH plus 855k USDC and 1.58M DAI across 29,632 addresses at 99.96% coverage. Balances sit in numbered sub-accounts, so one wallet can hold several positions, each withdrawn with its own `operate()` call.

### Aug 6 — Uniswap UNI Airdrop (12.5M UNI)
Added the September 2020 UNI genesis distribution. The distributor never expired and was never swept, but the interface serving merkle proofs was retired. 12,535,161 UNI across 30,760 addresses is still unclaimed; proofs are recomputed against the on-chain merkle root and unclaimed status read from the contract's own bitmap.

## July 2026

### Jul 24 — SingularX Fund (+386 ETH)
Added the SingularDTVFund reward pool behind the 2017 SingularX exchange (ConsenSys Tokit). It banked ETH trading fees for SNGX holders and still holds 386.5 ETH, fully backed and distributed pro-rata across 10,121 holders.

### Jul 11 — Omen / Conditional Tokens (+168 ETH)
Added the Gnosis Conditional Tokens framework, the settlement layer behind Omen prediction markets. Collateral from resolved markets that was never redeemed — ~168 ETH-equivalent in USDC, DAI, WETH and more across 511 addresses, redeemed per market.

### Jul 7 — POW NFT (+72.3 ETH)
Added POW NFT, a 2021 proof-of-work mineable ERC-721 where every token banks a share of the mining fees paid by all later tokens. 72.31 ETH claimable across 847 owners via per-token `withdraw(tokenId, withdrawUntil)`, verified against 15,117 historical Withdraw events.

## June 2026

### Jun 29 — PandaDAO Farewell and R1Exchange (+197 ETH)
Added PandaDAO PANDA-to-ETH farewell refunds and R1Exchange per-channel ETH withdrawals after source review, Sourcify/onchain data reconstruction, and local anvil fork payout proofs.

### Jun 12 — DutchX dx_2 + dx_3 (+155 WETH/ETH)
Added unclaimed DutchX withdrawal balances and auction settlement positions, with SAI sub-balances kept explicit.

### Jun 11 — DigiPulse, DirectCrypt, QCO, and three more failed ICO refunds (+275 ETH)
Integrated six externally submitted 2017–2018 refund contracts after source and local-fork verification. Five are single-call refunds; ZeroTraffic requires a permissionless `endCrowdsale()` state transition before each contributor calls `refund()`.

### Jun 8 — Hegic WBTC Pool (+3.346 WBTC)
Added the deprecated Hegic `writeWBTC` pool with a partial-liquidity model based on live `availableBalance()`.

### Jun 8 — MarketingMining (+35 token positions)
Added the March 2021 NFTX/Shard-era MarketingMining contract. Live per-pool positions span WBTC, WETH, USDT, B20, MEME, MUSE, RARI, WHALE, NFTX, MANA, and SAND.

### Jun 3 — P4RTY DAO Vault (+0.43 ETH)
Added dividend ETH claims for remaining P4RTY DAO vault stakers.

### Jun 3 — Lido AnchorVault (+237 stETH)
Added Ethereum-side bETH redemption into stETH for self-claimable holders after Lido's Anchor integration was shut down.

### Jun 1 — HONG (+882 ETH)
Added duplicate HONG refund claims after source-level review of the 2016 token creation and refund logic.

### Jun 1 — EpikStaking (+8 ETH)
Moved EpikStaking into the normal claim flow after confirming the contract is unpaused and rewards are claimable through `claimReward()`.

## May 2026

### May 27 — Gro UST Compensation (+955K USDC)
Added fully vested Gro Protocol UST/Terra compensation claims, verified against the on-chain merkle root.

### May 9 — Trace sweep batches (+468 ETH)
Added fourteen more recovery paths found by tracing previously rejected or deferred candidates with expanded selectors and wei-exact `debug_traceCall` verification.

### May 8 — Presale pools, SpankChain, FoMo3D forks, NFT marketplaces, and staking pools (+1,686 ETH)
Added a set of unverified or abandoned contracts recovered through trace-based and BigQuery discovery: presale pools, SpankChain Auction, FoMo3D Ultra, Bingo4Beast, LD3D Official, CryptoCats v2, CryptoPhunks, CryptoCats marketplace, seven FoMo3D forks, ArbitrageETHStaking, and four refund-mode ICOs.

### May 7 — Ahoolee Token Sale (+191 ETH)
Added refund claims for the September 2017 Ahoolee ICO after confirming the sale finalized in refund mode.

### May 5 — Crab V2, MicroETH, WETH10, Collective Canvas, ConfinaleToken, Futurists (+222 ETH)
Added six contracts from a score-based candidate sweep, including Opyn Crab Strategy V2 shutdown claims and Collective Canvas per-NFT escrow withdrawals.

### May 3 — FEG Wrapped ETH (+46 ETH)
Added the Ethereum-side fETH wrapper with reflection-style accounting and a 1% withdrawal fee.

### May 3 — Foundation FETH (+307 ETH)
Added idle Foundation FETH bid-escrow balances after the marketplace shutdown.

### May 2 — MCDEX, Quantfury, Celer, and six more (+1,510 ETH)
Added nine verified old-contract recovery paths, including MCDEX Perpetual, Quantfury QDT, Monolith TKN Holder, Celer EthPool, and smaller legacy reward or refund contracts.

## April 2026

### Apr 30 — PresalePool 2018 (+39 ETH)
Added an unpaused ICO presale pool with remaining `withdrawAll()` refunds.

### Apr 23 — Metadrop Webaverse, Metadrop Anata, X2Y2 Presale (+359 ETH/WETH)
Added frozen merkle refund roots for two Metadrop auctions and WETH rewards for X2Y2 presale participants.

### Apr 21 — Nomad Bridge Recovery (+100 WETH)
Added NFT-based WETH recovery claims from the Nomad post-exploit recovery contract, with allowlist status tracked by refreshes.

### Apr 17 — Gnosis Auction, X2Y2 Fee Sharing, Yearn v1 yWETH, Euler Redemptions, Tokemak v1 tWETH (+1,590 WETH)
Added abandoned WETH positions across auction refunds, fee-sharing rewards, old vault shares, exploit-redemption merkle claims, and Tokemak withdrawal requests.

### Apr 12 — Opyn v1, Unagii, UMA Yield Dollar, Mesa, Opyn v2 Gamma (+823 ETH/WETH)
Added DeFi Summer-era option, vault, EMP, and batch-auction claims.

### Apr 10 — Twelve DeFi Summer protocols (+828 ETH/WETH)
Added Yam v1, Spaghetti, Doki Doki, CoFiX, Pkl v1, Shrimp, Bee2, Kitten, Hegic V1 Pool, Gnosis DutchX, Hegic V1 Call, and Pop Finance.

### Apr 8 — KeeperDAO / Rook (+426 ETH)
Added kETH and kwETH recovery paths from the old KeeperDAO/Rook pools.

### Apr 7 — Refund vaults and MasterChef WETH farms (+360 ETH/WETH)
Added five abandoned MasterChef WETH farms, four custom-flow ICO refunds, eleven more refund-vault ICOs, and seventeen OpenZeppelin refund-vault ICOs.

### Apr 5 — Switcheo, Unknown DEX, Avastars, Ethfinex Trustless (+1,619 ETH)
Added cross-chain DEX withdrawals, an EtherDelta-style DEX, NFT mint refunds, and two Ethfinex WrapperLockEth contracts.

### Apr 4 — Aave v1 (+941 ETH)
Added aETH redemption for Aave v1 after official UI support was dropped.

### Apr 3 — Augur v1 and Old WETH (+3,695 ETH)
Added Augur v1 mailbox/order/share claim paths and the June 2016 Old WETH wrapper.

### Apr 1 — The DAO (+81,914 ETH)
Added WithdrawDAO claims with support for detected Parity multisigs.

## March 2026

Initial launch and first recovery batches: IDEX v1, EtherDelta, Token.Store, MoonCatRescue, ENS Old Registrar, FoMo3D, PoWH3D, Maker W-ETH, Neufund, DigixDAO, NuCypher WorkLock, Bounties Network, Kyber FeeHandler, Tessera vaults, and related early DEX, NFT, refund, and dividend-token contracts.
