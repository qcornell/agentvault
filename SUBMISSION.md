# Hackathon Submission — Hedera Hello Future Apex 2026
**Track:** DeFi & Tokenization

## Project Description (100 words)

AgentVault is a bank account with rules for AI agents on Hedera. As AI agents handle real money — distributing rent to property investors, executing trades, managing treasury — there's no standard way to constrain spending, prove what happened, or require human approval for high-value actions.

AgentVault solves this with four layers: an on-chain identity (NFT), a policy engine (spending limits, recipient whitelists, action controls), an immutable audit trail (HCS), and human-in-the-loop approval for transactions above configurable thresholds. Every action is verifiable on HashScan. Brain-agnostic via MCP tools — works with any AI.

## Tech Stack

- **Hedera Token Service** — NFT identity minting (max supply 1 per agent)
- **Hedera Consensus Service (HCS)** — Immutable audit trail logging
- **Hedera Crypto Service** — HBAR transfers and batch distributions
- **TypeScript / Node.js** — Core library and dashboard server
- **Hedera SDK (@hashgraph/sdk)** — All on-chain interactions
- **MCP (Model Context Protocol)** — 7 brain-agnostic tool definitions
- **HTML/CSS/JS** — Dashboard UI (single-file, zero dependencies)

## Live Demo

- **Console:** https://console.deedslice.com
- **Dashboard:** Run `npx ts-node dashboard/server.ts` → http://localhost:3099

## GitHub

https://github.com/qcornell/agentvault

## On-Chain Artifacts (Testnet)

- **Identity NFT:** [0.0.8289951](https://hashscan.io/testnet/token/0.0.8289951)
- **Audit Topic:** [0.0.8289949](https://hashscan.io/testnet/topic/0.0.8289949)
- **Distribution TX:** [0.0.7420047@1773935639.571095028](https://hashscan.io/testnet/transaction/0-0-7420047-1773935639-571095028)
