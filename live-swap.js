/**
 * LIVE SWAP - AgentVault + SaucerSwap V2
 * Following EXACT SaucerSwap official docs:
 * https://docs.saucerswap.finance/v/developer/saucerswap-v2/swap-operations/swap-hbar-for-tokens
 * 
 * Pattern: exactInput via multicall([exactInput, refundETH])
 * Uses ethers v5 for ABI encoding, Hedera SDK for execution
 */

const { ethers } = require("ethers");
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

// ─── OFFICIAL CONTRACT ADDRESSES (from docs) ───
const SWAP_ROUTER = "0.0.3949434";     // SaucerSwapV2SwapRouter
const WHBAR_TOKEN = "0.0.1456986";     // WHBAR token ID
const SAUCE_TOKEN = "0.0.731861";      // SAUCE token ID
const FEE_TIER = 3000;                 // 0.30% fee tier (most common)

// ─── ACCOUNT ───
const ACCOUNT_ID = "0.0.10206295";
const RAW_KEY = "6564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee";

// ─── SWAP AMOUNT ───
const AMOUNT_HBAR = 0.5; // 0.5 HBAR (~$0.09 at $0.18/HBAR) — small but meaningful

// ─── ABI (from SaucerSwap docs - SwapRouter + PeripheryPayments + Multicall) ───
const ABI = [
  "function exactInput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)",
  "function refundETH() external payable",
  "function multicall(bytes[] data) external payable returns (bytes[] results)"
];

/**
 * Convert Hedera token ID (0.0.XXXXX) to EVM address (0x000...XXXXX)
 */
function tokenIdToEvmAddress(hederaId) {
  const num = parseInt(hederaId.split(".")[2]);
  return "0x" + num.toString(16).padStart(40, "0");
}

/**
 * Hex string to Uint8Array (for setFunctionParameters)
 */
