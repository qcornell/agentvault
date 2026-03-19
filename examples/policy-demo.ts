#!/usr/bin/env npx ts-node
// ── Policy Engine Demo ─────────────────────────────────────────
// No Hedera needed — pure in-memory policy evaluation.
// Shows how the policy engine works: PASS, DENY, APPROVAL_REQUIRED.
//
// Usage:
//   npx ts-node examples/policy-demo.ts

import { AgentPolicy } from "../src/types";
import { evaluatePolicy, formatPolicyResult, validatePolicy, recordSpending, resetDailySpending } from "../src/policy";

const policy: AgentPolicy = {
  agentId: "demo-agent",
  dailySpendLimitHbar: 100,
  perTxLimitHbar: 50,
  approvalRequiredAboveHbar: 25,
  allowedActions: ["HBAR_TRANSFER", "DISTRIBUTE_TO_HOLDERS", "GET_BALANCE"],
  allowedRecipients: ["0.0.1234", "0.0.5678", "0.0.9012"],
  approvalMethod: "web",
};

function header(text: string) {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`  ${text}`);
  console.log(`${"─".repeat(50)}`);
}

function test(label: string, action: string, amount: number, recipient?: string) {
  const result = evaluatePolicy(policy, action, amount, recipient);
  console.log(`\n  📋 ${label}`);
  console.log(`     Action: ${action} | Amount: ${amount} ℏ${recipient ? ` | To: ${recipient}` : ""}`);
  console.log(`     ${formatPolicyResult(result)}`);
  return result;
}

console.log("\n🛡️  AgentVault Policy Engine Demo");
console.log("   No Hedera connection needed — pure rule evaluation\n");
console.log("Policy:");
console.log(`  Daily limit:       ${policy.dailySpendLimitHbar} ℏ`);
console.log(`  Per-TX limit:      ${policy.perTxLimitHbar} ℏ`);
console.log(`  Approval above:    ${policy.approvalRequiredAboveHbar} ℏ`);
console.log(`  Allowed actions:   ${policy.allowedActions.join(", ")}`);
console.log(`  Allowed recipients: ${policy.allowedRecipients.join(", ")}`);

// ── Validate ──
header("1. Policy Validation");
const errors = validatePolicy(policy);
console.log(`  ${errors.length === 0 ? "✅ Policy is valid" : `❌ ${errors.length} errors: ${errors.join("; ")}`}`);

// ── Rule 1: Action whitelist ──
header("2. Action Whitelist");
test("Allowed action", "HBAR_TRANSFER", 10, "0.0.1234");
test("Blocked action", "DELETE_ACCOUNT", 0);

// ── Rule 2: Recipient whitelist ──
header("3. Recipient Whitelist");
test("Approved recipient", "HBAR_TRANSFER", 10, "0.0.1234");
test("Unknown recipient", "HBAR_TRANSFER", 10, "0.0.9999999");

// ── Rule 3: Per-TX limit ──
header("4. Per-Transaction Limit");
test("Under limit (10 ℏ)", "HBAR_TRANSFER", 10, "0.0.1234");
test("Over per-TX but under approval (30 ℏ)", "HBAR_TRANSFER", 30, "0.0.1234");
test("Way over (60 ℏ)", "HBAR_TRANSFER", 60, "0.0.1234");

// ── Rule 4: Daily spending ──
header("5. Daily Spending Limit");
resetDailySpending("demo-agent");
console.log("\n  Recording 80 ℏ of spending...");
recordSpending("demo-agent", 80);
test("After 80 ℏ spent, try 25 ℏ more", "HBAR_TRANSFER", 25, "0.0.1234");

// ── Rule 5: Approval threshold ──
header("6. Approval Threshold");
resetDailySpending("demo-agent");
test("Under threshold (20 ℏ)", "HBAR_TRANSFER", 20, "0.0.1234");
test("Over threshold (30 ℏ)", "HBAR_TRANSFER", 30, "0.0.1234");

header("Demo Complete");
console.log(`
  The policy engine evaluates 5 rules in order:
  1. Action whitelist — is this action allowed?
  2. Recipient whitelist — is the target approved?
  3. Per-TX limit — is this single transaction too large?
  4. Daily spending limit — would this exceed the daily budget?
  5. Approval threshold — does a human need to sign off?

  Every check returns: PASS, DENY, or APPROVAL_REQUIRED
  Zero side effects — the engine never executes anything.
`);
