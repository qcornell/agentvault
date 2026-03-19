// ── AgentVault Core Types ──────────────────────────────────────

/** Result of any vault operation */
export interface VaultSuccess {
  ok: true;
  summary: string;
  txId?: string;
  data: Record<string, any>;
}

export interface VaultFailure {
  ok: false;
  error: string;
  code: string;
  details?: string;
}

export type VaultResult = VaultSuccess | VaultFailure;

/** Agent identity stored as NFT metadata */
export interface AgentIdentity {
  agentId: string;
  name: string;
  description: string;
  walletId: string;
  hcsTopicId: string;
  policyHash: string;
  capabilities: string[];
  operator: string;
  createdAt: string;
  version: string;
}

/** Policy rule set for an agent */
export interface AgentPolicy {
  agentId: string;
  dailySpendLimitHbar: number;
  perTxLimitHbar: number;
  approvalRequiredAboveHbar: number;
  allowedActions: string[];
  allowedRecipients: string[];
  approvalMethod: "web" | "telegram" | "both";
  approverContact?: string;
}

/** Result of a policy evaluation */
export type PolicyVerdict = "PASS" | "DENY" | "APPROVAL_REQUIRED";

export interface PolicyCheckResult {
  verdict: PolicyVerdict;
  rule: string;
  reason: string;
  details: {
    action: string;
    amount?: number;
    recipient?: string;
    dailySpentSoFar?: number;
  };
}

/** HCS audit log entry */
export interface AuditEntry {
  timestamp: string;
  agentId: string;
  action: string;
  summary: string;
  policyCheck: PolicyCheckResult;
  txIds: string[];
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}

/** Approval request */
export interface ApprovalRequest {
  id: string;
  agentId: string;
  action: string;
  amount: number;
  recipient: string;
  reason: string;
  policyCheck: PolicyCheckResult;
  status: "pending" | "approved" | "denied";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

/** MCP tool definition */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (input: any) => Promise<VaultResult>;
}
