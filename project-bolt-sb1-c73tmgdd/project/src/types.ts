export interface KPIData {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
}

export interface Activity {
  id: string;
  type: 'swap' | 'transfer' | 'approval' | 'policy' | 'strategy';
  action: string;
  status: 'success' | 'pending' | 'denied' | 'failed';
  amount?: string;
  timestamp: string;
  txHash?: string;
}

export interface Approval {
  id: string;
  action: string;
  amount: string;
  token: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  requestedBy: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  type: 'limit' | 'whitelist' | 'threshold' | 'schedule';
  description: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  verdict: 'pass' | 'deny' | 'approval_required';
  details: string;
  hcsTopicId: string;
  txHash?: string;
}

export interface StrategyBlock {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  label: string;
  icon: string;
  config?: Record<string, unknown>;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'enabled' | 'paused' | 'limit_reached' | 'circuit_breaker';
  blocks: StrategyBlock[];
  lastRun?: string;
  totalExecutions: number;
  successRate: number;
}

export type Page = 'overview' | 'approvals' | 'policy' | 'audit' | 'strategy' | 'identity';
