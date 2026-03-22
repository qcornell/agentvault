import { ExternalLink, Github, FileText, Link2 } from 'lucide-react';

export function ProofPanel() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Verifiable Proof</h3>

      <div className="space-y-3">
        <a
          href="https://hashscan.io/mainnet/transaction/0.0.123456"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Link2 className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Mainnet Transaction</p>
              <p className="text-xs text-gray-600">View on HashScan</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </a>

        <a
          href="https://hashscan.io/mainnet/topic/0.0.789012"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">HCS Topic</p>
              <p className="text-xs text-gray-600">Audit trail consensus</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </a>

        <a
          href="https://github.com/agentvault/protocol"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Github className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Open Source</p>
              <p className="text-xs text-gray-600">View on GitHub</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </a>
      </div>
    </div>
  );
}
