/**
 * AgentVault Trading Demo
 * Shows how the platform evolves from safety rails to trading bot
 */

import { Client, AccountId, PrivateKey, Hbar } from "@hashgraph/sdk";
import { AgentVault } from "../src/vault";
import { swapTokens, getSwapQuote, executeStrategy, STRATEGY_TEMPLATES } from "../src/actions/swap";

async function main() {
  console.log("🤖 AgentVault Trading Demo");
  console.log("========================\n");

  // Initialize client (testnet)
  const operatorId = AccountId.fromString(process.env.OPERATOR_ID || "0.0.7420047");
  const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY || "YOUR_KEY");
  
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  // Initialize vault
  const vault = new AgentVault({
    operatorAccountId: operatorId.toString(),
    network: "testnet",
    agentName: "Trading Bot Alpha"
  });

  console.log("1️⃣ DEMO: Basic Swap with Safety Rails");
  console.log("----------------------------------------");
  
  // First, get a quote
  console.log("Getting quote for 100 USDC -> HBAR...");
  const quote = await getSwapQuote(client, {
    fromToken: "USDC",
    toToken: "HBAR",
    amountIn: 100
  });
  
  console.log(`Quote received:`);
  console.log(`  • You send: 100 USDC`);
  console.log(`  • You receive: ~${quote.amountOut} HBAR`);
  console.log(`  • Price impact: ${quote.priceImpact}%`);
  console.log(`  • Gas estimate: ${quote.gasEstimate} ℏ\n`);

  // Try to execute swap - but it gets checked by policy engine!
  console.log("Attempting swap...");
  
  const swapAction = {
    type: "SWAP_TOKENS",
    payload: {
      fromToken: "USDC",
      toToken: "HBAR",
      amountIn: 100,
      minAmountOut: quote.amountOut * 0.99 // 1% slippage
    }
  };

  // Check with policy engine
  const policyResult = await vault.policyEngine.evaluate(swapAction);
  
  if (policyResult.decision === "DENY") {
    console.log("❌ BLOCKED by Policy Engine!");
    console.log(`  Reason: ${policyResult.reason}`);
  } else if (policyResult.decision === "APPROVAL_REQUIRED") {
    console.log("⚠️ APPROVAL REQUIRED");
    console.log(`  Reason: Amount exceeds approval threshold`);
    console.log(`  Status: Waiting for human approval...`);
  } else {
    console.log("✅ APPROVED - Executing swap...");
    const result = await swapTokens(client, {
      fromToken: "USDC",
      toToken: "HBAR",
      amountIn: 100,
      minAmountOut: quote.amountOut * 0.99
    });
    
    if (result.ok) {
      console.log(`  Success! TX: ${result.transactionId}`);
      console.log(`  Received: ${result.amountOut} HBAR`);
    }
  }

  console.log("\n2️⃣ DEMO: Strategy Builder - Safe DCA");
  console.log("----------------------------------------");
  
  const dcaStrategy = STRATEGY_TEMPLATES["safe-dca"];
  console.log(`Strategy: ${dcaStrategy.name}`);
  console.log(`Description: ${dcaStrategy.description}`);
  console.log("\nConditions:");
  dcaStrategy.conditions.forEach(c => {
    console.log(`  • ${c.type}: ${JSON.stringify(c.params)}`);
  });
  console.log("\nActions:");
  dcaStrategy.actions.forEach(a => {
    console.log(`  • ${a.type}: ${JSON.stringify(a.params)}`);
  });
  console.log("\nGuardrails:");
  console.log(`  • Max daily: ${dcaStrategy.guardrails.maxDailySpend} HBAR`);
  console.log(`  • Max per trade: ${dcaStrategy.guardrails.maxPerTrade} HBAR`);
  console.log(`  • Approval above: ${dcaStrategy.guardrails.requireApprovalAbove} HBAR`);

  // Simulate strategy execution
  console.log("\n🎯 Simulating strategy execution...");
  const mockMarketData = {
    currentTime: new Date().getHours(),
    prices: { HBAR: 0.05, USDC: 1.0 }
  };

  const strategyResult = await executeStrategy(client, dcaStrategy, mockMarketData);
  
  if (strategyResult.ok) {
    console.log("✅ Strategy executed successfully!");
    console.log(`  Executed actions: ${strategyResult.executed.length}`);
    console.log(`  Blocked actions: ${strategyResult.blocked.length}`);
  } else {
    console.log("⏸️ Strategy conditions not met");
  }

  console.log("\n3️⃣ DEMO: The Marketplace Vision");
  console.log("----------------------------------------");
  console.log("Imagine a marketplace where:");
  console.log("  • 🧠 Traders share proven strategies");
  console.log("  • 💰 Users subscribe to top performers");
  console.log("  • 📊 Real performance data visible");
  console.log("  • 🛡️ AgentVault enforces safety on ALL strategies");
  console.log("  • 💎 Strategy creators earn 70% of revenue");
  
  console.log("\nExample marketplace strategies:");
  const marketplaceExamples = [
    { name: "HBAR Accumulator", author: "CryptoWhale", subscribers: 234, monthlyReturn: "+12.3%" },
    { name: "Stable Yield Farm", author: "DeFiDegen", subscribers: 567, monthlyReturn: "+4.2%" },
    { name: "Meme Coin Sniper", author: "ApeHunter", subscribers: 89, monthlyReturn: "+45.6%" },
    { name: "Risk-Averse DCA", author: "SafeTrader", subscribers: 1023, monthlyReturn: "+6.8%" }
  ];
  
  marketplaceExamples.forEach(s => {
    console.log(`\n  📦 ${s.name}`);
    console.log(`     By: ${s.author}`);
    console.log(`     Subscribers: ${s.subscribers}`);
    console.log(`     Avg Return: ${s.monthlyReturn}`);
  });

  console.log("\n\n✨ This is AgentVault's future:");
  console.log("   Not just a trading bot...");
  console.log("   An AI Financial Operating System.");
  console.log("   Where strategies are apps.");
  console.log("   And safety is built-in.\n");
}

// Run the demo
main().catch(console.error);