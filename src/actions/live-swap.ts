// ── Live Swap Action ───────────────────────────────────────────
// Executes a real HBAR→Token swap on SaucerSwap V2 via AgentVault.
// Follows official SaucerSwap docs EXACTLY:
// https://docs.saucerswap.finance/v/developer/saucerswap-v2/swap-operations/swap-hbar-for-tokens
//
// Pattern: multicall([exactInput, refundETH]) on V2 SwapRouter

import {
  Client,
  ContractExecuteTransaction,
  ContractId,
  TokenId,
  AccountId,
  Hbar,
  HbarUnit,
  AccountBalanceQuery,
  TokenAssociateTransaction,
} from "@hashgraph/sdk";

// We use ethers v5 for ABI encoding (installed in project)
const ethers = require("ethers");

// ─── Contract addresses (official SaucerSwap docs) ───
const SAUCERSWAP_V2_ROUTER = "0.0.3949434";
const WHBAR_TOKEN_ID = "0.0.1456986";

const FEE_TIERS: Record<string, number> = {
  "0.01%": 100,
  "0.05%": 500,
  "0.15%": 1500,
  "0.30%": 3000,
  "1.00%": 10000,
};

// Well-known mainnet tokens
const KNOWN_TOKENS: Record<string, { id: string; decimals: number; defaultFee?: number }> = {
  SAUCE:  { id: "0.0.731861",   decimals: 6, defaultFee: 3000 },   // 0.30% — V2 pool confirmed
  USDC:   { id: "0.0.456858",   decimals: 6, defaultFee: 1500 },   // 0.15% — V2 pool confirmed (GeckoTerminal)
  // KARATE and HST only have V1 pools — no V2 liquidity, swaps will revert
  // KARATE: { id: "0.0.1463958",  decimals: 8 },
  // HST:    { id: "0.0.1460784",  decimals: 8 },
  WHBAR:  { id: "0.0.1456986",  decimals: 8 },
};

// Router ABI (SwapRouter + PeripheryPayments + Multicall)
const ROUTER_ABI = [
  "function exactInput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)",
  "function refundETH() external payable",
  "function multicall(bytes[] data) external payable returns (bytes[] results)",
];

// ─── Helpers ───

