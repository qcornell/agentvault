import { ExternalLink, Copy, Key, Shield, Image } from 'lucide-react';

export function Identity() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Identity & Vault</h1>
        <p className="text-sm text-gray-600 mt-1">NFT-based identity and vault details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Vault Identity NFT</h2>

            <div className="flex items-start gap-6">
              <div className="w-48 h-48 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Image className="w-20 h-20 text-white opacity-50" />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Token ID</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-900">0.0.1234567</p>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Serial Number</label>
                  <p className="text-sm font-mono text-gray-900">#42</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Collection</label>
                  <p className="text-sm text-gray-900">AgentVault Identity</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Created</label>
                  <p className="text-sm text-gray-900">2024-03-15 12:34:56 UTC</p>
                </div>

                <a
                  href="https://hashscan.io/mainnet/token/0.0.1234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  View on HashScan
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Vault Details</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vault Address</label>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-gray-900">0.0.9876543</p>
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Network</label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-gray-900">Hedera Mainnet</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total Assets</label>
                <p className="text-sm font-semibold text-gray-900">$124,563.42</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Active Since</label>
                <p className="text-sm text-gray-900">March 15, 2024</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total Transactions</label>
                <p className="text-sm text-gray-900">1,429</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Active Strategies</label>
                <p className="text-sm text-gray-900">3</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Token Holdings</h2>

            <div className="space-y-3">
              {[
                { token: 'HBAR', amount: '85,420.50', value: '$8,542.05', change: '+12.5%' },
                { token: 'USDC', amount: '62,145.80', value: '$62,145.80', change: '+0.1%' },
                { token: 'ETH', amount: '15.234', value: '$45,702.00', change: '+8.3%' },
                { token: 'BTC', amount: '0.156', value: '$8,173.57', change: '+15.2%' },
              ].map((holding) => (
                <div key={holding.token} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">{holding.token[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{holding.token}</p>
                      <p className="text-xs text-gray-600">{holding.amount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{holding.value}</p>
                    <p className="text-xs text-green-600">{holding.change}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Security Status</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Policy Engine</p>
                  <p className="text-xs text-green-600">Active</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Multi-Sig</p>
                  <p className="text-xs text-green-600">Enabled (2/3)</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Circuit Breaker</p>
                  <p className="text-xs text-green-600">Armed</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Backup & Recovery</h3>
            <p className="text-sm text-gray-700 mb-4">
              Your vault is protected with secure recovery mechanisms
            </p>
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors">
              View Recovery Options
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
