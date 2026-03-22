// ── Distribute to Holders ──────────────────────────────────────
// Proportional HBAR distribution to token holders.
// This is the DeedSlice rent distribution use case:
//   Income in → splits calculated → policy checked → transfers out → HCS logged
//
// For hackathon: uses hard-coded holder list.
// Production: query mirror node for token holder balances.

import {
  Client,
  TransferTransaction,
  Hbar,
  AccountId,
  Status,
} from "@hashgraph/sdk";
import { VaultResult, AgentPolicy, PolicyCheckResult } from "../types";
import { evaluatePolicy, recordSpending } from "../policy/engine";
import { logToHCS, buildAuditEntry, HCSLoggerConfig } from "../audit/hcs-logger";

export interface Holder {
  accountId: string;
  name: string;
  ownershipPercent: number; // 0-100
}

export interface DistributeInput {
  client: Client;
  agentId: string;
  policy: AgentPolicy;
  hcsConfig: HCSLoggerConfig;
  totalAmountHbar: number;
  holders: Holder[];
  propertyName: string;
  memo?: string;
}

export interface DistributionSplit {
  holder: Holder;
  amountHbar: number;
  txId?: string;
  status: "success" | "failed" | "skipped";
  error?: string;
}

/**
 * Execute a proportional distribution — the full pipeline:
 * 1. Calculate splits
 * 2. Check each transfer against policy
 * 3. Execute transfers
 * 4. Log everything to HCS
 */
