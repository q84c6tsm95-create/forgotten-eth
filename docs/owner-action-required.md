# Owner Action Required: Unlockable ETH Findings

**Status**: verified via Tenderly bundle simulation + local fork/on-chain re-checks (2026-05-05 through 2026-06-01); BigQuery owner-gate additions merged 2026-05-08; EpikStaking moved to direct Forgotten ETH integration 2026-06-01
**Data snapshots**: 2026-05-04 (initial scan), 2026-05-05 (verification + reclass), 2026-05-08 (BigQuery owner-gated sweep)
**Scope**: contracts holding ETH where recovery requires either an admin action OR a re-evaluation of a prior over-broad rejection rule

This is a working document; the per-contract verdicts have been updated as new evidence emerged.

## Summary

| Bucket | Contracts | ETH at stake | Status | User outcome |
|---|---:|---:|---|---|
| **Type A — Paused user claims** | **1 locally verified / 1 reverting-path pending** | **161.02 locally verified / 42.57 pending** | Transit locally verified; Tito owner path reverts in current state | Owner unpauses → users claim themselves |
| Type A reclassified (false-positive paused tag) | 9 | 169.34 | Pause heuristic over-fired; not actually paused | Reclassified to either Type B or Type C |
| Type B — Admin sweep required | 41 | 698.62 | Owner-only sweep; users need offchain refund | Project-led distribution |
| Type C — Re-verifiable/direct integrations | 5 | 1,227+ | Previously rejected or misbucketed, now mechanical/user-callable | INTEGRATE into Forgotten ETH |
| Type D — BigQuery owner/gate unlock additions | 6 | 654.75 | 4 locally verified / 1 partial / 1 pending | Outreach or re-check after unlock |
| Legacy / inception-era blocked rejects appendix | 30+ | 9,000+ known + TBD | Older score/research rejects, not direct integrations | Institution, governance, operator, or legal/social action |
| **Total exact A-D tracked** | **63** | **~2,955+** | Multi-track | Four different paths; Epik now site-tracked |

The composition shifted significantly during 2026-05-05 verification: the original "12 paused contracts / 381 ETH" Type A was 9-out-of-12 over-classified by the bytecode investigator's pause-state heuristic. After bundle simulation and source re-read, only 3 of 12 are real pause-gated cases. The 2026-05-08 BigQuery additions are kept as a separate Type D bucket because they were discovered later and are owner/gate blocked before they can become user-actionable.

## Root cause patterns

These are not protocol exploits. The common failure modes are operational or classification errors:

1. **Type A — Paused-claim** — A contract holds ETH; user-callable claim/withdraw exists; gated by an owner-flippable flag (`paused` / `claimPause` / `surfPoolActive`). Original frontend or operations stopped mid-stream.
2. **Type B — Admin-sweep** — A contract holds ETH; only `withdraw()` / `withdrawAll()` is exposed and is `onlyOwner`; recovery requires the owner to sweep + forward to original users via off-chain distribution.
3. **Type C — Past rejects on policy disqualifier** — A contract was rejected at triage time because the parent project still had a live frontend or its position was tracked on DeBank/Zapper. Per the revised triage rule (`feedback_no_online_frontend_check`), these are mechanically valid recoveries; the policy disqualifier was over-broad.
4. **Type D — Owner/gate unlock** — A contract has a plausible user or original-contributor route, but the route is currently blocked by a project role, oracle, refund-state transition, bounty-state transition, or operator role. These should not be listed until the state changes or the user set is safely enumerable.

## Type A — Paused user claims (1 locally verified, 1 pending; EpikStaking moved to direct integration)

After Tenderly/local fork bundle simulation (tx1 = owner unblock action; tx2 = user claim; verify wei-exact ETH out), only TransitFinanceRefund remains verified in the pause-gated owner-action bucket. Tito stays pending because the currently exposed owner path reverts in local fork testing. EpikStaking was re-checked on 2026-06-01 and is already unpaused, so it has been moved into the normal Forgotten ETH user-claim integration path.

| ETH | Contract | Address | Owner | tx1 unblock | tx2 user call | Bundle verdict |
|---:|---|---|---|---|---|---|
| **161.02** | TransitFinanceRefund | `0xc213f258f4142f53d086f9edb7a36e67eb347f63` | `0x8576910497930b79a97a24de1acb0333399d0c55` (executor `0x7e5c1595…`) | `setClaim(false, 0)` | `claim()` | ✓ **WEI-EXACT VERIFIED**: `claimPause` slot 4 flips 1→0, then sample user `0x0ddb482f…` claims +0.0993 ETH |
| **42.57** | Tito Surf MasterChef | `0x6db1c1b318275df254bb47c63e7f316380baf4be` | `0xa81eac3009bd6e6cce36602d6851fda789ddc3bb` | pending: source exposes `activateSurfPool()`; tested owner path reverts with zero pool accounting | not locally proven | Pending/reverting, not PoC-verified |

