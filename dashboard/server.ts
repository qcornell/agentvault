// ── AgentVault Dashboard Server ─────────────────────────────────
// Serves the dashboard UI + API endpoints for the vault.
// Boots a live vault on startup so the dashboard shows real data.
// No frameworks, no dependencies — just Node.js http module.
//
// Usage:
//   HEDERA_OPERATOR_ID=0.0.xxxx HEDERA_OPERATOR_KEY=302e... npx ts-node dashboard/server.ts
//   Then open http://localhost:3099

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
  ],
  allowedRecipients: [OPERATOR_ID],
  approvalMethod: "web",
};

const vaultConfig: VaultConfig = {
  operatorId: OPERATOR_ID,
  operatorKey: OPERATOR_KEY,
  network: "testnet",
  agentName: "DeedSlice Distributor",
  agentId: "agentvault:deedslice-distributor",
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
    const holders = body.holders || [
      { accountId: OPERATOR_ID, name: "Alice (45%)", ownershipPercent: 45 },
      { accountId: OPERATOR_ID, name: "Bob (35%)", ownershipPercent: 35 },
      { accountId: OPERATOR_ID, name: "Charlie (20%)", ownershipPercent: 20 },
    ];
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

  // ── Static Files ────────────────────────────────────────────

  if (pathname === "/" || pathname === "/index.html") {
    return serveFile(res, path.join(__dirname, "index.html"), "text/html");
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
