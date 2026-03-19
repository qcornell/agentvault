// ── MCP Tool Definitions ───────────────────────────────────────
// Every AgentVault action exposed as an MCP-compatible tool.
// Any MCP client (OpenClaw, Claude, Cursor, etc.) can discover
// and invoke these tools without knowing AgentVault internals.
//
// Architecture: brain-agnostic from day one.

import { MCPTool, VaultResult } from "../types";
import { AgentVault } from "../vault";
import { evaluatePolicy, formatPolicyResult } from "../policy";
import { Holder } from "../actions";

/**
 * Returns the full list of AgentVault MCP tools, wired to a vault instance.
 * Pass null for vault to get stubs (for manifest generation).
 */
export function getAgentVaultTools(vault?: AgentVault | null): MCPTool[] {
  return [
    {
      name: "agentvault_check_policy",
      description:
        "Check if a proposed action would be allowed by the agent's policy. " +
        "Returns PASS, DENY, or APPROVAL_REQUIRED with the specific rule that triggered.",
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "The action to check (e.g. HBAR_TRANSFER, DISTRIBUTE_TO_HOLDERS)",
          },
          amount: {
            type: "number",
            description: "Amount in HBAR",
          },
          recipient: {
            type: "string",
            description: "Recipient Hedera account ID (optional for non-transfer actions)",
          },
        },
        required: ["action", "amount"],
      },
      handler: async (input: { action: string; amount: number; recipient?: string }): Promise<VaultResult> => {
        if (!vault) return { ok: false, error: "Vault not initialized", code: "NO_VAULT" };
        const result = vault.checkPolicy(input.action, input.amount, input.recipient);
        return {
          ok: true,
          summary: formatPolicyResult(result),
          data: { policyCheck: result },
        };
      },
    },
    {
      name: "agentvault_get_balance",
      description:
        "Get the agent's current HBAR balance and daily spending status.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async (): Promise<VaultResult> => {
        if (!vault) return { ok: false, error: "Vault not initialized", code: "NO_VAULT" };
        return vault.getBalance();
      },
    },
    {
      name: "agentvault_transfer",
      description:
        "Transfer HBAR from the agent's vault to a recipient. " +
        "Automatically enforces policy rules: spending limits, recipient whitelist, " +
        "and human approval for high-value transactions. All actions logged to HCS.",
      inputSchema: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient Hedera account ID",
          },
          amount: {
            type: "number",
            description: "Amount of HBAR to send",
          },
          memo: {
            type: "string",
            description: "Optional transaction memo",
          },
        },
        required: ["to", "amount"],
      },
      handler: async (input: { to: string; amount: number; memo?: string }): Promise<VaultResult> => {
        if (!vault) return { ok: false, error: "Vault not initialized", code: "NO_VAULT" };
        // Single transfer = distribution to 1 holder at 100%
        return vault.distribute(input.amount, [
          { accountId: input.to, name: "recipient", ownershipPercent: 100 },
        ], input.memo || "Direct transfer");
      },
    },
    {
      name: "agentvault_distribute",
      description:
        "Distribute HBAR proportionally to token holders. " +
        "Calculates splits based on ownership percentages, checks policy, " +
        "executes batch transfer, and logs everything to HCS audit trail. " +
        "Used for rent distribution, dividends, revenue sharing.",
      inputSchema: {
        type: "object",
        properties: {
          totalAmountHbar: {
            type: "number",
            description: "Total HBAR to distribute",
          },
          propertyName: {
            type: "string",
            description: "Name/identifier for the distribution source",
          },
          holders: {
            type: "array",
            description: "Array of {accountId, name, ownershipPercent}",
            items: {
              type: "object",
              properties: {
                accountId: { type: "string" },
                name: { type: "string" },
                ownershipPercent: { type: "number" },
              },
            },
          },
        },
        required: ["totalAmountHbar", "propertyName", "holders"],
      },
      handler: async (input: { totalAmountHbar: number; propertyName: string; holders: Holder[] }): Promise<VaultResult> => {
        if (!vault) return { ok: false, error: "Vault not initialized", code: "NO_VAULT" };
        return vault.distribute(input.totalAmountHbar, input.holders, input.propertyName);
      },
    },
    {
      name: "agentvault_get_audit_log",
      description:
        "Retrieve the agent's audit log from HCS. " +
        "Returns a chronological list of all actions, policy checks, and approvals.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max entries to return (default 50)",
          },
        },
      },
      handler: async (input: { limit?: number }): Promise<VaultResult> => {
        if (!vault) return { ok: false, error: "Vault not initialized", code: "NO_VAULT" };
        const log = vault.getAuditLog();
        const limited = input.limit ? log.slice(-input.limit) : log.slice(-50);
        return {
          ok: true,
          summary: `${limited.length} audit entries`,
          data: { entries: limited, total: log.length },
        };
      },
    },
    {
      name: "agentvault_get_identity",
      description:
        "Get the agent's on-chain identity (NFT metadata). " +
        "Includes name, wallet, capabilities, policy hash, and HCS topic.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async (): Promise<VaultResult> => {
        if (!vault) return { ok: false, error: "Vault not initialized", code: "NO_VAULT" };
        const status = vault.getStatus() as any;
        return {
          ok: true,
          summary: `Agent: ${status.agent.name} (${status.agent.id})`,
          data: {
            agent: status.agent,
            identity: status.identity,
            nftMetadata: vault.identity,
          },
        };
      },
    },
    {
      name: "agentvault_request_approval",
      description:
        "Request human approval for a high-value action. " +
        "Sends notification to the configured approval channel and waits for response.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", description: "What the agent wants to do" },
          amount: { type: "number", description: "Amount in HBAR" },
          recipient: { type: "string", description: "Target account" },
          reason: { type: "string", description: "Why this action is needed" },
        },
        required: ["action", "amount", "reason"],
      },
      handler: async (input: { action: string; amount: number; recipient?: string; reason: string }): Promise<VaultResult> => {
        if (!vault) return { ok: false, error: "Vault not initialized", code: "NO_VAULT" };
        // Trigger a policy check which may produce APPROVAL_REQUIRED
        const check = vault.checkPolicy(input.action, input.amount, input.recipient);
        return {
          ok: true,
          summary: formatPolicyResult(check),
          data: {
            policyCheck: check,
            message: check.verdict === "APPROVAL_REQUIRED"
              ? "Approval request created. Check the dashboard to approve or deny."
              : check.verdict === "PASS"
                ? "This action does not require approval — it passes policy."
                : "This action is denied by policy — approval cannot override a DENY.",
          },
        };
      },
    },
  ];
}

/** Generate MCP tool list JSON (for registration/discovery) */
export function getMCPToolManifest(): object[] {
  return getAgentVaultTools(null).map(({ handler, ...tool }) => tool);
}