### TransitFinanceRefund — solvency footnote

The refund pool is **structurally insolvent for unclaimed users**. State observed 2026-05-05:

- 621 users with refund entries set by the executor's `setRefunder(...)` calls
- 3,937.84 ETH of total entitlements committed
- 3,776.81 ETH already paid to 321 claimants (pre-pause)
- **300 unclaimed users hold 1,056.86 ETH in entitlements**, but **only 161.02 ETH remains in contract**

If the owner unpauses, claims will succeed FCFS until balance falls below the next claimer's entitlement. Smaller claimants (the 7 lowest are each 0.0993 ETH and would all succeed instantly) are safe; larger ones (top 5 are 50–333 ETH each) will revert at the safeTransferETH step once balance drops below their entitlement amount. The unblock is still net positive — 161 ETH gets distributed instead of permanently locked — but downstream UX should explain the FCFS dynamic.

## Type A reclassified (9 false positives, 169.34 ETH)

These were originally tagged paused by the bytecode investigator's `paused_state = bool(re.search(...))` heuristic, which matches any state-variable name containing "paused"/"enabled"/"isPaused". On source re-read, no admin function actually flips a gate that blocks user claims.

| Live ETH | Name | Address | Why the pause tag was wrong | Real classification |
|---:|---|---|---|---|
| 42.26 | ERC20Peg | `0x76bac85e1e82cd677faa2b3f00c4a2626c4c6e32` | No `unpause()` exists; "paused" matched a different state variable | Type B (admin-only ETH-out). **DRAINED 2026-05:** 42.25 ETH out at block 25,028,278 (tx `0x84e8be5b…970b`); now ~0.009 ETH |
| 40.20 | Treasury | `0xa0da53447c0f6c4987964d8463da7e6628b30f82` | Has `unpause()` but the user-callable ETH-out is `depositTokenForOLAS` (deposits, not withdraws); withdraw is admin-only | Type B |
| 29.72 | AvidlinesMinter | `0x43a113c71a26d04cb2e8938cd84883e181fcc304` | `owner()` returns 0x0 — not OZ Ownable; withdraw fns (`fpWithdrawal`, `generatorWithdrawal`) are admin-style | Type B |
| 17.40 | NeaMintTicketFactory | `0xfdeef424c147e869a9bb2723874186f06f36b386` | Not pause-gated; gated by `setMintTicketPublicSaleOpens(...)` timestamp (per-mint deadline). User claim already callable; just no entitlement | Type C-adjacent (per-user state, not pause) |
| 14.67 | GameChannel | `0xa867bf8447ec6f614ea996057e3d769b76a8aa0e` | No pause var in source. Bytecode investigator false-positive | Type C-adjacent (per-channel state) |
| 8.76 | DutchAuctionRefundMinter | `0xdb8fb781777bf70caea8e48b31ccf83c4e20f659` | No pause var. `refund()` is permissionless and works without admin call; users just need `refundAvailable(addr) > 0` | Direct user-callable; needs depositor enumeration |
| 6.00 | AltMint | `0x2cedd98d4ec9bc9cd51fc9ea9091da5664518dd2` | `owner()` returns 0x0 — not Ownable. `claimTokens(amount, signature)` is signature-gated, not pause-gated | Off-chain signed claim; not addressable |
| 5.63 | CalendarSteward | `0xb283c835410dc2c8429fbb38a410ce021e263c78` | No pause var. `withdrawBenefactorFundsTo(account)` requires caller to be the registered benefactor for that token | Per-benefactor mapping, similar to OZ PaymentSplitter |
| 5.10 | PPPArtworkAuction | `0x720d601df07b17503e8d66cf5f520bc4ca895c4a` | Same as DutchAuctionRefundMinter (same author): no pause, just per-user `refundAvailable` | Direct user-callable; needs depositor enumeration |

These 9 contracts hold **169.34 ETH total**. They're not blocked by an owner pause — they're either:

- Legitimately user-callable already with per-user state (DutchAuctionRefundMinter, PPPArtworkAuction, CalendarSteward, GameChannel) → 6 of these have a real refund/claim path; users with valid per-user state CAN claim now without owner action; verification just needs depositor enumeration (a per-contract mini-research task).
- Time-gated by an unpassed deadline (NeaMintTicketFactory)
- Signature/oracle-gated (AltMint)
- Admin-only ETH-out with a different signature than the heuristic looked for (Treasury, ERC20Peg, AvidlinesMinter) — these belong in Type B

## Type B — Admin sweep required

No direct user claim path. The project/admin can `withdraw()` (or equivalent), then needs to distribute funds off-chain using a depositor list. **These are outreach targets, not site integrations.**

