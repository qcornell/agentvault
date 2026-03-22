// ── AgentVault Dashboard Server ─────────────────────────────────
// Serves the dashboard UI + API endpoints for the vault.
// Boots a live vault on startup so the dashboard shows real data.
// No frameworks, no dependencies — just Node.js http module + dotenv.
//
// Usage:
//   1. Create .env in project root (see .env.example)
//   2. npx ts-node dashboard/server.ts
//   Then open http://localhost:3099

import "dotenv/config";
import http from "http";
import fs from "fs";
import path from "path";
import { AgentVault, VaultConfig } from "../src/vault";
import { AgentPolicy } from "../src/types";
import { getPendingApprovals, getResolvedApprovals, resolveApproval, getAllApprovals } from "../src/approval";
import { getDailySpending } from "../src/policy";
import { getAgentVaultTools, getMCPToolManifest } from "../src/mcp";

const PORT = Number(process.env.VAULT_DASHBOARD_PORT || 3099);

// ── Vault Configuration ────────────────────────────────────────

const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID;
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;
const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet") as "testnet" | "mainnet";

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error("\n❌ Missing env vars:");
  console.error("   HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node dashboard/server.ts\n");
  process.exit(1);
}

const policy: AgentPolicy = {
  agentId: "agentvault:deedslice-distributor",
  dailySpendLimitHbar: 100,
  perTxLimitHbar: 50,
  approvalRequiredAboveHbar: 25,
  allowedActions: [
    "HBAR_TRANSFER",
    "DISTRIBUTE_TO_HOLDERS",
    "GET_BALANCE",
    "GET_AUDIT_LOG",
    "SWAP",
  ],
  allowedRecipients: [OPERATOR_ID],
  approvalMethod: "web",
};

const vaultConfig: VaultConfig = {
  operatorId: OPERATOR_ID,
  operatorKey: OPERATOR_KEY,
  network: HEDERA_NETWORK,
  agentName: "AgentVault Operator",
  agentId: "agentvault:operator",
  policy,
};

let vault: AgentVault | null = null;
let initError: string | null = null;

// ── Helpers ────────────────────────────────────────────────────

