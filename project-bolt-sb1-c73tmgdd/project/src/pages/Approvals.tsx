import { Check, X, Clock, Filter } from 'lucide-react';
import { Approval } from '../types';
import { useState } from 'react';

const mockApprovals: Approval[] = [
  {
    id: '1',
    action: 'Transfer USDC',
    amount: '5,000.00',
    token: 'USDC',
    reason: 'Amount exceeds daily limit ($3,000)',
    status: 'pending',
    createdAt: '2024-03-22 14:30:00',
    requestedBy: 'Agent #1247',
  },
  {
    id: '2',
    action: 'Swap ETH to HBAR',
    amount: '10.00',
    token: 'ETH',
    reason: 'New token pair approval required',
    status: 'pending',
    createdAt: '2024-03-22 13:15:00',
    requestedBy: 'Agent #1247',
  },
  {
    id: '3',
    action: 'Deploy Strategy',
    amount: '1,000.00',
    token: 'USDC',
    reason: 'New strategy requires approval',
    status: 'pending',
    createdAt: '2024-03-22 12:00:00',
    requestedBy: 'Agent #1247',
  },
  {
    id: '4',
    action: 'Transfer HBAR',
    amount: '2,500.00',
    token: 'HBAR',
    reason: 'Manual approval requested',
    status: 'approved',
    createdAt: '2024-03-22 10:30:00',
    requestedBy: 'Agent #1247',
  },
  {
    id: '5',
    action: 'Swap to Unknown Token',
    amount: '500.00',
    token: 'UNKNOWN',
    reason: 'Token not in whitelist',
    status: 'denied',
    createdAt: '2024-03-22 09:15:00',
    requestedBy: 'Agent #1247',
  },
];

export function Approvals() {
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');

  const filteredApprovals = filter === 'all'
    ? mockApprovals
    : mockApprovals.filter(a => a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-600 mt-1">Review and manage approval requests</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === 'pending' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === 'approved' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('denied')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === 'denied' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Denied
            </button>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredApprovals.map((approval) => (
                <tr key={approval.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{approval.action}</p>
                      <p className="text-xs text-gray-600">{approval.requestedBy}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">${approval.amount}</p>
                    <p className="text-xs text-gray-600">{approval.token}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{approval.reason}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      approval.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      approval.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {approval.status === 'pending' && <Clock className="w-3 h-3" />}
                      {approval.status === 'approved' && <Check className="w-3 h-3" />}
                      {approval.status === 'denied' && <X className="w-3 h-3" />}
                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{approval.createdAt}</p>
                  </td>
                  <td className="px-6 py-4">
                    {approval.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedApproval(approval)}
                          className="p-1.5 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4 text-green-700" />
                        </button>
                        <button
                          onClick={() => setSelectedApproval(approval)}
                          className="p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                          title="Deny"
                        >
                          <X className="w-4 h-4 text-red-700" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Action</h3>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to process this approval request?
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 mb-2">{selectedApproval.action}</p>
              <p className="text-xs text-gray-600">{selectedApproval.reason}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedApproval(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors">
                Approve
              </button>
              <button className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium text-white transition-colors">
                Deny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