41 contracts, **698.62 ETH cumulative**. Most are NFT mint receipts where the buyer list is derivable from on-chain mint Transfer events.

### Top 10 Type B by ETH

| ETH | Contract | Address | Admin call | Likely distribution basis |
|---:|---|---|---|---|
| 43.05 | Token | `0x92373e9ad216762eeb0794086f5ad63883343333` | `withdraw`, `withdrawAll` | Token-sale or NFT buyer events |
| 39.18 | SAWGamesPass | `0x347e3513ca6d5118cb2df3bc386eade1e8f25ceb` | `withdraw` | NFT mint receipts |
| 38.94 | LocalCoinSwapEthereumEscrow | `0x0e87bf5286c4091e0eeb7814d802115dfbb4c4cd` | `withdrawFees` | Escrow fee accounting |
| 38.59 | LAND | `0x193616faf0f51b454fabe38088616a1fd5a5d85e` | `withdraw` | NFT mint receipts |
| 33.20 | AsterFi | `0x0193b85c38337eb90338ed8660810ba66c548b62` | `withdraw` | NFT mint receipts |
| 30.63 | ForgottenRunesWizardsCult | `0x521f9c7505005cfa19a8e5786a9c3c9c9f5e6f42` | `withdraw`, `withdrawAll` | NFT mint receipts |
| 29.75 | dotdotdot | `0xce25e60a89f200b1fa40f6c313047ffe386992c3` | `withdraw` | NFT mint receipts |
| 29.25 | Oosagi | `0xff5cdc2c1b3f3583e8f7a67cb7a7d3af75339f5e` | `withdraw`, `withdrawTokens` | NFT mint receipts |
| 27.50 | VisualMassageModule | `0xe255fd35cec33a10e46c807423ea318c072de5d2` | `withdraw` | NFT mint receipts |

Plus ERC20Peg (drained 2026-05, now ~0 — see Type A reclassified table), Treasury (40.20), AvidlinesMinter (29.72) reclassified from Type A.

### Full Type B list

PandaDAOFarewell was removed from this bucket after source and fork verification found the direct PANDA-holder redeem path: grant Juicebox OperatorStore permission index 3 for project 409, then call `redeem(amount)` on `0x229cc0a81a1d6b4a2fc1452b3bd166462216e3f3`.

41 contracts. The full list is in `data/.scan_state/owner_blocked_candidates.md`. Most are 5–15 ETH each NFT mint contracts; the largest remaining rows are the score-≥75 NFT mints from the prior section.

## Type D — BigQuery owner/gate unlock additions (654.75 ETH)

Surfaced from the 2026-05-08 BigQuery 2015-2023 sweep. These are not direct site integrations today. Each needs a project role to flip state, initialize missing dependencies, or remove an operator drain before ordinary users can recover ETH safely.

| ETH | Contract | Address | Required action | Why blocked | Current handling |
|---:|---|---|---|---|---|
| 200.00 | InstantListingV2 | `0xb9fbe1315824a466d05df4882ffac592ce9c009a` | Owner-controlled `initialize(beneficiary)` + two `reset(...)` calls | Local fork PoC moved the full 200 ETH to the chosen beneficiary; the previously assumed `setRefundable` route was not the proven path | PoC-verified owner-action recovery |
| 170.11 | ICO+Kraken (unverified) | `0xe29bbc8fcd866dfff36dcac6b006a3a97adba9c9` | Owner initializes/repairs Kraken oracle and exchange rates | `redeemAll()` reverts; `kraken()` currently points at non-contract `0x…0020`, `paused()` is false, and callable ABI proof is still missing | Reject until owner/oracle state is repaired |
| 100.12 | RemovePutinBounty | `0xaf5fc45258b5d0af72031ab154bf6dfcfec74b99` | Owner calls `cancel()` or `report(time)` | State is still `Initial`; contributors can only `redeem()` after `Cancelled`, or addressee can `withdraw()` after `Executed` + delay | Outreach to owner `0x7ac476a319b07faf75fdd07a72800732d8b59d94` |
| 91.18 | CapitalConverter / Nsure ETH | `0xa6b658ce4b1cdb4e7d8f97dffb549b8688cafb84` | Owner renounces operator role, or depositor-only enumeration proves a safe path | `exit()` works only for original depositors, while `payouts(address,uint256)` is `onlyOperator` and can drain ETH | Defer until operator risk is removed or depositor-only set is built |
| 69.24 | PembiCoinICO | `0x5535a72556727c221c567e0fc4208c5a99dba1cc` | Owner calls `setFailed()` | `refund()` requires `inState(Failed)` but current state is `Idle`; 23 contributors remain blocked | Outreach / re-check state transition |
| 24.10 | RefundVault paired with crowdsale `0x61db4c9d...` (owned by `0xc928ea49...`) | `0x93d812bf90a575d628e246b0966505a9e466f534` | Crowdsale owner calls `finalize()` | Local fork PoC changed the vault state from Active to Refunding, then sample depositor `claimRefund()` returned exactly 1 ETH from the vault | PoC-verified owner-action recovery |

