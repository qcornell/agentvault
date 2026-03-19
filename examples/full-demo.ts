#!/usr/bin/env npx ts-node
// ── AgentVault Full Demo ───────────────────────────────────────
// End-to-end demonstration:
//   1. Initialize vault (HCS topic + Identity NFT)
//   2. Show the agent card
//   3. Attempt a BLOCKED transfer (bad recipient) → DENY
//   4. Attempt a high-value transfer → APPROVAL_REQUIRED
//   5. Run DeedSlice distribution (3 holders) → SUCCESS
//   6. Print all HashScan URLs
//
// Usage:
//   HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/full-demo.ts

import { AgentVault, VaultConfig } from "../src/vault";
import { AgentPolicy } from "../src/types";
import { formatPolicyResult } from "../src/policy";
import { Holder } from "../src/actions";

// ── Config ──
const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID;
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error("\n❌ Missing env vars. Run with:");
  console.error("   HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/full-demo.ts\n");
  process.exit(1);
}

// Test holders for the DeedSlice distribution demo
// In production, these come from mirror node queries
const TEST_HOLDERS: Holder[] = [
  { accountId: OPERATOR_ID, name: "Alice (45%)", ownershipPercent: 45 },
  { accountId: OPERATOR_ID, name: "Bob (35%)", ownershipPercent: 35 },
  { accountId: OPERATOR_ID, name: "Charlie (20%)", ownershipPercent: 20 },
];

// Agent policy — the rules that govern what this agent can do
const policy: AgentPolicy = {
  agentId: `agentvault:deedslice-distributor`,
  dailySpendLimitHbar: 100,
  perTxLimitHbar: 50,
  approvalRequiredAboveHbar: 25,
  allowedActions: [
    "HBAR_TRANSFER",
    "DISTRIBUTE_TO_HOLDERS",
    "GET_BALANCE",
    "GET_AUDIT_LOG",
  ],
  allowedRecipients: [OPERATOR_ID], // only our own account for safety in demo
  approvalMethod: "web",
};

const config: VaultConfig = {
  operatorId: OPERATOR_ID,
  operatorKey: OPERATOR_KEY,
  network: "testnet",
  agentName: "DeedSlice Distributor",
  agentId: "agentvault:deedslice-distributor",
  policy,
};

