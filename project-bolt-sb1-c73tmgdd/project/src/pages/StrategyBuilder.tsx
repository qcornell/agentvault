import { useState } from 'react';
import {
  Clock,
  TrendingUp,
  Repeat,
  ArrowRight,
  Settings,
  Save,
  Play,
  Rocket,
  Plus,
  X,
  Check,
  AlertTriangle,
  Zap,
  Target,
  Shield,
  GitBranch,
} from 'lucide-react';

interface Block {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  category: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface StrategyBlock extends Block {
  config: Record<string, string | number | boolean>;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'enabled' | 'paused' | 'limit_reached' | 'circuit_breaker';
  blocks: StrategyBlock[];
}

const blockLibrary: Block[] = [
  { id: 'schedule-trigger', type: 'trigger', category: 'Triggers', label: 'Schedule', icon: Clock, description: 'Run on a schedule' },
  { id: 'price-trigger', type: 'trigger', category: 'Triggers', label: 'Price Alert', icon: TrendingUp, description: 'Trigger on price change' },
  { id: 'event-trigger', type: 'trigger', category: 'Triggers', label: 'Event', icon: Zap, description: 'Trigger on chain event' },
  { id: 'if-price', type: 'condition', category: 'Conditions', label: 'If Price', icon: Target, description: 'Check token price' },
  { id: 'if-balance', type: 'condition', category: 'Conditions', label: 'If Balance', icon: Shield, description: 'Check wallet balance' },
  { id: 'if-threshold', type: 'condition', category: 'Conditions', label: 'If Threshold', icon: GitBranch, description: 'Compare values' },
  { id: 'swap-action', type: 'action', category: 'Actions', label: 'Swap Tokens', icon: Repeat, description: 'Execute token swap' },
  { id: 'transfer-action', type: 'action', category: 'Actions', label: 'Transfer', icon: ArrowRight, description: 'Transfer tokens' },
];

const demoStrategy: Strategy = {
  id: 'demo-dca',
  name: 'Safe DCA Strategy',
  description: 'Dollar-cost averaging into HBAR with safety limits',
  status: 'enabled',
  blocks: [
    {
      id: 'trigger-1',
      type: 'trigger',
      category: 'Triggers',
      label: 'Schedule',
      icon: Clock,
      description: 'Run on a schedule',
      config: { frequency: 'daily', time: '09:00', timezone: 'UTC' },
    },
    {
      id: 'condition-1',
      type: 'condition',
      category: 'Conditions',
      label: 'If Balance',
      icon: Shield,
      description: 'Check wallet balance',
      config: { token: 'USDC', operator: '>', amount: 100 },
    },
    {
      id: 'action-1',
      type: 'action',
      category: 'Actions',
      label: 'Swap Tokens',
      icon: Repeat,
      description: 'Execute token swap',
      config: { fromToken: 'USDC', toToken: 'HBAR', amount: 100, slippage: 1 },
    },
  ],
};

export function StrategyBuilder() {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(demoStrategy);
  const [selectedBlock, setSelectedBlock] = useState<StrategyBlock | null>(null);
  const [testResult, setTestResult] = useState<{ verdict: string; explanation: string } | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);

  const addBlock = (block: Block) => {
    const newBlock: StrategyBlock = {
      ...block,
      id: `${block.id}-${Date.now()}`,
      config: {},
    };
    setSelectedStrategy({
      ...selectedStrategy,
      blocks: [...selectedStrategy.blocks, newBlock],
    });
    setSelectedBlock(newBlock);
  };

  const removeBlock = (blockId: string) => {
    setSelectedStrategy({
      ...selectedStrategy,
      blocks: selectedStrategy.blocks.filter(b => b.id !== blockId),
    });
    if (selectedBlock?.id === blockId) {
      setSelectedBlock(null);
    }
  };

  const updateBlockConfig = (key: string, value: string | number | boolean) => {
    if (!selectedBlock) return;

    const updatedBlock = {
      ...selectedBlock,
      config: { ...selectedBlock.config, [key]: value },
    };

    setSelectedBlock(updatedBlock);
    setSelectedStrategy({
      ...selectedStrategy,
      blocks: selectedStrategy.blocks.map(b => b.id === selectedBlock.id ? updatedBlock : b),
    });
  };

  const testStrategy = () => {
    setTestResult({
      verdict: 'PASS',
      explanation: 'Strategy configuration is valid. All blocks are properly configured and within policy limits. Safe to deploy.',
    });
  };

