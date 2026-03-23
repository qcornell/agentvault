import { Shield, Plus, Play, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';
import { PolicyRule } from '../types';

const mockPolicies: PolicyRule[] = [
  {
    id: '1',
    name: 'Daily Spending Limit',
    type: 'limit',
    description: 'Restrict daily spending to protect against runaway AI actions',
    enabled: true,
    config: { limit: 5000, period: 'daily', currency: 'USD' },
  },
  {
    id: '2',
    name: 'Token Whitelist',
    type: 'whitelist',
    description: 'Only allow swaps with approved tokens',
    enabled: true,
    config: { tokens: ['HBAR', 'USDC', 'ETH', 'BTC', 'USDT', 'DAI', 'LINK', 'AAVE'] },
  },
  {
    id: '3',
    name: 'Large Transfer Approval',
    type: 'threshold',
    description: 'Require human approval for transfers above threshold',
    enabled: true,
    config: { threshold: 3000, currency: 'USD' },
  },
  {
    id: '4',
    name: 'Trading Hours',
    type: 'schedule',
    description: 'Restrict trading to specific hours',
    enabled: false,
    config: { start: '09:00', end: '17:00', timezone: 'UTC' },
  },
];

export function Policy() {
  const [policies, setPolicies] = useState(mockPolicies);
  const [testResult, setTestResult] = useState<{
    verdict: 'pass' | 'deny' | 'approval_required';
    explanation: string;
  } | null>(null);

  const togglePolicy = (id: string) => {
    setPolicies(policies.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const simulatePolicy = () => {
    setTestResult({
      verdict: 'approval_required',
      explanation: 'Transfer amount ($5,000) exceeds the approval threshold ($3,000). Human approval required.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Policy Engine</h1>
          <p className="text-sm text-gray-600 mt-1">Configure guardrails and safety rules</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus className="w-4 h-4" />
          Add Policy
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {policies.map((policy) => (
            <div key={policy.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    policy.enabled ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Shield className={`w-5 h-5 ${policy.enabled ? 'text-green-700' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{policy.name}</h3>
                    <p className="text-sm text-gray-600">{policy.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => togglePolicy(policy.id)}
                  className="flex-shrink-0"
                  aria-label={policy.enabled ? 'Disable policy' : 'Enable policy'}
                >
                  {policy.enabled ? (
                    <ToggleRight className="w-10 h-10 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Configuration</p>
                <div className="space-y-2">
                  {Object.entries(policy.config).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{key}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {Array.isArray(value) ? `${value.length} items` : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Policy Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Active Policies</span>
                <span className="text-lg font-semibold text-green-700">
                  {policies.filter(p => p.enabled).length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Total Policies</span>
                <span className="text-lg font-semibold text-gray-900">{policies.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Simulate Policy Check</h3>
            <p className="text-sm text-gray-600 mb-4">
              Test how your policies would handle a specific action
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Action Type</label>
                <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <option>Transfer</option>
                  <option>Swap</option>
                  <option>Deploy Strategy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (USD)</label>
                <input
                  type="number"
                  placeholder="5000"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <button
              onClick={simulatePolicy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <Play className="w-4 h-4" />
              Run Simulation
            </button>

            {testResult && (
              <div className={`mt-4 p-4 rounded-lg border ${
                testResult.verdict === 'pass' ? 'bg-green-50 border-green-200' :
                testResult.verdict === 'deny' ? 'bg-red-50 border-red-200' :
                'bg-amber-50 border-amber-200'
              }`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                  testResult.verdict === 'pass' ? 'text-green-800' :
                  testResult.verdict === 'deny' ? 'text-red-800' :
                  'text-amber-800'
                }`}>
                  {testResult.verdict.replace('_', ' ')}
                </p>
                <p className="text-sm text-gray-700">{testResult.explanation}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