export async function distributeToHolders(input: DistributeInput): Promise<VaultResult> {
  const {
    client, agentId, policy, hcsConfig,
    totalAmountHbar, holders, propertyName, memo
  } = input;

  // Validate holders add up to 100%
  const totalPercent = holders.reduce((sum, h) => sum + h.ownershipPercent, 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    return {
      ok: false,
      error: "Holder percentages must sum to 100%",
      code: "INVALID_DISTRIBUTION",
      details: `Total: ${totalPercent}%`,
    };
  }

  // Calculate splits
  const splits: DistributionSplit[] = holders.map((holder) => ({
    holder,
    amountHbar: Math.round((holder.ownershipPercent / 100) * totalAmountHbar * 10000) / 10000,
    status: "skipped" as const,
  }));

  // Policy check for the total distribution
  const totalPolicyCheck = evaluatePolicy(
    policy,
    "DISTRIBUTE_TO_HOLDERS",
    totalAmountHbar,
    undefined // distribution has multiple recipients
  );

  // If the total distribution is denied, log and abort
  if (totalPolicyCheck.verdict === "DENY") {
    const entry = buildAuditEntry(
      agentId,
      "DISTRIBUTE_TO_HOLDERS",
      `Distribution of ${totalAmountHbar} HBAR for "${propertyName}" DENIED: ${totalPolicyCheck.reason}`,
      totalPolicyCheck,
      [],
      { totalAmountHbar, propertyName, holderCount: holders.length },
      { splits: splits.map((s) => ({ to: s.holder.accountId, amount: s.amountHbar })) }
    );
    await logToHCS(hcsConfig, entry);

    return {
      ok: false,
      error: `Distribution denied by policy: ${totalPolicyCheck.reason}`,
      code: "POLICY_DENIED",
      details: totalPolicyCheck.rule,
    };
  }

  // If approval required, return the check result for the caller to handle
  if (totalPolicyCheck.verdict === "APPROVAL_REQUIRED") {
    const entry = buildAuditEntry(
      agentId,
      "DISTRIBUTE_TO_HOLDERS",
      `Distribution of ${totalAmountHbar} HBAR for "${propertyName}" requires approval`,
      totalPolicyCheck,
      [],
      { totalAmountHbar, propertyName, holderCount: holders.length },
      { splits: splits.map((s) => ({ to: s.holder.accountId, amount: s.amountHbar })) }
    );
    await logToHCS(hcsConfig, entry);

    return {
      ok: false,
      error: "Distribution requires human approval",
      code: "APPROVAL_REQUIRED",
      details: JSON.stringify({
        totalAmountHbar,
        propertyName,
        splits: splits.map((s) => ({
          to: s.holder.accountId,
          name: s.holder.name,
          amount: s.amountHbar,
          percent: s.holder.ownershipPercent,
        })),
        policyCheck: totalPolicyCheck,
      }),
    };
  }

  // Execute transfers — batch into a single TransferTransaction
  const txIds: string[] = [];
  try {
    const transferTx = new TransferTransaction();
    let totalOut = 0;

    for (const split of splits) {
      if (split.amountHbar <= 0) continue;
      transferTx.addHbarTransfer(
        AccountId.fromString(split.holder.accountId),
        new Hbar(split.amountHbar)
      );
      totalOut += split.amountHbar;
    }

    // Debit from the agent's wallet (always use the operator account)
    transferTx.addHbarTransfer(
      AccountId.fromString(hcsConfig.operatorId),
      new Hbar(-totalOut)
    );

    if (memo) {
      transferTx.setTransactionMemo(memo);
    } else {
      transferTx.setTransactionMemo(`AgentVault distribution: ${propertyName}`);
    }

    const response = await transferTx.execute(client as any);
    const receipt = await response.getReceipt(client as any);

    if (receipt.status !== Status.Success) {
      // Log failure
      const entry = buildAuditEntry(
        agentId,
        "DISTRIBUTE_TO_HOLDERS",
        `Distribution FAILED: ${receipt.status.toString()}`,
        totalPolicyCheck,
        [],
        { totalAmountHbar, propertyName },
        { error: receipt.status.toString() }
      );
      await logToHCS(hcsConfig, entry);

      return {
        ok: false,
        error: `Distribution transaction failed: ${receipt.status.toString()}`,
        code: "TX_FAILED",
      };
    }

    const txId = response.transactionId.toString();
    txIds.push(txId);

    // Mark all splits as success
    for (const split of splits) {
      if (split.amountHbar > 0) {
        split.txId = txId;
        split.status = "success";
      }
    }

    // Record the spending
    recordSpending(agentId, totalAmountHbar);

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const entry = buildAuditEntry(
      agentId,
      "DISTRIBUTE_TO_HOLDERS",
      `Distribution ERROR: ${errMsg}`,
      totalPolicyCheck,
      txIds,
      { totalAmountHbar, propertyName },
      { error: errMsg }
    );
    await logToHCS(hcsConfig, entry);

    return {
      ok: false,
      error: "Distribution failed",
      code: "EXECUTION_ERROR",
      details: errMsg,
    };
  }

  // Log success to HCS
  const successEntry = buildAuditEntry(
    agentId,
    "DISTRIBUTE_TO_HOLDERS",
    `Distributed ${totalAmountHbar} HBAR for "${propertyName}" to ${holders.length} holders`,
    totalPolicyCheck,
    txIds,
    { totalAmountHbar, propertyName, holderCount: holders.length },
    {
      splits: splits.map((s) => ({
        to: s.holder.accountId,
        name: s.holder.name,
        amount: s.amountHbar,
        percent: s.holder.ownershipPercent,
        txId: s.txId,
        status: s.status,
      })),
    }
  );
  await logToHCS(hcsConfig, successEntry);

  // Build HashScan URLs
  const hashScanUrls = txIds.map((id) => {
    return `https://hashscan.io/testnet/transaction/${encodeURIComponent(id)}`;
  });

  return {
    ok: true,
    summary: `✅ Distributed ${totalAmountHbar} HBAR for "${propertyName}" to ${holders.length} holders`,
    txId: txIds[0],
    data: {
      propertyName,
      totalAmountHbar,
      splits: splits.map((s) => ({
        to: s.holder.accountId,
        name: s.holder.name,
        amount: s.amountHbar,
        percent: s.holder.ownershipPercent,
        status: s.status,
      })),
      txIds,
      hashScanUrls,
      policyCheck: totalPolicyCheck,
    },
  };
}
