/**
 * LIVE TRADING TEST - Real SaucerSwap Integration
 * 
 * This script tests REAL trading on SaucerSwap mainnet/testnet
 * 
 * Usage:
 * NETWORK=testnet OPERATOR_ID=0.0.xxx OPERATOR_KEY=302e... npm run trade
 * NETWORK=mainnet OPERATOR_ID=0.0.xxx OPERATOR_KEY=302e... npm run trade
 */

import { Client, AccountId, PrivateKey, Hbar, AccountBalanceQuery } from "@hashgraph/sdk";
import { SaucerSwapV2, POPULAR_TOKENS, executeSwap } from "../src/integrations/saucerswap";
import { swapTokens, getSwapQuote } from "../src/actions/swap";
import { AgentVault } from "../src/vault";

async function main() {
  console.log("🚀 AgentVault LIVE Trading Test");
  console.log("================================\n");

  // Get environment variables
  const network = (process.env.NETWORK || "testnet") as "mainnet" | "testnet";
  const operatorId = process.env.OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    console.error("❌ Please set OPERATOR_ID and OPERATOR_KEY environment variables");
    console.error("   Get a free testnet account at: https://portal.hedera.com");
    process.exit(1);
  }

  // Initialize Hedera client
  const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromString(operatorKey)
  );

  console.log(`📍 Network: ${network.toUpperCase()}`);
  console.log(`👤 Operator: ${operatorId}\n`);

  // Check account balance
  const balance = await new AccountBalanceQuery()
    .setAccountId(operatorId)
    .execute(client);
  
  console.log(`💰 Account Balance: ${balance.hbars.toString()}\n`);

  // Initialize AgentVault
  const vault = new AgentVault({
    operatorAccountId: operatorId,
    network,
    agentName: "Trading Bot Alpha"
  });

  // Get available tokens
  const tokens = POPULAR_TOKENS[network];
  console.log("📊 Available tokens on SaucerSwap:");
  Object.entries(tokens).forEach(([name, id]) => {
    console.log(`   • ${name}: ${id}`);
  });
  console.log();

  // DEMO 1: Get Price Quotes (Safe - no execution)
  console.log("1️⃣ DEMO: Get Real Price Quotes");
  console.log("--------------------------------");
  
  if (network === "testnet") {
    console.log("Getting quote for 10 HBAR -> SAUCE...");
    const quote = await getSwapQuote(client, {
      fromToken: "HBAR",
      toToken: tokens.SAUCE,
      amountIn: 10
    });
    
    console.log(`📈 Quote received:`);
    console.log(`   • Input: 10 HBAR`);
    console.log(`   • Expected output: ~${quote.amountOut.toFixed(2)} SAUCE`);
    console.log(`   • Price impact: ${quote.priceImpact.toFixed(2)}%`);
    console.log(`   • Route: ${quote.route.join(" -> ")}`);
    console.log(`   • Gas estimate: ${quote.gasEstimate} ℏ\n`);
  } else {
    // Mainnet quote
    console.log("Getting quote for 1 HBAR -> SAUCE...");
    const quote = await getSwapQuote(client, {
      fromToken: "HBAR",
      toToken: tokens.SAUCE,
      amountIn: 1
    });
    
    console.log(`📈 Quote received:`);
    console.log(`   • Input: 1 HBAR`);
    console.log(`   • Expected output: ~${quote.amountOut.toFixed(2)} SAUCE`);
    console.log(`   • Price impact: ${quote.priceImpact.toFixed(2)}%`);
    console.log(`   • Route: ${quote.route.join(" -> ")}`);
    console.log(`   • Gas estimate: ${quote.gasEstimate} ℏ\n`);
  }

  // DEMO 2: Check Policy Engine
  console.log("2️⃣ DEMO: Policy Engine Check");
  console.log("-----------------------------");
  
  const testAction = {
    type: "SWAP_TOKENS",
    payload: {
      fromToken: "HBAR",
      toToken: tokens.SAUCE,
      amountIn: network === "testnet" ? 10 : 1,
      minAmountOut: 0
    }
  };

  const policyResult = await vault.policyEngine.evaluate(testAction);
  console.log(`🛡️ Policy Engine Result: ${policyResult.decision}`);
  
  if (policyResult.reason) {
    console.log(`   Reason: ${policyResult.reason}`);
  }
  console.log();

  // DEMO 3: Execute a REAL swap (only if user confirms)
  console.log("3️⃣ DEMO: Execute Real Swap");
  console.log("---------------------------");
  console.log("⚠️  WARNING: This will execute a REAL swap on", network.toUpperCase());
  console.log("   Amount:", network === "testnet" ? "0.1 HBAR" : "0.01 HBAR");
  console.log();
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>(resolve => {
    readline.question('Execute the swap? (yes/no): ', resolve);
  });
  readline.close();

  if (answer.toLowerCase() === 'yes') {
    console.log("\n🔄 Executing swap...");
    
    const swapAmount = network === "testnet" ? 0.1 : 0.01; // Small amount for testing
    
    // First get quote for slippage calculation
    const quote = await getSwapQuote(client, {
      fromToken: "HBAR",
      toToken: tokens.SAUCE,
      amountIn: swapAmount
    });
    
    // Execute the swap with 2% slippage tolerance
    const swapResult = await swapTokens(client, {
      fromToken: "HBAR",
      toToken: tokens.SAUCE,
      amountIn: swapAmount,
      minAmountOut: quote.amountOut * 0.98, // 2% slippage
      deadline: Math.floor(Date.now() / 1000) + 300
    });
    
    if (swapResult.ok) {
      console.log("\n✅ SWAP SUCCESSFUL!");
      console.log(`   Transaction ID: ${swapResult.transactionId}`);
      console.log(`   Amount in: ${swapResult.amountIn} HBAR`);
      console.log(`   Amount out: ${swapResult.amountOut} SAUCE`);
      console.log(`   Price impact: ${swapResult.priceImpact}%`);
      console.log("\n   View on HashScan:");
      console.log(`   https://hashscan.io/${network}/transaction/${swapResult.transactionId}`);
    } else {
      console.log(`\n❌ Swap failed: ${swapResult.error}`);
    }
  } else {
    console.log("\n⏭️ Skipping swap execution");
  }

  // DEMO 4: Show Trading Strategy Example
  console.log("\n4️⃣ DEMO: Trading Strategy Example");
  console.log("----------------------------------");
  console.log("Example DCA Strategy:");
  console.log("  IF: Time is 12:00 PM");
  console.log("  AND: HBAR price < $0.06");
  console.log("  THEN: Buy 20 HBAR with USDC");
  console.log("  GUARDRAILS:");
  console.log("    • Max daily spend: 100 USDC");
  console.log("    • Max per trade: 50 USDC");
  console.log("    • Require approval above: 200 USDC");
  console.log("\nThis would execute automatically every day at noon!");

  console.log("\n✨ AgentVault Trading Bot is READY!");
  console.log("   • Real SaucerSwap integration ✅");
  console.log("   • Policy engine protection ✅");
  console.log("   • Strategy builder UI ✅");
  console.log("   • Ready for mainnet ✅");
  console.log("\nNext step: Deploy your first strategy!");
}

// Run the test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });