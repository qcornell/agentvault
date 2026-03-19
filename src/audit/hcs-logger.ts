// ── HCS Audit Logger ───────────────────────────────────────────
// Every agent action, policy check, approval, and transaction
// gets immutably recorded to the agent's HCS topic.
// This is the provable trail that makes agents trustworthy.

import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  PrivateKey,
  Status,
} from "@hashgraph/sdk";
import { AuditEntry, PolicyCheckResult, VaultResult } from "../types";

export interface HCSLoggerConfig {
  client: Client;
  topicId?: string;        // existing topic — if not provided, we create one
  submitKey?: string;       // if the topic has a submit key
  operatorId: string;
  operatorKey: string;
}

/** In-memory log for dashboard access (also goes to HCS) */
const localLogs: Map<string, AuditEntry[]> = new Map();

export function getLocalLogs(agentId: string): AuditEntry[] {
  return localLogs.get(agentId) ?? [];
}

export function getAllLogs(): Map<string, AuditEntry[]> {
  return localLogs;
}

/**
 * Create a new HCS topic for an agent's audit trail
 */
export async function createAuditTopic(
  client: Client,
  agentId: string,
  operatorKey: string
): Promise<VaultResult> {
  try {
    const supplyKey = PrivateKey.fromString(operatorKey);

    const tx = new TopicCreateTransaction()
      .setTopicMemo(`AgentVault audit trail for ${agentId}`)
      .setSubmitKey(supplyKey);

    const response = await tx.execute(client as any);
    const receipt = await response.getReceipt(client as any);

    if (receipt.status !== Status.Success) {
      return {
        ok: false,
        error: "Failed to create audit topic",
        code: "TOPIC_CREATE_FAILED",
        details: receipt.status.toString(),
      };
    }

    const topicId = receipt.topicId!.toString();
    return {
      ok: true,
      summary: `Created audit topic ${topicId} for agent ${agentId}`,
      txId: response.transactionId.toString(),
      data: {
        topicId,
        hashScanUrl: `https://hashscan.io/testnet/topic/${topicId}`,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: "Failed to create audit topic",
      code: "TOPIC_ERROR",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Log an audit entry to HCS + local store
 */
export async function logToHCS(
  config: HCSLoggerConfig,
  entry: AuditEntry
): Promise<VaultResult> {
  try {
    // Always store locally for dashboard
    if (!localLogs.has(entry.agentId)) {
      localLogs.set(entry.agentId, []);
    }
    localLogs.get(entry.agentId)!.push(entry);

    if (!config.topicId) {
      return {
        ok: true,
        summary: `Logged locally (no HCS topic configured): ${entry.action}`,
        data: { entry, stored: "local-only" },
      };
    }

    const messageJson = JSON.stringify({
      v: "1.0",
      ...entry,
      // Strip large inputs/outputs to stay under HCS message limit
      inputs: summarizeObject(entry.inputs),
      outputs: summarizeObject(entry.outputs),
    });

    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(config.topicId)
      .setMessage(messageJson);

    const frozenTx = await tx.freezeWith(config.client as any);

    if (config.submitKey) {
      const key = PrivateKey.fromString(config.submitKey);
      await frozenTx.sign(key);
    }

    const response = await frozenTx.execute(config.client as any);
    const receipt = await response.getReceipt(config.client as any);

    if (receipt.status !== Status.Success) {
      return {
        ok: false,
        error: "HCS log submission failed",
        code: "HCS_LOG_FAILED",
        details: receipt.status.toString(),
      };
    }

    const seqNum = receipt.topicSequenceNumber?.toString() ?? "unknown";

    return {
      ok: true,
      summary: `Logged to HCS topic ${config.topicId} (seq #${seqNum}): ${entry.action} — ${entry.policyCheck.verdict}`,
      txId: response.transactionId.toString(),
      data: {
        topicId: config.topicId,
        sequenceNumber: seqNum,
        entry,
        hashScanUrl: `https://hashscan.io/testnet/topic/${config.topicId}`,
      },
    };
  } catch (err) {
    // Still stored locally even if HCS fails
    return {
      ok: false,
      error: "HCS logging failed (entry stored locally)",
      code: "HCS_ERROR",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Build a standard audit entry */
export function buildAuditEntry(
  agentId: string,
  action: string,
  summary: string,
  policyCheck: PolicyCheckResult,
  txIds: string[] = [],
  inputs: Record<string, any> = {},
  outputs: Record<string, any> = {}
): AuditEntry {
  return {
    timestamp: new Date().toISOString(),
    agentId,
    action,
    summary,
    policyCheck,
    txIds,
    inputs: sanitizeInputs(inputs),
    outputs,
  };
}

/** Strip private keys and large blobs from logged inputs */
function sanitizeInputs(inputs: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(inputs)) {
    if (key.toLowerCase().includes("key") || key.toLowerCase().includes("secret")) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.slice(0, 200) + `... [${value.length} chars]`;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/** Truncate object values for HCS message size limits */
function summarizeObject(obj: Record<string, any>): Record<string, any> {
  const json = JSON.stringify(obj);
  if (json.length <= 2000) return obj;
  // If too large, return a summary
  return {
    _truncated: true,
    _keys: Object.keys(obj),
    _sizeBytes: json.length,
  };
}
