// ── Policy Engine ──────────────────────────────────────────────
// Evaluates every proposed action against the agent's policy rules.
// Returns PASS, DENY, or APPROVAL_REQUIRED — never executes anything.
// Pure function, zero side effects. The caller decides what to do.

import { AgentPolicy, PolicyCheckResult, PolicyVerdict } from "../types";

/** Tracks daily spending per agent (in-memory, resets on restart) */
const dailySpending: Map<string, { date: string; total: number }> = new Map();

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getDailySpent(agentId: string): number {
  const entry = dailySpending.get(agentId);
  if (!entry || entry.date !== getTodayKey()) return 0;
  return entry.total;
}

export function recordSpending(agentId: string, amountHbar: number): void {
  const today = getTodayKey();
  const entry = dailySpending.get(agentId);
  if (!entry || entry.date !== today) {
    dailySpending.set(agentId, { date: today, total: amountHbar });
  } else {
    entry.total += amountHbar;
  }
}

export function resetDailySpending(agentId: string): void {
  dailySpending.delete(agentId);
}

/** Core policy evaluation — call this before every action */
export function evaluatePolicy(
  policy: AgentPolicy,
  action: string,
  amount: number,
  recipient?: string
): PolicyCheckResult {
  const dailySpentSoFar = getDailySpent(policy.agentId);
  const baseDetails = { action, amount, recipient, dailySpentSoFar };

  // Rule 1: Action whitelist
  if (!policy.allowedActions.includes(action)) {
    return {
      verdict: "DENY",
      rule: "ALLOWED_ACTIONS",
      reason: `Action "${action}" is not in the agent's allowed actions list`,
      details: baseDetails,
    };
  }

  // Rule 2: Recipient whitelist (skip for non-transfer actions)
  if (recipient && policy.allowedRecipients.length > 0) {
    if (!policy.allowedRecipients.includes(recipient)) {
      return {
        verdict: "DENY",
        rule: "ALLOWED_RECIPIENTS",
        reason: `Recipient "${recipient}" is not in the agent's approved recipients list`,
        details: baseDetails,
      };
    }
  }

  // Rule 3: Per-transaction limit
  if (amount > policy.perTxLimitHbar) {
    // Check if it should be escalated vs denied
    if (amount <= policy.approvalRequiredAboveHbar) {
      return {
        verdict: "DENY",
        rule: "PER_TX_LIMIT",
        reason: `Amount ${amount} HBAR exceeds per-transaction limit of ${policy.perTxLimitHbar} HBAR`,
        details: baseDetails,
      };
    }
    // Falls through to approval check below
  }

  // Rule 4: Daily spending limit
  if (dailySpentSoFar + amount > policy.dailySpendLimitHbar) {
    return {
      verdict: "DENY",
      rule: "DAILY_LIMIT",
      reason: `Transaction would push daily spending to ${dailySpentSoFar + amount} HBAR, exceeding the ${policy.dailySpendLimitHbar} HBAR daily limit (spent today: ${dailySpentSoFar} HBAR)`,
      details: baseDetails,
    };
  }

  // Rule 5: Approval threshold
  if (amount > policy.approvalRequiredAboveHbar) {
    return {
      verdict: "APPROVAL_REQUIRED",
      rule: "APPROVAL_THRESHOLD",
      reason: `Amount ${amount} HBAR exceeds the ${policy.approvalRequiredAboveHbar} HBAR approval threshold — human approval required`,
      details: baseDetails,
    };
  }

  // All rules passed
  return {
    verdict: "PASS",
    rule: "ALL_CLEAR",
    reason: `Action "${action}" for ${amount} HBAR passed all policy checks`,
    details: baseDetails,
  };
}

/** Validate a policy object for completeness */
export function validatePolicy(policy: Partial<AgentPolicy>): string[] {
  const errors: string[] = [];
  if (!policy.agentId) errors.push("agentId is required");
  if (typeof policy.dailySpendLimitHbar !== "number" || policy.dailySpendLimitHbar <= 0)
    errors.push("dailySpendLimitHbar must be a positive number");
  if (typeof policy.perTxLimitHbar !== "number" || policy.perTxLimitHbar <= 0)
    errors.push("perTxLimitHbar must be a positive number");
  if (typeof policy.approvalRequiredAboveHbar !== "number" || policy.approvalRequiredAboveHbar <= 0)
    errors.push("approvalRequiredAboveHbar must be a positive number");
  if (!Array.isArray(policy.allowedActions) || policy.allowedActions.length === 0)
    errors.push("allowedActions must be a non-empty array");
  if (!Array.isArray(policy.allowedRecipients))
    errors.push("allowedRecipients must be an array");
  if (policy.perTxLimitHbar && policy.approvalRequiredAboveHbar &&
      policy.perTxLimitHbar > policy.approvalRequiredAboveHbar)
    errors.push("perTxLimitHbar should not exceed approvalRequiredAboveHbar");
  return errors;
}

/** Pretty-print a policy check result */
export function formatPolicyResult(result: PolicyCheckResult): string {
  const icon = result.verdict === "PASS" ? "✅" :
               result.verdict === "DENY" ? "🚫" : "⚠️";
  return `${icon} ${result.verdict} | Rule: ${result.rule} | ${result.reason}`;
}