function serveFile(res: http.ServerResponse, filePath: string, contentType: string) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    res.writeHead(200, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

function json(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: any) => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

// ── HTTP Server ────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // ── API Routes ──────────────────────────────────────────────

  // GET /api/status
  if (pathname === "/api/status" && req.method === "GET") {
    if (!vault) {
      return json(res, {
        error: initError || "Vault initializing...",
        agent: { name: vaultConfig.agentName, id: vaultConfig.agentId, wallet: vaultConfig.operatorId, network: vaultConfig.network },
        identity: {},
        policy: { dailySpendLimitHbar: policy.dailySpendLimitHbar, perTxLimitHbar: policy.perTxLimitHbar, approvalRequiredAboveHbar: policy.approvalRequiredAboveHbar, allowedActions: policy.allowedActions },
        balance: null,
      });
    }
    const status = vault.getStatus() as any;
    const balance = await vault.getBalance();
    const dailySpent = getDailySpending(vault.config.agentId);
    return json(res, { ...status, balance: balance.ok ? balance.data : null, dailySpent });
  }

  // GET /api/audit
  if (pathname === "/api/audit" && req.method === "GET") {
    if (!vault) return json(res, { entries: [] });
    return json(res, { entries: vault.getAuditLog() });
  }

  // GET /api/approvals
  if (pathname === "/api/approvals" && req.method === "GET") {
    const agentId = url.searchParams.get("agentId") || undefined;
    return json(res, {
      pending: getPendingApprovals(agentId),
      resolved: getResolvedApprovals(agentId),
      all: getAllApprovals(agentId),
    });
  }

  // POST /api/approvals/:id/resolve
  if (pathname.startsWith("/api/approvals/") && pathname.endsWith("/resolve") && req.method === "POST") {
    const id = pathname.split("/")[3];
    const body = await parseBody(req);
    const approved = body.approved === true;
    const result = resolveApproval(id, approved, body.resolvedBy || "dashboard");
    return json(res, result);
  }

  // GET /api/policy
  if (pathname === "/api/policy" && req.method === "GET") {
    return json(res, { policy: vault?.policy || policy });
  }

  // POST /api/demo/distribute — trigger a test distribution from the dashboard
  if (pathname === "/api/demo/distribute" && req.method === "POST") {
    if (!vault) return json(res, { ok: false, error: "Vault not initialized" }, 503);
    const body = await parseBody(req);
    const amount = Number(body.amount) || 1;
    const rawHolders = body.holders || [
      { accountId: OPERATOR_ID, name: "Alice (45%)", ownershipPercent: 45 },
      { accountId: OPERATOR_ID, name: "Bob (35%)", ownershipPercent: 35 },
      { accountId: OPERATOR_ID, name: "Charlie (20%)", ownershipPercent: 20 },
    ];
    // Normalize: replace "operator" or any non-Hedera ID with the actual operator
    const holders = rawHolders.map((h: any) => ({
      ...h,
      accountId: (!h.accountId || h.accountId === "operator" || !/^\d+\.\d+\.\d+$/.test(h.accountId))
        ? OPERATOR_ID
        : h.accountId,
    }));
    const result = await vault.distribute(amount, holders, body.propertyName || "Dashboard Test Distribution");
    return json(res, result);
  }

  // ── MCP Routes ──────────────────────────────────────────────

  // GET /api/mcp/tools — list all available MCP tools (manifest)
  if (pathname === "/api/mcp/tools" && req.method === "GET") {
    return json(res, { tools: getMCPToolManifest() });
  }

  // POST /api/mcp/invoke — invoke an MCP tool by name
  if (pathname === "/api/mcp/invoke" && req.method === "POST") {
    if (!vault) return json(res, { ok: false, error: "Vault not initialized" }, 503);
    const body = await parseBody(req);
    const toolName = body.tool || body.name;
    const params = body.params || body.input || {};
    if (!toolName) return json(res, { ok: false, error: "Missing 'tool' field" }, 400);
    const tools = getAgentVaultTools(vault);
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) return json(res, { ok: false, error: `Unknown tool: ${toolName}`, available: tools.map(t => t.name) }, 404);
    try {
      const result = await tool.handler(params);
      return json(res, result);
    } catch (err) {
      return json(res, { ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  // POST /api/demo/check-policy — test a policy check from the dashboard
  if (pathname === "/api/demo/check-policy" && req.method === "POST") {
    if (!vault) return json(res, { ok: false, error: "Vault not initialized" }, 503);
    const body = await parseBody(req);
    const check = vault.checkPolicy(body.action || "HBAR_TRANSFER", Number(body.amount) || 10, body.recipient);
    return json(res, { ok: true, data: { policyCheck: check } });
  }

  // POST /api/swap — execute a live HBAR→Token swap via SaucerSwap V2
  if (pathname === "/api/swap" && req.method === "POST") {
    if (!vault) return json(res, { ok: false, error: "Vault not initialized" }, 503);
    const body = await parseBody(req);
    const toToken = body.toToken || "SAUCE";
    const amountHbar = Number(body.amountHbar);
    if (!amountHbar || amountHbar <= 0) return json(res, { ok: false, error: "amountHbar must be > 0" }, 400);
    if (amountHbar > 50) return json(res, { ok: false, error: `Amount ${amountHbar} exceeds per-TX limit of 50 HBAR` }, 400);
    try {
      const result = await vault.swap({ toToken, amountHbar, feeTier: body.feeTier || "0.30%" });
      return json(res, result);
    } catch (err) {
      return json(res, { ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  // GET /api/tokens — list available tokens for swap
  if (pathname === "/api/tokens" && req.method === "GET") {
    return json(res, {
      tokens: [
        { symbol: "SAUCE", id: "0.0.731861", decimals: 6, name: "SaucerSwap" },
        { symbol: "USDC", id: "0.0.456858", decimals: 6, name: "USD Coin" },
        { symbol: "KARATE", id: "0.0.1463958", decimals: 8, name: "Karate Combat" },
        { symbol: "HST", id: "0.0.1460784", decimals: 8, name: "HeadStarter" },
      ],
    });
  }

  // GET /api/balance — get HBAR + token balances
  if (pathname === "/api/balance" && req.method === "GET") {
    if (!vault) return json(res, { ok: false, error: "Vault not initialized" }, 503);
    const result = await vault.getBalance();
    return json(res, result);
  }

  // ── Strategy Endpoints ──────────────────────────────────────

  // POST /api/strategy/test — validate a strategy against the policy engine
  if (pathname === "/api/strategy/test" && req.method === "POST") {
    if (!vault) return json(res, { ok: false, error: "Vault not initialized" }, 503);
    const body = await parseBody(req);
    const blocks = body.blocks || [];
    const guardrails = body.guardrails || {};
    const steps: any[] = [];

    // 1. Validate structure
    const conditions = blocks.filter((b: any) => b.type === "condition");
    const actions = blocks.filter((b: any) => b.type === "action");
    steps.push({
      icon: blocks.length > 0 ? "pass" : "fail",
      label: "Strategy structure",
      detail: blocks.length > 0 ? `${conditions.length} condition(s), ${actions.length} action(s)` : "No blocks defined",
    });

    // 2. Check guardrails against vault policy
    const maxTrade = Number(guardrails.maxPerTrade) || 0;
    const policyPerTx = vault.policy.perTxLimitHbar;
    steps.push({
      icon: maxTrade <= policyPerTx ? "pass" : "warn",
      label: "Per-trade limit check",
      detail: maxTrade <= policyPerTx
        ? `Max per-trade (${maxTrade} ℏ) within vault limit (${policyPerTx} ℏ)`
        : `Max per-trade (${maxTrade} ℏ) exceeds vault limit (${policyPerTx} ℏ) — trades above ${policyPerTx} ℏ will be denied`,
    });

    const maxDaily = Number(guardrails.maxDailySpend) || 0;
    const policyDaily = vault.policy.dailySpendLimitHbar;
    steps.push({
      icon: maxDaily <= policyDaily ? "pass" : "warn",
      label: "Daily spend limit check",
      detail: maxDaily <= policyDaily
        ? `Max daily (${maxDaily} ℏ) within vault limit (${policyDaily} ℏ)`
        : `Max daily (${maxDaily} ℏ) exceeds vault limit (${policyDaily} ℏ) — will be capped`,
    });

    // 3. Check if SWAP is allowed
    const swapAllowed = vault.policy.allowedActions.includes("SWAP");
    const hasSwapBlock = actions.some((a: any) => ["swap-tokens", "dca-buy", "take-profit", "stop-loss", "limit-order"].includes(a.block));
    if (hasSwapBlock) {
      steps.push({
        icon: swapAllowed ? "pass" : "fail",
        label: "Swap action authorized",
        detail: swapAllowed ? "SWAP is in the vault's allowed actions" : "SWAP is NOT in the vault's allowed actions — trades will be denied",
      });
    }

    // 4. Risk controls
    const hasRisk = blocks.some((b: any) => b.block === "stop-loss" || b.block === "take-profit");
    steps.push({
      icon: hasRisk ? "pass" : "warn",
      label: "Risk controls",
      detail: hasRisk ? "Stop-loss or take-profit detected" : "Consider adding stop-loss or take-profit for downside protection",
    });

    // 5. Approval threshold
    const approvalThreshold = Number(guardrails.approvalThreshold) || vault.policy.approvalRequiredAboveHbar;
    steps.push({
      icon: "pass",
      label: "Human approval threshold",
      detail: `Trades above ${approvalThreshold} ℏ will require human approval on the dashboard`,
    });

    // 6. Token allowlist
    const tokens = body.allowedTokens || [];
    steps.push({
      icon: tokens.length > 0 ? "pass" : "warn",
      label: "Token allowlist",
      detail: tokens.length > 0 ? `Tokens: ${tokens.join(", ")}` : "No tokens specified — strategy may not execute",
    });

    // 7. Simulate a policy check for a typical trade
    const testAmount = Math.min(maxTrade || 1, 1);
    const simCheck = vault.checkPolicy("SWAP", testAmount, "self");
    steps.push({
      icon: simCheck.verdict === "PASS" ? "pass" : simCheck.verdict === "APPROVAL_REQUIRED" ? "warn" : "fail",
      label: `Simulated trade (${testAmount} ℏ SWAP)`,
      detail: `Policy verdict: ${simCheck.verdict} — ${simCheck.reason}`,
    });

    return json(res, {
      ok: true,
      steps,
      summary: {
        totalBlocks: blocks.length,
        conditions: conditions.length,
        actions: actions.length,
        policyCompatible: steps.every((s: any) => s.icon !== "fail"),
      },
    });
  }

  // POST /api/strategy/deploy — deploy a strategy (execute its first swap action)
  if (pathname === "/api/strategy/deploy" && req.method === "POST") {
    if (!vault) return json(res, { ok: false, error: "Vault not initialized" }, 503);
    const body = await parseBody(req);
    const strategyName = body.name || "Untitled Strategy";
    const blocks = body.blocks || [];
    const guardrails = body.guardrails || {};

    // Find the first actionable swap block
    const swapBlock = blocks.find((b: any) =>
      b.type === "action" && ["swap-tokens", "dca-buy", "limit-order"].includes(b.block)
    );

    if (!swapBlock) {
      return json(res, {
        ok: false,
        error: "No executable swap action found in strategy",
        detail: "Add a Swap Tokens, DCA Buy, or Limit Order block",
      });
    }

    // Determine swap parameters from strategy config
    const amountHbar = Math.min(
      Number(body.swapAmount) || 0.5,
      Number(guardrails.maxPerTrade) || vault.policy.perTxLimitHbar
    );
    const toToken = body.toToken || "SAUCE";

    // Execute via the vault's swap pipeline (policy → approval → execute → HCS log)
    try {
      const result = await vault.swap({
        toToken,
        amountHbar,
        feeTier: "0.30%",
      });
      return json(res, {
        ...result,
        strategyName,
        swapBlock: swapBlock.block,
        note: result.ok
          ? `Strategy "${strategyName}" executed: swapped ${amountHbar} HBAR → ${toToken}`
          : `Strategy "${strategyName}" failed: ${(result as any).error}`,
      });
    } catch (err) {
      return json(res, {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        strategyName,
      }, 500);
    }
  }

  // ── Static Files ────────────────────────────────────────────

  if (pathname === "/" || pathname === "/index.html") {
    return serveFile(res, path.join(__dirname, "index.html"), "text/html");
  }

  if (pathname === "/strategy-builder.html" || pathname === "/strategy-builder") {
    return serveFile(res, path.join(__dirname, "strategy-builder.html"), "text/html");
  }

  // Fallback
  res.writeHead(404);
  res.end("Not found");
});

// ── Boot ───────────────────────────────────────────────────────

async function boot() {
  console.log("\n🏦 AgentVault Dashboard");
  console.log(`   Agent: ${vaultConfig.agentName}`);
  console.log(`   Wallet: ${vaultConfig.operatorId}`);
  console.log(`   Network: ${vaultConfig.network}\n`);

  // Start server immediately so dashboard loads (shows "initializing...")
  server.listen(PORT, () => {
    console.log(`   Dashboard → http://localhost:${PORT}\n`);
  });

  // Initialize vault in background
  console.log("   Initializing vault (HCS topic + Identity NFT)...");
  try {
    vault = new AgentVault(vaultConfig);
    const result = await vault.initialize();
    if (result.ok) {
      console.log(`   ✅ Vault ready!`);
      console.log(`   NFT:   ${vault.nftTokenId} → https://hashscan.io/testnet/token/${vault.nftTokenId}`);
      console.log(`   Topic: ${vault.hcsTopicId} → https://hashscan.io/testnet/topic/${vault.hcsTopicId}`);
      console.log(`\n   Dashboard is live. Approve/deny actions from the browser.\n`);
    } else {
      initError = result.error || "Initialization failed";
      console.error(`   ❌ ${initError}`);
    }
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Vault init failed: ${initError}`);
  }
}

boot();