function tokenIdToEvmAddress(hederaId: string): string {
  const num = parseInt(hederaId.split(".")[2]);
  return "0x" + num.toString(16).padStart(40, "0");
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

function buildPath(tokenInEvm: string, fee: number, tokenOutEvm: string): string {
  const a = tokenInEvm.slice(2);
  const f = fee.toString(16).padStart(6, "0");
  const b = tokenOutEvm.slice(2);
  return "0x" + a + f + b;
}

// ─── Public types ───

export interface SwapParams {
  /** Token to buy (token ID like "0.0.731861" or symbol like "SAUCE") */
  toToken: string;
  /** Amount of HBAR to swap */
  amountHbar: number;
  /** Minimum amount out in token's smallest unit (0 = accept any) */
  minAmountOut?: number;
  /** Fee tier (default 0.30%) */
  feeTier?: string;
  /** Account to receive tokens (defaults to operator) */
  recipient?: string;
}

export interface SwapResult {
  ok: boolean;
  txId?: string;
  amountInHbar?: number;
  amountOut?: number;
  amountOutRaw?: number;
  decimals?: number;
  tokenSymbol?: string;
  tokenId?: string;
  hashScanUrl?: string;
  error?: string;
  gasUsed?: number;
}

// ─── Main swap function ───

export async function executeHbarSwap(
  client: Client,
  params: SwapParams
): Promise<SwapResult> {
  // Resolve token
  let tokenId = params.toToken;
  let tokenSymbol = params.toToken;
  const knownUpper = params.toToken.toUpperCase();
  if (KNOWN_TOKENS[knownUpper]) {
    tokenId = KNOWN_TOKENS[knownUpper].id;
    tokenSymbol = knownUpper;
  }

  const operatorId = client.operatorAccountId!.toString();
  const recipientId = params.recipient || operatorId;
  // Use token's known fee tier, or user override, or 0.30% default
  const knownFee = KNOWN_TOKENS[knownUpper]?.defaultFee;
  const fee = params.feeTier ? (FEE_TIERS[params.feeTier] || 3000) : (knownFee || 3000);

  // 1. Ensure token is associated
  try {
    const assocTx = new TokenAssociateTransaction()
      .setAccountId(recipientId)
      .setTokenIds([TokenId.fromString(tokenId)]);
    const assocResp = await assocTx.execute(client);
    await assocResp.getReceipt(client);
  } catch (e: any) {
    // Ignore if already associated
    if (!e.message?.includes("TOKEN_ALREADY_ASSOCIATED")) {
      // Non-fatal, continue anyway
    }
  }

  // 2. Get balance before (for verification)
  let tokenBefore = 0;
  try {
    const bal = await new AccountBalanceQuery()
      .setAccountId(recipientId)
      .execute(client);
    const t = bal.tokens.get(TokenId.fromString(tokenId));
    tokenBefore = t ? Number(t.toString()) : 0;
  } catch (e) {
    // Non-fatal
  }

  // 3. Build the swap transaction
  const abiInterface = new ethers.utils.Interface(ROUTER_ABI);

  const whbarEvm = tokenIdToEvmAddress(WHBAR_TOKEN_ID);
  const tokenEvm = tokenIdToEvmAddress(tokenId);
  const recipientEvm = tokenIdToEvmAddress(recipientId);

  const path = buildPath(whbarEvm, fee, tokenEvm);
  const amountInTinybar = Math.floor(params.amountHbar * 100_000_000);
  const deadline = Math.floor(Date.now() / 1000) + 600;

  const exactInputParams = {
    path,
    recipient: recipientEvm,
    deadline,
    amountIn: amountInTinybar,
    amountOutMinimum: params.minAmountOut || 0,
  };

  // Encode multicall([exactInput, refundETH])
  const swapEncoded = abiInterface.encodeFunctionData("exactInput", [exactInputParams]);
  const refundEncoded = abiInterface.encodeFunctionData("refundETH");
  const encodedData = abiInterface.encodeFunctionData("multicall", [[swapEncoded, refundEncoded]]);
  const encodedBytes = hexToUint8Array(encodedData);

  // 4. Execute!
  try {
    const response = await new ContractExecuteTransaction()
      .setPayableAmount(Hbar.from(amountInTinybar, HbarUnit.Tinybar))
      .setContractId(ContractId.fromString(SAUCERSWAP_V2_ROUTER))
      .setGas(1_000_000)
      .setFunctionParameters(encodedBytes)
      .execute(client);

    const record = await response.getRecord(client);
    const receipt = record.receipt;
    const txId = response.transactionId.toString();
    const gasUsed = record.contractFunctionResult?.gasUsed?.toNumber() || 0;

    if (receipt.status.toString() !== "SUCCESS") {
      return {
        ok: false,
        txId,
        error: `Transaction status: ${receipt.status}`,
        gasUsed,
      };
    }

    // 5. Check balance after to determine actual amount received
    await new Promise(r => setTimeout(r, 3000));
    let tokenAfter = 0;
    try {
      const bal = await new AccountBalanceQuery()
        .setAccountId(recipientId)
        .execute(client);
      const t = bal.tokens.get(TokenId.fromString(tokenId));
      tokenAfter = t ? Number(t.toString()) : 0;
    } catch (e) {
      // Non-fatal
    }

    const amountOutRaw = tokenAfter - tokenBefore;
    const decimals = KNOWN_TOKENS[knownUpper]?.decimals || 8;
    const amountOutFormatted = amountOutRaw / Math.pow(10, decimals);
    const network = client.ledgerId?.toString() === "mainnet" ? "mainnet" : "testnet";

    return {
      ok: true,
      txId,
      amountInHbar: params.amountHbar,
      amountOut: amountOutFormatted,
      amountOutRaw,
      decimals,
      tokenSymbol,
      tokenId,
      hashScanUrl: `https://hashscan.io/${network}/transaction/${txId}`,
      gasUsed,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || String(err),
    };
  }
}