## Type C — Past rejects revisited mechanically (1,219+ ETH new)

These were REJECTED by prior sweeps because the parent project still had a live frontend or DeBank/Zapper visibility (per the now-revised `feedback_disqualifier_active_frontend_or_debank` rule). On mechanical re-verification (source-only, plus on-chain wei-exact), 4 of 7 are clean PASSes that should be re-integrated.

| Live | Name | Address | Past verdict | New verdict | User-recoverable | Verification |
|---:|---|---|---|---|---:|---|
| 2,935.55 WETH | LooksRare FeeSharingSystem | `0xBcD7254A1D759EFA08eC7c3291B2E85c5dCC12ce` | REJECT | **PASS** | 615 WETH | wei-exact ✓ — top staker `harvest()` → +17.0167 WETH |
| 213.88 ETH | EulerBeats v1 | `0x8754f54074400ce745a7ceddc928fb1b7e985ed6` | REJECT | **PASS — wrapper only** | ~155 ETH | wei-exact ✓ re-verified 2026-08-11 at head. **Do not call this contract directly** — see the deep-dive below. |
| 372.97 ETH | SplitMain V1 | `0x2ed6c4b5da6378c7897ac67ba9e43102feb694ee` | REJECT | **PASS-mechanical** | ~344 ETH | 1,720 user `Withdrawal` events in last 1M blocks — confirmed active user-callable mechanism |
| 85.24 ETH | EulerBeats v2 | `0xa98771a46dcb34b34cdad5355718f8a97c8e603e` | NEEDS-MORE | PASS-likely | ~85 ETH | `burnPrintEnabled=1` (re-checked 2026-08-11); `burnPrint` clears the gate and fails only on seed validation. No wrapper — users call this contract directly. Still needs seed↔tokenId reverse map |
| 5,130.08 ETH | TerminalV1 (Juicebox V1) | `0xd569d3cce55b71a8a3f3c418c329a66e5f714431` | REJECT | DEFER | n/a | Mechanically open but project-controversy risk; outreach-only |
| 744.84 ETH | OxODashboardClaim | `0x02b15c47b4b516a22fd2d8b1fc662afb808a2169` | REJECT | NEEDS-OFFCHAIN | n/a | Merkle-gated; leaves not enumerable on-chain |
| 551.10 ETH | BlackFortGenesisNFT | `0x6c3197c9f3954b682b0e64b520e6da5fe74fcf8b` | REJECT | REJECT (admin-only) | n/a | Reject stands — was wrongly classified as ponzi but is actually Type B (admin sweep) |

### LooksRare FeeSharingSystem (deep-dive)

State at block 25,030,254 (882 days post-pause):
- `periodEndBlock` = 18,676,027 (Nov 13 2023) — distribution frozen
- `lastUpdateBlock` = same — confirms no rewards since
- `currentRewardPerBlock` = 1.5383e-6 WETH (frozen)
- `totalShares` = 26,422,103 (down ~62k from April → some active claims continue)
- WETH balance = 2,935.55 (down 6 from April — slow drain via `harvest()`)

User-callable, no admin gate:
```solidity
function harvest() external nonReentrant
function withdraw(uint256 shares, bool claimRewardToken) external nonReentrant
function withdrawAll(bool claimRewardToken) external nonReentrant
function calculatePendingRewards(address user) external view returns (uint256)
```

Enumeration: 142,191 Deposit + 125,102 Withdraw events → 69,902 unique stakers. Multicall `calculatePendingRewards`: **27,717 with non-zero pending = 615.61 WETH cumulative**.

Wei-exact verification: top staker `0xa33f562b…1adf` (17.0167 WETH pending). `debug_traceCall(harvest())` from this staker: WETH balance went from 1.124693 → 18.141399 = **+17.0167 WETH** ✓ matches the view function exactly.

The 2,320 WETH delta between contract balance and pending sum is the stranded rewards-accumulator (same X2Y2 pattern: once distribution freezes, the rolling avg over-rewards early stakers; precision loss compounds; ~21% extra is dust permanently locked in the math).

**Recommendation**: integrate as `looksrare_fees`, mirroring the `x2y2_fee_sharing` shape. `balance_source: "token"`, `noWalletCheck: true`, balance via `calculatePendingRewards`, withdraw via `harvest()`.

### EulerBeats v1 — the wrapper is the user path (deep-dive)

**This row is the easiest one in the document to misread, so read this before
acting on it.** Looking at `EulerBeats` `0x8754f5…5ed6` on its own gives the
wrong answer:

