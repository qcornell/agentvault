// ── AgentVault — The Orchestrator ──────────────────────────────
// Ties identity, policy, audit, and approval together.
// This is what gets instantiated per agent.

import { Client, PrivateKey, AccountId, Hbar, AccountBalanceQuery } from "@hashgraph/sdk";
import { AgentPolicy, AgentIdentity, VaultResult, PolicyCheckResult } from "./types";
import { mintAgentNFT } from "./identity";
import { evaluatePolicy, recordSpending, formatPolicyResult } from "./policy";
import { createAuditTopic, logToHCS, buildAuditEntry, getLocalLogs, HCSLoggerConfig } from "./audit";
import { createApprovalRequest, waitForApproval } from "./approval";
import { distributeToHolders, Holder } from "./actions";

export interface VaultConfig {
  operatorId: string;
  operatorKey: string;
  network: "testnet" | "mainnet";
  agentName: string;
  agentId: string;
  policy: AgentPolicy;
}

export class AgentVault {
  public client: Client;
  public config: VaultConfig;
  public policy: AgentPolicy;
  public identity?: AgentIdentity;
  public nftTokenId?: string;
  public hcsTopicId?: string;
  private hcsConfig?: HCSLoggerConfig;

  constructor(config: VaultConfig) {
    this.config = config;
    this.policy = config.policy;

    this.client = config.network === "mainnet"
      ? Client.forMainnet()
      : Client.forTestnet();

    this.client.setOperator(
      AccountId.fromString(config.operatorId),
      PrivateKey.fromString(config.operatorKey)
    );
  }

  /** Initialize: create HCS topic + mint identity NFT */
  async initialize(): Promise<VaultResult> {
    // 1. Create HCS audit topic
    const topicResult = await createAuditTopic(
      this.client,
      this.config.agentId,
      this.config.operatorKey
    );
    if (!topicResult.ok) return topicResult;
    this.hcsTopicId = topicResult.data.topicId;

    this.hcsConfig = {
      client: this.client,
      topicId: this.hcsTopicId,
      submitKey: this.config.operatorKey,
      operatorId: this.config.operatorId,
      operatorKey: this.config.operatorKey,
    };

    // 2. Mint identity NFT
    const nftResult = await mintAgentNFT({
      client: this.client,
      operatorId: this.config.operatorId,
      operatorKey: this.config.operatorKey,
      identity: {
        agentId: this.config.agentId,
        name: this.config.agentName,
        description: "AgentVault-managed AI agent on Hedera",
        walletId: this.config.operatorId,
        hcsTopicId: this.hcsTopicId!,
        capabilities: this.policy.allowedActions,
        operator: this.config.operatorId,
      },
      policyJson: JSON.stringify(this.policy),
    });
    if (!nftResult.ok) return nftResult;
    this.nftTokenId = nftResult.data.tokenId;
    this.identity = nftResult.data.identity;

    // 3. Log initialization to HCS
    const initEntry = buildAuditEntry(
      this.config.agentId,
      "VAULT_INITIALIZED",
      `AgentVault initialized: ${this.config.agentName} | NFT: ${this.nftTokenId} | Topic: ${this.hcsTopicId}`,
      { verdict: "PASS", rule: "INITIALIZATION", reason: "Vault setup", details: { action: "VAULT_INITIALIZED" } },
      [],
      { agentName: this.config.agentName },
      { nftTokenId: this.nftTokenId, hcsTopicId: this.hcsTopicId }
    );
    await logToHCS(this.hcsConfig, initEntry);

    return {
      ok: true,
      summary: `✅ AgentVault "${this.config.agentName}" initialized\n   NFT: ${this.nftTokenId}\n   HCS Topic: ${this.hcsTopicId}\n   Wallet: ${this.config.operatorId}`,
      data: {
        nftTokenId: this.nftTokenId,
        hcsTopicId: this.hcsTopicId,
        identity: this.identity,
        nftUrl: `https://hashscan.io/testnet/token/${this.nftTokenId}`,
        topicUrl: `https://hashscan.io/testnet/topic/${this.hcsTopicId}`,
      },
    };
  }

  /** Check policy without executing */
  checkPolicy(action: string, amount: number, recipient?: string): PolicyCheckResult {
    return evaluatePolicy(this.policy, action, amount, recipient);
  }

  /** Get wallet balance */
  async getBalance(): Promise<VaultResult> {
    try {
      const balance = await new AccountBalanceQuery()
        .setAccountId(AccountId.fromString(this.config.operatorId))
        .execute(this.client as any);

      return {
        ok: true,
        summary: `Balance: ${balance.hbars.toString()}`,
        data: {
          hbar: balance.hbars.toBigNumber().toNumber(),
          hbarFormatted: balance.hbars.toString(),
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: "Failed to get balance",
        code: "BALANCE_ERROR",
        details: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** Execute a distribution with full policy + audit pipeline */
  async distribute(
    totalAmountHbar: number,
    holders: Holder[],
    propertyName: string
  ): Promise<VaultResult> {
    if (!this.hcsConfig) {
      return { ok: false, error: "Vault not initialized", code: "NOT_INITIALIZED" };
    }

    const result = await distributeToHolders({
      client: this.client,
      agentId: this.config.agentId,
      policy: this.policy,
      hcsConfig: this.hcsConfig,
      totalAmountHbar,
      holders,
      propertyName,
    });

    // If approval required, handle the flow
    if (!result.ok && (result as any).code === "APPROVAL_REQUIRED") {
      const details = JSON.parse((result as any).details || "{}");
      const approvalReq = createApprovalRequest(
        this.config.agentId,
        "DISTRIBUTE_TO_HOLDERS",
        totalAmountHbar,
        `${holders.length} holders`,
        `Distribution for ${propertyName}`,
        details.policyCheck
      );

      // Log the approval request
      const entry = buildAuditEntry(
        this.config.agentId,
        "APPROVAL_REQUESTED",
        `Approval requested for ${totalAmountHbar} HBAR distribution to ${holders.length} holders`,
        details.policyCheck,
        [],
        { approvalId: approvalReq.id, totalAmountHbar, propertyName },
        {}
      );
      await logToHCS(this.hcsConfig, entry);

      return {
        ok: false,
        error: "Awaiting human approval",
        code: "PENDING_APPROVAL",
        details: JSON.stringify({
          approvalId: approvalReq.id,
          ...details,
        }),
      };
    }

    return result;
  }

  /** Get audit log */
  getAuditLog(): any[] {
    return getLocalLogs(this.config.agentId);
  }

  /** Get full agent status for dashboard */
  getStatus(): object {
    return {
      agent: {
        id: this.config.agentId,
        name: this.config.agentName,
        wallet: this.config.operatorId,
        network: this.config.network,
      },
      identity: {
        nftTokenId: this.nftTokenId,
        hcsTopicId: this.hcsTopicId,
        nftUrl: this.nftTokenId ? `https://hashscan.io/testnet/token/${this.nftTokenId}` : null,
        topicUrl: this.hcsTopicId ? `https://hashscan.io/testnet/topic/${this.hcsTopicId}` : null,
      },
      policy: {
        dailySpendLimitHbar: this.policy.dailySpendLimitHbar,
        perTxLimitHbar: this.policy.perTxLimitHbar,
        approvalRequiredAboveHbar: this.policy.approvalRequiredAboveHbar,
        allowedActions: this.policy.allowedActions,
        allowedRecipients: this.policy.allowedRecipients,
      },
      auditLogCount: getLocalLogs(this.config.agentId).length,
    };
  }
}
