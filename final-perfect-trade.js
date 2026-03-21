/**
 * THE FINAL 5% - ONE PERFECT TRADE
 * Following GPT's EXACT recommendations
 * Goal: Execute ONE successful HBAR → USDC swap on SaucerSwap
 */

const { 
  Client, 
  AccountId, 
  PrivateKey, 
  AccountBalanceQuery,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractId,
  TokenId,
  Hbar,
  TokenAssociateTransaction,
  TransactionId
} = require("@hashgraph/sdk");
const { ethers } = require("ethers");

// KNOWN GOOD CONTRACT ADDRESSES (from SaucerSwap docs)
const CONTRACTS = {
  router: "0.0.3045981",      // SaucerSwapV1RouterV3 (mainnet) 
  whbar: "0.0.1456985",       // WHBAR contract
  whbarToken: "0.0.1456986",  // WHBAR token
  usdc: "0.0.456858",         // USDC[hts]
  sauce: "0.0.731861"         // SAUCE (backup option)
};

// TOKEN DECIMALS (CRITICAL!)
const DECIMALS = {
  HBAR: 8,
  WHBAR: 8,
  USDC: 6,  // USDC has 6 decimals!
  SAUCE: 6
};

// Router V2 ABI - EXACT functions we need
const ROUTER_ABI = [
  // For HBAR → Token swaps (uses payable)
  "function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) external payable returns (uint[] amounts)",
  
  // For Token → Token swaps (needs approval first)
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external returns (uint[] amounts)",
  
  // For getting quotes (view function)
  "function getAmountsOut(uint amountIn, address[] path) external view returns (uint[] amounts)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
];

