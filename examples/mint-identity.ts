#!/usr/bin/env npx ts-node
// ── Mint Agent Identity NFT ────────────────────────────────────
// Standalone script to mint an identity NFT for an AI agent.
// Creates an NFT collection (max supply 1) with full metadata.
//
// Usage:
//   HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/mint-identity.ts

import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import { mintAgentNFT } from "../src/identity";

const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID;
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error("\n❌ Missing env vars. Run with:");
  console.error("   HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node examples/mint-identity.ts\n");
  process.exit(1);
}

async function main() {
  console.log("\n🤖 Minting Agent Identity NFT on Hedera Testnet...\n");

  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(OPERATOR_ID!), PrivateKey.fromString(OPERATOR_KEY!));

  const policy = {
    agentId: "agentvault:standalone-agent",
    dailySpendLimitHbar: 50,
    perTxLimitHbar: 25,
    approvalRequiredAboveHbar: 10,
    allowedActions: ["HBAR_TRANSFER", "GET_BALANCE"],
    allowedRecipients: [OPERATOR_ID!],
    approvalMethod: "web" as const,
  };

  const result = await mintAgentNFT({
    client,
    operatorId: OPERATOR_ID!,
    operatorKey: OPERATOR_KEY!,
    identity: {
      agentId: "agentvault:standalone-agent",
      name: "My First Agent",
      description: "A simple AgentVault-managed agent",
      walletId: OPERATOR_ID!,
      hcsTopicId: "TBD",
      capabilities: policy.allowedActions,
      operator: OPERATOR_ID!,
    },
    policyJson: JSON.stringify(policy),
  });

  if (result.ok) {
    console.log(result.summary);
    console.log(`\n🔗 View on HashScan: ${result.data.hashScanUrl}`);
    console.log(`   NFT Detail:       ${result.data.nftUrl}`);
    console.log(`   TX ID:            ${result.txId}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
    if (result.details) console.error(`   Details: ${result.details}`);
  }
}

main().catch((err) => {
  console.error("\n💥 Crashed:", err.message || err);
  process.exit(1);
});
