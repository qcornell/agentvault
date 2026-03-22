import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { ProofPanel } from '../components/ProofPanel';
import { Activity } from '../types';

const kpis = [
  { label: 'Vault Balance', value: '$124,563.42', change: '+12.5%', trend: 'up' as const },
  { label: 'Daily Spent', value: '$3,241.18', change: '-8.2%', trend: 'down' as const },
  { label: 'Pending Approvals', value: '3', change: null, trend: null },
  { label: 'Audit Entries', value: '1,429', change: null, trend: null },
];

const recentActivity: Activity[] = [
  {
    id: '1',
    type: 'swap',
    action: 'Swapped 100 HBAR to USDC',
    status: 'success',
    amount: '$24.50',
    timestamp: '2 minutes ago',
    txHash: '0x123...abc',
  },
  {
    id: '2',
    type: 'approval',
    action: 'Transfer request above threshold',
    status: 'pending',
    amount: '$5,000.00',
    timestamp: '15 minutes ago',
  },
  {
    id: '3',
    type: 'policy',
    action: 'Attempted swap to unlisted token',
    status: 'denied',
    timestamp: '1 hour ago',
  },
  {
    id: '4',
    type: 'strategy',
    action: 'DCA Strategy executed',
    status: 'success',
    amount: '$100.00',
    timestamp: '3 hours ago',
    txHash: '0x456...def',
  },
];

const pendingApprovals = [
  {
    id: '1',
    action: 'Transfer 5000 USDC',
    reason: 'Amount exceeds daily limit ($3,000)',
    timestamp: '15 min ago',
  },
  {
    id: '2',
    action: 'Swap 10 ETH to HBAR',
    reason: 'New token pair approval required',
    timestamp: '1 hour ago',
  },
  {
    id: '3',
    action: 'Deploy new strategy',
    reason: 'Strategy approval required',
    timestamp: '2 hours ago',
  },
];

export function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">{kpi.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-semibold text-gray-900">{kpi.value}</p>
              {kpi.change && (
                <div className={`flex items-center gap-1 ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {kpi.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">{kpi.change}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
            </div>

            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      activity.status === 'success' ? 'bg-green-100' :
                      activity.status === 'pending' ? 'bg-amber-100' :
                      activity.status === 'denied' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {activity.status === 'success' ? (
                        <CheckCircle className={`w-5 h-5 text-green-700`} />
                      ) : activity.status === 'pending' ? (
                        <Clock className={`w-5 h-5 text-amber-700`} />
                      ) : (
                        <AlertCircle className={`w-5 h-5 text-red-700`} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-600">{activity.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.amount && (
                      <p className="text-sm font-semibold text-gray-900">{activity.amount}</p>
                    )}
                    {activity.txHash && (
                      <a href="#" className="text-xs text-blue-600 hover:text-blue-700">View TX</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Policy Status</h3>
                <p className="text-sm text-gray-700 mb-4">All guardrails active. 5 policies enabled.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Daily Limit</p>
                    <p className="text-sm font-semibold text-gray-900">$3,000 / $5,000</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Whitelisted Tokens</p>
                    <p className="text-sm font-semibold text-gray-900">8 tokens</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <ProofPanel />

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Pending Approvals</h3>
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                {pendingApprovals.length}
              </span>
            </div>

            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">{approval.action}</p>
                  <p className="text-xs text-gray-600 mb-2">{approval.reason}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{approval.timestamp}</span>
                    <button className="text-xs font-medium text-blue-600 hover:text-blue-700">Review</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
