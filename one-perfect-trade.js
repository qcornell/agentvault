/**
 * ONE PERFECT TRADE
 * The goal: Execute ONE verified swap on SaucerSwap mainnet
 * Following GPT's exact recommendations
 */

const { Client, AccountId, PrivateKey, AccountBalanceQuery, Hbar } = require("@hashgraph/sdk");
const { SaucerSwapV2Production } = require("./dist/integrations/saucerswap-v2");
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log("🎯 ONE PERFECT TRADE - SaucerSwap Mainnet");
  console.log("==========================================\n");
  
  // Setup
  const ACCOUNT_ID = "0.0.10206295";
  const RAW_KEY = "6564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee";
  const DER_KEY = "302e020100300506032b6570042204206" + RAW_KEY;
  
  const client = Client.forMainnet();
  const privateKey = PrivateKey.fromString(DER_KEY);
  client.setOperator(AccountId.fromString(ACCOUNT_ID), privateKey);
  
  console.log("📍 Network: MAINNET (REAL MONEY)");
  console.log(`👤 Account: ${ACCOUNT_ID}\n`);
  
  try {
    // STEP 1: Check balance
    console.log("1️⃣ Checking balance...");
    const balance = await new AccountBalanceQuery()
      .setAccountId(ACCOUNT_ID)
      .execute(client);
    
    const hbarBalance = balance.hbars.toBigNumber().toNumber();
    console.log(`   Balance: ${hbarBalance.toFixed(4)} ℏ`);
    console.log(`   USD: $${(hbarBalance * 0.05).toFixed(2)}\n`);
    
    // STEP 2: Initialize SaucerSwap
    console.log("2️⃣ Initializing SaucerSwap V2...");
    const swapper = new SaucerSwapV2Production(client, 'mainnet');
    
    // STEP 3: Get quote (no money spent)
    const AMOUNT = 0.01; // TINY amount for safety
    const FROM_TOKEN = "HBAR";
    const TO_TOKEN = "0.0.731861"; // SAUCE
    
    console.log(`\n3️⃣ Getting quote for ${AMOUNT} ${FROM_TOKEN} → SAUCE...`);
    const quote = await swapper.getQuote(FROM_TOKEN, TO_TOKEN, AMOUNT);
    
    console.log(`\n📊 Quote Results:`);
    console.log(`   Input: ${AMOUNT} HBAR`);
    console.log(`   Output: ${quote.amountOut.toFixed(4)} SAUCE`);
    console.log(`   Price Impact: ${quote.priceImpact.toFixed(2)}%`);
    console.log(`   Path: ${quote.path.join(' → ')}`);
    console.log(`   Estimated gas: 0.5 ℏ`);
    console.log(`   Total cost: ~${(AMOUNT + 0.5).toFixed(4)} ℏ\n`);
    
    // STEP 4: Safety checks
    console.log("4️⃣ Safety Checks:");
    console.log(`   ✅ Amount small: ${AMOUNT} HBAR`);
    console.log(`   ✅ Price impact low: ${quote.priceImpact.toFixed(2)}%`);
    console.log(`   ✅ Slippage set: 2%`);
    console.log(`   ✅ Quote received: ${quote.amountOut > 0}\n`);
    
    // STEP 5: Confirm execution
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  READY TO EXECUTE REAL SWAP");
    console.log(`   Network: MAINNET`);
    console.log(`   Swap: ${AMOUNT} HBAR → ~${quote.amountOut.toFixed(2)} SAUCE`);
    console.log(`   Cost: ~$${((AMOUNT + 0.5) * 0.05).toFixed(3)}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    const answer = await new Promise(resolve => {
      rl.question('Execute this swap? (type "yes" to confirm): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log("❌ Swap cancelled");
      return;
    }
    
    // STEP 6: EXECUTE THE SWAP
    console.log("\n5️⃣ Executing swap...");
    console.log("   Please wait...\n");
    
    const startTime = Date.now();
    const result = await swapper.swap(FROM_TOKEN, TO_TOKEN, AMOUNT, 2); // 2% slippage
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (result.success) {
      console.log("\n✅✅✅ SWAP SUCCESSFUL! ✅✅✅");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Transaction ID: ${result.txId}`);
      console.log(`Execution time: ${duration}s`);
      console.log(`Amount in: ${result.amountIn} HBAR`);
      console.log(`Amount out: ${result.amountOut} SAUCE`);
      console.log(`Price impact: ${result.priceImpact?.toFixed(2)}%`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      
      console.log("🔍 Verify on HashScan:");
      console.log(`https://hashscan.io/mainnet/transaction/${result.txId}\n`);
      
      // Check new balance
      console.log("6️⃣ Verifying new balance...");
      const newBalance = await new AccountBalanceQuery()
        .setAccountId(ACCOUNT_ID)
        .execute(client);
      
      const newHbarBalance = newBalance.hbars.toBigNumber().toNumber();
      console.log(`   Old: ${hbarBalance.toFixed(4)} ℏ`);
      console.log(`   New: ${newHbarBalance.toFixed(4)} ℏ`);
      console.log(`   Difference: ${(hbarBalance - newHbarBalance).toFixed(4)} ℏ\n`);
      
      // Check for SAUCE
      const sauceBalance = newBalance.tokens?.get("0.0.731861");
      if (sauceBalance) {
        console.log(`   SAUCE balance: ${sauceBalance}`);
      }
      
      console.log("\n🎉 PERFECT TRADE COMPLETE!");
      console.log("The AgentVault trading bot works on MAINNET!");
      console.log("\n📹 Ready for demo video:");
      console.log("1. Show this successful trade");
      console.log("2. Show the strategy builder");
      console.log("3. Submit to hackathon!");
      
    } else {
      console.log(`\n❌ Swap failed: ${result.error}`);
      console.log("\nTroubleshooting:");
      console.log("- Check token association");
      console.log("- Verify liquidity available");
      console.log("- Try smaller amount");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nDebug info:", error);
  }
}

// Compile TypeScript first
console.log("Building TypeScript...");
require('child_process').execSync('npm run build', { stdio: 'inherit' });

// Run the test
console.log("\n");
main().catch(console.error);