```
cast call 0x8754f5...5ed6 "burnPrint(uint256,uint256)" 1 0 --from <holder>
  → execution reverted: Contract is disabled
```

`burnPrint` and `mint` both carry `onlyWhenEnabled`, and `_enabled` is a
**private** bool with no getter (storage slot 7, currently `0x00`). The only
setter is `setEnabled(bool) onlyOwner`. That is where "the project has to call
`setEnabled(true)` first" comes from — and it is wrong.

**`owner()` of EulerBeats is not a person. It is a contract**:
`PrintingPress` `0x8cac485c30641ece09dbeb2b5245e24de4830f27` (verified source).
Its `burnPrint` is `public nonReentrant` with **no owner gate**, and it flips the
toggle inside the caller's own transaction:

```solidity
function burnPrint(uint256 seed, uint256 minimumSupply) public nonReentrant {
    require(burnEnabled, "Burning is disabled");          // PrintingPress flag, currently TRUE
    uint startBalance = address(this).balance;
    IEulerBeats(EulerBeats).safeTransferFrom(msg.sender, address(this), tokenId, 1, hex"");
    IEulerBeats(EulerBeats).setEnabled(true);             // <-- the wrapper does this, not the team
    IEulerBeats(EulerBeats).burnPrint(seed, minimumSupply);
    IEulerBeats(EulerBeats).setEnabled(false);
    (bool ok, ) = msg.sender.call{value: address(this).balance.sub(startBalance)}("");
    require(ok, "Refund payment failed");
}
```

The EulerBeats contract is *deliberately* left disabled; the deploy comment says
so outright: "To be functional, this must be set as the owner of the original
EulerBeats contract, and the EulerBeats contract should be disabled. After that,
this is the only way to print those fresh beats."

**User path of record** (two txs, no project involvement):
1. `EulerBeats.setApprovalForAll(0x8cac485c…0f27, true)`
2. `PrintingPress.burnPrint(seed, 1)`

**Wei-exact re-verification, 2026-08-11 at chain head** (`debug_traceCall` on the
local archive node, state-override giving a fresh EOA 1 print of token
`558681818883` + the operator approval, seed `8926004995`):

```
CALL  PrintingPress                       value=0
  CALL  EulerBeats (safeTransferFrom)     value=0
  CALL  EulerBeats (setEnabled true)      value=0
  CALL  EulerBeats (burnPrint)            value=0
    CALL  PrintingPress                   value=0.983700000 ETH   <- reserve pays out
  CALL  EulerBeats (setEnabled false)     value=0
  CALL  <holder>                          value=0.983700000 ETH   <- holder receives
```

No revert, no owner transaction. On-chain corroboration at the same block:
`reserve() = 213.2586 ETH`, contract balance `213.3998 ETH`,
`totalSupply(558681818883) = 34`, `getBurnPrice(34) = 0.9837 ETH` — the bonding
curve and the trace agree exactly.

**The real caveat is a live dependency, not an unlock.** `burnEnabled` on
PrintingPress is owner-settable via `setBurnEnabled(bool)`, owner
`0x0FCB8eCF48D327d8DA77A92e63BcE07ec17F636D`. It is `true` today, but the team can
switch the path off at any time without touching EulerBeats itself. Any
integration must read `PrintingPress.burnEnabled()` at refresh time and treat a
`false` reading as "path closed", not as a data error.

**Contract holders are also excluded**: the refund is a bare
`msg.sender.call{value:}("")`, so the `0xfa21807e…f3ed` superholder (a contract
that rejects ETH) reverts at the final step. EOA holders are unaffected.

### Why the disqualifier rule was wrong

The old rule (`feedback_disqualifier_active_frontend_or_debank`) was a **policy** filter ("don't list things that compete with active projects") applied at **triage** time, before any user/integration decision. It filtered out genuinely user-recoverable contracts whose only "sin" was that the parent project still had a website. The revised rule (`feedback_no_online_frontend_check`) applies the policy at integration time per-candidate (the user/owner makes the call), and runs triage as purely mechanical: source + on-chain only.

Net effect on this report: 4 contracts representing ~1,200 WETH/ETH user-recoverable were wrongly excluded from the integration pipeline.

## Legacy / inception-era blocked rejects appendix

These are older rejected cases from the bricked-contract scratchpad and score sweeps. They are useful for owner/governance outreach and research writing, but they are not Forgotten ETH integrations unless the named gate changes or a direct user-recoverable path is later proven.

### Governance, dependency, and protocol-state blockers

