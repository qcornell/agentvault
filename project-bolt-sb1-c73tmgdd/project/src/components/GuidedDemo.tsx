import { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';

interface DemoStep {
  id: number;
  title: string;
  description: string;
  action: string;
  result: 'denied' | 'approval_required' | 'success';
  explanation: string;
}

const demoSteps: DemoStep[] = [
  {
    id: 1,
    title: 'Step 1: Denied Action',
    description: 'Attempt to swap to an unlisted token',
    action: 'Swap 100 USDC to RANDOM_TOKEN',
    result: 'denied',
    explanation: 'Action denied: RANDOM_TOKEN is not in the whitelist. Policy prevents swaps to unlisted tokens.',
  },
  {
    id: 2,
    title: 'Step 2: Approval Required',
    description: 'Transfer above threshold',
    action: 'Transfer 5000 USDC',
    result: 'approval_required',
    explanation: 'Approval required: Transfer amount ($5,000) exceeds the approval threshold ($3,000).',
  },
  {
    id: 3,
    title: 'Step 3: Safe Action',
    description: 'Execute within limits',
    action: 'Swap 100 USDC to HBAR',
    result: 'success',
    explanation: 'Action executed: Swap is within policy limits and token is whitelisted. Transaction completed.',
  },
];

export function GuidedDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const runStep = (stepId: number) => {
    setIsRunning(true);
    setCurrentStep(stepId);
    setTimeout(() => {
      setCompletedSteps([...completedSteps, stepId]);
      setIsRunning(false);
    }, 1500);
  };

  const reset = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setIsRunning(false);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Guided Demo</h3>
          <p className="text-sm text-gray-700">See how AgentVault protects your assets</p>
        </div>
        {completedSteps.length > 0 && (
          <button
            onClick={reset}
            className="text-sm font-medium text-purple-700 hover:text-purple-800"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-4">
        {demoSteps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isActive = currentStep === step.id;
          const isLocked = index > 0 && !completedSteps.includes(demoSteps[index - 1].id);

          return (
            <div
              key={step.id}
              className={`bg-white rounded-xl p-4 transition-all ${
                isActive ? 'ring-2 ring-purple-500 shadow-lg' :
                isCompleted ? 'opacity-75' :
                isLocked ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? step.result === 'denied' ? 'bg-red-100' :
                      step.result === 'approval_required' ? 'bg-amber-100' :
                      'bg-green-100'
                    : 'bg-gray-100'
                }`}>
                  {isCompleted ? (
                    step.result === 'denied' ? (
                      <XCircle className="w-5 h-5 text-red-700" />
                    ) : step.result === 'approval_required' ? (
                      <AlertCircle className="w-5 h-5 text-amber-700" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-700" />
                    )
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">{step.id}</span>
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{step.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">{step.description}</p>

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Action:</p>
                    <p className="text-sm text-gray-900 font-mono">{step.action}</p>
                  </div>

                  {isCompleted && (
                    <div className={`rounded-lg p-3 border ${
                      step.result === 'denied' ? 'bg-red-50 border-red-200' :
                      step.result === 'approval_required' ? 'bg-amber-50 border-amber-200' :
                      'bg-green-50 border-green-200'
                    }`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                        step.result === 'denied' ? 'text-red-800' :
                        step.result === 'approval_required' ? 'text-amber-800' :
                        'text-green-800'
                      }`}>
                        {step.result.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-700">{step.explanation}</p>
                    </div>
                  )}

                  {!isCompleted && !isLocked && (
                    <button
                      onClick={() => runStep(step.id)}
                      disabled={isRunning}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      {isRunning && isActive ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Run Step
                        </>
                      )}
                    </button>
                  )}
                </div>

                {!isCompleted && !isLocked && (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {completedSteps.length === demoSteps.length && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900 mb-1">Demo Complete!</p>
              <p className="text-xs text-green-800">
                You've seen how AgentVault's policy engine protects against unauthorized actions while allowing safe operations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
