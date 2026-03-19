#!/usr/bin/env npx ts-node
// ── Distribution Demo ──────────────────────────────────────────
// Shows the DeedSlice rent distribution pipeline:
//   Income → split calculation → policy check → batch transfer → HCS audit
//
// Usage:
//   HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/distribution-demo.ts

import { AgentVault, VaultConfig } from "../src/vault";
import { AgentPolicy } from "../src/types";
import { Holder } from "../src/actions";

const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID;
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error("\n❌ Missing env vars. Run with:");
  console.error("   HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/distribution-demo.ts\n");
  process.exit(1);
}

// Simulate 3 investors in a tokenized property
const INVESTORS: Holder[] = [
  { accountId: OPERATOR_ID!, name: "Investor A", ownershipPercent: 50 },
  { accountId: OPERATOR_ID!, name: "Investor B", ownershipPercent: 30 },
  { accountId: OPERATOR_ID!, name: "Investor C", ownershipPercent: 20 },
];

const policy: AgentPolicy = {
  agentId: "agentvault:deedslice-demo",
  dailySpendLimitHbar: 200,
  perTxLimitHbar: 100,
  approvalRequiredAboveHbar: 50,
  allowedActions: ["DISTRIBUTE_TO_HOLDERS", "GET_BALANCE"],
  allowedRecipients: [OPERATOR_ID!],
  approvalMethod: "web",
};

const config: VaultConfig = {
  operatorId: OPERATOR_ID!,
  operatorKey: OPERATOR_KEY!,
  network: "testnet",
  agentName: "DeedSlice Distributor",
  agentId: "agentvault:deedslice-demo",
  policy,
};

async function main() {
  console.log("\n🏠 DeedSlice Distribution Demo");
  console.log("   Proportional rent distribution via AgentVault\n");

  const vault = new AgentVault(config);

  // Initialize (creates HCS topic + NFT)
  console.log("Initializing vault...");
  const init = await vault.initialize();
  if (!init.ok) {
    console.error("❌ Init failed:", init.error);
    process.exit(1);
  }
  console.log(init.summary);

  // Wait for HCS propagation
  await new Promise((r) => setTimeout(r, 3000));

  // Check balance
  const bal = await vault.getBalance();
  if (bal.ok) console.log(`\n💰 ${bal.summary}`);

  // Distribute 20 HBAR (under approval threshold)
  console.log("\n── Distribution 1: 20 ℏ (under approval threshold) ──");
  console.log("Splits:");
  INVESTORS.forEach((h) => console.log(`  ${h.name}: ${h.ownershipPercent}% = ${(h.ownershipPercent / 100) * 20} ℏ`));

  const dist1 = await vault.distribute(20, INVESTORS, "456 Oak Ave — March Rent");
  if (dist1.ok) {
    console.log(`\n${dist1.summary}`);
    const urls = (dist1.data as any).hashScanUrls || [];
    if (urls.length) console.log(`🔗 ${urls[0]}`);
  } else {
    console.log(`❌ ${dist1.error}`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  // Distribute 60 HBAR (above approval threshold)
  console.log("\n── Distribution 2: 60 ℏ (above approval threshold) ──");
  const dist2 = await vault.distribute(60, INVESTORS, "789 Pine Blvd — Q1 Dividend");
  if (dist2.ok) {
    console.log(`\n${dist2.summary}`);
  } else {
    console.log(`\n⚠️  ${dist2.error}`);
    if ((dist2 as any).code === "PENDING_APPROVAL") {
      console.log("   → Open the dashboard at http://localhost:3099 to approve or deny");
    }
  }

  // Show audit trail
  console.log("\n── Audit Trail ──");
  const log = vault.getAuditLog();
  log.forEach((e) => {
    const icon = e.policyCheck.verdict === "PASS" ? "✅" :
                 e.policyCheck.verdict === "DENY" ? "🚫" : "⚠️";
    console.log(`  ${icon} ${e.action} — ${e.summary.slice(0, 80)}`);
  });

  console.log(`\n📜 Full audit on HashScan: https://hashscan.io/testnet/topic/${vault.hcsTopicId}`);
  console.log(`🤖 Identity NFT:          https://hashscan.io/testnet/token/${vault.nftTokenId}\n`);
}

main().catch((err) => {
  console.error("\n💥 Crashed:", err.message || err);
  process.exit(1);
});
