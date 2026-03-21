/**
 * CORRECT SaucerSwap V2 Implementation
 * Based on OFFICIAL SaucerSwap documentation
 * Using multicall with exactInput + refundETH pattern
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
  HbarUnit,
  TokenAssociateTransaction
} = require("@hashgraph/sdk");
const { ethers } = require("ethers");

// OFFICIAL Contract Addresses from SaucerSwap docs
const CONTRACTS = {
  swapRouter: "0.0.3949434",     // SaucerSwapV2SwapRouter (mainnet)
  whbar: "0.0.1456986",          // WHBAR token
  usdc: "0.0.456858",            // USDC[hts]
  sauce: "0.0.731861"            // SAUCE
};

// Convert to EVM addresses (0x format)
function hederaIdToEvmAddress(hederaId) {
  const parts = hederaId.split(".");
  const num = parseInt(parts[2]);
  return "0x" + num.toString(16).padStart(40, "0");
}

// Convert hex to Uint8Array
function hexToUint8Array(hex) {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

// Router ABI (from SaucerSwap docs)
const ROUTER_ABI = [
  // exactInput for HBAR -> Token swaps
  {
    "inputs": [{
      "components": [
        {"name": "path", "type": "bytes"},
        {"name": "recipient", "type": "address"},
        {"name": "deadline", "type": "uint256"},
        {"name": "amountIn", "type": "uint256"},
        {"name": "amountOutMinimum", "type": "uint256"}
      ],
      "name": "params",
      "type": "tuple"
    }],
    "name": "exactInput",
    "outputs": [{"name": "amountOut", "type": "uint256"}],
    "type": "function"
  },
  // refundETH to return unused HBAR
  {
    "inputs": [],
    "name": "refundETH",
    "outputs": [],
    "type": "function"
  },
  // multicall to combine operations
  {
    "inputs": [{"name": "data", "type": "bytes[]"}],
    "name": "multicall",
    "outputs": [{"name": "results", "type": "bytes[]"}],
    "type": "function"
  }
];

async function executeCorrectSwap() {
  console.log("🎯 CORRECT SAUCERSWAP V2 IMPLEMENTATION");
  console.log("Based on Official Documentation");
  console.log("=======================================\n");
  
  // Setup
  const ACCOUNT_ID = "0.0.10206295";
  const RAW_KEY = "6564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee";
  const DER_KEY = "302e020100300506032b6570042204206" + RAW_KEY;
  
  const client = Client.forMainnet();
  const privateKey = PrivateKey.fromString(DER_KEY);
  client.setOperator(AccountId.fromString(ACCOUNT_ID), privateKey);
  
  console.log("📍 Network: MAINNET");
  console.log(`👤 Account: ${ACCOUNT_ID}`);
  console.log(`📄 Router: ${CONTRACTS.swapRouter}\n`);
  
  try {
    // STEP 1: Check balance and association
    console.log("1️⃣ CHECKING ACCOUNT STATUS");
    console.log("---------------------------");
    const balance = await new AccountBalanceQuery()
      .setAccountId(ACCOUNT_ID)
      .execute(client);
    
    const hbarBalance = balance.hbars.toBigNumber().toNumber();
    console.log(`HBAR Balance: ${hbarBalance.toFixed(4)} ℏ`);
    
    // Check SAUCE association
    const hasSauce = balance.tokens?.get(TokenId.fromString(CONTRACTS.sauce));
    if (!hasSauce && hasSauce !== 0) {
      console.log("Associating SAUCE token...");
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(ACCOUNT_ID)
        .setTokenIds([TokenId.fromString(CONTRACTS.sauce)]);
      
      const associateResponse = await associateTx.execute(client);
      await associateResponse.getReceipt(client);
      console.log("✅ SAUCE associated");
    } else {
      console.log("✅ SAUCE already associated");
    }
    
    const sauceBalance = balance.tokens?.get(TokenId.fromString(CONTRACTS.sauce)) || 0;
    console.log(`SAUCE Balance: ${sauceBalance}\n`);
    
    // STEP 2: Setup swap parameters
    console.log("2️⃣ CONFIGURING SWAP");
    console.log("-------------------");
    const AMOUNT_HBAR = 0.1;  // Small test amount
    const SLIPPAGE = 0.05;    // 5% slippage
    
    // Convert amounts
    const amountInTinybar = Math.floor(AMOUNT_HBAR * 100000000); // HBAR has 8 decimals
    const estimatedOutput = AMOUNT_HBAR * 50; // Rough estimate: 1 HBAR = 50 SAUCE
    const minOutput = Math.floor(estimatedOutput * (1 - SLIPPAGE) * 1000000); // SAUCE has 6 decimals
    
    console.log(`Input: ${AMOUNT_HBAR} HBAR (${amountInTinybar} tinybar)`);
    console.log(`Min Output: ${minOutput / 1000000} SAUCE`);
    console.log(`Slippage: ${SLIPPAGE * 100}%\n`);
    
    // STEP 3: Build the path (CRITICAL - must be correct format)
    console.log("3️⃣ BUILDING SWAP PATH");
    console.log("---------------------");
    
    // Path format: [token, fee, token]
    // For HBAR -> SAUCE: [WHBAR, fee, SAUCE]
    // Fee: 0x000BB8 = 3000 = 0.30% (most common pool)
    
    const whbarAddress = hederaIdToEvmAddress(CONTRACTS.whbar);
    const sauceAddress = hederaIdToEvmAddress(CONTRACTS.sauce);
    const fee = "000BB8"; // 0.30% fee tier
    
    // Construct path bytes: token(20 bytes) + fee(3 bytes) + token(20 bytes)
    const pathHex = whbarAddress.slice(2) + fee + sauceAddress.slice(2);
    const pathBytes = "0x" + pathHex;
    
    console.log(`Path: WHBAR → 0.30% → SAUCE`);
    console.log(`Encoded: ${pathBytes.slice(0, 20)}...${pathBytes.slice(-10)}\n`);
    
    // STEP 4: Prepare exactInput parameters
    console.log("4️⃣ ENCODING TRANSACTION");
    console.log("----------------------");
    
    // Get recipient EVM address
    const recipientEvmAddress = hederaIdToEvmAddress(ACCOUNT_ID);
    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
    
    // Create ethers interface
    const abiInterface = new ethers.utils.Interface(ROUTER_ABI);
    
    // ExactInputParams struct
    const params = {
      path: pathBytes,
      recipient: recipientEvmAddress,
      deadline: deadline,
      amountIn: amountInTinybar,
      amountOutMinimum: minOutput
    };
    
    console.log("ExactInputParams:");
    console.log(`  path: ${pathBytes.slice(0, 20)}...`);
    console.log(`  recipient: ${recipientEvmAddress}`);
    console.log(`  deadline: ${deadline}`);
    console.log(`  amountIn: ${amountInTinybar}`);
    console.log(`  amountOutMinimum: ${minOutput}\n`);
    
    // Encode functions
    const swapEncoded = abiInterface.encodeFunctionData('exactInput', [params]);
    const refundEncoded = abiInterface.encodeFunctionData('refundETH');
    
    // Create multicall
    const multicallData = abiInterface.encodeFunctionData('multicall', [[swapEncoded, refundEncoded]]);
    const encodedDataAsUint8Array = hexToUint8Array(multicallData);
    
    console.log("Encoded multicall data ready");
    console.log(`Size: ${encodedDataAsUint8Array.length} bytes\n`);
    
    // STEP 5: Execute the swap
    console.log("5️⃣ EXECUTING SWAP");
    console.log("----------------");
    console.log("⚠️  SENDING REAL TRANSACTION...\n");
    
    const swapTx = new ContractExecuteTransaction()
      .setPayableAmount(Hbar.from(amountInTinybar, HbarUnit.Tinybar))
      .setContractId(ContractId.fromString(CONTRACTS.swapRouter))
      .setGas(500000)  // Generous gas for multicall
      .setFunctionParameters(encodedDataAsUint8Array);
    
    console.log(`Sending ${AMOUNT_HBAR} HBAR to router...`);
    const response = await swapTx.execute(client);
    const receipt = await response.getReceipt(client);
    
    console.log("\n✅✅✅ TRANSACTION COMPLETE ✅✅✅");
    console.log("================================");
    console.log(`Status: ${receipt.status}`);
    console.log(`TX ID: ${response.transactionId}`);
    console.log();
    
    // Get the result
    const record = await response.getRecord(client);
    const result = record.contractFunctionResult;
    if (result) {
      try {
        const values = result.getResult(['uint256']);
        const amountOut = values[0];
        console.log(`Amount received: ${amountOut} (smallest unit)`);
      } catch (e) {
        console.log("Could not decode return value");
      }
    }
    
    console.log("\n🔍 View on HashScan:");
    console.log(`https://hashscan.io/mainnet/transaction/${response.transactionId}\n`);
    
    // STEP 6: Verify balance change
    console.log("6️⃣ VERIFYING RESULTS");
    console.log("-------------------");
    console.log("Waiting 5 seconds...");
    await new Promise(r => setTimeout(r, 5000));
    
    const newBalance = await new AccountBalanceQuery()
      .setAccountId(ACCOUNT_ID)
      .execute(client);
    
    const newHbarBalance = newBalance.hbars.toBigNumber().toNumber();
    const newSauceBalance = newBalance.tokens?.get(TokenId.fromString(CONTRACTS.sauce)) || 0;
    
    console.log("Balance Changes:");
    console.log(`HBAR: ${hbarBalance.toFixed(4)} → ${newHbarBalance.toFixed(4)} (${(hbarBalance - newHbarBalance).toFixed(4)} spent)`);
    console.log(`SAUCE: ${sauceBalance} → ${newSauceBalance} (+${newSauceBalance - sauceBalance})\n`);
    
    if (newSauceBalance > sauceBalance) {
      console.log("🎉🎉🎉 PERFECT SWAP SUCCESSFUL! 🎉🎉🎉");
      console.log("======================================");
      console.log("✅ Used official SaucerSwap V2 router");
      console.log("✅ Multicall with exactInput + refundETH");
      console.log("✅ SAUCE balance increased");
      console.log("\n🚀 AGENTVAULT DEX TRADING COMPLETE!");
    } else {
      console.log("⚠️ Balance unchanged - check transaction on HashScan");
    }
    
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error("\nFull error:", error);
    
    console.log("\n💡 DEBUGGING TIPS:");
    console.log("1. Check HashScan for revert reason");
    console.log("2. Verify WHBAR-SAUCE pool has liquidity");
    console.log("3. Try increasing gas limit");
    console.log("4. Check if path encoding is correct");
  }
}

// RUN IT
console.log("Starting correct V2 swap...\n");
setTimeout(() => {
  executeCorrectSwap().catch(console.error);
}, 2000);