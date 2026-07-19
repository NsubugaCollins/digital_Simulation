import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Layers, Plus, Trash2, ArrowRight, Play, Cpu, Hammer, Clock } from 'lucide-react';

interface ProcessDesignerProps {
  selectedFactory: any;
  onSelectTab: (tab: string) => void;
}

export const ProcessDesigner: React.FC<ProcessDesignerProps> = ({ selectedFactory, onSelectTab }) => {
  const [processes, setProcesses] = useState<any[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<any | null>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [robots, setRobots] = useState<any[]>([]);

  // Form states
  const [pName, setPName] = useState('');
  const [stepName, setStepName] = useState('');
  const [stepDuration, setStepDuration] = useState(5.0);
  const [resType, setResType] = useState<'MACHINE' | 'ROBOT'>('MACHINE');
  const [resId, setResId] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const fetchProcesses = async () => {
    if (!selectedFactory) return;
    try {
      setError(null);
      const data = await api.getProcesses(selectedFactory.id);
      setProcesses(data);
      if (data.length > 0 && !selectedProcess) {
        setSelectedProcess(data[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch processes.');
    }
  };

  const fetchResources = async () => {
    if (!selectedFactory) return;
    try {
      setStepError(null);
      const mData = await api.getMachines(selectedFactory.id);
      const rData = await api.getRobots(selectedFactory.id);
      setMachines(mData);
      setRobots(rData);
      
      // Initialize resource ID dropdown selection
      if (resType === 'MACHINE' && mData.length > 0) {
        setResId(mData[0].id);
      } else if (resType === 'ROBOT' && rData.length > 0) {
        setResId(rData[0].id);
      } else {
        setResId(-1);
      }
    } catch (err: any) {
      console.error(err);
      setStepError(err.message || 'Failed to fetch factory resources.');
    }
  };

  useEffect(() => {
    fetchProcesses();
    fetchResources();
  }, [selectedFactory]);

  useEffect(() => {
    // Reset resource dropdown when type switches
    if (resType === 'MACHINE' && machines.length > 0) {
      setResId(machines[0].id);
    } else if (resType === 'ROBOT' && robots.length > 0) {
      setResId(robots[0].id);
    } else {
      setResId(-1);
    }
  }, [resType, machines, robots]);

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactory || !pName.trim()) return;
    try {
      setError(null);
      const newP = await api.createProcess(selectedFactory.id, { name: pName });
      setPName('');
      fetchProcesses();
      setSelectedProcess(newP);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create process line.');
    }
  };

  const handleDeleteProcess = async (id: number) => {
    if (!confirm('Are you sure you want to delete this process?')) return;
    try {
      setError(null);
      await api.deleteProcess(id);
      if (selectedProcess?.id === id) {
        setSelectedProcess(null);
      }
      fetchProcesses();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to delete process line.');
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess || !stepName.trim() || resId === -1) return;
    
    const nextOrder = (selectedProcess.steps?.length || 0) + 1;

    try {
      setStepError(null);
      await api.addProcessStep(selectedProcess.id, {
        stepOrder: nextOrder,
        name: stepName,
        duration: stepDuration,
        resourceType: resType,
        resourceId: resId,
      });
      setStepName('');
      setStepDuration(5.0);
      
      // Reload selected process to see new steps
      const updatedProcesses = await api.getProcesses(selectedFactory.id);
      setProcesses(updatedProcesses);
      const found = updatedProcesses.find((p: any) => p.id === selectedProcess.id);
      if (found) setSelectedProcess(found);
    } catch (err: any) {
      console.error(err);
      setStepError(err.message || 'Failed to add sequence step.');
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    try {
      setStepError(null);
      await api.deleteProcessStep(stepId);
      // Reload
      const updatedProcesses = await api.getProcesses(selectedFactory.id);
      setProcesses(updatedProcesses);
      const found = updatedProcesses.find((p: any) => p.id === selectedProcess.id);
      if (found) setSelectedProcess(found);
    } catch (err: any) {
      console.error(err);
      setStepError(err.message || 'Failed to delete sequence step.');
    }
  };

  if (!selectedFactory) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center m-4">
        <Layers className="h-12 w-12 text-slate-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-300">No Factory Selected</h3>
        <p className="text-sm text-slate-500 mt-2">Go to the Factory Designer tab first to select or create a factory.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4">
      {/* Sidebar: Processes List */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Layers className="h-5 w-5 text-violet-400" />
          Production Lines
        </h3>

        {/* Create Process Form */}
        <form onSubmit={handleCreateProcess} className="space-y-2 border-b border-slate-800 pb-4">
          {error && (
            <div className="mb-2 bg-red-950/40 border border-red-800/60 text-red-300 rounded-lg p-2 text-[10px]">
              {error}
            </div>
          )}
          <input
            type="text"
            placeholder="Process Name (e.g. Phone Assembly)"
            value={pName}
            onChange={(e) => setPName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
            required
          />
          <button
            type="submit"
            disabled={!pName.trim()}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs py-2 rounded-lg transition cursor-pointer flex justify-center items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Process Line
          </button>
        </form>

        {/* Processes List */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] lg:max-h-[600px]">
          {processes.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProcess(p)}
              className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                selectedProcess?.id === p.id
                  ? 'bg-violet-950/20 border-violet-500/80 text-violet-200'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div>
                <h4 className="font-semibold text-sm text-slate-100">{p.name}</h4>
                <p className="text-xs text-slate-400">{p.steps?.length || 0} Steps</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProcess(p.id);
                }}
                className="text-slate-500 hover:text-red-400 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {processes.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No process lines created yet.</p>
          )}
        </div>
      </div>

      {/* Main Content: Steps Configurator */}
      <div className="lg:col-span-3 space-y-6">
        {!selectedProcess ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <Layers className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-300">No Process Line Selected</h3>
            <p className="text-sm text-slate-500 mt-2">Select a production process line from the sidebar or create a new one to design its steps.</p>
          </div>
        ) : (
          <>
            {/* Visual Process Flow Diagram */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{selectedProcess.name} - Manufacturing Sequence</h3>
                  <p className="text-xs text-slate-400">Sequence of operations triggered in simulations</p>
                </div>
                {selectedProcess.steps?.length > 0 && (
                  <button
                    onClick={() => onSelectTab('simulation')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition flex items-center gap-1"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Run Sim
                  </button>
                )}
              </div>

              {/* Horizontal Nodes */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 overflow-x-auto">
                <div className="flex items-center min-w-max space-x-4 py-2">
                  {selectedProcess.steps?.map((step: any, index: number) => (
                    <React.Fragment key={step.id}>
                      {index > 0 && <ArrowRight className="h-5 w-5 text-slate-700 flex-shrink-0" />}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-[180px] flex-shrink-0 relative group">
                        <div className="absolute top-2 left-2 text-[9px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded">
                          #{step.stepOrder}
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleDeleteStep(step.id)}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-4">
                          <h4 className="text-xs font-bold text-slate-100 truncate mb-1">{step.name}</h4>
                          <div className="space-y-1 mt-2">
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              {step.resourceType === 'MACHINE' ? (
                                <Cpu className="h-3 w-3 text-cyan-400" />
                              ) : (
                                <Hammer className="h-3 w-3 text-violet-400" />
                              )}
                              <span className="truncate w-[120px] inline-block">{step.resourceName}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              <span>{step.duration} min</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                  {(!selectedProcess.steps || selectedProcess.steps.length === 0) && (
                    <div className="text-slate-600 text-xs py-4 text-center w-full">
                      No steps defined yet. Use the form below to add the first sequence step.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add Step Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Add Operation Step</h3>
              
              {machines.length === 0 && robots.length === 0 ? (
                <div className="border border-amber-900/40 bg-amber-950/20 text-amber-300 rounded-xl p-4 text-xs">
                  You have not added any Machine or Robot resources to this factory yet. 
                  Please go to the <strong>Factory Designer</strong> tab to add resources before configure steps.
                </div>
              ) : (
                <form onSubmit={handleAddStep} className="space-y-4">
                  {stepError && (
                    <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl p-3 text-xs">
                      {stepError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Step Operation Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Cut sheet metal, Assemble CPU, Final Inspection"
                        value={stepName}
                        onChange={(e) => setStepName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Base Processing Duration (Minutes)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={stepDuration}
                        onChange={(e) => setStepDuration(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Target Resource Type</label>
                      <div className="flex gap-4 mt-1">
                        <label className="inline-flex items-center text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="resType"
                            checked={resType === 'MACHINE'}
                            onChange={() => setResType('MACHINE')}
                            className="mr-2 text-violet-500 focus:ring-0"
                          />
                          Machine
                        </label>
                        <label className="inline-flex items-center text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="resType"
                            checked={resType === 'ROBOT'}
                            onChange={() => setResType('ROBOT')}
                            className="mr-2 text-violet-500 focus:ring-0"
                          />
                          Robot
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Select Resource</label>
                      <select
                        value={resId}
                        onChange={(e) => setResId(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                        required
                      >
                        {resType === 'MACHINE' ? (
                          machines.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.type}) - {m.operatingSpeed} RPM/min
                            </option>
                          ))
                        ) : (
                          robots.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.model}) - {r.payload}kg payload
                            </option>
                          ))
                        )}
                        {resType === 'MACHINE' && machines.length === 0 && (
                          <option value="-1">No machines configured</option>
                        )}
                        {resType === 'ROBOT' && robots.length === 0 && (
                          <option value="-1">No robots configured</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!stepName.trim() || resId === -1}
                    className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs py-2.5 rounded-lg transition cursor-pointer flex justify-center items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Sequence Step
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
