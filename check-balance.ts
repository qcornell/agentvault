/**
 * Simple balance checker - verify account access works
 */

import { Client, AccountId, PrivateKey, AccountBalanceQuery, TokenId } from "@hashgraph/sdk";

async function main() {
  console.log("💰 Checking Hedera Account Balance");
  console.log("===================================\n");

  const OPERATOR_ID = "0.0.10206295";
  const OPERATOR_KEY = process.env.OPERATOR_KEY;
  
  if (!OPERATOR_KEY) {
    console.error("❌ Set OPERATOR_KEY environment variable");
    process.exit(1);
  }

  try {
    // Test connection
    const client = Client.forMainnet();
    client.setOperator(
      AccountId.fromString(OPERATOR_ID),
      PrivateKey.fromString(OPERATOR_KEY)
    );

    // Get balance
    const balance = await new AccountBalanceQuery()
      .setAccountId(OPERATOR_ID)
      .execute(client);
    
    console.log("✅ Account connected successfully!");
    console.log(`📍 Account ID: ${OPERATOR_ID}`);
    console.log(`💎 HBAR Balance: ${balance.hbars.toString()}`);
    console.log(`💵 USD Value: ~$${(balance.hbars.toBigNumber().toNumber() * 0.05).toFixed(2)} @ $0.05/HBAR`);
    
    // Check for tokens
    const tokenMap = balance.tokens;
    if (tokenMap) {
      console.log("\n📊 Token Balances:");
      const tokens = Array.from(tokenMap.entries());
      tokens.forEach(([tokenId, amount]) => {
        console.log(`   • Token ${tokenId}: ${amount}`);
      });
    }
    
    console.log("\n✅ Ready to trade!");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("\nCheck:");
    console.error("1. Key is correct");
    console.error("2. Network connection");
    console.error("3. Account exists on mainnet");
  }
}

main();