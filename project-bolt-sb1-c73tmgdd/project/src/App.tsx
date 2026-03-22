import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { GuidedDemo } from './components/GuidedDemo';
import { Overview } from './pages/Overview';
import { Approvals } from './pages/Approvals';
import { Policy } from './pages/Policy';
import { AuditTrail } from './pages/AuditTrail';
import { StrategyBuilder } from './pages/StrategyBuilder';
import { Identity } from './pages/Identity';
import { Page } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <Overview />;
      case 'approvals':
        return <Approvals />;
      case 'policy':
        return <Policy />;
      case 'audit':
        return <AuditTrail />;
      case 'strategy':
        return <StrategyBuilder />;
      case 'identity':
        return <Identity />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />

        <main className="flex-1 overflow-auto">
          <div className="max-w-[1600px] mx-auto p-6">
            {showDemo && currentPage === 'overview' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700">For Hackathon Judges</h2>
                  <button
                    onClick={() => setShowDemo(false)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Hide
                  </button>
                </div>
                <GuidedDemo />
              </div>
            )}

            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
