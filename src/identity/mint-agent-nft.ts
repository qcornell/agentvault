// ── Agent Identity NFT ─────────────────────────────────────────
// Mints a single NFT on Hedera that represents an AI agent.
// The metadata encodes who the agent is, what it can do, and where
// its audit trail lives. Verifiable on HashScan by anyone.

import {
  Client,
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenType,
  TokenSupplyType,
  PrivateKey,
  AccountId,
  Status,
} from "@hashgraph/sdk";
import { AgentIdentity, VaultResult } from "../types";
import crypto from "crypto";

export interface MintAgentNFTInput {
  client: Client;
  operatorId: string;
  operatorKey: string;
  identity: Omit<AgentIdentity, "policyHash" | "createdAt" | "version">;
  policyJson: string; // raw JSON of the policy — we hash it
}

/**
 * Creates an NFT collection for the agent and mints serial #1
 * with the agent's full identity as metadata.
 */
export async function mintAgentNFT(input: MintAgentNFTInput): Promise<VaultResult> {
  try {
    const { client, operatorId, operatorKey, identity, policyJson } = input;
    const supplyKey = PrivateKey.fromString(operatorKey);

    // Hash the policy so we can verify it later without storing the full thing on-chain
    const policyHash = crypto.createHash("sha256").update(policyJson).digest("hex");

    const fullIdentity: AgentIdentity = {
      ...identity,
      policyHash,
      createdAt: new Date().toISOString(),
      version: "1.0.0",
    };

    // 1. Create the NFT collection (1 per agent, max supply 1)
    const createTx = new TokenCreateTransaction()
      .setTokenName(`AgentVault: ${identity.name}`)
      .setTokenSymbol("AGVLT")
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(1)
      .setTreasuryAccountId(AccountId.fromString(operatorId))
      .setSupplyKey(supplyKey)
      .setTokenMemo(`AgentVault identity for ${identity.agentId}`);

    const createResponse = await createTx.execute(client as any);
    const createReceipt = await createResponse.getReceipt(client as any);

    if (createReceipt.status !== Status.Success) {
      return {
        ok: false,
        error: "NFT collection creation failed",
        code: "NFT_CREATE_FAILED",
        details: createReceipt.status.toString(),
      };
    }

    const tokenId = createReceipt.tokenId!.toString();

    // 2. Mint serial #1 with compact metadata reference
    // Hedera NFT metadata field is limited to 100 bytes.
    // We store a compact identifier + policy hash prefix.
    // Full identity is logged to HCS (immutable, verifiable).
    const compactMeta = `av:${identity.agentId}|ph:${policyHash.slice(0, 16)}`;
    const metadataBuffer = Buffer.from(compactMeta);

    const mintTx = new TokenMintTransaction()
      .setTokenId(tokenId)
      .addMetadata(metadataBuffer);

    const frozenMint = await mintTx.freezeWith(client as any);
    const signedMint = await frozenMint.sign(supplyKey);
    const mintResponse = await signedMint.execute(client as any);
    const mintReceipt = await mintResponse.getReceipt(client as any);

    if (mintReceipt.status !== Status.Success) {
      return {
        ok: false,
        error: "NFT mint failed",
        code: "NFT_MINT_FAILED",
        details: mintReceipt.status.toString(),
      };
    }

    const serialNumber = mintReceipt.serials[0]?.toString() ?? "1";
    const mintTxId = mintResponse.transactionId.toString();

    return {
      ok: true,
      summary: `Minted AgentVault identity NFT for "${identity.name}" — Token ${tokenId} Serial #${serialNumber}`,
      txId: mintTxId,
      data: {
        tokenId,
        serialNumber,
        identity: fullIdentity,
        policyHash,
        hashScanUrl: `https://hashscan.io/mainnet/token/${tokenId}`,
        nftUrl: `https://hashscan.io/mainnet/token/${tokenId}/1`,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: "Failed to mint agent identity NFT",
      code: "NFT_ERROR",
      details: message,
    };
  }
}
