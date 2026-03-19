// ── Approval Manager ───────────────────────────────────────────
// Handles human-in-the-loop approval for high-value actions.
// Primary: web dashboard (real-time polling).
// Actions that exceed the approval threshold are held here
// until a human approves or denies them.

import { ApprovalRequest, PolicyCheckResult, VaultResult } from "../types";
import crypto from "crypto";

/** In-memory approval queue */
const pendingApprovals: Map<string, ApprovalRequest> = new Map();
const resolvedApprovals: Map<string, ApprovalRequest> = new Map();

/** Callbacks waiting for approval resolution */
const waiters: Map<string, (approved: boolean) => void> = new Map();

export function createApprovalRequest(
  agentId: string,
  action: string,
  amount: number,
  recipient: string,
  reason: string,
  policyCheck: PolicyCheckResult
): ApprovalRequest {
  const id = crypto.randomBytes(8).toString("hex");
  const request: ApprovalRequest = {
    id,
    agentId,
    action,
    amount,
    recipient,
    reason,
    policyCheck,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  pendingApprovals.set(id, request);
  return request;
}

/**
 * Wait for approval resolution (with timeout).
 * Returns true if approved, false if denied or timed out.
 */
export function waitForApproval(requestId: string, timeoutMs: number = 300000): Promise<boolean> {
  return new Promise((resolve) => {
    // Already resolved?
    const existing = resolvedApprovals.get(requestId);
    if (existing) {
      resolve(existing.status === "approved");
      return;
    }

    const timer = setTimeout(() => {
      waiters.delete(requestId);
      // Auto-deny on timeout
      const req = pendingApprovals.get(requestId);
      if (req) {
        req.status = "denied";
        req.resolvedAt = new Date().toISOString();
        req.resolvedBy = "timeout";
        pendingApprovals.delete(requestId);
        resolvedApprovals.set(requestId, req);
      }
      resolve(false);
    }, timeoutMs);

    waiters.set(requestId, (approved) => {
      clearTimeout(timer);
      resolve(approved);
    });
  });
}

/**
 * Resolve an approval (called from dashboard/API)
 */
export function resolveApproval(
  requestId: string,
  approved: boolean,
  resolvedBy: string = "operator"
): VaultResult {
  const request = pendingApprovals.get(requestId);
  if (!request) {
    // Check if already resolved
    if (resolvedApprovals.has(requestId)) {
      return {
        ok: false,
        error: "Approval already resolved",
        code: "ALREADY_RESOLVED",
        details: `Request ${requestId} was already ${resolvedApprovals.get(requestId)!.status}`,
      };
    }
    return {
      ok: false,
      error: "Approval request not found",
      code: "NOT_FOUND",
      details: `No pending approval with id ${requestId}`,
    };
  }

  request.status = approved ? "approved" : "denied";
  request.resolvedAt = new Date().toISOString();
  request.resolvedBy = resolvedBy;

  pendingApprovals.delete(requestId);
  resolvedApprovals.set(requestId, request);

  // Wake up anyone waiting
  const waiter = waiters.get(requestId);
  if (waiter) {
    waiters.delete(requestId);
    waiter(approved);
  }

  const icon = approved ? "✅" : "🚫";
  return {
    ok: true,
    summary: `${icon} Approval ${requestId} ${request.status} by ${resolvedBy}`,
    data: { request },
  };
}

export function getPendingApprovals(agentId?: string): ApprovalRequest[] {
  const all = Array.from(pendingApprovals.values());
  if (agentId) return all.filter((r) => r.agentId === agentId);
  return all;
}

export function getResolvedApprovals(agentId?: string): ApprovalRequest[] {
  const all = Array.from(resolvedApprovals.values());
  if (agentId) return all.filter((r) => r.agentId === agentId);
  return all;
}

export function getAllApprovals(agentId?: string): ApprovalRequest[] {
  return [...getPendingApprovals(agentId), ...getResolvedApprovals(agentId)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
