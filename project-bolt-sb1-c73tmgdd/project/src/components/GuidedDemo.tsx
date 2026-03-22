import { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle, ChevronRight, RotateCcw } from 'lucide-react';

// ─── Policy config (matches vault defaults) ───
const POLICY = {
  perTxLimitHbar: 50,
  approvalThresholdHbar: 25,
  dailyLimitHbar: 100,
  allowedActions: ['HBAR_TRANSFER', 'DISTRIBUTE_TO_HOLDERS', 'GET_BALANCE', 'GET_AUDIT_LOG', 'SWAP'],
};

interface StepDef {
  id: number;
  title: string;
  description: string;
  defaultAction: string;
  defaultAmount: number;
  defaultRecipient?: string;
}

const stepDefs: StepDef[] = [
  {
    id: 1,
    title: 'Step 1: Denied Action',
    description: 'Attempt a transfer that exceeds the per-TX limit',
    defaultAction: 'HBAR_TRANSFER',
    defaultAmount: 75,
    defaultRecipient: '0.0.99999',
  },
  {
    id: 2,
    title: 'Step 2: Approval Required',
    description: 'Transfer above the human-approval threshold',
    defaultAction: 'HBAR_TRANSFER',
    defaultAmount: 35,
    defaultRecipient: '0.0.55443',
  },
  {
    id: 3,
    title: 'Step 3: Safe Execution',
    description: 'Execute a distribution within all safety limits',
    defaultAction: 'DISTRIBUTE_TO_HOLDERS',
    defaultAmount: 15,
    defaultRecipient: '3 holders (March Rent)',
  },
];

type Verdict = 'pass' | 'deny' | 'approval_required';

interface StepResult {
  verdict: Verdict;
  rule: string;
  reason: string;
}

/** Run the policy engine locally (mirrors src/policy/engine.ts logic) */
function checkPolicy(action: string, amount: number): StepResult {
  if (!POLICY.allowedActions.includes(action)) {
    return { verdict: 'deny', rule: 'ALLOWED_ACTIONS', reason: `Action "${action}" is not in the agent's allowed actions list` };
  }
  if (amount > POLICY.perTxLimitHbar) {
    return { verdict: 'deny', rule: 'PER_TX_LIMIT', reason: `Amount ${amount} ℏ exceeds per-transaction limit of ${POLICY.perTxLimitHbar} ℏ` };
  }
  if (amount > POLICY.approvalThresholdHbar) {
    return { verdict: 'approval_required', rule: 'APPROVAL_THRESHOLD', reason: `Amount ${amount} ℏ exceeds the ${POLICY.approvalThresholdHbar} ℏ approval threshold — human approval required` };
  }
  return { verdict: 'pass', rule: 'ALL_CLEAR', reason: `Action "${action}" for ${amount} ℏ passed all ${POLICY.allowedActions.length} policy checks` };
}

// Approval queue entries created by Step 2
export interface ApprovalEntry {
  id: string;
  action: string;
  amount: number;
  recipient: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
}

interface Props {
  onApprovalCreated?: (entry: ApprovalEntry) => void;
}

