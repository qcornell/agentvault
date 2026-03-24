import { ExternalLink, CheckCircle, XCircle, AlertCircle, Filter, Download } from 'lucide-react';
import { AuditEntry } from '../types';

const mockAuditEntries: AuditEntry[] = [
  {
    id: '1',
    timestamp: '2024-03-22 14:30:15',
    action: 'TRANSFER_USDC',
    actor: 'Agent #1247',
    verdict: 'approval_required',
    details: 'Transfer of 5000 USDC exceeds daily limit',
    hcsTopicId: '0.0.789012',
    txHash: '0x123abc...',
  },
  {
    id: '2',
    timestamp: '2024-03-22 14:28:42',
    action: 'SWAP_HBAR_TO_USDC',
    actor: 'Agent #1247',
    verdict: 'pass',
    details: 'Swap of 100 HBAR to USDC within limits',
    hcsTopicId: '0.0.789012',
    txHash: '0x456def...',
  },
  {
    id: '3',
    timestamp: '2024-03-22 14:25:10',
    action: 'SWAP_TO_UNLISTED_TOKEN',
    actor: 'Agent #1247',
    verdict: 'deny',
    details: 'Attempted swap to token not in whitelist',
    hcsTopicId: '0.0.789012',
  },
  {
    id: '4',
    timestamp: '2024-03-22 14:20:05',
    action: 'STRATEGY_EXECUTE',
    actor: 'Strategy: Safe DCA',
    verdict: 'pass',
    details: 'DCA strategy executed successfully',
    hcsTopicId: '0.0.789012',
    txHash: '0x789ghi...',
  },
  {
    id: '5',
    timestamp: '2024-03-22 14:15:30',
    action: 'POLICY_UPDATE',
    actor: 'Admin',
    verdict: 'pass',
    details: 'Updated daily spending limit to $5000',
    hcsTopicId: '0.0.789012',
  },
];

export function AuditTrail() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-600 mt-1">Immutable on-chain activity log via HCS</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">1,429</p>
              <p className="text-sm text-gray-600">Total Entries</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">42</p>
              <p className="text-sm text-gray-600">Approvals Required</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">18</p>
              <p className="text-sm text-gray-600">Denied Actions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Verdict</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockAuditEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 font-mono">{entry.timestamp}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{entry.actor}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      entry.verdict === 'pass' ? 'bg-green-100 text-green-800' :
                      entry.verdict === 'deny' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {entry.verdict === 'pass' && <CheckCircle className="w-3 h-3" />}
                      {entry.verdict === 'deny' && <XCircle className="w-3 h-3" />}
                      {entry.verdict === 'approval_required' && <AlertCircle className="w-3 h-3" />}
                      {entry.verdict.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{entry.details}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://hashscan.io/mainnet/topic/${entry.hcsTopicId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      >
                        HCS
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {entry.txHash && (
                        <>
                          <span className="text-gray-300">|</span>
                          <a
                            href={`https://hashscan.io/mainnet/transaction/${entry.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                          >
                            TX
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
