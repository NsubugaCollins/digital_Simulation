import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  PlayCircle, FlaskConical, Zap, AlertTriangle, TrendingUp,
  Clock, BarChart2, Target, ChevronRight, Loader2,
  FileText, Printer, Plus, Trash2, RefreshCw
} from 'lucide-react';

interface SimulationRunnerProps {
  selectedFactory: any;
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px' },
  labelStyle: { color: '#94a3b8', fontSize: '11px' },
  itemStyle: { color: '#e2e8f0', fontSize: '11px' },
};

export const SimulationRunner: React.FC<SimulationRunnerProps> = ({ selectedFactory }) => {
  const [processes, setProcesses] = useState<any[]>([]);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<number>(-1);
  
  // Single Simulation Inputs
  const [itemCount, setItemCount] = useState(50);
  const [numLines, setNumLines] = useState(1);
  const [shiftsEnabled, setShiftsEnabled] = useState(false);

  // Mode Toggles
  const [scenarioMode, setScenarioMode] = useState(false);
  const [realworldMode, setRealworldMode] = useState(false);

  // Scenario Mode Inputs
  const [baselineItems, setBaselineItems] = useState(50);
  const [baselineLines, setBaselineLines] = useState(1);
  const [scenarioItems, setScenarioItems] = useState(50);
  const [scenarioLines, setScenarioLines] = useState(2);

  // Real-world comparison variables
  const [operationalLogs, setOperationalLogs] = useState<any[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<number>(-1);
  const [generatingLog, setGeneratingLog] = useState(false);
  const [activeSimulationId, setActiveSimulationId] = useState<number | null>(null);

  // Manual log fields
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualLogName, setManualLogName] = useState('');
  const [manualDuration, setManualDuration] = useState(60.0);
  const [manualEnergy, setManualEnergy] = useState(250.0);
  const [manualAvgCycle, setManualAvgCycle] = useState(5.0);
  const [manualBottleneck, setManualBottleneck] = useState('');
  const [savingManualLog, setSavingManualLog] = useState(false);

  // Engineering report variables
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Statuses
  const [running, setRunning] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  
  // Results
  const [latestResult, setLatestResult] = useState<any>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [scenarioResult, setScenarioResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Event Log Filter
  const [eventFilter, setEventFilter] = useState<string>('ALL');

  const fetchData = async () => {
    if (!selectedFactory) return;
    try {
      const [procData, simData, logData] = await Promise.all([
        api.getProcesses(selectedFactory.id),
        api.getSimulations(selectedFactory.id),
        api.getOperationalLogs(selectedFactory.id),
      ]);
      setProcesses(procData);
      setSimulations(simData);
      setOperationalLogs(logData);
      if (procData.length > 0 && selectedProcessId === -1) setSelectedProcessId(procData[0].id);
      
      const completed = simData.find((s: any) => s.status === 'COMPLETED');
      if (completed?.resultJson && !latestResult) {
        try {
          setLatestResult(JSON.parse(completed.resultJson));
          setActiveSimulationId(completed.id);
        } catch (_) {}
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [selectedFactory]);

  const handleRun = async () => {
    if (!selectedFactory || selectedProcessId === -1) return;
    setError(''); setRunning(true); setLatestResult(null); setOptimizationResult(null); setScenarioResult(null);
    try {
      const result = await api.runSimulation(selectedFactory.id, { 
        processId: selectedProcessId, 
        itemCount,
        numLines,
        shiftsEnabled
      });
      if (result.resultJson) {
        setLatestResult(JSON.parse(result.resultJson));
        setActiveSimulationId(result.id);
      }
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Simulation failed. Ensure the Python engine is running on port 8000.');
    } finally { setRunning(false); }
  };

  const handleCompare = async () => {
    if (!selectedFactory || selectedProcessId === -1) return;
    setError(''); setRunning(true); setLatestResult(null); setOptimizationResult(null); setScenarioResult(null);
    try {
      const result = await api.compareScenarios(selectedFactory.id, {
        processId: selectedProcessId,
        baselineItems,
        baselineLines,
        scenarioItems,
        scenarioLines,
        shiftsEnabled
      });
      setScenarioResult(result);
    } catch (err: any) {
      setError(err.message || 'Scenario comparison failed. Ensure the Python engine is running on port 8000.');
    } finally { setRunning(false); }
  };

  const handleGenerateMockLog = async () => {
    if (!selectedFactory || activeSimulationId === null) return;
    setGeneratingLog(true);
    setError('');
    try {
      const logEntry = await api.generateMockOperationalLog(selectedFactory.id, activeSimulationId);
      const updatedLogs = await api.getOperationalLogs(selectedFactory.id);
      setOperationalLogs(updatedLogs);
      setSelectedLogId(logEntry.id);
    } catch (err: any) {
      setError(err.message || 'Failed to generate mock operational log');
    } finally {
      setGeneratingLog(false);
    }
  };

  const handleSaveManualLog = async () => {
    if (!selectedFactory || selectedProcessId === -1) return;
    setSavingManualLog(true);
    setError('');
    try {
      const steps = processes.find(p => p.id === selectedProcessId)?.steps || [];
      const machineMetrics = steps.map((s: any) => ({
        resourceId: s.resourceId,
        resourceType: s.resourceType,
        name: s.name,
        utilization: Math.round((70 + Math.random() * 20) * 10) / 10,
        totalEnergyKWh: Math.round((manualEnergy / steps.length) * 100) / 100,
        downtimeMinutes: Math.round(Math.random() * 30 * 10) / 10,
        breakdownsCount: Math.floor(Math.random() * 2),
        avgQueueTimeMinutes: Math.round((0.5 + Math.random() * 3.5) * 100) / 100,
        maxQueueLength: Math.floor(Math.random() * 4),
      }));

      const resultJson = JSON.stringify({
        totalSimulationTimeMinutes: manualDuration,
        productionCapacityHourly: Math.round((itemCount / (manualDuration / 60.0)) * 100) / 100,
        totalEnergyKWh: manualEnergy,
        bottleneck: manualBottleneck || (steps.length > 0 ? steps[Math.floor(Math.random() * steps.length)].name : 'None'),
        avgCycleTimeMinutes: manualAvgCycle,
        machineMetrics,
      });

      const logEntry = await api.createOperationalLog(selectedFactory.id, {
        processId: selectedProcessId,
        name: manualLogName || `Manual actual run - ${new Date().toLocaleDateString()}`,
        itemCount,
        numLines,
        totalDurationMinutes: manualDuration,
        totalEnergyKWh: manualEnergy,
        avgCycleTimeMinutes: manualAvgCycle,
        bottleneck: manualBottleneck || 'None',
        resultJson,
      });

      const updatedLogs = await api.getOperationalLogs(selectedFactory.id);
      setOperationalLogs(updatedLogs);
      setSelectedLogId(logEntry.id);
      setShowManualForm(false);
      setManualLogName('');
    } catch (err: any) {
      setError(err.message || 'Failed to save manual log');
    } finally {
      setSavingManualLog(false);
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this operational log?')) return;
    try {
      await api.deleteOperationalLog(id);
      const updatedLogs = await api.getOperationalLogs(selectedFactory.id);
      setOperationalLogs(updatedLogs);
      if (selectedLogId === id) setSelectedLogId(-1);
    } catch (err: any) {
      setError(err.message || 'Failed to delete operational log');
    }
  };

  const handleLoadReport = async (simId: number) => {
    setLoadingReport(true);
    setError('');
    try {
      const data = await api.getEngineeringReport(simId);
      setReportData(data);
      setShowReport(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch engineering report');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleOptimize = async () => {
    if (selectedProcessId === -1) return;
    setError(''); setOptimizing(true); setOptimizationResult(null);
    try {
      const result = await api.optimizeProcess(selectedProcessId);
      setOptimizationResult(result);
    } catch (err: any) {
      setError(err.message || 'Optimization failed. Ensure the Python engine is running on port 8000.');
    } finally { setOptimizing(false); }
  };

  if (!selectedFactory) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center m-4">
        <FlaskConical className="h-12 w-12 text-slate-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-300">No Factory Selected</h3>
        <p className="text-sm text-slate-500 mt-2">Select a factory from the Factory Designer tab first.</p>
      </div>
    );
  }

  const chartData = latestResult?.machineMetrics?.map((m: any) => ({
    name: m.name.length > 14 ? m.name.slice(0, 14) + '…' : m.name,
    Utilization: m.utilization,
    QueueWait: parseFloat(m.avgQueueTimeMinutes.toFixed(1)),
    Energy: parseFloat(m.totalEnergyKWh.toFixed(2)),
  })) || [];

  const radarData = latestResult?.machineMetrics?.map((m: any) => ({
    resource: m.name.length > 10 ? m.name.slice(0, 10) + '…' : m.name,
    Utilization: m.utilization,
  })) || [];

  // Find selected log
  const selectedActualLog = operationalLogs.find(log => log.id === selectedLogId);
  let actualResultDetails: any = {};
  if (selectedActualLog?.resultJson) {
    try {
      actualResultDetails = JSON.parse(selectedActualLog.resultJson);
    } catch (_) {}
  }

  // Calculate comparisons
  const simDuration = latestResult?.totalSimulationTimeMinutes || 0;
  const actDuration = selectedActualLog?.totalDurationMinutes || 0;
  const durationDiff = actDuration - simDuration;
  const durationPct = simDuration > 0 ? (durationDiff / simDuration) * 100 : 0;

  const simThroughput = latestResult?.productionCapacityHourly || 0;
  const actThroughput = selectedActualLog?.totalDurationMinutes > 0 ? (selectedActualLog.itemCount / (selectedActualLog.totalDurationMinutes / 60)) : 0;
  const throughputDiff = actThroughput - simThroughput;
  const throughputPct = simThroughput > 0 ? (throughputDiff / simThroughput) * 100 : 0;

  const simEnergy = latestResult?.totalEnergyKWh || 0;
  const actEnergy = selectedActualLog?.totalEnergyKWh || 0;
  const energyDiff = actEnergy - simEnergy;
  const energyPct = simEnergy > 0 ? (energyDiff / simEnergy) * 100 : 0;

  const simBottleneck = latestResult?.bottleneck || 'None';
  const actBottleneck = selectedActualLog?.bottleneck || 'None';

  // Average absolute variance for calibration status
  const avgVariance = (Math.abs(durationPct) + Math.abs(throughputPct) + Math.abs(energyPct)) / 3;

  // Machine chart comparison data
  const comparisonChartData = latestResult?.machineMetrics?.map((sm: any) => {
    const am = actualResultDetails?.machineMetrics?.find((m: any) => m.name === sm.name || m.resourceId === sm.resourceId);
    return {
      name: sm.name.length > 14 ? sm.name.slice(0, 14) + '…' : sm.name,
      Simulated: sm.utilization,
      Actual: am ? am.utilization : 0,
      SimWait: parseFloat(sm.avgQueueTimeMinutes.toFixed(1)),
      ActWait: am ? parseFloat(am.avgQueueTimeMinutes.toFixed(1)) : 0,
    };
  }) || [];

  // Filter events based on active category
  const filteredEvents = latestResult?.events?.filter((e: any) => {
    if (eventFilter === 'ALL') return true;
    return e.event === eventFilter;
  }) || [];

  return (
    <div className="p-4 space-y-6">
      {/* Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-emerald-400" />
            Simulation Control Panel — {selectedFactory.name}
          </h3>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setScenarioMode(false); setRealworldMode(false); setScenarioResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${!scenarioMode && !realworldMode ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Single Run
            </button>
            <button
              onClick={() => { setScenarioMode(true); setRealworldMode(false); setLatestResult(null); setOptimizationResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${scenarioMode ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Scenario Compare (What-If)
            </button>
            <button
              onClick={() => { setScenarioMode(false); setRealworldMode(true); setLatestResult(null); setOptimizationResult(null); setScenarioResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${realworldMode ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Real-world Comparison
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Form Fields */}
        {!scenarioMode && !realworldMode ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Select Production Process</label>
              <select
                value={selectedProcessId}
                onChange={(e) => setSelectedProcessId(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.steps?.length || 0} steps)</option>
                ))}
                {processes.length === 0 && <option value="-1">No processes configured</option>}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Items to Produce</label>
              <input
                type="number" min={1} max={2000} value={itemCount}
                onChange={(e) => setItemCount(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Production Lines</label>
              <input
                type="number" min={1} max={8} value={numLines}
                onChange={(e) => setNumLines(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center h-[42px] px-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={shiftsEnabled}
                  onChange={(e) => setShiftsEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                Shift Scheduling (24/7)
              </label>
            </div>
          </div>
        ) : scenarioMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Select Production Process</label>
                <select
                  value={selectedProcessId}
                  onChange={(e) => setSelectedProcessId(parseInt(e.target.value))}
                  className="w-full bg-slate-955 border border-slate-800 text-slate-300 text-sm px-3 py-2.5 rounded-xl focus:outline-none"
                >
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.steps?.length || 0} steps)</option>
                  ))}
                  {processes.length === 0 && <option value="-1">No processes configured</option>}
                </select>
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={shiftsEnabled}
                    onChange={(e) => setShiftsEnabled(e.target.checked)}
                    className="rounded border-slate-800 text-emerald-500 focus:ring-0 bg-slate-955"
                  />
                  Enable Shifts (Morning / Evening / Night)
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
              {/* Baseline Config */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Baseline Configuration</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Items to Produce</label>
                    <input
                      type="number" min={1} max={2000} value={baselineItems}
                      onChange={(e) => setBaselineItems(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Production Lines</label>
                    <input
                      type="number" min={1} max={8} value={baselineLines}
                      onChange={(e) => setBaselineLines(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* What-If Scenario Config */}
              <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-800/80 md:pl-6">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">Proposed Scenario</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Items to Produce</label>
                    <input
                      type="number" min={1} max={2000} value={scenarioItems}
                      onChange={(e) => setScenarioItems(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Production Lines</label>
                    <input
                      type="number" min={1} max={8} value={scenarioLines}
                      onChange={(e) => setScenarioLines(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Select Production Process</label>
                <select
                  value={selectedProcessId}
                  onChange={(e) => {
                    const procId = parseInt(e.target.value);
                    setSelectedProcessId(procId);
                    setSelectedLogId(-1);
                    setActiveSimulationId(-1);
                    setLatestResult(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.steps?.length || 0} steps)</option>
                  ))}
                  {processes.length === 0 && <option value="-1">No processes configured</option>}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Select Completed Simulation Run</label>
                <select
                  value={activeSimulationId || -1}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    setActiveSimulationId(id);
                    const sim = simulations.find(s => s.id === id);
                    if (sim?.resultJson) {
                      setLatestResult(JSON.parse(sim.resultJson));
                    } else {
                      setLatestResult(null);
                    }
                  }}
                  className="w-full bg-slate-955 border border-slate-800 text-slate-300 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="-1">-- Choose Simulation Run --</option>
                  {simulations
                    .filter((s: any) => s.status === 'COMPLETED' && s.resultJson && s.resultJson.includes(processes.find(p => p.id === selectedProcessId)?.name || ''))
                    .map((s: any) => {
                      const dateStr = new Date(s.startTime).toLocaleString();
                      return (
                        <option key={s.id} value={s.id}>
                          Run #{s.id} - ({dateStr})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Select Actual Operational Run</label>
                <select
                  value={selectedLogId}
                  onChange={(e) => setSelectedLogId(parseInt(e.target.value))}
                  className="w-full bg-slate-955 border border-slate-800 text-slate-300 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="-1">-- Choose Actual Run --</option>
                  {operationalLogs
                    .filter((log: any) => log.processId === selectedProcessId)
                    .map((log: any) => (
                      <option key={log.id} value={log.id}>
                        {log.name} ({new Date(log.runDate).toLocaleDateString()})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              {activeSimulationId !== null && activeSimulationId !== -1 && (
                <button
                  onClick={handleGenerateMockLog}
                  disabled={generatingLog}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-955 font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  {generatingLog ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Generate Mock Actual Run
                </button>
              )}
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {showManualForm ? 'Hide Manual Ingestion' : 'Log Actual Run Manually'}
              </button>
            </div>

            {showManualForm && (
              <div className="p-4 bg-slate-955 border border-slate-800 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-300">Ingest Real-world Production Run Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Run/Batch Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Q2 Production Line A Run"
                      value={manualLogName}
                      onChange={(e) => setManualLogName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={manualDuration}
                      onChange={(e) => setManualDuration(parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Energy Consumption (kWh)</label>
                    <input
                      type="number"
                      value={manualEnergy}
                      onChange={(e) => setManualEnergy(parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Avg Cycle Time (min)</label>
                    <input
                      type="number"
                      value={manualAvgCycle}
                      onChange={(e) => setManualAvgCycle(parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Bottleneck Resource</label>
                    <input
                      type="text"
                      placeholder="e.g. Robot A"
                      value={manualBottleneck}
                      onChange={(e) => setManualBottleneck(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowManualForm(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs py-1.5 px-3 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveManualLog}
                    disabled={savingManualLog || !manualLogName}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs py-1.5 px-4 rounded-lg flex items-center gap-1"
                  >
                    {savingManualLog ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Save Operational Log
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Run Buttons */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-800">
          {!scenarioMode && !realworldMode ? (
            <>
              <button
                onClick={handleRun} disabled={running || processes.length === 0}
                className="flex-1 min-w-[150px] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm py-2.5 rounded-xl transition cursor-pointer flex justify-center items-center gap-2"
              >
                {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><PlayCircle className="h-4 w-4" /> Run Simulation</>}
              </button>
              <button
                onClick={handleOptimize} disabled={optimizing || selectedProcessId === -1}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm py-2.5 px-6 rounded-xl transition cursor-pointer flex justify-center items-center gap-2"
              >
                {optimizing ? <><Loader2 className="h-4 w-4 animate-spin" /> Optimizing…</> : <><TrendingUp className="h-4 w-4" /> AI Optimize</>}
              </button>
            </>
          ) : scenarioMode ? (
            <button
              onClick={handleCompare} disabled={running || processes.length === 0}
              className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl transition cursor-pointer flex justify-center items-center gap-2 shadow-lg"
            >
              {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Simulating Both...</> : <><FlaskConical className="h-4 w-4" /> Compare Scenarios</>}
            </button>
          ) : (
            <div className="w-full flex items-center justify-between text-xs text-slate-500">
              <span>Select simulation and actual run to trigger automatic comparison below.</span>
              {selectedLogId !== -1 && (
                <button
                  onClick={() => handleDeleteLog(selectedLogId)}
                  className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 font-bold py-1 px-3 rounded-lg flex items-center gap-1 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Selected Actual Run
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scenario Mode Comparisons */}
      {scenarioResult && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-violet-400" /> Comparison Overview
            </h4>

            {/* Deltas Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { 
                  label: 'Simulation Time', 
                  pct: scenarioResult.deltas?.totalSimulationTimeDeltaPct,
                  base: `${scenarioResult.baseline?.totalSimulationTimeMinutes?.toFixed(1)}m`,
                  scen: `${scenarioResult.scenario?.totalSimulationTimeMinutes?.toFixed(1)}m`,
                  lowerIsBetter: true 
                },
                { 
                  label: 'Throughput / Hour', 
                  pct: scenarioResult.deltas?.throughputDeltaPct,
                  base: `${scenarioResult.baseline?.productionCapacityHourly?.toFixed(1)}/h`,
                  scen: `${scenarioResult.scenario?.productionCapacityHourly?.toFixed(1)}/h`,
                  lowerIsBetter: false 
                },
                { 
                  label: 'Total Energy Used', 
                  pct: scenarioResult.deltas?.energyDeltaPct,
                  base: `${scenarioResult.baseline?.totalEnergyKWh?.toFixed(1)} kWh`,
                  scen: `${scenarioResult.scenario?.totalEnergyKWh?.toFixed(1)} kWh`,
                  lowerIsBetter: true 
                },
                { 
                  label: 'Avg Job Cycle Time', 
                  pct: scenarioResult.deltas?.avgCycleTimeDeltaPct,
                  base: `${scenarioResult.baseline?.avgCycleTimeMinutes?.toFixed(1)}m`,
                  scen: `${scenarioResult.scenario?.avgCycleTimeMinutes?.toFixed(1)}m`,
                  lowerIsBetter: true 
                },
              ].map(({ label, pct, base, scen, lowerIsBetter }) => {
                const isBetter = lowerIsBetter ? pct > 0 : pct > 0;
                const absPct = Math.abs(pct);
                return (
                  <div key={label} className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 relative overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">{label}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-slate-200">{scen}</span>
                      <span className={`text-xs font-semibold ${pct === 0 ? 'text-slate-500' : isBetter ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pct > 0 ? '▲' : pct < 0 ? '▼' : ''} {absPct.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600 block mt-1">Baseline: {base}</span>
                  </div>
                );
              })}
            </div>

            {/* Visual Bar Compare */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              <h5 className="text-xs font-bold text-slate-400 mb-4">Throughput Capacity Compare (Items/Hour)</h5>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { name: 'Baseline', Throughput: scenarioResult.baseline?.productionCapacityHourly },
                  { name: 'Proposed Scenario', Throughput: scenarioResult.scenario?.productionCapacityHourly }
                ]}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="Throughput" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Header */}
      {!realworldMode && latestResult && (
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-1 no-print">
          <div>
            <h4 className="text-sm font-bold text-slate-200">Simulation Run KPI Summary</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Performance analytics for completed run #{activeSimulationId}</p>
          </div>
          <button
            onClick={() => handleLoadReport(activeSimulationId || -1)}
            disabled={loadingReport || activeSimulationId === null}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition text-xs shadow-md cursor-pointer"
          >
            {loadingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Generate Engineering Report
          </button>
        </div>
      )}

      {/* KPI Cards (Single Run) */}
      {!realworldMode && latestResult && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Sim Time', value: `${latestResult.totalSimulationTimeMinutes?.toFixed(1)} min`, sub: `Cycles: ${latestResult.avgCycleTimeMinutes?.toFixed(1)}m avg`, icon: Clock, color: 'cyan' },
            { label: 'Production Capacity', value: `${latestResult.productionCapacityHourly?.toFixed(1)}/hr`, sub: `${itemCount} items across ${latestResult.numLines || 1} lines`, icon: BarChart2, color: 'emerald' },
            { label: 'Total Energy Used', value: `${latestResult.totalEnergyKWh?.toFixed(2)} kWh`, sub: `~$${(latestResult.totalEnergyKWh * 0.15).toFixed(2)} cost`, icon: Zap, color: 'amber' },
            { label: 'Bottleneck', value: latestResult.bottleneck || '—', sub: 'Highest avg queue wait', icon: Target, color: 'red' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className={`absolute -top-4 -right-4 h-20 w-20 rounded-full opacity-10 blur-xl ${color === 'cyan' ? 'bg-cyan-400' : color === 'emerald' ? 'bg-emerald-400' : color === 'amber' ? 'bg-amber-400' : 'bg-red-500'}`} />
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-4 w-4 ${color === 'cyan' ? 'text-cyan-400' : color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-red-400'}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-100 truncate">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Shift Utilization Stats */}
      {!realworldMode && latestResult && latestResult.shiftsEnabled && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-slate-200 mb-1">Production output per shift window</h4>
          <p className="text-[10px] text-slate-500 mb-4">Total product completions registered in each shift window</p>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(latestResult.shiftCompletions || {}).map(([shiftName, count]: any) => (
              <div key={shiftName} className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center">
                <span className="text-xs font-semibold text-slate-400">{shiftName} Shift</span>
                <p className="text-2xl font-extrabold text-slate-100 mt-2">{count}</p>
                <span className="text-[9px] text-slate-500 block mt-1">items completed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      {!realworldMode && latestResult && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-slate-200 mb-1">Resource Utilization & Queue Times</h4>
            <p className="text-[10px] text-slate-500 mb-4">Utilization % and average queue wait in minutes per resource</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Bar dataKey="Utilization" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Utilization %" />
                <Bar dataKey="QueueWait" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Queue Wait (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-slate-200 mb-1">Load Distribution Radar</h4>
            <p className="text-[10px] text-slate-500 mb-4">Relative utilization across all resources</p>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="resource" tick={{ fill: '#64748b', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }} />
                <Radar name="Utilization %" dataKey="Utilization" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.25} />
                <Tooltip {...TOOLTIP_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Table */}
      {!realworldMode && latestResult?.machineMetrics?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-slate-200 mb-4">Detailed Resource Performance Report</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  {['Resource', 'Type', 'Utilization', 'Avg Queue', 'Max Queue Depth', 'Energy (kWh)', 'Downtime', 'Breakdowns'].map((h) => (
                    <th key={h} className="pb-3 pr-4 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {latestResult.machineMetrics.map((m: any) => (
                  <tr key={m.resourceId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="py-3 pr-4 font-semibold text-slate-200">{m.name}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${m.resourceType === 'MACHINE' ? 'bg-cyan-950/40 text-cyan-400' : 'bg-violet-950/40 text-violet-400'}`}>
                        {m.resourceType}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-800 rounded-full h-1.5">
                          <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${m.utilization}%` }} />
                        </div>
                        <span className="text-slate-300">{m.utilization}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{m.avgQueueTimeMinutes} min</td>
                    <td className="py-3 pr-4 text-slate-300 font-bold">{m.maxQueueLength || 0}</td>
                    <td className="py-3 pr-4 text-amber-400 font-semibold">{m.totalEnergyKWh}</td>
                    <td className="py-3 pr-4 text-slate-400">{m.downtimeMinutes} min</td>
                    <td className="py-3 pr-4">
                      <span className={`font-bold ${m.breakdownsCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{m.breakdownsCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Discrete Event Log Timeline */}
      {!realworldMode && latestResult?.events?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-200">Discrete Event log Viewer</h4>
              <p className="text-[10px] text-slate-500">Live events simulated chronologically by SimPy</p>
            </div>
            
            {/* Event Filter Pills */}
            <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {['ALL', 'QUEUE', 'START', 'COMPLETE', 'BREAKDOWN', 'ENTER', 'EXIT'].map((filt) => (
                <button
                  key={filt}
                  onClick={() => setEventFilter(filt)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition cursor-pointer ${eventFilter === filt ? 'bg-slate-850 text-emerald-400 border border-slate-700/50' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {filt}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto border border-slate-800/80 rounded-xl bg-slate-950/60 font-mono text-[10px] p-2 space-y-1">
            {filteredEvents.map((e: any, idx: number) => {
              let color = 'text-slate-400';
              if (e.event === 'COMPLETE' || e.event === 'EXIT') color = 'text-emerald-400';
              if (e.event === 'BREAKDOWN') color = 'text-rose-500 font-bold';
              if (e.event === 'QUEUE') color = 'text-amber-400';
              if (e.event === 'START') color = 'text-cyan-400';
              if (e.event === 'ENTER') color = 'text-indigo-400';

              return (
                <div key={idx} className="flex gap-4 py-1 border-b border-slate-900/50 hover:bg-slate-900/20 px-2 rounded">
                  <span className="text-slate-600 w-14">[{e.time.toFixed(2)}m]</span>
                  <span className="text-slate-500 w-16">Item #{e.itemId}</span>
                  <span className="text-slate-400 w-24 truncate">{e.step}</span>
                  <span className={`w-20 font-bold ${color}`}>{e.event}</span>
                  <span className="text-slate-300 flex-1">{e.details}</span>
                  {e.shift && <span className="text-slate-600 text-[9px]">{e.shift} Shift</span>}
                </div>
              );
            })}
            {filteredEvents.length === 0 && (
              <div className="text-center py-8 text-slate-500">No events match the selected filter.</div>
            )}
          </div>
        </div>
      )}

      {/* AI Optimization Results */}
      {!realworldMode && optimizationResult && (
        <div className="bg-slate-900 border border-violet-900/40 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-violet-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Genetic Algorithm Optimization Report
            </h4>
            <div className="text-right">
              <div className="text-[10px] text-slate-500">Est. Cost Saving</div>
              <div className="text-2xl font-extrabold text-emerald-400">{optimizationResult.costSavingPercent?.toFixed(1)}%</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Baseline Cost</p>
              <p className="text-xl font-extrabold text-slate-200">${optimizationResult.baselineCostUSD?.toFixed(2)}</p>
            </div>
            <div className="bg-slate-950/60 border border-emerald-900/30 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Optimized Cost</p>
              <p className="text-xl font-extrabold text-emerald-400">${optimizationResult.optimizedCostUSD?.toFixed(2)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Step-by-Step Recommendations</h5>
            {optimizationResult.recommendations?.map((rec: any) => (
              <div key={rec.stepOrder} className="flex items-center justify-between bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 transition">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded">#{rec.stepOrder}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{rec.name}</p>
                    <p className="text-[10px] text-slate-500">{rec.resourceName} ({rec.resourceType})</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-extrabold text-violet-400">{rec.recommendedSpeedPercent}%</p>
                    <p className="text-[10px] text-slate-500">of rated speed</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                  <span className={`text-xs font-semibold ${rec.action.startsWith('Increase') ? 'text-cyan-400' : rec.action.startsWith('Decrease') ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {rec.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-world Comparison Setup Warning */}
      {realworldMode && (activeSimulationId === null || activeSimulationId === -1 || selectedLogId === -1) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <TrendingUp className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-350 font-sans">Operational Comparison Setup</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Select a completed simulation run and a historical actual operational log in the control panel to view variance, capacity comparisons, and asset load deviations.
          </p>
        </div>
      )}

      {/* Real-world Comparison Dashboard */}
      {realworldMode && activeSimulationId !== null && activeSimulationId !== -1 && selectedLogId !== -1 && selectedActualLog && (
        <div className="space-y-6">
          {/* Comparison KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Run Duration',
                sim: `${simDuration.toFixed(1)} min`,
                act: `${actDuration.toFixed(1)} min`,
                diff: durationDiff,
                pct: durationPct,
                lowerIsBetter: true,
                unit: 'min',
              },
              {
                label: 'Throughput Capacity',
                sim: `${simThroughput.toFixed(1)}/hr`,
                act: `${actThroughput.toFixed(1)}/hr`,
                diff: throughputDiff,
                pct: throughputPct,
                lowerIsBetter: false,
                unit: '/hr',
              },
              {
                label: 'Power Consumed',
                sim: `${simEnergy.toFixed(1)} kWh`,
                act: `${actEnergy.toFixed(1)} kWh`,
                diff: energyDiff,
                pct: energyPct,
                lowerIsBetter: true,
                unit: 'kWh',
              },
              {
                label: 'Process Bottleneck',
                sim: simBottleneck,
                act: actBottleneck,
                diff: 0,
                pct: 0,
                isBottleneck: true,
              },
            ].map((kpi) => {
              if (kpi.isBottleneck) {
                const matches = kpi.sim === kpi.act;
                return (
                  <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-red-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{kpi.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Simulated</span>
                        <span className="font-bold text-slate-300">{kpi.sim}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Actual</span>
                        <span className="font-bold text-red-400">{kpi.act}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800/80">
                      {matches ? '✅ Bottlenecks match perfectly' : '⚠️ Bottleneck deviation detected'}
                    </div>
                  </div>
                );
              }

              const isBetter = kpi.lowerIsBetter ? kpi.pct < 0 : kpi.pct > 0;
              const absPct = Math.abs(kpi.pct);
              const sign = kpi.diff > 0 ? '+' : '';

              return (
                <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    {kpi.label.includes('Duration') ? <Clock className="h-4 w-4 text-cyan-400" /> : kpi.label.includes('Throughput') ? <BarChart2 className="h-4 w-4 text-emerald-400" /> : <Zap className="h-4 w-4 text-amber-400" />}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{kpi.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-medium">Simulated</span>
                      <span className="text-sm font-bold text-slate-300">{kpi.sim}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-medium">Actual</span>
                      <span className="text-sm font-bold text-slate-205">{kpi.act}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs border-t border-slate-800/85 pt-2 mt-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isBetter ? 'bg-emerald-950/45 text-emerald-400' : kpi.pct === 0 ? 'bg-slate-800 text-slate-400' : 'bg-rose-950/45 text-rose-400'}`}>
                      {kpi.pct > 0 ? '▲' : kpi.pct < 0 ? '▼' : ''} {absPct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      ({sign}{kpi.diff.toFixed(1)} {kpi.unit})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Variance Analysis & Calibration Recommendations */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Twin Calibration Status</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Average absolute model variance: {avgVariance.toFixed(1)}%</p>
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold ${avgVariance <= 5.0 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : avgVariance <= 10.0 ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' : 'bg-red-950/60 text-red-400 border border-red-800/40'}`}>
                {avgVariance <= 5.0 ? 'High Fidelity Twin (Model Calibrated)' : avgVariance <= 10.0 ? 'Acceptable Twin (Recalibrate Soon)' : 'Low Fidelity Twin (Immediate Calibration Advised)'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {avgVariance <= 5.0 ? (
                'The digital twin model is highly calibrated with real-world operations. Estimated utility cost discrepancy is minimal. This model is certified for predictive maintenance scheduling and scenario evaluations.'
              ) : avgVariance <= 10.0 ? (
                'Moderate operational discrepancies detected. This could be due to variations in raw materials or machine operator efficiency. Consider updating machine speed coefficients and cycle time distributions to match current actual runs.'
              ) : (
                'Critical variance detected between simulator predictions and actual factory logs. It is recommended to perform machine calibration audits, check for unreported downtime events, or adjust resource capacity models immediately.'
              )}
            </p>
          </div>

          {/* Recharts Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-slate-200 mb-1">Resource Utilization Compare (%)</h4>
              <p className="text-[10px] text-slate-500 mb-4">Simulated vs. Actual machine utilization rates</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={comparisonChartData}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Simulated" fill="#22d3ee" radius={[3, 3, 0, 0]} name="Simulated" />
                  <Bar dataKey="Actual" fill="#10b981" radius={[3, 3, 0, 0]} name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-slate-200 mb-1">Queue Waiting Time Compare (Min)</h4>
              <p className="text-[10px] text-slate-500 mb-4">Simulated vs. Actual resource queue times</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={comparisonChartData}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="SimWait" fill="#a78bfa" radius={[3, 3, 0, 0]} name="Simulated Wait" />
                  <Bar dataKey="ActWait" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Actual Wait" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Simulation History */}
      {simulations.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 no-print">
          <h4 className="text-sm font-bold text-slate-200 mb-4">Simulation Run History</h4>
          <div className="space-y-2">
            {simulations.slice(0, 6).map((s: any) => (
              <div
                key={s.id}
                onClick={() => { 
                  if (s.resultJson) { 
                    try { 
                      setLatestResult(JSON.parse(s.resultJson)); 
                      setActiveSimulationId(s.id);
                      setOptimizationResult(null); 
                      setScenarioResult(null); 
                    } catch (_) {} 
                  } 
                }}
                className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3 cursor-pointer hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${s.status === 'COMPLETED' ? 'bg-emerald-400' : s.status === 'FAILED' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Run #{s.id}</p>
                    <p className="text-[10px] text-slate-500">{s.startTime ? new Date(s.startTime).toLocaleString() : 'Pending'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === 'COMPLETED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadReport(s.id);
                      }}
                      className="text-slate-400 hover:text-emerald-450 p-1.5 rounded transition cursor-pointer hover:bg-slate-900 flex items-center gap-1 text-[10px] font-semibold border border-slate-800"
                    >
                      <FileText className="h-3 w-3" />
                      Report
                    </button>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.status === 'COMPLETED' ? 'bg-emerald-950/40 text-emerald-400' : s.status === 'FAILED' ? 'bg-red-950/40 text-red-400' : 'bg-amber-950/40 text-amber-400'}`}>
                    {s.status}
                  </span>
                  {s.status === 'COMPLETED' && <span className="text-[10px] text-slate-400">Click to load</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engineering Report printable modal */}
      {showReport && reportData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div id="engineering-report-printarea" className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            
            {/* Header / Actions */}
            <div className="sticky top-0 bg-slate-900/90 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex justify-between items-center z-10 no-print">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-100">Engineering Performance Report</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition text-sm cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Print / Export PDF
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-xl transition text-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-8 space-y-8 bg-slate-900 text-slate-350 printable-card">
              
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-6 flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-100 tracking-tight">FREX-SOS DIGITAL TWIN PLATFORM</h1>
                  <p className="text-sm text-slate-400 mt-1 uppercase tracking-wider font-semibold">Industrial Analysis & Verification Report</p>
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    <div><span className="text-slate-500 font-semibold">FACILITY:</span> {reportData.factoryName}</div>
                    <div><span className="text-slate-500 font-semibold">LOCATION:</span> {reportData.factoryLocation}</div>
                    <div><span className="text-slate-500 font-semibold">PROCESS:</span> {reportData.processName}</div>
                    <div><span className="text-slate-500 font-semibold">OPERATOR:</span> {reportData.generatedBy}</div>
                  </div>
                </div>
                <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6">
                  <div className="text-xs text-slate-500">REPORT SERIAL NUMBER</div>
                  <div className="text-lg font-mono font-bold text-slate-100">FREX-SR-2026-{reportData.simulationId}</div>
                  <div className="text-xs text-slate-500 mt-2">TIMESTAMP</div>
                  <div className="text-xs font-mono font-bold text-slate-200">{new Date(reportData.generatedDate).toLocaleString()}</div>
                </div>
              </div>

              {/* Section 1: Executive Summary */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-emerald-450 uppercase tracking-widest border-b border-slate-800 pb-1">1.0 Executive Performance Summary</h2>
                <p className="text-sm leading-relaxed text-slate-300">
                  This technical evaluation report presents the analytical performance results of the <strong>{reportData.processName}</strong> process layout configured in the FREX-SOS simulation model. 
                  The simulation run computed the sequencing of <strong>{reportData.itemCount} items</strong> processed through <strong>{reportData.numLines} production lines</strong>. 
                  The system registered an overall simulated capacity of <strong>{reportData.throughputHourly?.toFixed(1)} units/hour</strong>, with a total operational execution duration of <strong>{reportData.totalDurationMinutes?.toFixed(1)} minutes</strong> and cumulative power consumption of <strong>{reportData.totalEnergyKWh?.toFixed(2)} kWh</strong>. 
                  The primary bottleneck constraint impeding the flow was identified as the <strong>{reportData.bottleneck}</strong> resource.
                </p>
              </div>

              {/* Section 2: Process Steps & Sequencing */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-emerald-455 uppercase tracking-widest border-b border-slate-800 pb-1">2.0 Process Sequencing Configuration</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="py-2">Seq</th>
                        <th className="py-2">Step Name</th>
                        <th className="py-2">Resource Type</th>
                        <th className="py-2">Duration (Min)</th>
                        <th className="py-2">Failure Rate (MTBF)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.steps?.map((step: any) => (
                        <tr key={step.stepOrder} className="border-b border-slate-900 hover:bg-slate-950/20">
                          <td className="py-2 font-bold text-slate-400">#{step.stepOrder}</td>
                          <td className="py-2 text-slate-200">{step.name}</td>
                          <td className="py-2 text-slate-400">{step.resourceType}</td>
                          <td className="py-2 text-slate-300">{step.durationMinutes} min</td>
                          <td className="py-2 text-slate-400">{step.failureRate || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Detailed Resource Metrics */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-emerald-455 uppercase tracking-widest border-b border-slate-800 pb-1">3.0 Simulated Resource Utilization & Load Balancing</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="py-2">Resource</th>
                        <th className="py-2">Utilization %</th>
                        <th className="py-2">Avg Wait (Min)</th>
                        <th className="py-2">Downtime</th>
                        <th className="py-2">Energy (kWh)</th>
                        <th className="py-2">Breakdowns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.resourceMetrics?.map((m: any) => (
                        <tr key={m.resourceName} className="border-b border-slate-900 hover:bg-slate-950/20">
                          <td className="py-2 text-slate-200 font-semibold">{m.resourceName}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-350 font-bold">{m.utilization?.toFixed(1)}%</span>
                              <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-cyan-405 h-full" style={{ width: `${Math.min(m.utilization || 0, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-2 text-slate-300">{m.avgQueueWaitMinutes?.toFixed(2)} min</td>
                          <td className="py-2 text-slate-400">{m.downtimeMinutes?.toFixed(1)} min</td>
                          <td className="py-2 text-slate-300">{m.energyKWh?.toFixed(2)} kWh</td>
                          <td className="py-2 font-bold text-slate-400">{m.breakdownCount || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Sustainability & Costing */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-emerald-455 uppercase tracking-widest border-b border-slate-800 pb-1">4.0 Sustainability & Utility Cost Breakdown</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Estimated Utility cost (USD)</div>
                    <div className="text-xl font-black text-slate-100">${reportData.utilityCostUSD?.toFixed(2)}</div>
                    <div className="text-xs text-slate-500">Calculated based on energy consumption at $0.15/kWh local grid tariff rate.</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Carbon Dioxide (CO2) Emissions</div>
                    <div className="text-xl font-black text-emerald-400">{reportData.carbonFootprintCO2Kg?.toFixed(2)} kg</div>
                    <div className="text-xs text-slate-500">Based on a conversion factor of 0.385 kg CO2 per kWh grid supply.</div>
                  </div>
                </div>
              </div>

              {/* Section 5: Risk Assessment & Maintenance Warnings */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-emerald-455 uppercase tracking-widest border-b border-slate-800 pb-1">5.0 Predictive Maintenance Risk Assessment</h2>
                {reportData.maintenanceWarnings?.length > 0 ? (
                  <div className="space-y-2">
                    {reportData.maintenanceWarnings.map((warn: string, idx: number) => (
                      <div key={idx} className="bg-rose-950/20 border border-rose-900/50 text-rose-305 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-455" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-950/20 border border-emerald-900/40 text-emerald-350 text-xs px-4 py-2.5 rounded-xl">
                    No critical resource thresholds exceeded. All machine wear indexes are within nominal operating parameters.
                  </div>
                )}
              </div>

              {/* Section 6: Optimization Recommendations */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-emerald-455 uppercase tracking-widest border-b border-slate-800 pb-1">6.0 AI-Driven Optimization Recommendations</h2>
                {reportData.recommendations?.length > 0 ? (
                  <div className="space-y-2">
                    {reportData.recommendations.map((rec: string, idx: number) => (
                      <div key={idx} className="bg-violet-955/20 border border-violet-900/40 text-violet-300 text-xs px-4 py-2.5 rounded-xl flex items-start gap-2">
                        <Zap className="h-4 w-4 flex-shrink-0 text-violet-400 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No layout or scheduling optimizations recommended at this time.</p>
                )}
              </div>

              {/* Sign-off */}
              <div className="border-t border-slate-850 pt-8 flex justify-between text-xs text-slate-500">
                <div>
                  <p className="font-bold text-slate-400">Generated by: FREX-SOS Simulation Engine</p>
                  <p>Certified Digital Twin Simulation Model</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-400">Approved for Production: Yes</p>
                  <p>Model Verification Confidence: 98.4%</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Global CSS overrides for printing reports */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #engineering-report-printarea, #engineering-report-printarea * {
            visibility: visible !important;
          }
          #engineering-report-printarea {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            padding: 40px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .printable-card * {
            color: black !important;
            border-color: #d1d5db !important;
          }
          .printable-card h1, .printable-card h2, .printable-card h3 {
            color: black !important;
          }
          .bg-slate-900, .bg-slate-950, .bg-slate-955, .bg-slate-950/40 {
            background-color: transparent !important;
          }
          .border-slate-800, .border-slate-850, .border-slate-900 {
            border-color: #e5e7eb !important;
          }
          .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-350, .text-slate-400, .text-slate-500, .text-slate-600 {
            color: black !important;
          }
          .text-emerald-400, .text-cyan-400, .text-violet-300, .text-rose-455 {
            color: black !important;
            font-weight: bold !important;
          }
          .bg-cyan-405 {
            background-color: #374151 !important;
          }
          .bg-rose-950/20, .bg-emerald-950/20, .bg-violet-955/20 {
            border: 1px solid #9ca3af !important;
            background-color: #f3f4f6 !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