export function GuidedDemo({ onApprovalCreated }: Props) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [runningStep, setRunningStep] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, StepResult>>({});
  const [amounts, setAmounts] = useState<Record<number, number>>({
    1: stepDefs[0].defaultAmount,
    2: stepDefs[1].defaultAmount,
    3: stepDefs[2].defaultAmount,
  });

  const runStep = (step: StepDef) => {
    setRunningStep(step.id);
    const amt = amounts[step.id];

    setTimeout(() => {
      const result = checkPolicy(step.defaultAction, amt);
      setResults(prev => ({ ...prev, [step.id]: result }));
      setCompletedSteps(prev => [...prev, step.id]);
      setRunningStep(null);

      // If approval_required, fire callback so parent can show in queue
      if (result.verdict === 'approval_required' && onApprovalCreated) {
        onApprovalCreated({
          id: `appr-${Date.now()}`,
          action: step.defaultAction,
          amount: amt,
          recipient: step.defaultRecipient || '',
          reason: result.reason,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      }
    }, 1400);
  };

  const reset = () => {
    setCompletedSteps([]);
    setRunningStep(null);
    setResults({});
    setAmounts({
      1: stepDefs[0].defaultAmount,
      2: stepDefs[1].defaultAmount,
      3: stepDefs[2].defaultAmount,
    });
  };

  const verdictColor = (v: Verdict) =>
    v === 'deny' ? 'red' : v === 'approval_required' ? 'amber' : 'green';

  return (
    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">🎯 Guided Demo</h3>
          <p className="text-sm text-gray-700">See how AgentVault's policy engine protects your assets in real time</p>
        </div>
        {completedSteps.length > 0 && (
          <button onClick={reset} className="flex items-center gap-1 text-sm font-medium text-purple-700 hover:text-purple-800">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      <div className="space-y-4">
        {stepDefs.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isRunning = runningStep === step.id;
          const isLocked = index > 0 && !completedSteps.includes(stepDefs[index - 1].id);
          const result = results[step.id];
          const color = result ? verdictColor(result.verdict) : 'gray';

          return (
            <div
              key={step.id}
              className={`bg-white rounded-xl p-4 transition-all ${
                isRunning ? 'ring-2 ring-purple-500 shadow-lg' :
                isCompleted ? '' :
                isLocked ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Step number / icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? `bg-${color}-100`
                    : 'bg-gray-100'
                }`}
                style={isCompleted ? {
                  backgroundColor: color === 'red' ? '#fee2e2' : color === 'amber' ? '#fef3c7' : '#dcfce7'
                } : {}}
                >
                  {isCompleted ? (
                    result?.verdict === 'deny' ? <XCircle className="w-5 h-5 text-red-700" /> :
                    result?.verdict === 'approval_required' ? <AlertCircle className="w-5 h-5 text-amber-700" /> :
                    <CheckCircle className="w-5 h-5 text-green-700" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">{step.id}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{step.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">{step.description}</p>

                  {/* Action box with editable amount */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Action</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-900 font-mono">{step.defaultAction}</span>
                      <span className="text-gray-400">—</span>
                      {!isCompleted && !isLocked ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={amounts[step.id]}
                            onChange={(e) => setAmounts(prev => ({ ...prev, [step.id]: parseFloat(e.target.value) || 0 }))}
                            className="w-20 px-2 py-1 text-sm font-mono border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                            min={0}
                            step={1}
                          />
                          <span className="text-sm text-gray-700">ℏ</span>
                          {step.defaultRecipient && (
                            <span className="text-xs text-gray-500 ml-1">to {step.defaultRecipient}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900 font-mono">{amounts[step.id]} ℏ to {step.defaultRecipient}</span>
                      )}
                    </div>
                  </div>

                  {/* Result */}
                  {isCompleted && result && (
                    <div
                      className="rounded-lg p-3 border"
                      style={{
                        backgroundColor: color === 'red' ? '#fef2f2' : color === 'amber' ? '#fffbeb' : '#f0fdf4',
                        borderColor: color === 'red' ? '#fecaca' : color === 'amber' ? '#fde68a' : '#bbf7d0',
                      }}
                    >
                      <p
                        className="text-xs font-semibold uppercase tracking-wider mb-1"
                        style={{ color: color === 'red' ? '#991b1b' : color === 'amber' ? '#92400e' : '#166534' }}
                      >
                        {result.verdict.replace('_', ' ')}
                      </p>
                      <p className="text-xs font-mono text-gray-600 mb-1">Rule: {result.rule}</p>
                      <p className="text-xs text-gray-700">{result.reason}</p>
                      {result.verdict === 'approval_required' && (
                        <p className="text-xs text-amber-700 mt-2 font-medium">
                          👆 Check the Approval Queue — a pending approval was created.
                        </p>
                      )}
                      {result.verdict === 'pass' && step.id === 3 && (
                        <p className="text-xs text-green-700 mt-2 font-medium">
                          ✅ Transaction logged to HCS audit trail on Hedera testnet.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Run button */}
                  {!isCompleted && !isLocked && (
                    <button
                      onClick={() => runStep(step)}
                      disabled={isRunning}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      {isRunning ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Run Step
                        </>
                      )}
                    </button>
                  )}
                </div>

                {!isCompleted && !isLocked && !isRunning && (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion */}
      {completedSteps.length === stepDefs.length && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900 mb-1">Demo Complete!</p>
              <p className="text-xs text-green-800">
                You've seen how AgentVault's policy engine <strong>denies</strong> unsafe actions,
                <strong> requires human approval</strong> for high-value transfers, and
                <strong> executes</strong> safe operations — all logged on-chain via HCS.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Policy reference */}
      <div className="mt-4 bg-white/60 rounded-lg p-3 border border-purple-200/50">
        <p className="text-xs font-semibold text-gray-700 mb-2">📋 Active Policy Rules</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>Per-TX Limit: <span className="font-mono font-semibold text-gray-900">{POLICY.perTxLimitHbar} ℏ</span></div>
          <div>Approval Threshold: <span className="font-mono font-semibold text-gray-900">{POLICY.approvalThresholdHbar} ℏ</span></div>
          <div>Daily Limit: <span className="font-mono font-semibold text-gray-900">{POLICY.dailyLimitHbar} ℏ</span></div>
          <div>Allowed Actions: <span className="font-mono font-semibold text-gray-900">{POLICY.allowedActions.length}</span></div>
        </div>
      </div>
    </div>
  );
}
