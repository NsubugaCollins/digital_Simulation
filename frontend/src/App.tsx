import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { FactoryDesigner } from './components/FactoryDesigner';
import { ProcessDesigner } from './components/ProcessDesigner';
import { SimulationRunner } from './components/SimulationRunner';
import PredictiveMaintenance from './components/PredictiveMaintenance';
import {
  Activity, Factory, Layers, FlaskConical, LogOut,
  User, ChevronRight, Menu, X, BrainCircuit,
} from 'lucide-react';

type Tab = 'factory' | 'process' | 'simulation' | 'predictive';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType; accent: string }[] = [
  { id: 'factory',    label: 'Factory Designer',        icon: Factory,       accent: 'text-cyan-400' },
  { id: 'process',    label: 'Process Designer',        icon: Layers,        accent: 'text-violet-400' },
  { id: 'simulation', label: 'Simulation & AI',         icon: FlaskConical,  accent: 'text-emerald-400' },
  { id: 'predictive', label: 'Predictive Maintenance',  icon: BrainCircuit,  accent: 'text-amber-400' },
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('factory');
  const [selectedFactory, setSelectedFactory] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('frex_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (_) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('frex_token');
    localStorage.removeItem('frex_user');
    setUser(null);
    setSelectedFactory(null);
  };

  if (!user) {
    return <Auth onAuthSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out z-20`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
          <div className="flex-shrink-0 p-1.5 bg-gradient-to-tr from-cyan-500 to-violet-600 rounded-lg shadow-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-violet-500 whitespace-nowrap">
              FREX-SOS
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-slate-500 hover:text-slate-300 transition"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Factory Context Pill */}
        {sidebarOpen && selectedFactory && (
          <div className="mx-3 mt-4 px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Active Factory</p>
            <p className="text-sm font-semibold text-cyan-300 truncate">{selectedFactory.name}</p>
            {selectedFactory.location && (
              <p className="text-[10px] text-slate-500 truncate">{selectedFactory.location}</p>
            )}
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon, accent }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-800/80 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? accent : ''}`} />
                {sidebarOpen && (
                  <>
                    <span className="text-sm font-medium truncate">{label}</span>
                    {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-500" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="px-3 py-3 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-600 to-violet-700 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{user.username}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                title="Logout"
                className="text-slate-500 hover:text-red-400 transition flex-shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex-shrink-0 bg-slate-900/70 backdrop-blur-sm border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-100">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </h1>
            <p className="text-[11px] text-slate-400">
              FREX-SOS Industrial Digital Twin Platform &nbsp;·&nbsp; v1.0.0
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-semibold">SIM ENGINE ONLINE</span>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {activeTab === 'factory' && (
            <FactoryDesigner
              selectedFactory={selectedFactory}
              onFactorySelected={setSelectedFactory}
            />
          )}
          {activeTab === 'process' && (
            <ProcessDesigner
              selectedFactory={selectedFactory}
              onSelectTab={(tab) => setActiveTab(tab as Tab)}
            />
          )}
          {activeTab === 'simulation' && (
            <SimulationRunner selectedFactory={selectedFactory} />
          )}
          {activeTab === 'predictive' && (
            <PredictiveMaintenance />
          )}
        </main>
      </div>
    </div>
  );
}