async function onePerfectTrade() {
  console.log("🎯 THE FINAL 5% - ONE PERFECT TRADE");
  console.log("====================================\n");
  
  // Setup
  const ACCOUNT_ID = "0.0.10206295";
  const RAW_KEY = "6564b5530ec2693ea5b1643fab8edfb1aa2c2987eb7d7a2683860cfcb5d900ee";
  const DER_KEY = "302e020100300506032b6570042204206" + RAW_KEY;
  
  const client = Client.forMainnet();
  const privateKey = PrivateKey.fromString(DER_KEY);
  client.setOperator(AccountId.fromString(ACCOUNT_ID), privateKey);
  
  // Create interface for encoding
  const routerInterface = new ethers.utils.Interface(ROUTER_ABI);
  
  console.log("📍 Network: MAINNET");
  console.log(`👤 Account: ${ACCOUNT_ID}`);
  console.log(`📄 Router: ${CONTRACTS.router}\n`);
  
  try {
    // STEP 1: Check initial balance
    console.log("1️⃣ CHECKING INITIAL BALANCE");
    console.log("----------------------------");
    const balance = await new AccountBalanceQuery()
      .setAccountId(ACCOUNT_ID)
      .execute(client);
    
    const hbarBalance = balance.hbars.toBigNumber().toNumber();
    console.log(`HBAR: ${hbarBalance.toFixed(4)} ℏ`);
    
    const usdcBalance = balance.tokens?.get(TokenId.fromString(CONTRACTS.usdc)) || 0;
    console.log(`USDC: ${usdcBalance}`);
    console.log();
    
    // STEP 2: Associate USDC if needed
    if (!usdcBalance && usdcBalance !== 0) {
      console.log("2️⃣ ASSOCIATING USDC TOKEN");
      console.log("-------------------------");
      const associateTx = new TokenAssociateTransaction()
        .setAccountId(ACCOUNT_ID)
        .setTokenIds([TokenId.fromString(CONTRACTS.usdc)]);
      
      const associateResponse = await associateTx.execute(client);
      await associateResponse.getReceipt(client);
      console.log("✅ USDC associated\n");
    } else {
      console.log("2️⃣ TOKEN ASSOCIATION");
      console.log("--------------------");
      console.log("✅ USDC already associated\n");
    }
    
    // STEP 3: Setup swap parameters
    console.log("3️⃣ SWAP PARAMETERS");
    console.log("------------------");
    const AMOUNT_HBAR = 0.1;  // Small test amount
    const SLIPPAGE = 0.02;    // 2% slippage
    
    // Build path: HBAR → WHBAR → USDC
    const path = [
      CONTRACTS.whbarToken,  // WHBAR token
      CONTRACTS.usdc         // USDC
    ];
    
    console.log(`Amount In: ${AMOUNT_HBAR} HBAR`);
    console.log(`Path: HBAR → WHBAR → USDC`);
    console.log(`Slippage: ${SLIPPAGE * 100}%`);
    console.log();
    
    // STEP 4: Get quote first
    console.log("4️⃣ GETTING QUOTE");
    console.log("----------------");
    
    // For quote, we need amount in WHBAR wei
    const amountInWei = ethers.utils.parseUnits(AMOUNT_HBAR.toString(), DECIMALS.WHBAR);
    
    const quoteFunctionData = routerInterface.encodeFunctionData("getAmountsOut", [
      amountInWei,
      path
    ]);
    
    console.log("Calling getAmountsOut...");
    const quoteQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(CONTRACTS.router))
      .setGas(100000)
      .setFunctionParameters(Buffer.from(quoteFunctionData.slice(2), 'hex'));
    
    let expectedUSDC = 0;
    try {
      const quoteResult = await quoteQuery.execute(client);
      const decoded = routerInterface.decodeFunctionResult("getAmountsOut", quoteResult.bytes);
      const amountsOut = decoded[0];
      
      // Last element is final output
      const usdcOutWei = amountsOut[amountsOut.length - 1];
      expectedUSDC = parseFloat(ethers.utils.formatUnits(usdcOutWei, DECIMALS.USDC));
      
      console.log(`✅ Quote: ${AMOUNT_HBAR} HBAR → ${expectedUSDC.toFixed(2)} USDC`);
    } catch (quoteError) {
      console.log("⚠️ Quote failed, using estimate");
      expectedUSDC = AMOUNT_HBAR * 0.05 * 1000; // Rough estimate: HBAR=$0.05, USDC=$1
      console.log(`Estimate: ${AMOUNT_HBAR} HBAR → ~${expectedUSDC.toFixed(2)} USDC`);
    }
    console.log();
    
    // STEP 5: Calculate minimum output with slippage
    console.log("5️⃣ SLIPPAGE CALCULATION");
    console.log("----------------------");
    const minUSDC = expectedUSDC * (1 - SLIPPAGE);
    const minUSDCWei = ethers.utils.parseUnits(minUSDC.toFixed(DECIMALS.USDC), DECIMALS.USDC);
    
    console.log(`Expected: ${expectedUSDC.toFixed(2)} USDC`);
    console.log(`Minimum (with slippage): ${minUSDC.toFixed(2)} USDC`);
    console.log(`Min Wei: ${minUSDCWei.toString()}`);
    console.log();
    
    // STEP 6: Set deadline
    console.log("6️⃣ TRANSACTION SETUP");
    console.log("-------------------");
    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
    console.log(`Deadline: ${new Date(deadline * 1000).toISOString()}`);
    console.log();
    
    // STEP 7: Encode swap function (HBAR uses swapExactETHForTokens)
    console.log("7️⃣ ENCODING FUNCTION CALL");
    console.log("------------------------");
    console.log("Function: swapExactETHForTokens");
    console.log("Parameters:");
    console.log(`  - amountOutMin: ${minUSDCWei.toString()}`);
    console.log(`  - path: [${path.join(', ')}]`);
    console.log(`  - to: ${ACCOUNT_ID}`);
    console.log(`  - deadline: ${deadline}`);
    
    const swapFunctionData = routerInterface.encodeFunctionData("swapExactETHForTokens", [
      minUSDCWei,
      path,
      ACCOUNT_ID,
      deadline
    ]);
    
    console.log(`Encoded data: ${swapFunctionData.slice(0, 10)}...`);
    console.log();
    
    // STEP 8: Execute the swap
    console.log("8️⃣ EXECUTING SWAP");
    console.log("----------------");
    console.log("⚠️  SENDING REAL TRANSACTION...\n");
    
    const swapTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(CONTRACTS.router))
      .setGas(500000)  // Generous gas limit
      .setPayableAmount(new Hbar(AMOUNT_HBAR))  // CRITICAL: Send HBAR value
      .setFunctionParameters(Buffer.from(swapFunctionData.slice(2), 'hex'));
    
    console.log(`Sending ${AMOUNT_HBAR} HBAR to router...`);
    const txResponse = await swapTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    console.log("\n✅✅✅ TRANSACTION COMPLETE ✅✅✅");
    console.log("================================");
    console.log(`Status: ${receipt.status}`);
    console.log(`TX ID: ${txResponse.transactionId}`);
    console.log(`Gas Used: ${receipt.gasUsed}`);
    console.log();
    
    // STEP 9: Verify on HashScan
    console.log("9️⃣ VERIFICATION");
    console.log("--------------");
    console.log("🔍 View on HashScan:");
    console.log(`https://hashscan.io/mainnet/transaction/${txResponse.transactionId}`);
    console.log();
    
    // STEP 10: Check final balance
    console.log("🔟 CHECKING FINAL BALANCE");
    console.log("------------------------");
    console.log("Waiting 5 seconds for settlement...");
    await new Promise(r => setTimeout(r, 5000));
    
    const newBalance = await new AccountBalanceQuery()
      .setAccountId(ACCOUNT_ID)
      .execute(client);
    
    const newHbarBalance = newBalance.hbars.toBigNumber().toNumber();
    const newUsdcBalance = newBalance.tokens?.get(TokenId.fromString(CONTRACTS.usdc)) || 0;
    
    console.log("BEFORE → AFTER:");
    console.log(`HBAR: ${hbarBalance.toFixed(4)} → ${newHbarBalance.toFixed(4)} (${(hbarBalance - newHbarBalance).toFixed(4)} spent)`);
    console.log(`USDC: ${usdcBalance} → ${newUsdcBalance} (+${newUsdcBalance - usdcBalance})`);
    console.log();
    
    if (newUsdcBalance > usdcBalance) {
      console.log("🎉🎉🎉 PERFECT TRADE SUCCESSFUL! 🎉🎉🎉");
      console.log("=====================================");
      console.log("✅ HBAR decreased");
      console.log("✅ USDC increased");
      console.log("✅ Swap verified on-chain");
      console.log("\n🚀 AGENTVAULT TRADING BOT IS COMPLETE!");
      console.log("\nYou now have:");
      console.log("- Working DEX integration ✅");
      console.log("- Policy engine protection ✅");
      console.log("- Strategy builder UI ✅");
      console.log("- Live on mainnet ✅");
      console.log("\n📹 Ready for hackathon demo!");
    } else {
      console.log("⚠️ USDC balance unchanged");
      console.log("Check HashScan for transaction details");
    }
    
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error("\nDEBUG INFO:");
    console.error(error);
    
    console.log("\n💡 COMMON FIXES:");
    console.log("1. Check router contract is correct");
    console.log("2. Verify WHBAR path is right");
    console.log("3. Try smaller amount");
    console.log("4. Check liquidity on SaucerSwap");
  }
}

// RUN THE PERFECT TRADE
console.log("Starting in 3 seconds...\n");
setTimeout(() => {
  onePerfectTrade().catch(console.error);
}, 3000);