  const getStatusColor = (status: Strategy['status']) => {
    switch (status) {
      case 'enabled': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'limit_reached': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'circuit_breaker': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <div className={`bg-white border border-gray-200 rounded-xl flex flex-col transition-all ${showTemplates ? 'w-80' : 'w-16'}`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {showTemplates && <h3 className="font-semibold text-gray-900">Blocks</h3>}
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showTemplates ? <X className="w-4 h-4 text-gray-600" /> : <Plus className="w-4 h-4 text-gray-600" />}
          </button>
        </div>

        {showTemplates && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {['Triggers', 'Conditions', 'Actions'].map((category) => (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">{category}</p>
                <div className="space-y-2">
                  {blockLibrary.filter(b => b.category === category).map((block) => {
                    const Icon = block.icon;
                    return (
                      <button
                        key={block.id}
                        onClick={() => addBlock(block)}
                        className="w-full flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                          <Icon className="w-4 h-4 text-gray-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{block.label}</p>
                          <p className="text-xs text-gray-600 line-clamp-1">{block.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Templates</p>
              <button
                onClick={() => setSelectedStrategy(demoStrategy)}
                className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <p className="text-sm font-medium text-blue-900">Safe DCA</p>
                <p className="text-xs text-blue-700">Guided demo strategy</p>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={selectedStrategy.name}
                onChange={(e) => setSelectedStrategy({ ...selectedStrategy, name: e.target.value })}
                className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none w-full mb-1"
              />
              <input
                type="text"
                value={selectedStrategy.description}
                onChange={(e) => setSelectedStrategy({ ...selectedStrategy, description: e.target.value })}
                className="text-sm text-gray-600 bg-transparent border-none outline-none w-full"
              />
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(selectedStrategy.status)}`}>
              {selectedStrategy.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={testStrategy}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-medium text-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Test Strategy
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white transition-colors">
              <Rocket className="w-4 h-4" />
              Deploy
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedStrategy.blocks.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <GitBranch className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Build Your Strategy</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add blocks from the left panel to create your automated strategy flow
                </p>
                <button
                  onClick={() => setSelectedStrategy(demoStrategy)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  Load Demo Strategy
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedStrategy.blocks.map((block, index) => {
                const Icon = block.icon;
                const isSelected = selectedBlock?.id === block.id;
                return (
                  <div key={block.id}>
                    <button
                      onClick={() => setSelectedBlock(block)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        block.type === 'trigger' ? 'bg-purple-100' :
                        block.type === 'condition' ? 'bg-amber-100' :
                        'bg-green-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          block.type === 'trigger' ? 'text-purple-700' :
                          block.type === 'condition' ? 'text-amber-700' :
                          'text-green-700'
                        }`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold uppercase tracking-wider ${
                            block.type === 'trigger' ? 'text-purple-700' :
                            block.type === 'condition' ? 'text-amber-700' :
                            'text-green-700'
                          }`}>
                            {block.type}
                          </span>
                          {block.type === 'condition' && (
                            <span className="text-xs font-semibold text-gray-500">IF/THEN</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{block.label}</p>
                        <p className="text-xs text-gray-600">{block.description}</p>
                        {Object.keys(block.config).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(block.config).map(([key, value]) => (
                              <span key={key} className="px-2 py-1 bg-white rounded text-xs text-gray-700">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBlock(block.id);
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </button>
                    {index < selectedStrategy.blocks.length - 1 && (
                      <div className="flex justify-center py-2">
                        <div className="w-0.5 h-8 bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {testResult && (
            <div className={`mt-6 p-4 rounded-xl border-2 ${
              testResult.verdict === 'PASS' ? 'bg-green-50 border-green-500' :
              testResult.verdict === 'DENY' ? 'bg-red-50 border-red-500' :
              'bg-amber-50 border-amber-500'
            }`}>
              <div className="flex items-start gap-3">
                {testResult.verdict === 'PASS' ? (
                  <Check className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-semibold mb-1 ${
                    testResult.verdict === 'PASS' ? 'text-green-900' :
                    testResult.verdict === 'DENY' ? 'text-red-900' :
                    'text-amber-900'
                  }`}>
                    {testResult.verdict}
                  </p>
                  <p className="text-sm text-gray-700">{testResult.explanation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedBlock && (
        <div className="w-80 bg-white border border-gray-200 rounded-xl flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Configuration</h3>
            <button
              onClick={() => setSelectedBlock(null)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">{selectedBlock.label}</p>
              <p className="text-xs text-gray-600">{selectedBlock.description}</p>
            </div>

            {selectedBlock.type === 'trigger' && selectedBlock.label === 'Schedule' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Frequency</label>
                  <select
                    value={String(selectedBlock.config.frequency || 'daily')}
                    onChange={(e) => updateBlockConfig('frequency', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Time (UTC)</label>
                  <input
                    type="time"
                    value={String(selectedBlock.config.time || '09:00')}
                    onChange={(e) => updateBlockConfig('time', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </>
            )}

            {selectedBlock.type === 'condition' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Token</label>
                  <select
                    value={String(selectedBlock.config.token || 'USDC')}
                    onChange={(e) => updateBlockConfig('token', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option>USDC</option>
                    <option>HBAR</option>
                    <option>ETH</option>
                    <option>BTC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Operator</label>
                  <select
                    value={String(selectedBlock.config.operator || '>')}
                    onChange={(e) => updateBlockConfig('operator', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option>&gt;</option>
                    <option>&lt;</option>
                    <option>=</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={Number(selectedBlock.config.amount || 100)}
                    onChange={(e) => updateBlockConfig('amount', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </>
            )}

            {selectedBlock.type === 'action' && selectedBlock.label === 'Swap Tokens' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">From Token</label>
                  <select
                    value={String(selectedBlock.config.fromToken || 'USDC')}
                    onChange={(e) => updateBlockConfig('fromToken', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option>USDC</option>
                    <option>HBAR</option>
                    <option>ETH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">To Token</label>
                  <select
                    value={String(selectedBlock.config.toToken || 'HBAR')}
                    onChange={(e) => updateBlockConfig('toToken', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option>HBAR</option>
                    <option>USDC</option>
                    <option>ETH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={Number(selectedBlock.config.amount || 100)}
                    onChange={(e) => updateBlockConfig('amount', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Slippage Tolerance (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={Number(selectedBlock.config.slippage || 1)}
                    onChange={(e) => updateBlockConfig('slippage', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </>
            )}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Policy Check</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-900">Configuration is within policy limits</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