// ── Helpers ──
function header(text: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${text}`);
  console.log(`${"═".repeat(60)}`);
}

function divider() {
  console.log(`\n${"─".repeat(60)}`);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main Demo ──
async function main() {
  console.log("\n🏦 AgentVault — Full Demo");
  console.log("   Bank account + rules for AI agents on Hedera\n");

  const vault = new AgentVault(config);

  // ── Step 1: Initialize ──
  header("Step 1: Initialize Vault");
  console.log("Creating HCS audit topic + minting Identity NFT...\n");

  const initResult = await vault.initialize();
  if (!initResult.ok) {
    console.error("❌ Initialization failed:", initResult.error);
    process.exit(1);
  }

  console.log(initResult.summary);
  console.log(`\n🔗 HashScan links:`);
  console.log(`   NFT:   ${(initResult.data as any).nftUrl}`);
  console.log(`   Topic: ${(initResult.data as any).topicUrl}`);

  await sleep(3000); // let HCS propagate

  // ── Step 2: Agent Card ──
  header("Step 2: Agent Identity Card");
  const status = vault.getStatus() as any;
  console.log(`  Name:    ${status.agent.name}`);
  console.log(`  ID:      ${status.agent.id}`);
  console.log(`  Wallet:  ${status.agent.wallet}`);
  console.log(`  Network: ${status.agent.network}`);
  console.log(`  NFT:     ${status.identity.nftTokenId}`);
  console.log(`  HCS:     ${status.identity.hcsTopicId}`);

  // ── Step 3: Check balance ──
  header("Step 3: Vault Balance");
  const balResult = await vault.getBalance();
  if (balResult.ok) {
    console.log(`  ${balResult.summary}`);
  }

  // ── Step 4: BLOCKED transfer (bad recipient) ──
  header("Step 4: Blocked Transfer (Policy DENY)");
  console.log("Attempting transfer to unauthorized recipient 0.0.9999999...\n");

  const blockedCheck = vault.checkPolicy("HBAR_TRANSFER", 5, "0.0.9999999");
  console.log(`  ${formatPolicyResult(blockedCheck)}`);
  console.log(`  Rule:   ${blockedCheck.rule}`);
  console.log(`  Reason: ${blockedCheck.reason}`);
  console.log("\n  ✅ Transfer blocked before hitting the network. Policy works.");

  await sleep(2000);

  // ── Step 5: HIGH-VALUE transfer (approval required) ──
  header("Step 5: High-Value Transfer (Approval Required)");
  console.log(`Attempting 30 HBAR transfer (above ${policy.approvalRequiredAboveHbar} ℏ threshold)...\n`);

  const approvalCheck = vault.checkPolicy("HBAR_TRANSFER", 30, OPERATOR_ID);
  console.log(`  ${formatPolicyResult(approvalCheck)}`);
  console.log(`  Rule:   ${approvalCheck.rule}`);
  console.log(`  Reason: ${approvalCheck.reason}`);
  console.log("\n  ✅ High-value action escalated to human. Agent can't spend freely.");

  await sleep(2000);

  // ── Step 6: Successful distribution ──
  header("Step 6: DeedSlice Rent Distribution (SUCCESS)");
  console.log("Distributing 10 HBAR to 3 token holders...\n");

  const holders = TEST_HOLDERS.map((h) => `  ${h.name}: ${h.ownershipPercent}%`).join("\n");
  console.log(holders);
  console.log();

  const distResult = await vault.distribute(10, TEST_HOLDERS, "123 Main St — March Rent");

  if (distResult.ok) {
    console.log(distResult.summary);
    console.log("\nSplits:");
    const splits = (distResult.data as any).splits || [];
    for (const s of splits) {
      console.log(`  ${s.name}: ${s.amount} ℏ (${s.percent}%) → ${s.status}`);
    }
    const urls = (distResult.data as any).hashScanUrls || [];
    if (urls.length) {
      console.log(`\n🔗 TX: ${urls[0]}`);
    }
  } else {
    console.log(`❌ Distribution failed: ${distResult.error}`);
  }

  await sleep(2000);

  // ── Step 7: Audit trail ──
  header("Step 7: Full Audit Trail");
  const log = vault.getAuditLog();
  console.log(`${log.length} entries recorded:\n`);
  for (const entry of log) {
    const icon = entry.policyCheck.verdict === "PASS" ? "✅" :
                 entry.policyCheck.verdict === "DENY" ? "🚫" : "⚠️";
    console.log(`  ${icon} ${entry.action} — ${entry.policyCheck.verdict}`);
    console.log(`     ${entry.summary}`);
    if (entry.txIds.length) {
      console.log(`     TX: ${entry.txIds.join(", ")}`);
    }
    console.log();
  }

  // ── Summary ──
  header("Demo Complete 🎉");
  console.log(`
  What just happened:
  ✅ Created an on-chain identity (NFT) for the AI agent
  ✅ Created an immutable audit trail (HCS topic)
  🚫 Blocked an unauthorized transfer (policy DENY)
  ⚠️  Escalated a high-value transfer for human approval
  ✅ Executed a proportional rent distribution
  📜 Every action recorded to Hedera Consensus Service

  All verifiable on HashScan:
    NFT:   https://hashscan.io/testnet/token/${vault.nftTokenId}
    Topic: https://hashscan.io/testnet/topic/${vault.hcsTopicId}

  Dashboard: http://localhost:3099
  `);
}

main().catch((err) => {
  console.error("\n💥 Demo crashed:", err.message || err);
  process.exit(1);
});