| ETH | Contract | Address | Blocking condition | Actor needed | Site status |
|---:|---|---|---|---|---|
| 3,211 | Loopring DefaultDepositContract | `0x674bdf20a0f284d710bc40872100128e2d66bd3f` | `withdraw(...)` is `onlyExchange`; EOA call reverts `UNAUTHORIZED` | Loopring/exchange operator or official custody flow | Reject: active custody infrastructure |
| 1,919 | ThreeFMutual | `0x66be1bc6c6af47900bbd4f3711801be6c2c6cb32` | `claim()` depends on Maker `Vat.live() == 0`; Maker is still live | Maker governance / ThreeF stakeholders | Reject: governance-triggered, not user-actionable |
| 1,013 | BETFI/BFI Launchpad | `0xa205d797243126f312ae63bb0a5ea9a32fb14f41` | Refund mode is false; owner-only `setupLiquidity()` moves ETH to team/LP/fees, not depositors | Project owner/team | Reject: finalization does not create ETH refund |
| 0 native | HONG | `0x9998e05030aee3af9ad3df35a34f5c51e1628779` | Refund blocked by `tokensCreated` counter bug. **Never held native ETH** (0 even in 2016, 0 internal txns) — value was DAO-token denominated | Project-side rescue or settlement | Excluded |
| TBD | AkuDreams | `0xf42c318dbfbaab0eee040279c6a2588fa01a961d` | `processRefunds` stuck by griefing bug | Team rescue, migration, or settlement | Excluded |
| TBD | Alpha Homora v1 | `0x67b66c99d3eb37fa76aa3ed1ff33e8e39f0b9c7a` | Insolvent accounting; `withdraw()` computes against assets no longer present | Recapitalization / migration / settlement | Excluded |
| 0 native | DaoStakeLocking | `0x1f5b7179a643570effb4da05a0ca0760b36ceed3` | Withdraw depends on dissolved DAO dependency. The 367.93 figure was the **ETH-equivalent of 1,905 DGD tokens**, never native ETH — 0 native is expected | Dependency recovery or settlement | Excluded |
| TBD | Rouleth | `0x18a672e11d637fffadccc99b152f4895da069601` | Broken old bytecode; calls revert through invalid jump behavior | Offchain/social/legal remedy | Excluded |

### Admin, operator, or fixed-recipient ETH paths

| ETH | Contract | Address | Why rejected | Who could act |
|---:|---|---|---|---|
| 551.10 | BlackFortGenesisNFT | `0x6c3197c9f3954b682b0e64b520e6da5fe74fcf8b` | Sold-out NFT mint; `withdraw()` is `onlyOwner`; buyers received NFTs | Owner can sweep mint proceeds only |
| 510.61 | unverified_bd6 | `0x5978c6153a06b141cd0935569f600a83eb44aeaa` | Operator-signed custodial vault; withdraw requires offchain signature/pubkey and admin controls include pause/reset | Operator / keyholder |
| 451.32 | MintedTokenCappedCrowdsaleExtv1 | `0xc9d7bd1fad7d5621dda20335818e9575ae07ea03` | Goal was reached; no `claimRefund()`; current multisig contract blocks withdrawal and owner can redirect to an EOA | Owner / TokenMarket operator |
| 348.24 | DavyJones | `0xaba513097f04d637727fdcda0246636e0d5d6833` | No user ETH withdrawal path; public function swaps held ETH into token baskets and owner controls setup/leftover unwinds | Owner/project |
| 304.81 | Custodian | `0xe5c405c5578d84c5231d3a9a29ef4374423fa0c2` | Whitelisted exchange/custodian flow, not public depositor withdrawal | Exchange/operator |
| 196.95 | Kyber reserve (dormant) | `0x9149c59f087e891b659481ed665768a57247c79e` | Market-maker reserve inventory, **not user deposits** — there is no depositor cohort to make whole. `withdrawEther(uint,address)` is `onlyAdmin`; `withdraw(token,amount,destination)` is `onlyOperator` + pre-approved destinations. `tradeEnabled=false`, no logs in the last 30 days | Reserve operator (nothing for us to do) |
| 286.77 | GuildBank | `0x83d0d842e6db3b020f384a2af11bd14787bec8e7` | ETH movement is owner/burner oriented, not a depositor claim path | Owner/burner role |
| 245.95 | Miner | `0x64356f9e79957fa6d84564fa75f53028799c52de` | `userWithdraw` and `withdraw` are both admin-gated; ETH is operational pool from token swaps | Manager / `userWithdrawAddr` |
| 193.59 | XifraICO2 | `0x7488451db91df618759b8af15e36f70c0fdd529e` | `withdrawICOFunds()` is permissionless but sends ETH to immutable `xifraWallet`, not investors | Project wallet |
| 150.36 | R1Exchange | `0xc7c9b856d33651cc2bcd9e0099efa85f59f78302` | **Promoted to Forgotten ETH integration**: full local scan found 146.28 ETH directly claimable by EOAs across per-channel balances. `withdrawEnabled()` is false, but the public `applyWithdraw()` + wait + `withdraw()` path works. | Integrated via `r1_exchange` |
| 101.00 | EtherkingJackpot | `0xab5cffaaec03efc94ab5c0c4c0bc85ae2b2b65ac` | Jackpot payout and pending-balance drain are owner-only | Owner |
| 68.59 | NativeOFT | `0x4f7a67464b5976d7547c860109e4432d50afb38e` | LayerZero NativeOFT bridge wrapper; ETH backs bridged OFT accounting | Protocol/operator flow |
| 62.74 | ETHRegistrarController | `0x253553366da8546fc250f225fe3d25d0c782303b` | `withdraw` sends ETH to fixed owner/ENS infrastructure | ENS owner/admin |
| 59.64 | ApeToken | `0x22ad3fab750fb53118e4d6aa85343056a736394b` | `claimPresale()` mints tokens only; developer-only `listOnUniswap()` can spend ETH | Developer |
| 50.00 | EmCandyPool | `0x18639f44f946983bf3413d9b51322d05c29d269e` | Configured queue/admin flow, not public ETH refund | Project queue/admin |
| 48.30 | RocketSmoothingPool | `0xd4e96ef8eee8678dbff4d535e033ed1a4f7605b7` | Candidate ETH-out functions are gated by `onlyLatestNetworkContract` | Rocket Pool network contract |

