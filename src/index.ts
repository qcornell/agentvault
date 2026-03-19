// ── AgentVault ─────────────────────────────────────────────────
// Bank account + rules for AI agents on Hedera.
//
// Architecture:
//   Identity (NFT) → Policy (rules) → Audit (HCS) → Approval (human-in-the-loop)
//   Every action = MCP tool. Brain-agnostic from day one.

export * from "./types";
export * from "./identity";
export * from "./policy";
export * from "./audit";
export * from "./approval";
export * from "./actions";
export * from "./mcp";
export { AgentVault, VaultConfig } from "./vault";
