# 🏦 AgentVault

**AI-safe wallet infrastructure for autonomous agents on Hedera.**

> AI agents are getting access to real money. AgentVault is the guardrail.

---

## The Problem

AI agents can now execute transactions, distribute rent, manage treasury. But there's no standard way to:

- **Constrain** what an agent can spend
- **Prove** what an agent did
- **Require human approval** before high-value actions execute

One hallucination, one prompt injection, one bad tool call — and the money is gone.

## The Solution

AgentVault wraps a Hedera wallet in four safety layers:

| Layer | What | Hedera Service |
|-------|------|---------------|
| 🪪 **Identity** | On-chain agent identity (NFT, max supply 1) | Token Service |
| 🛡️ **Policy Engine** | 5-rule engine: spending limits, recipient whitelist, action controls | Pure logic |
| 📜 **Audit Trail** | Every action logged immutably — verifiable by anyone | Consensus Service (HCS) |
| 👤 **Approval** | Human-in-the-loop for high-value transactions | Web dashboard |

Brain-agnostic via **MCP tools** — works with Claude, GPT, OpenClaw, or any AI.

## Demo (20-second version)

```
Agent wants to transfer 5 HBAR to unknown address
  → Policy Engine: ❌ DENY (recipient not in whitelist)
  → Logged to HCS. Money never moves.

Agent wants to transfer 30 HBAR to approved address
  → Policy Engine: ⚠️ APPROVAL_REQUIRED (above 25 ℏ threshold)
  → Human approves on dashboard → transfer executes
  → Logged to HCS with approval record.

Agent distributes 10 HBAR rent to 3 token holders
  → Policy Engine: ✅ PASS (within limits, approved recipients)
  → Batch transfer: Alice 4.5, Bob 3.5, Charlie 2.0
  → Logged to HCS. Verifiable on HashScan.
```

## Quick Start

```bash
git clone https://github.com/qcornell/agentvault.git
cd agentvault
npm install

# Policy demo (no Hedera account needed)
npx ts-node examples/policy-demo.ts

# Full demo (needs free testnet account from portal.hedera.com)
HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/full-demo.ts

# Dashboard (live UI with approve/deny)
HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node dashboard/server.ts
# → http://localhost:3099
```

## On-Chain Proof (Testnet)

Every claim is verifiable:

