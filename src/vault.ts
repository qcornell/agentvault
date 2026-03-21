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
import { executeHbarSwap, SwapParams, SwapResult } from "./actions/live-swap";

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

    // If approval required, create the request and WAIT for human to resolve it
    if (!result.ok && (result as any).code === "APPROVAL_REQUIRED") {
      const details = JSON.parse((result as any).details || "{}");
      const approvalReq = createApprovalRequest(
        this.config.agentId,
        "DISTRIBUTE_TO_HOLDERS",
        totalAmountHbar,
        `${holders.length} holders`,
        `Distribution of ${totalAmountHbar} ℏ for "${propertyName}"`,
        details.policyCheck
      );

      // Log the approval request to HCS
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

      // Wait for human to approve/deny on the dashboard (5 min timeout)
      const approved = await waitForApproval(approvalReq.id, 300000);

      if (!approved) {
        // Denied or timed out — log it
        const denyEntry = buildAuditEntry(
          this.config.agentId,
          "APPROVAL_DENIED",
          `Distribution of ${totalAmountHbar} HBAR for "${propertyName}" was denied or timed out`,
          { ...details.policyCheck, verdict: "DENY" as const, rule: "HUMAN_DENIED" },
          [],
          { approvalId: approvalReq.id },
          {}
        );
        await logToHCS(this.hcsConfig, denyEntry);

        return {
          ok: false,
          error: "Distribution denied by human operator",
          code: "APPROVAL_DENIED",
          details: JSON.stringify({ approvalId: approvalReq.id }),
        };
      }

      // Approved! Log it and execute the distribution (bypass policy this time)
      const approveEntry = buildAuditEntry(
        this.config.agentId,
        "APPROVAL_GRANTED",
        `Human approved ${totalAmountHbar} HBAR distribution for "${propertyName}"`,
        { ...details.policyCheck, verdict: "PASS" as const, rule: "HUMAN_APPROVED" },
        [],
        { approvalId: approvalReq.id },
        {}
      );
      await logToHCS(this.hcsConfig, approveEntry);

      // Re-execute with approval override — call distributeToHolders
      // but first temporarily raise the approval threshold so it passes
      const origThreshold = this.policy.approvalRequiredAboveHbar;
      this.policy.approvalRequiredAboveHbar = totalAmountHbar + 1;
      try {
        const retryResult = await distributeToHolders({
          client: this.client,
          agentId: this.config.agentId,
          policy: this.policy,
          hcsConfig: this.hcsConfig,
          totalAmountHbar,
          holders,
          propertyName,
          memo: `Approved distribution: ${propertyName}`,
        });
        return retryResult;
      } finally {
        this.policy.approvalRequiredAboveHbar = origThreshold;
      }
    }

    return result;
  }

  /** Execute a single transfer with full policy + approval pipeline */
  async transfer(
    to: string,
    amount: number,
    memo?: string
  ): Promise<VaultResult> {
    return this.distribute(amount, [
      { accountId: to, name: "recipient", ownershipPercent: 100 },
    ], memo || "Direct transfer");
  }

  /** Execute a swap with full policy + approval + HCS audit pipeline */
  async swap(params: SwapParams): Promise<VaultResult> {
    if (!this.hcsConfig) {
      return { ok: false, error: "Vault not initialized", code: "NOT_INITIALIZED" };
    }

    const action = "SWAP";
    const amount = params.amountHbar;

    // 1. Policy check
    const policyCheck = evaluatePolicy(this.policy, action, amount, "self");

    // Log the policy check
    const checkEntry = buildAuditEntry(
      this.config.agentId,
      "POLICY_CHECK",
      `Policy check for SWAP ${amount} HBAR → ${params.toToken}: ${policyCheck.verdict}`,
      policyCheck,
      [],
      { amountHbar: amount, toToken: params.toToken, feeTier: params.feeTier || "0.30%" },
      {}
    );
    await logToHCS(this.hcsConfig, checkEntry);

    // 2. Handle DENY
    if (policyCheck.verdict === "DENY") {
      return {
        ok: false,
        error: `Policy DENIED: ${policyCheck.reason}`,
        code: "POLICY_DENIED",
        details: JSON.stringify(policyCheck),
      };
    }

    // 3. Handle APPROVAL_REQUIRED
    if (policyCheck.verdict === "APPROVAL_REQUIRED") {
      const approvalReq = createApprovalRequest(
        this.config.agentId,
        action,
        amount,
        "self",
        `Swap ${amount} HBAR → ${params.toToken} on SaucerSwap V2`,
        policyCheck
      );

      // Log approval request to HCS
      const reqEntry = buildAuditEntry(
        this.config.agentId,
        "APPROVAL_REQUESTED",
        `Approval requested: swap ${amount} HBAR → ${params.toToken}`,
        policyCheck,
        [],
        { approvalId: approvalReq.id, amountHbar: amount, toToken: params.toToken },
        {}
      );
      await logToHCS(this.hcsConfig, reqEntry);

      // Wait for human (5 min timeout)
      const approved = await waitForApproval(approvalReq.id, 300000);

      if (!approved) {
        const denyEntry = buildAuditEntry(
          this.config.agentId,
          "APPROVAL_DENIED",
          `Swap of ${amount} HBAR → ${params.toToken} was denied or timed out`,
          { ...policyCheck, verdict: "DENY" as const, rule: "HUMAN_DENIED" },
          [],
          { approvalId: approvalReq.id },
          {}
        );
        await logToHCS(this.hcsConfig, denyEntry);
        return {
          ok: false,
          error: "Swap denied by human operator",
          code: "APPROVAL_DENIED",
          details: JSON.stringify({ approvalId: approvalReq.id }),
        };
      }

      // Approved!
      const approveEntry = buildAuditEntry(
        this.config.agentId,
        "APPROVAL_GRANTED",
        `Human approved swap of ${amount} HBAR → ${params.toToken}`,
        { ...policyCheck, verdict: "PASS" as const, rule: "HUMAN_APPROVED" },
        [],
        { approvalId: approvalReq.id },
        {}
      );
      await logToHCS(this.hcsConfig, approveEntry);
    }

    // 4. Execute the swap
    const swapResult = await executeHbarSwap(this.client, params);

    // 5. Record spending & log result to HCS
    if (swapResult.ok) {
      recordSpending(this.config.agentId, amount);

      const successEntry = buildAuditEntry(
        this.config.agentId,
        "SWAP_EXECUTED",
        `Swapped ${amount} HBAR → ${swapResult.amountOut} ${swapResult.tokenSymbol} on SaucerSwap V2`,
        { ...policyCheck, verdict: "PASS" as const },
        swapResult.txId ? [swapResult.txId] : [],
        { amountHbar: amount, toToken: params.toToken },
        {
          txId: swapResult.txId,
          amountOut: swapResult.amountOut,
          tokenId: swapResult.tokenId,
          hashScanUrl: swapResult.hashScanUrl,
          gasUsed: swapResult.gasUsed,
        }
      );
      await logToHCS(this.hcsConfig, successEntry);

      const network = this.config.network;
      return {
        ok: true,
        summary: `✅ Swapped ${amount} HBAR → ${swapResult.amountOut} ${swapResult.tokenSymbol}\n   TX: ${swapResult.txId}\n   HashScan: ${swapResult.hashScanUrl}`,
        txId: swapResult.txId,
        data: {
          amountInHbar: amount,
          amountOut: swapResult.amountOut,
          tokenSymbol: swapResult.tokenSymbol,
          tokenId: swapResult.tokenId,
          txId: swapResult.txId,
          hashScanUrl: swapResult.hashScanUrl,
          gasUsed: swapResult.gasUsed,
        },
      };
    } else {
      const failEntry = buildAuditEntry(
        this.config.agentId,
        "SWAP_FAILED",
        `Swap of ${amount} HBAR → ${params.toToken} failed: ${swapResult.error}`,
        policyCheck,
        [],
        { amountHbar: amount, toToken: params.toToken },
        { error: swapResult.error }
      );
      await logToHCS(this.hcsConfig, failEntry);

      return {
        ok: false,
        error: `Swap failed: ${swapResult.error}`,
        code: "SWAP_FAILED",
        details: JSON.stringify(swapResult),
      };
    }
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
