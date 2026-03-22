import { useState, useEffect } from 'react';
import { ArrowDownUp, Zap, Shield, ExternalLink, Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

// ─── API base (dashboard server) ───
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3099';

interface Token {
  symbol: string;
  id: string;
  decimals: number;
  name: string;
}

const DEFAULT_TOKENS: Token[] = [
  { symbol: 'SAUCE', id: '0.0.731861', decimals: 6, name: 'SaucerSwap' },
  { symbol: 'USDC', id: '0.0.456858', decimals: 6, name: 'USD Coin' },
  { symbol: 'KARATE', id: '0.0.1463958', decimals: 8, name: 'Karate Combat' },
  { symbol: 'HST', id: '0.0.1460784', decimals: 8, name: 'HeadStarter' },
];

// Policy limits (matches vault config)
const POLICY = {
  perTxLimit: 50,
  approvalThreshold: 25,
  dailyLimit: 100,
};

type SwapState = 'idle' | 'checking' | 'swapping' | 'success' | 'denied' | 'error';

interface SwapResult {
  ok: boolean;
  txId?: string;
  summary?: string;
  error?: string;
  data?: {
    amountInHbar?: number;
    amountOut?: number;
    tokenSymbol?: string;
    tokenId?: string;
    hashScanUrl?: string;
    gasUsed?: number;
    txId?: string;
  };
  policyCheck?: { verdict: string; rule: string; reason: string };
}

export function Swap() {
  const [amount, setAmount] = useState('0.5');
  const [selectedToken, setSelectedToken] = useState('SAUCE');
  const [tokens] = useState<Token[]>(DEFAULT_TOKENS);
  const [swapState, setSwapState] = useState<SwapState>('idle');
  const [result, setResult] = useState<SwapResult | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [history, setHistory] = useState<SwapResult[]>([]);

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/balance`);
      const data = await res.json();
      if (data.ok && data.data?.hbarBalance) {
        setBalance(data.data.hbarBalance);
      }
    } catch {
      // Backend might be offline
    }
  };

  const selectedTokenInfo = tokens.find(t => t.symbol === selectedToken);
  const amountNum = parseFloat(amount) || 0;

  // Pre-check: what will the policy engine say?
  const getPolicyPreview = () => {
    if (amountNum <= 0) return null;
    if (amountNum > POLICY.perTxLimit) return { verdict: 'deny', text: `Exceeds ${POLICY.perTxLimit} ℏ per-TX limit` };
    if (amountNum > POLICY.approvalThreshold) return { verdict: 'approval', text: `Above ${POLICY.approvalThreshold} ℏ — needs approval` };
    return { verdict: 'pass', text: 'Within policy limits' };
  };

  const policyPreview = getPolicyPreview();

  const executeSwap = async () => {
    if (amountNum <= 0) return;
    
    setSwapState('checking');
    setResult(null);

    // Small delay to show "checking policy" state
    await new Promise(r => setTimeout(r, 800));

    if (amountNum > POLICY.perTxLimit) {
      setSwapState('denied');
      setResult({
        ok: false,
        error: `Policy DENIED: ${amountNum} ℏ exceeds per-transaction limit of ${POLICY.perTxLimit} ℏ`,
        policyCheck: { verdict: 'DENY', rule: 'PER_TX_LIMIT', reason: `Amount ${amountNum} ℏ exceeds limit of ${POLICY.perTxLimit} ℏ` }
      });
      return;
    }

    setSwapState('swapping');

    try {
      const res = await fetch(`${API_BASE}/api/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toToken: selectedToken, amountHbar: amountNum }),
      });
      const data = await res.json();
      setResult(data);
      
      if (data.ok) {
        setSwapState('success');
        setHistory(prev => [data, ...prev].slice(0, 10));
        fetchBalance(); // Refresh balance
      } else {
        setSwapState('error');
      }
    } catch (err) {
      setSwapState('error');
      setResult({ ok: false, error: 'Failed to connect to AgentVault backend. Make sure the dashboard server is running.' });
    }
  };

  const reset = () => {
    setSwapState('idle');
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Swap Tokens</h1>
        <p className="text-sm text-gray-600 mt-1">
          Swap HBAR for tokens on SaucerSwap V2 — protected by AgentVault's policy engine
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main swap card */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Swap header with SaucerSwap branding */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <ArrowDownUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">SaucerSwap V2</h2>
                    <p className="text-blue-100 text-xs">Live mainnet swaps on Hedera</p>
                  </div>
                </div>
                {balance && (
                  <div className="text-right">
                    <p className="text-blue-100 text-xs">Available Balance</p>
                    <p className="text-white font-semibold">{balance} ℏ</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              {/* From */}
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-500 mb-2">You Pay</label>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); reset(); }}
                      placeholder="0.0"
                      step="0.1"
                      min="0"
                      className="flex-1 bg-transparent text-3xl font-semibold text-gray-900 outline-none placeholder-gray-300"
                      disabled={swapState === 'swapping' || swapState === 'checking'}
                    />
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                      <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">ℏ</span>
                      </div>
                      <span className="font-semibold text-gray-900">HBAR</span>
                    </div>
                  </div>
                  {/* Quick amounts */}
                  <div className="flex gap-2 mt-3">
                    {[0.5, 1, 5, 10, 25].map(v => (
                      <button
                        key={v}
                        onClick={() => { setAmount(String(v)); reset(); }}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          amount === String(v) 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {v} ℏ
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center my-1">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                  <ArrowDownUp className="w-4 h-4 text-gray-500" />
                </div>
              </div>

              {/* To */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">You Receive</label>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-3xl font-semibold text-gray-300">
                        {result?.ok ? result.data?.amountOut?.toLocaleString() : '—'}
                      </p>
                    </div>
                    <select
                      value={selectedToken}
                      onChange={(e) => { setSelectedToken(e.target.value); reset(); }}
                      className="bg-white px-4 py-2 rounded-lg border border-gray-200 font-semibold text-gray-900 outline-none cursor-pointer"
                      disabled={swapState === 'swapping' || swapState === 'checking'}
                    >
                      {tokens.map(t => (
                        <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                      ))}
                    </select>
                  </div>
                  {selectedTokenInfo && (
                    <p className="text-xs text-gray-500 mt-2">{selectedTokenInfo.name} · {selectedTokenInfo.id}</p>
                  )}
                </div>
              </div>

              {/* Policy preview */}
              {policyPreview && amountNum > 0 && swapState === 'idle' && (
                <div className={`rounded-lg p-3 mb-4 flex items-center gap-2 text-sm ${
                  policyPreview.verdict === 'pass' ? 'bg-green-50 text-green-700 border border-green-200' :
                  policyPreview.verdict === 'deny' ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>{policyPreview.text}</span>
                </div>
              )}

              {/* Swap button */}
              {(swapState === 'idle' || swapState === 'denied') && (
                <button
                  onClick={executeSwap}
                  disabled={amountNum <= 0}
                  className={`w-full py-4 rounded-xl text-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    amountNum > 0
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-200'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  {amountNum > POLICY.perTxLimit ? 'Policy Will Deny' : 'Swap Now'}
                </button>
              )}

              {/* Loading states */}
              {swapState === 'checking' && (
                <div className="w-full py-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center gap-3">
                  <Shield className="w-5 h-5 text-blue-600 animate-pulse" />
                  <span className="text-blue-700 font-semibold">Checking policy engine...</span>
                </div>
              )}

              {swapState === 'swapping' && (
                <div className="w-full py-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  <span className="text-indigo-700 font-semibold">Executing on SaucerSwap V2...</span>
                </div>
              )}

              {/* Result */}
              {result && (swapState === 'success' || swapState === 'error' || swapState === 'denied') && (
                <div className={`rounded-xl p-4 mt-4 border ${
                  swapState === 'success' ? 'bg-green-50 border-green-200' :
                  swapState === 'denied' ? 'bg-red-50 border-red-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {swapState === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {swapState === 'success' && result.ok && (
                        <>
                          <p className="font-semibold text-green-900">Swap Executed!</p>
                          <p className="text-sm text-green-700 mt-1">
                            Swapped {result.data?.amountInHbar} HBAR → {result.data?.amountOut?.toLocaleString()} {result.data?.tokenSymbol}
                          </p>
                          {result.data?.hashScanUrl && (
                            <a
                              href={result.data.hashScanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-green-700 hover:text-green-800 underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Verify on HashScan →
                            </a>
                          )}
                          {result.data?.gasUsed && (
                            <p className="text-xs text-green-600 mt-1">Gas used: {result.data.gasUsed.toLocaleString()}</p>
                          )}
                        </>
                      )}
                      {(swapState === 'error' || swapState === 'denied') && (
                        <>
                          <p className="font-semibold text-red-900">
                            {swapState === 'denied' ? 'Policy Denied' : 'Swap Failed'}
                          </p>
                          <p className="text-sm text-red-700 mt-1">{result.error}</p>
                          {result.policyCheck && (
                            <p className="text-xs font-mono text-red-600 mt-1">
                              Rule: {result.policyCheck.rule}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="mt-3 text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> New Swap
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Protection badge */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Protected by AgentVault</h3>
                <p className="text-xs text-gray-500">Every swap is policy-checked</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-600">Per-TX Limit</span>
                <span className="text-sm font-semibold text-gray-900">{POLICY.perTxLimit} ℏ</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-600">Approval Threshold</span>
                <span className="text-sm font-semibold text-gray-900">{POLICY.approvalThreshold} ℏ</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-600">Daily Limit</span>
                <span className="text-sm font-semibold text-gray-900">{POLICY.dailyLimit} ℏ</span>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">How It Works</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">1</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Policy Check</p>
                  <p className="text-xs text-gray-500">Vault checks amount against 5 safety rules</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">2</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Execute on SaucerSwap</p>
                  <p className="text-xs text-gray-500">Multicall: exactInput + refundETH on V2 Router</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-700">3</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Audit on HCS</p>
                  <p className="text-xs text-gray-500">Transaction logged immutably to Hedera Consensus</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent swaps */}
          {history.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Swaps</h3>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg border border-green-100">
                    <div>
                      <p className="text-xs font-medium text-gray-900">
                        {h.data?.amountInHbar} ℏ → {h.data?.amountOut?.toLocaleString()} {h.data?.tokenSymbol}
                      </p>
                    </div>
                    {h.data?.hashScanUrl && (
                      <a href={h.data.hashScanUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 text-green-600" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Powered by */}
          <div className="text-center py-3">
            <p className="text-xs text-gray-400">
              Powered by <span className="font-semibold">SaucerSwap V2</span> on <span className="font-semibold">Hedera</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