| Artifact | Link |
|----------|------|
| Identity NFT | [0.0.8289951](https://hashscan.io/testnet/token/0.0.8289951) |
| Audit Topic (HCS) | [0.0.8289949](https://hashscan.io/testnet/topic/0.0.8289949) |
| Distribution TX | [0.0.7420047@1773935639](https://hashscan.io/testnet/transaction/0-0-7420047-1773935639-571095028) |

## Architecture

```
┌─────────────────────────────────────────────────┐
│            AI Agent (any brain)                  │
│         Claude / GPT / OpenClaw / etc.           │
└──────────────────────┬──────────────────────────┘
                       │ MCP Tools (7 tools)
                       ▼
┌─────────────────────────────────────────────────┐
│                  AgentVault                       │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌───────┐ ┌────────┐ │
│  │ Identity │ │  Policy  │ │ Audit │ │Approval│ │
│  │   NFT    │ │  Engine  │ │  HCS  │ │Manager │ │
│  └────┬─────┘ └────┬─────┘ └──┬────┘ └───┬────┘ │
│       │             │          │           │      │
│       ▼             ▼          ▼           ▼      │
│  ┌─────────────────────────────────────────────┐ │
│  │            Hedera Network                    │ │
│  │  Tokens (NFT) · HCS (Audit) · Crypto (HBAR) │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                       │
                       ▼
             ┌──────────────────┐
             │  Dashboard UI    │
             │  Approve / Deny  │
             │  Live audit log  │
             └──────────────────┘
```

## Policy Engine

Five rules evaluated in order. The engine never executes — it returns a verdict.

| # | Rule | If violated |
|---|------|------------|
| 1 | Action whitelist | → DENY |
| 2 | Recipient whitelist | → DENY |
| 3 | Per-transaction limit | → DENY |
| 4 | Daily spending limit | → DENY |
| 5 | Approval threshold | → APPROVAL_REQUIRED |

All pass → **PASS** → action executes → logged to HCS.

```typescript
const policy = {
  dailySpendLimitHbar: 100,      // Max 100 ℏ/day
  perTxLimitHbar: 50,            // Max 50 ℏ per transaction
  approvalRequiredAboveHbar: 25, // Human approval above 25 ℏ
  allowedActions: ["HBAR_TRANSFER", "DISTRIBUTE_TO_HOLDERS"],
  allowedRecipients: ["0.0.1234", "0.0.5678"],
};
```

## MCP Tools

7 tools that any MCP-compatible AI can discover and invoke:

| Tool | What it does |
|------|-------------|
| `agentvault_check_policy` | Check if an action would be allowed |
| `agentvault_get_balance` | Get current HBAR balance |
| `agentvault_transfer` | Send HBAR (policy-enforced) |
| `agentvault_distribute` | Proportional split to holders |
| `agentvault_get_audit_log` | Read the immutable audit trail |
| `agentvault_get_identity` | Get on-chain agent identity |
| `agentvault_request_approval` | Request human approval |

### MCP API

The dashboard server exposes MCP tools via HTTP:

```bash
# List tools
GET /api/mcp/tools

# Invoke a tool
POST /api/mcp/invoke
{ "tool": "agentvault_check_policy", "params": { "action": "HBAR_TRANSFER", "amount": 10 } }
```

## Real-World Use Case: DeedSlice

[DeedSlice](https://deedslice.com) is a white-label real estate tokenization platform on Hedera.

**Problem:** AI agents distribute rent to property token holders. How do you ensure they follow the rules?

**AgentVault's answer:**
1. Agent receives rent income → calculates proportional splits
2. Policy engine checks: within limits? approved recipients? need human sign-off?
3. Executes batch transfer on Hedera (single transaction)
4. Logs everything to HCS — immutable, verifiable on HashScan

Every distribution is provably fair and permanently recorded.

## Project Structure

```
agentvault/
├── src/
│   ├── types.ts           # Core types
│   ├── vault.ts           # Orchestrator class
│   ├── identity/          # NFT identity minting
│   ├── policy/            # 5-rule evaluation engine
│   ├── audit/             # HCS logging + local store
│   ├── approval/          # Human-in-the-loop flow
│   ├── actions/           # HBAR distribution
│   └── mcp/               # 7 MCP tool definitions
├── dashboard/
│   ├── server.ts          # API server (zero deps)
│   └── index.html         # Dashboard UI (dark theme)
├── examples/
│   ├── full-demo.ts       # End-to-end demo
│   ├── policy-demo.ts     # Policy engine only (no Hedera)
│   ├── mint-identity.ts   # Standalone NFT mint
│   └── distribution-demo.ts # Rent distribution demo
└── SUBMISSION.md          # Hackathon submission details
```

## Tech Stack

- **Hedera Token Service** — NFT identity (max supply 1 per agent)
- **Hedera Consensus Service** — Immutable audit trail
- **Hedera Crypto Service** — HBAR transfers and batch distributions
- **TypeScript** — Full type safety
- **MCP** — Model Context Protocol (brain-agnostic tools)
- **Node.js** — Dashboard server (zero external deps)

## Hackathon Scope & Production Roadmap

This is a hackathon build. Some simplifications were made intentionally:

| Hackathon | Production |
|-----------|-----------|
| Single operator key (NFT supply, HCS submit, treasury, payer) | Separate keys per role (principle of least privilege) |
| In-memory approval queue & daily spending tracker | Persistent storage (DB or on-chain state) |
| Operator account = treasury = all holder accounts in demo | Distinct wallets per holder, mirror node queries for balances |
| Web dashboard polling (3s) | WebSocket push, mobile notifications |

The architecture is designed for this evolution — every component (identity, policy, audit, approval) is a separate module with clean interfaces.

## License

MIT

---

Built by [Dappily](https://dappily.io) for the **Hedera Hello Future Apex 2026 Hackathon** — DeFi & Tokenization track.
