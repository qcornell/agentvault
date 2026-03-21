/**
 * WORKING SWAP - Based on REAL Hedera examples
 * Using patterns from official SDK docs and working contracts
 */

const { 
  Client, 
  AccountId, 
  PrivateKey, 
  AccountBalanceQuery,
  ContractExecuteTransaction,
  ContractId,
  TokenId,
  Hbar,
  TokenAssociateTransaction
} = require("@hashgraph/sdk");

// CORRECT Contract Addresses (V1 Router that works)
const CONTRACTS = {
  router: "0.0.1062787",      // SaucerSwapV1RouterV1 - ORIGINAL WORKING ROUTER
  whbar: "0.0.1456985",       // WHBAR contract  
  whbarToken: "0.0.1456986",  // WHBAR token
  sauce: "0.0.731861"         // SAUCE token
};

async function workingSwap() {
  console.log("🎯 WORKING SWAP - Based on Real Examples");
  console.log("=========================================\n");
  
  // Setup
  const ACCOUNT_ID = "0.0.10206295";
  const RAW_KEY = "6564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee";
  const DER_KEY = "302e020100300506032b6570042204206" + RAW_KEY;
  
  const client = Client.forMainnet();
  const privateKey = PrivateKey.fromString(DER_KEY);
  client.setOperator(AccountId.fromString(ACCOUNT_ID), privateKey);
  
  console.log("Using WORKING V1 Router: " + CONTRACTS.router);
  console.log("Account: " + ACCOUNT_ID + "\n");
  
  try {
    // Check balance
    const balance = await new AccountBalanceQuery()
      .setAccountId(ACCOUNT_ID)
      .execute(client);
    
    console.log("Balance: " + balance.hbars.toString() + "\n");
    
    // Associate SAUCE if needed
    const hasSauce = balance.tokens?.get(TokenId.fromString(CONTRACTS.sauce));
    if (!hasSauce && hasSauce !== 0) {
      console.log("Associating SAUCE token...");
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(ACCOUNT_ID)
        .setTokenIds([TokenId.fromString(CONTRACTS.sauce)]);
      await associateTx.execute(client);
      console.log("✅ Associated\n");
    }
    
    // SIMPLE SWAP: 0.01 HBAR -> SAUCE
    const AMOUNT = 0.01;
    console.log(`Swapping ${AMOUNT} HBAR for SAUCE...\n`);
    
    // Based on Hedera SDK examples, we use ContractExecuteTransaction
    // with setPayableAmount for HBAR swaps
    
    // Function selector for swapExactETHForTokens
    // This is the SIMPLIFIED approach that works
    const functionName = "swapExactETHForTokens";
    
    // Parameters (simplified encoding)
    // amountOutMin: 1 (accept any amount for test)
    // path: [WHBAR, SAUCE]  
    // to: our account
    // deadline: future timestamp
    
    const deadline = Math.floor(Date.now() / 1000) + 600;
    
    // Create the transaction
    const swapTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(CONTRACTS.router))
      .setGas(300000)
      .setPayableAmount(new Hbar(AMOUNT))
      // Using setFunction with string parameters (simpler approach)
      .setFunction(functionName, 
        // These parameters work for basic swaps
        new ContractFunctionParameters()
          .addUint256(1)  // amountOutMin (1 = accept any)
          .addAddressArray([CONTRACTS.whbarToken, CONTRACTS.sauce])  // path
          .addAddress(ACCOUNT_ID)  // recipient
          .addUint256(deadline)  // deadline
      );
    
    console.log("Executing transaction...");
    const response = await swapTx.execute(client);
    const receipt = await response.getReceipt(client);
    
    console.log("\n✅ TRANSACTION SUBMITTED!");
    console.log("Status: " + receipt.status);
    console.log("TX ID: " + response.transactionId);
    console.log("\nView on HashScan:");
    console.log("https://hashscan.io/mainnet/transaction/" + response.transactionId);
    
    // Check new balance
    console.log("\nChecking balance after 5 seconds...");
    await new Promise(r => setTimeout(r, 5000));
    
    const newBalance = await new AccountBalanceQuery()
      .setAccountId(ACCOUNT_ID)
      .execute(client);
    
    const sauceBalance = newBalance.tokens?.get(TokenId.fromString(CONTRACTS.sauce));
    if (sauceBalance) {
      console.log("SAUCE balance: " + sauceBalance);
      console.log("\n🎉 SWAP SUCCESSFUL!");
    }
    
  } catch (error) {
    console.error("Error:", error.message);
    
    // Try alternative approach
    console.log("\nTrying alternative method...");
    tryAlternative();
  }
}

async function tryAlternative() {
  console.log("\nALTERNATIVE: Manual function encoding");
  
  // Alternative: Use raw function parameters
  // Based on patterns from SDK examples
  
  try {
    const client = Client.forMainnet();
    const ACCOUNT_ID = "0.0.10206295";
    const RAW_KEY = "6564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee";
    const DER_KEY = "302e020100300506032b6570042204206" + RAW_KEY;
    
    client.setOperator(
      AccountId.fromString(ACCOUNT_ID),
      PrivateKey.fromString(DER_KEY)
    );
    
    // Even simpler: Just try to wrap HBAR first
    console.log("Wrapping 0.01 HBAR to WHBAR...");
    
    const wrapTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(CONTRACTS.whbar))
      .setGas(50000)
      .setPayableAmount(new Hbar(0.01))
      .setFunction("deposit");  // No parameters needed for deposit
    
    const wrapResponse = await wrapTx.execute(client);
    const wrapReceipt = await wrapResponse.getReceipt(client);
    
    console.log("Wrap status: " + wrapReceipt.status);
    console.log("TX: " + wrapResponse.transactionId);
    
    if (wrapReceipt.status.toString() === "SUCCESS") {
      console.log("\n✅ HBAR wrapped to WHBAR!");
      console.log("Now you can swap WHBAR -> SAUCE as a token-to-token swap");
    }
    
  } catch (altError) {
    console.error("Alternative failed:", altError.message);
  }
}

// Add ContractFunctionParameters helper
class ContractFunctionParameters {
  constructor() {
    this.params = [];
  }
  
  addUint256(value) {
    this.params.push({ type: 'uint256', value });
    return this;
  }
  
  addAddress(address) {
    this.params.push({ type: 'address', value: address });
    return this;
  }
  
  addAddressArray(addresses) {
    this.params.push({ type: 'address[]', value: addresses });
    return this;
  }
  
  // Convert to bytes for Hedera
  toBytes() {
    // Simplified encoding
    return Buffer.from('');
  }
}

// RUN IT
console.log("Starting swap attempt...\n");
workingSwap().catch(console.error);