> **Scope correction (2026-08-11).** The second Kyber reserve
> `0x773a58c0ae122f56d6747bc1264f00174b3144c3` has been **removed from this
> document entirely**. It is not stranded ETH by any reading: `tradeEnabled()` is
> `true`, it emitted **580 logs in the last 30 days** with the most recent a few
> minutes before this check, and its balance moves (the 117.75 ETH figure once
> listed here is now 99.99 ETH — because it is trading). It is live
> market-making inventory belonging to an operator who is self-evidently aware of
> it. The remaining row above is kept only as a rejection record: a KyberReserve
> holds the reserve manager's own capital, so even the dormant one has no user
> cohort and no "unlock" that would return ETH to anybody but the operator.
> Neither contract should ever appear in an outreach list.

### Blocked refund-vault family

> **CORRECTION (re-verified 2026-05-31, block 25,216,528).** The original `ETH`
> figures below were **historical throughput / mid-life snapshots, not current native
> balance**. A current + historical balance re-check (local archive node + Etherscan
> internal-tx history) shows all of these except `0x58fc…` hold **0 native ETH today**
> and were emptied during their original 2017–2019 operation. They are **closed, not
> recoverable** — do not promote. `Live ETH` and `Verified status` columns added.

| Live ETH | Historical figure | Contract/cluster | Address(es) | Verified status |
|---:|---:|---|---|---|
| 6.46 | 6.46 | 2017-18 refund vault | `0x58fcf11196abaeefdf23198ec4ec9c5237963e17` | **Still holds 6.46 ETH** — refund state never enabled. Only live row in this family. |
| 0.00 | 67.87 | LCD/Coinplace refund vault | `0xc592c63a86d03d1ac2aad4a0a2d5cd1eb724ddba` | Emptied **2017** (outflows to owner `0x095bd25c…`, blk ~4.4M); never held 67.87 as native ETH. Closed. |
| 0.00 | 24.10 | CirclesTokenOffering crowdsale | `0x61db4c9db2bb58da4777b73463257a6dde90eb0d` | Crowdsale contract; routed 24.099 ETH out **2017** (tx `0x76af69be…`). The matching 24.10 ETH is **live in its RefundVault `0x93d8…` (Type D row), the actionable entry** — same money, not a separate pot. |
| 0.00 | 20.51 | Proof of Toss refund vault | `0x2690402e8d303c1ca4eceff9e17c85dd7383ef47` | Emptied **2019** (outflows to `0xd32c59bd…`, blk 7.2–7.5M). Closed. |
| 0.00 | ~20+ | Other 2017-2018 refund vaults | `0xc479a15166c507024dec9c55be5b95d80596ebf3`, `0xbe7e2a3c24b3f2319dd61a6d704c7282f0907b78`, `0x77b2d3681c8c715e7def3ac47e35b00b73de4272`, `0xfc4e779f6f55f43e2aa012e4bd8eed62f12a796b`, `0x80223b6bd01633961ae5eddc200b5f4b4acd4e7c`, `0xd691fa0af70da6d3b879ae013b804acdc85c5de0`, `0x44629e79a57f5d9811cfbfa3b796b355aecefda6`, `0x03a897c8d7d21688ae0a49ea087836b2667c2cc8` | 0 native ETH; presumed emptied in original ICO operation (not individually traced). |
| 0.00 | 13.32 | Closed refund vault with leftover ETH | `0x16b06363d97c8c4eed209b5b04c061361663cdbc` | ~53 ETH flowed out **2018** (26 OUT txns, blk 5.16–5.48M, tx `0xd9bd4bc3…`). Empty since. Closed. |

