// Test with proper DER format
const { Client, AccountId, PrivateKey, AccountBalanceQuery } = require("@hashgraph/sdk");

async function test() {
  console.log("Testing Hedera Mainnet Connection...\n");
  
  const accountId = "0.0.10206295";
  const rawKey = "6564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee";
  
  // Add DER prefix for ED25519 key
  const derKey = "302e020100300506032b6570042204206" + rawKey;
  
  try {
    console.log("Account:", accountId);
    console.log("Connecting to mainnet...");
    
    const client = Client.forMainnet();
    const privateKey = PrivateKey.fromString(derKey);
    client.setOperator(AccountId.fromString(accountId), privateKey);
    
    console.log("Getting balance...");
    const balance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);
    
    console.log("\n✅ SUCCESS! Connected to mainnet");
    console.log("Balance:", balance.hbars.toString());
    console.log("USD Value: $" + (balance.hbars.toBigNumber().toNumber() * 0.05).toFixed(2));
    console.log("\nReady to trade on SaucerSwap!");
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    
    // Try alternative format
    console.log("\nTrying alternative ED25519 format...");
    try {
      const altKey = "302e020100300506032b657004220420" + rawKey;
      const privateKey2 = PrivateKey.fromString(altKey);
      const client2 = Client.forMainnet();
      client2.setOperator(AccountId.fromString(accountId), privateKey2);
      
      const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(client2);
      
      console.log("✅ Alternative format worked!");
      console.log("Balance:", balance.hbars.toString());
      
    } catch (error2) {
      console.log("❌ Still failed:", error2.message);
      console.log("\n💡 For hackathon demo, use testnet instead!");
    }
  }
}

test().catch(console.error);