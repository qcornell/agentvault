# 🏦 AgentVault

**Bank account + rules for AI agents on Hedera.**

AgentVault gives AI agents a secure financial identity on Hedera: a wallet governed by policy rules, every action logged to an immutable audit trail, and high-value transactions gated by human approval.

Built for the [Hedera Hello Future Apex 2026 Hackathon](https://hedera.com) — DeFi & Tokenization track.

---

## What It Does

| Layer | What | How |
|-------|------|-----|
| **Identity** | On-chain agent identity | NFT (max supply 1) with full metadata — name, wallet, capabilities, policy hash |
| **Policy** | Spending rules | 5-rule engine: action whitelist, recipient whitelist, per-TX limit, daily limit, approval threshold |
| **Audit** | Immutable trail | Every action logged to HCS (Hedera Consensus Service) — verifiable by anyone on HashScan |
| **Approval** | Human-in-the-loop | High-value transactions require human approval via web dashboard |
| **MCP** | Brain-agnostic tools | 7 MCP-compatible tools — works with any AI (Claude, GPT, OpenClaw, etc.) |

## Why

AI agents are getting access to real money. Right now there's no standard way to:
- **Constrain** what an agent can spend
- **Prove** what an agent did
- **Approve** high-value actions before they execute

AgentVault solves all three on Hedera.

## Quick Start

```bash
# Clone
git clone https://github.com/qcornell/agentvault.git
cd agentvault

# Install
npm install

# Run the policy demo (no Hedera account needed)
npx ts-node examples/policy-demo.ts

# Run the full demo (needs testnet account)
HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/full-demo.ts

# Start the dashboard
npx ts-node dashboard/server.ts
# Open http://localhost:3099
```

### Get a Testnet Account

1. Go to [portal.hedera.com](https://portal.hedera.com)
2. Create a testnet account (free)
3. Copy your Account ID and DER-encoded private key

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    AI Agent (any brain)               │
│              Claude / GPT / OpenClaw / etc.           │
└────────────────────────┬─────────────────────────────┘
                         │ MCP Tools
                         ▼
┌──────────────────────────────────────────────────────┐
│                    AgentVault                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────┐ │
│  │ Identity  │  │  Policy  │  │ Audit  │  │Approval│ │
│  │   NFT     │  │  Engine  │  │  HCS   │  │Manager │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘  └───┬────┘ │
│       │              │            │            │      │
│       ▼              ▼            ▼            ▼      │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Hedera Network                      │ │
│  │  Tokens (NFT)  ·  HCS (Audit)  ·  Crypto (HBAR) │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │   Dashboard UI   │
               │  Approve / Deny  │
               │  Live audit log  │
               └──────────────────┘
```

## Policy Engine

The policy engine evaluates 5 rules in order. It never executes anything — it returns a verdict and the caller decides what to do.

| # | Rule | Verdict |
|---|------|---------|
| 1 | Action whitelist | DENY if action not in allowed list |
| 2 | Recipient whitelist | DENY if recipient not approved |
| 3 | Per-transaction limit | DENY if amount exceeds per-TX limit |
| 4 | Daily spending limit | DENY if daily total would be exceeded |
| 5 | Approval threshold | APPROVAL_REQUIRED if amount above threshold |

If all rules pass → **PASS** — the action executes.

### Example Policy

```typescript
const policy = {
  agentId: "agentvault:my-agent",
  dailySpendLimitHbar: 100,     // Max 100 ℏ per day
  perTxLimitHbar: 50,           // Max 50 ℏ per transaction
  approvalRequiredAboveHbar: 25, // Human approval above 25 ℏ
  allowedActions: ["HBAR_TRANSFER", "DISTRIBUTE_TO_HOLDERS"],
  allowedRecipients: ["0.0.1234", "0.0.5678"],
  approvalMethod: "web",
};
```

## MCP Tools

AgentVault exposes 7 MCP-compatible tools that any AI agent can call:

| Tool | Description |
|------|-------------|
| `agentvault_check_policy` | Check if an action would be allowed |
| `agentvault_get_balance` | Get wallet balance |
| `agentvault_transfer` | Transfer HBAR (policy-enforced) |
| `agentvault_distribute` | Proportional distribution to holders |
| `agentvault_get_audit_log` | Read the audit trail |
| `agentvault_get_identity` | Get on-chain agent identity |
| `agentvault_request_approval` | Request human approval |

## Dashboard

The web dashboard at `http://localhost:3099` shows:

- **Agent Identity** — name, wallet, NFT link, HCS topic
- **Vault Balance** — current HBAR balance
- **Policy Rules** — spending limits, allowed actions
- **Approval Queue** — pending approvals with Approve/Deny buttons
- **Live Audit Trail** — real-time log of all agent actions

The dashboard polls the API every 3 seconds for live updates.

## DeedSlice Integration

AgentVault's first real-world use case is [DeedSlice](https://deedslice.com) — a white-label real estate tokenization platform on Hedera.

**The problem:** When AI agents manage property distributions (rent payments to token holders), how do you ensure they follow the rules?

**AgentVault's answer:**
1. Agent receives rent income
2. Calculates proportional splits based on token ownership
3. Policy engine checks: Is this action allowed? Within limits? Need approval?
4. If approved, executes batch transfer on Hedera
5. Logs everything to HCS — immutable, verifiable, auditable

Every distribution is provably fair and permanently recorded.

## Project Structure

```
agentvault/
├── src/
│   ├── types.ts              # Core types (VaultResult, Policy, AuditEntry, etc.)
│   ├── vault.ts              # AgentVault orchestrator class
│   ├── index.ts              # Barrel exports
│   ├── identity/
│   │   └── mint-agent-nft.ts # NFT identity minting
│   ├── policy/
│   │   └── engine.ts         # 5-rule policy evaluation engine
│   ├── audit/
│   │   └── hcs-logger.ts     # HCS audit logging + local store
│   ├── approval/
│   │   └── manager.ts        # Human-in-the-loop approval flow
│   ├── actions/
│   │   └── distribute.ts     # Proportional HBAR distribution
│   └── mcp/
│       └── tools.ts          # 7 MCP-compatible tool definitions
├── dashboard/
│   ├── server.ts             # API server (Node.js, no deps)
│   └── index.html            # Dashboard UI (dark theme, live polling)
├── examples/
│   ├── full-demo.ts          # End-to-end demo (all features)
│   ├── policy-demo.ts        # Policy engine demo (no Hedera needed)
│   ├── mint-identity.ts      # Standalone NFT mint
│   └── distribution-demo.ts  # DeedSlice distribution demo
├── package.json
├── tsconfig.json
└── README.md
```

## Tech Stack

- **Hedera SDK** — Token Service (NFTs), Consensus Service (HCS), Crypto (HBAR transfers)
- **TypeScript** — Full type safety, zero `any` in public APIs
- **Node.js** — Dashboard server (zero external deps, just `http` module)
- **MCP** — Model Context Protocol tool definitions

## Examples

### Policy Demo (No Hedera Required)

```bash
npx ts-node examples/policy-demo.ts
```

Tests all 5 policy rules with sample scenarios. Great for understanding the engine.

### Full Demo (Testnet)

```bash
HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/full-demo.ts
```

1. Creates vault (HCS topic + Identity NFT)
2. Shows agent identity card
3. Attempts blocked transfer → **DENY**
4. Attempts high-value transfer → **APPROVAL_REQUIRED**
5. Runs successful distribution → **PASS**
6. Prints all HashScan verification links

### Distribution Demo

```bash
HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/distribution-demo.ts
```

DeedSlice-specific: proportional rent distribution to 3 investors.

## On-Chain Verification

Every AgentVault action is verifiable on [HashScan](https://hashscan.io/testnet):

- **Identity NFT** — `https://hashscan.io/testnet/token/{tokenId}`
- **Audit Topic** — `https://hashscan.io/testnet/topic/{topicId}`
- **Transactions** — `https://hashscan.io/testnet/transaction/{txId}`

## License

MIT

## Built By

[Dappily](https://dappily.io) — AI infrastructure for the real world.

Built for the Hedera Hello Future Apex 2026 Hackathon.