function hexToUint8Array(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Build the path bytes: [tokenIn(20) + fee(3) + tokenOut(20)]
 * SaucerSwap docs: "each token 20 bytes, each fee 3 bytes"
 */
function buildPath(tokenInEvmAddress, fee, tokenOutEvmAddress) {
  const tokenInHex = tokenInEvmAddress.slice(2); // remove 0x, 40 chars = 20 bytes
  const feeHex = fee.toString(16).padStart(6, "0"); // 3 bytes = 6 hex chars
  const tokenOutHex = tokenOutEvmAddress.slice(2);
  return "0x" + tokenInHex + feeHex + tokenOutHex;
}

async function liveSwap() {
  console.log("🔴 LIVE SWAP - AgentVault × SaucerSwap V2");
  console.log("==========================================");
  console.log("Following official SaucerSwap developer docs EXACTLY\n");

  // ─── 1. Connect to Hedera Mainnet ───
  const client = Client.forMainnet();
  const privateKey = PrivateKey.fromStringED25519(RAW_KEY);
  client.setOperator(AccountId.fromString(ACCOUNT_ID), privateKey);
  console.log("✅ Connected to Hedera Mainnet");
  console.log(`   Account: ${ACCOUNT_ID}\n`);

  // ─── 2. Check initial balance ───
  console.log("📊 INITIAL BALANCE");
  console.log("──────────────────");
  const balanceBefore = await new AccountBalanceQuery()
    .setAccountId(ACCOUNT_ID)
    .execute(client);
  
  const hbarBefore = balanceBefore.hbars.toBigNumber().toNumber();
  let sauceBefore = 0;
  try {
    const s = balanceBefore.tokens.get(TokenId.fromString(SAUCE_TOKEN));
    sauceBefore = s ? Number(s.toString()) : 0;
  } catch (e) {
    sauceBefore = 0;
  }
  console.log(`   HBAR:  ${hbarBefore.toFixed(4)} ℏ`);
  console.log(`   SAUCE: ${sauceBefore} (smallest unit)\n`);

  // ─── 3. Associate SAUCE token if needed ───
  if (sauceBefore === 0) {
    console.log("🔗 Associating SAUCE token...");
    try {
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(ACCOUNT_ID)
        .setTokenIds([TokenId.fromString(SAUCE_TOKEN)]);
      const assocResponse = await associateTx.execute(client);
      const assocReceipt = await assocResponse.getReceipt(client);
      console.log(`   Status: ${assocReceipt.status}\n`);
    } catch (e) {
      if (e.message && e.message.includes("TOKEN_ALREADY_ASSOCIATED")) {
        console.log("   Already associated ✅\n");
      } else {
        console.log(`   Association note: ${e.message}\n`);
      }
    }
  } else {
    console.log("🔗 SAUCE already associated ✅\n");
  }

  // ─── 4. Build the swap parameters ───
  console.log("🔧 BUILDING TRANSACTION");
  console.log("───────────────────────");
  
  const abiInterface = new ethers.utils.Interface(ABI);
  
  // Convert to EVM addresses
  const whbarEvm = tokenIdToEvmAddress(WHBAR_TOKEN);
  const sauceEvm = tokenIdToEvmAddress(SAUCE_TOKEN);
  const recipientEvm = tokenIdToEvmAddress(ACCOUNT_ID);
  
  console.log(`   WHBAR EVM:     ${whbarEvm}`);
  console.log(`   SAUCE EVM:     ${sauceEvm}`);
  console.log(`   Recipient EVM: ${recipientEvm}`);
  
  // Build path: WHBAR → SAUCE (for HBAR swaps, use WHBAR as first token)
  const path = buildPath(whbarEvm, FEE_TIER, sauceEvm);
  console.log(`   Path:          ${path}`);
  
  // Amount in tinybar (1 HBAR = 100,000,000 tinybar)
  const amountInTinybar = Math.floor(AMOUNT_HBAR * 100_000_000);
  
  // Minimum output: 0 (accept any amount for this test — we just want it to work)
  // In production, use a real quote + slippage calculation
  const amountOutMinimum = 0;
  
  // Deadline: 10 minutes from now
  const deadline = Math.floor(Date.now() / 1000) + 600;
  
  console.log(`   Amount In:     ${amountInTinybar} tinybar (${AMOUNT_HBAR} HBAR)`);
  console.log(`   Min Out:       ${amountOutMinimum} (accept any for test)`);
  console.log(`   Deadline:      ${new Date(deadline * 1000).toISOString()}`);
  console.log(`   Fee Tier:      ${FEE_TIER} (0.30%)\n`);

  // ─── 5. Encode the multicall (EXACTLY per SaucerSwap docs) ───
  console.log("📦 ENCODING MULTICALL");
  console.log("─────────────────────");
  
  // ExactInputParams struct
  const params = {
    path: path,
    recipient: recipientEvm,
    deadline: deadline,
    amountIn: amountInTinybar,
    amountOutMinimum: amountOutMinimum
  };
  
  // Encode each function individually
  const swapEncoded = abiInterface.encodeFunctionData("exactInput", [params]);
  const refundHBAREncoded = abiInterface.encodeFunctionData("refundETH");
  
  // Multicall: bytes[]
  const multiCallParam = [swapEncoded, refundHBAREncoded];
  const encodedData = abiInterface.encodeFunctionData("multicall", [multiCallParam]);
  
  // Convert to Uint8Array for Hedera SDK
  const encodedDataAsUint8Array = hexToUint8Array(encodedData);
  
  console.log(`   Swap encoded:     ${swapEncoded.slice(0, 20)}... (${swapEncoded.length / 2 - 1} bytes)`);
  console.log(`   RefundETH:        ${refundHBAREncoded}`);
  console.log(`   Multicall total:  ${encodedDataAsUint8Array.length} bytes\n`);

  // ─── 6. EXECUTE THE SWAP ───
  console.log("🚀 EXECUTING LIVE SWAP");
  console.log("──────────────────────");
  console.log(`   Sending ${AMOUNT_HBAR} HBAR to SaucerSwap V2 SwapRouter...`);
  console.log(`   Contract: ${SWAP_ROUTER}\n`);
  
  try {
    const response = await new ContractExecuteTransaction()
      .setPayableAmount(Hbar.from(amountInTinybar, HbarUnit.Tinybar))
      .setContractId(ContractId.fromString(SWAP_ROUTER))
      .setGas(1_000_000) // Generous gas for first attempt
      .setFunctionParameters(encodedDataAsUint8Array)
      .execute(client);
    
    console.log("   ⏳ Transaction submitted, waiting for receipt...");
    const record = await response.getRecord(client);
    const receipt = record.receipt;
    
    console.log(`\n   ✅ STATUS: ${receipt.status}`);
    console.log(`   TX ID:   ${response.transactionId}`);
    
    // Try to decode the return value
    if (record.contractFunctionResult) {
      try {
        const resultBytes = record.contractFunctionResult.bytes;
        // multicall returns bytes[], the first element is exactInput's return (uint256 amountOut)
        console.log(`   Gas Used: ${record.contractFunctionResult.gasUsed}`);
      } catch (decErr) {
        // That's ok, the receipt status is what matters
      }
    }
    
    console.log(`\n   🔍 HashScan: https://hashscan.io/mainnet/transaction/${response.transactionId}`);
    
    // ─── 7. Verify the swap ───
    console.log("\n📊 FINAL BALANCE (waiting 5s for settlement)");
    console.log("─────────────────────────────────────────────");
    await new Promise(r => setTimeout(r, 5000));
    
    const balanceAfter = await new AccountBalanceQuery()
      .setAccountId(ACCOUNT_ID)
      .execute(client);
    
    const hbarAfter = balanceAfter.hbars.toBigNumber().toNumber();
    let sauceAfter = 0;
    try {
      const s = balanceAfter.tokens.get(TokenId.fromString(SAUCE_TOKEN));
      sauceAfter = s ? Number(s.toString()) : 0;
    } catch (e) {
      sauceAfter = 0;
    }
    
    const hbarDiff = hbarBefore - hbarAfter;
    const sauceDiff = sauceAfter - sauceBefore;
    
    console.log(`   HBAR:  ${hbarBefore.toFixed(4)} → ${hbarAfter.toFixed(4)} (spent ${hbarDiff.toFixed(4)} ℏ)`);
    console.log(`   SAUCE: ${sauceBefore} → ${sauceAfter} (received ${sauceDiff})`);
    
    if (sauceDiff > 0) {
      // SAUCE has 6 decimals
      const sauceHuman = sauceDiff / 1_000_000;
      console.log(`\n🎉🎉🎉 LIVE SWAP SUCCESSFUL! 🎉🎉🎉`);
      console.log(`=========================================`);
      console.log(`Swapped ${AMOUNT_HBAR} HBAR → ${sauceHuman.toFixed(6)} SAUCE`);
      console.log(`On SaucerSwap V2 via AgentVault`);
      console.log(`Verified on Hedera Mainnet`);
      console.log(`\n🏆 AgentVault can execute REAL trades!`);
    } else {
      console.log(`\n⚠️ SAUCE balance didn't change — check HashScan for details`);
    }
    
  } catch (err) {
    console.error(`\n❌ SWAP FAILED: ${err.message}`);
    
    // Parse Hedera-specific errors
    if (err.message.includes("CONTRACT_REVERT_EXECUTED")) {
      console.log("\n💡 CONTRACT_REVERT_EXECUTED means the swap logic reverted.");
      console.log("   Possible causes:");
      console.log("   - No liquidity in the WHBAR/SAUCE pool at 0.30% fee tier");
      console.log("   - Try a different fee tier (500 = 0.05%, 10000 = 1.00%)");
      console.log("   - Token not associated");
      console.log("   - Path encoding issue");
    } else if (err.message.includes("INSUFFICIENT_TX_FEE")) {
      console.log("\n💡 Need more gas. Try increasing gas limit.");
    } else if (err.message.includes("INVALID_SIGNATURE")) {
      console.log("\n💡 Key format issue. Check DER vs raw key.");
    }
    
    console.error("\nFull error:", err);
  }
  
  client.close();
}

// GO!
console.log("Starting live swap in 2 seconds...\n");
setTimeout(() => {
  liveSwap().catch(e => {
    console.error("Fatal:", e);
    process.exit(1);
  });
}, 2000);
