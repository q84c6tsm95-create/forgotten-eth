# Forgotten ETH

**[forgotteneth.com](https://forgotteneth.com)** — Recover ETH stuck in old smart contracts.

60,000+ ETH sits unclaimed across 110+ defunct contracts (old DEXes, ICO escrows, ENS deeds, dividend tokens). Portfolio trackers don't detect these balances.

## Source Code

This repository contains the full frontend and API source code for transparency and auditability. The live site is deployed from a private repository that also includes balance data and address indexes.

**What's here:**
- `public/` — Frontend (HTML, JS, CSS, assets)
- `api/` — Vercel serverless functions
- `vercel.json` — Routing and security headers
- `data/protocol_info.json` — Protocol metadata

**What's NOT here (private):**
- Balance data and address indexes (user privacy)
- Refresh scripts and data pipeline
- Deployment configuration

## Verify the Code

Every withdrawal transaction is crafted client-side and sent directly to the original smart contract. No proxy contracts, no backend involvement. You can verify:

1. **Contract addresses** — all shown in the UI and verifiable on Etherscan
2. **Withdrawal functions** — standard `withdraw()`, `releaseDeed()`, etc. on verified contracts
3. **Keystore handling** — decryption happens entirely in your browser ([see the code](https://github.com/q84c6tsm95-create/forgotten-eth/blob/main/public/app.js#L123-L190))
4. **No exfiltration** — CSP blocks all unauthorized network requests

Report vulnerabilities via [GitHub Security Advisories](https://github.com/q84c6tsm95-create/forgotten-eth/security/advisories/new).

## License

MIT
