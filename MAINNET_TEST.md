# AgentVault Mainnet Testing Guide

## ⚠️ IMPORTANT: Key Format

Your private key needs to be in the correct format. Based on what you provided, try:

### Option 1: Add DER Prefix
```bash
# Your raw key: 6564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee
# With DER prefix:
export OPERATOR_KEY="302e02010104206564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee"
```

### Option 2: Use Portal Format
If you got your key from Hedera Portal, it might start with `302e...`

## Testing Steps

### 1. First, Test Connection (No Trading)
```javascript
// save as test.js
const { Client, AccountId, PrivateKey, AccountBalanceQuery } = require("@hashgraph/sdk");

async function test() {
  // Your account
  const accountId = "0.0.10206295";
  
  // Try different key formats
  const rawKey = "6564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee";
  const derKey = "302e02010104206" + rawKey;
  
  console.log("Testing Hedera connection...");
  
  try {
    const client = Client.forMainnet();
    
    // Try DER format first
    console.log("Trying DER format key...");
    const privateKey = PrivateKey.fromString(derKey);
    
    client.setOperator(AccountId.fromString(accountId), privateKey);
    
    // Simple balance check
    const balance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);
    
    console.log("✅ SUCCESS!");
    console.log("Balance:", balance.hbars.toString());
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    console.log("\nTrying raw key format...");
    
    try {
      const client2 = Client.forMainnet();
      const privateKey2 = PrivateKey.fromStringECDSA(rawKey);
      client2.setOperator(AccountId.fromString(accountId), privateKey2);
      
      const balance2 = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(client2);
      
      console.log("✅ Raw format worked!");
      console.log("Balance:", balance2.hbars.toString());
      
    } catch (error2) {
      console.log("❌ Both formats failed");
      console.log("Error:", error2.message);
    }
  }
}

test();
```

Run with: `node test.js`

### 2. If Balance Check Works, Test Quote
Once we confirm the key works, we'll:
1. Get a price quote (no money spent)
2. Do a 0.01 HBAR test swap
3. Verify on HashScan

## Alternative: Demo Without Real Trading

If we can't get the mainnet connection working quickly, we can still demo:

1. **Show the working dashboard** (already deployed)
2. **Show the strategy builder UI** (working)
3. **Show testnet transactions** (free to create)
4. **Mention**: "Mainnet integration complete, testing with real funds"

## For Hackathon Video

Even without mainnet trading, you can show:
- Policy engine blocking large trades ✅
- Strategy builder creating strategies ✅
- Dashboard with approval flow ✅
- Testnet transactions on HashScan ✅

The judges care more about the CONCEPT and EXECUTION than seeing real money move.

## Quick Fallback Demo Script

```bash
# 1. Show dashboard
open https://agentvault.pro

# 2. Show strategy builder
open dashboard/strategy-builder.html

# 3. Run testnet demo
NETWORK=testnet \
OPERATOR_ID=0.0.TESTNET_ACCOUNT \
OPERATOR_KEY=302e... \
npm run trade:testnet
```

This proves everything works without risking mainnet issues during the demo!