## Outreach strategy

1. **Type A (1 verified + 1 pending/reverting contract, 204 ETH)** — these unblock users' own actions; the owner doesn't need to take custody. Lowest legal/ops friction. **Highest priority when PoC-verified.**
   - **TransitFinanceRefund 161 ETH**: one tx (`setClaim(false, blockTimestamp)`) resumes the existing flow for 300 unclaimed users. Note FCFS dynamic in user comms.
   - **Tito 42 ETH**: pending/reverting; do not promote publicly until the live ABI/state proof is repaired.
   - **EpikStaking 8.13 ETH**: removed from owner outreach. It is already unpaused and now has a Forgotten ETH `claimReward()` integration backed by local-node refresh + wei-exact trace proof.
2. **Type B (41 contracts, 699 ETH)** — owners willing to act in good faith sweep contract via `withdraw()`/equivalent → multisig → forward to original users from a recovery wallet. Buyers derivable from on-chain mint Transfer events. Top 10 are well-known NFT projects (~280 ETH).
3. **Type C/direct integrations (5 contracts, 1,227+ ETH)** — **integrate directly**, do NOT outreach. EpikStaking is the newest moved row: 220 claimable wallets / 8.1310 ETH from `earned(address)`, `paused() == false`, and sample `claimReward()` trace matched expected wei exactly.
4. **Type D (6 contracts, 655 ETH)** — outreach or periodic state checks. These become actionable only if an owner/manager/oracle/operator gate changes or if depositor-only enumeration removes the operator-drain risk.
5. **Legacy appendix** — use for research notes and targeted outreach, but do not convert to site integrations without fresh source/state/simulation evidence that an ordinary user can receive ETH/WETH/stablecoin/token value directly.

### Outreach mechanics

- Each contract's owner address is on Etherscan (call `owner()` or read storage slot).
- Many owners will be findable via their public profiles (the contract names are well-known projects: PandaDAO, ForgottenRunes, etc.). EulerBeats is **not** an outreach target — its burn path is already open to holders through the PrintingPress wrapper.
- Standardized template: "Your contract X holds Y ETH that's either user-claimable but paused, or owner-recoverable. We've verified the path on local archive node + Tenderly bundle simulation. Single-tx unblock."

## Methodology lessons

The Tenderly bundle simulation framework is the right approach — it verifies end-to-end "if owner takes action X, does user Y get ETH?" without needing to compute storage slots manually. Where it fell short here was the **input filtering**: the original Type A label trusted the bytecode investigator's `paused_state = bool(re.search(...))` which matched any state variable name containing "paused"/"enabled". 9-of-12 false positives.

Recommended hardening for `triage_batch.py`'s classifier:

1. **Don't flag `paused_state=True`** unless there's also a public/external function with `onlyOwner`/`onlyAdmin`/`onlyManager` modifier that mutates that state variable.
2. **For the simple `unpause()` case**, verify by simulating an `eth_call` from the owner address; if it reverts, the contract isn't OZ Pausable.
3. **Don't apply policy disqualifiers at triage** (active frontend, DeBank visibility). Triage stays mechanical; policy decisions move to per-candidate integration review.

## Notes & exclusions

- **Sanctioned**: CycloneV2 / CycloneV2.2 / CycloneV2.3 / ETHTornado (~280 ETH) — Tornado-Cash forks. Excluded for legal compliance.
- **Drained / empty**: WETH10, NFETH (now 0 ETH).
- **Custom integrations** (CrabStrategyV2, MicroETH, ConfinaleToken, Futurists, CollectiveCanvas, EulerBeats v2, SavingAccount): see `data/.scan_state/score60_plus_review_2026-05-04.md` for status. 6 already shipped to forgotteneth.com on 2026-05-05.
- **Legacy appendix rows**: not counted as direct site candidates. They stay here to preserve rejected evidence and prevent future sweeps from re-promoting admin/operator/governance-only ETH as user-recoverable.

## Files

- This document: `docs/owner-action-required.md`
- Original findings draft: `data/.scan_state/owner_action_findings_2026-05-04.md`
- Bundle verification report: `data/.scan_state/owner_action_verification_2026-05-05.md`
- Past frontend-rejects revisit: `data/.scan_state/past_frontend_rejects_revisit_2026-05-05.md`
- Tracker (full list of owner-blocked entries): `data/.scan_state/owner_blocked_candidates.md`
- Bricked/institution-actionable scratchpad: `data/research_notes/2026-05-02_bricked_contracts_unfreeze_memory.md`
- Score70 rejection source: `data/.scan_state/score70_review.md`
- Score70 new flagged source: `data/.scan_state/score70_new_flagged_candidates_2026-05-03.md`
- Score60+ rejection source: `data/.scan_state/score60_plus_review_2026-05-04.md`
