// ── AgentVault Dashboard Server ─────────────────────────────────
// Minimal HTTP server: serves the dashboard + API endpoints
// for approval flow, audit logs, and agent status.
// No frameworks, no dependencies — just Node.js http module.

import http from "http";
import fs from "fs";
import path from "path";
import { getPendingApprovals, getResolvedApprovals, resolveApproval, getAllApprovals } from "../src/approval";
import { getLocalLogs } from "../src/audit";

const PORT = process.env.VAULT_DASHBOARD_PORT || 3099;

// We'll store a reference to the vault instance
let vaultRef: any = null;

export function setVaultRef(vault: any) {
  vaultRef = vault;
}

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

function jsonResponse(res: http.ServerResponse, data: any, status = 200) {
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
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

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

  // GET /api/status — agent status
  if (pathname === "/api/status" && req.method === "GET") {
    if (!vaultRef) {
      return jsonResponse(res, { error: "No vault initialized" }, 503);
    }
    const status = vaultRef.getStatus();
    const balance = await vaultRef.getBalance();
    return jsonResponse(res, { ...status, balance: balance.ok ? balance.data : null });
  }

  // GET /api/audit — audit log
  if (pathname === "/api/audit" && req.method === "GET") {
    const agentId = url.searchParams.get("agentId") || undefined;
    const logs = agentId ? getLocalLogs(agentId) : [];
    // If no agentId, get from vault
    if (!agentId && vaultRef) {
      return jsonResponse(res, { entries: vaultRef.getAuditLog() });
    }
    return jsonResponse(res, { entries: logs });
  }

  // GET /api/approvals — all approvals
  if (pathname === "/api/approvals" && req.method === "GET") {
    const agentId = url.searchParams.get("agentId") || undefined;
    return jsonResponse(res, {
      pending: getPendingApprovals(agentId),
      resolved: getResolvedApprovals(agentId),
      all: getAllApprovals(agentId),
    });
  }

  // POST /api/approvals/:id/resolve — approve or deny
  if (pathname.startsWith("/api/approvals/") && pathname.endsWith("/resolve") && req.method === "POST") {
    const id = pathname.split("/")[3];
    const body = await parseBody(req);
    const approved = body.approved === true;
    const result = resolveApproval(id, approved, body.resolvedBy || "dashboard");
    return jsonResponse(res, result);
  }

  // GET /api/policy — current policy
  if (pathname === "/api/policy" && req.method === "GET") {
    if (!vaultRef) return jsonResponse(res, { error: "No vault" }, 503);
    return jsonResponse(res, { policy: vaultRef.policy });
  }

  // ── Static Files ────────────────────────────────────────────

  if (pathname === "/" || pathname === "/index.html") {
    return serveFile(res, path.join(__dirname, "index.html"), "text/html");
  }

  // Fallback
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n🏦 AgentVault Dashboard → http://localhost:${PORT}\n`);
});

export default server;
