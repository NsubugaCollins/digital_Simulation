import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Factory, Cpu, Hammer, Trash2, Plus, Zap, RefreshCw, Layers } from 'lucide-react';

interface FactoryDesignerProps {
  onFactorySelected: (factory: any) => void;
  selectedFactory: any;
}

export const FactoryDesigner: React.FC<FactoryDesignerProps> = ({ onFactorySelected, selectedFactory }) => {
  const [factories, setFactories] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Factory Form
  const [newFactoryName, setNewFactoryName] = useState('');
  const [newFactoryLoc, setNewFactoryLoc] = useState('');

  // New Machine Form
  const [mName, setMName] = useState('');
  const [mType, setMType] = useState('CNC Cutter');
  const [mManufacturer, setMManufacturer] = useState('Siemens');
  const [mPower, setMPower] = useState(15.0);
  const [mSpeed, setMSpeed] = useState(120.0);
  const [mMaint, setMMaint] = useState(100);

  // New Robot Form
  const [rName, setRName] = useState('');
  const [rModel, setRModel] = useState('ABB IRB 1200');
  const [rPayload, setRPayload] = useState(7.0);
  const [rAccuracy, setRAccuracy] = useState(0.02);

  const fetchFactories = async () => {
    try {
      const data = await api.getFactories();
      setFactories(data);
      if (data.length > 0 && !selectedFactory) {
        onFactorySelected(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDetails = async () => {
    if (!selectedFactory) return;
    setLoading(true);
    try {
      const mData = await api.getMachines(selectedFactory.id);
      const rData = await api.getRobots(selectedFactory.id);
      setMachines(mData);
      setRobots(rData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactories();
  }, []);

  useEffect(() => {
    fetchDetails();
  }, [selectedFactory]);

  const handleCreateFactory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactoryName.trim()) return;
    try {
      const newFact = await api.createFactory({ name: newFactoryName, location: newFactoryLoc });
      setNewFactoryName('');
      setNewFactoryLoc('');
      fetchFactories();
      onFactorySelected(newFact);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFactory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this factory?')) return;
    try {
      await api.deleteFactory(id);
      if (selectedFactory?.id === id) {
        onFactorySelected(null);
      }
      fetchFactories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactory || !mName.trim()) return;
    try {
      await api.createMachine(selectedFactory.id, {
        name: mName,
        type: mType,
        manufacturer: mManufacturer,
        powerConsumption: mPower,
        operatingSpeed: mSpeed,
        maintenanceInterval: mMaint,
        status: 'RUNNING',
      });
      setMName('');
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMachine = async (id: number) => {
    try {
      await api.deleteMachine(id);
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRobot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactory || !rName.trim()) return;
    try {
      await api.createRobot(selectedFactory.id, {
        name: rName,
        model: rModel,
        payload: rPayload,
        accuracy: rAccuracy,
        status: 'RUNNING',
      });
      setRName('');
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRobot = async (id: number) => {
    try {
      await api.deleteRobot(id);
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4">
      {/* Sidebar: Factories List */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Factory className="h-5 w-5 text-cyan-400" />
          Factories
        </h3>
        
        {/* Create Factory */}
        <form onSubmit={handleCreateFactory} className="space-y-2 border-b border-slate-800 pb-4">
          <input
            type="text"
            placeholder="Factory Name"
            value={newFactoryName}
            onChange={(e) => setNewFactoryName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
            required
          />
          <input
            type="text"
            placeholder="Location (e.g. Detroit, USA)"
            value={newFactoryLoc}
            onChange={(e) => setNewFactoryLoc(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs py-2 rounded-lg transition cursor-pointer flex justify-center items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Factory
          </button>
        </form>

        {/* Factories Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] lg:max-h-[600px]">
          {factories.map((f) => (
            <div
              key={f.id}
              onClick={() => onFactorySelected(f)}
              className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                selectedFactory?.id === f.id
                  ? 'bg-cyan-950/20 border-cyan-500/80 text-cyan-200'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div>
                <h4 className="font-semibold text-sm text-slate-100">{f.name}</h4>
                <p className="text-xs text-slate-400">{f.location || 'Unknown location'}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFactory(f.id);
                }}
                className="text-slate-500 hover:text-red-400 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {factories.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No factories created yet.</p>
          )}
        </div>
      </div>

      {/* Main Content: Layout Design */}
      <div className="lg:col-span-3 space-y-6">
        {!selectedFactory ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <Factory className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-300">No Factory Selected</h3>
            <p className="text-sm text-slate-500 mt-2">Select a factory from the sidebar or create a new one to begin designing.</p>
          </div>
        ) : (
          <>
            {/* Factory Floor Grid Representation */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                {loading ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-950 border border-slate-800 rounded-md px-2 py-1 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin text-cyan-400" />
                    Loading Twin...
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-950 border border-slate-800 rounded-md px-2 py-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                    Twin Sync: ACTIVE
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Layers className="h-5 w-5 text-cyan-400" />
                {selectedFactory.name} Floor Layout
              </h3>

              {/* Grid visualization */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 min-h-[160px] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {machines.map((m) => (
                  <div key={`m-${m.id}`} className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3 flex flex-col justify-between relative group transition">
                    <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-400" title="RUNNING" />
                    <div>
                      <Cpu className="h-6 w-6 text-cyan-400 mb-2" />
                      <h4 className="text-xs font-bold text-slate-200 truncate">{m.name}</h4>
                      <p className="text-[10px] text-slate-500">{m.type}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                        <Zap className="h-3 w-3 text-amber-500" /> {m.powerConsumption}kW
                      </span>
                      <button
                        onClick={() => handleDeleteMachine(m.id)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {robots.map((r) => (
                  <div key={`r-${r.id}`} className="bg-slate-900/60 border border-slate-800 hover:border-violet-500/40 rounded-xl p-3 flex flex-col justify-between relative group transition">
                    <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-400" title="RUNNING" />
                    <div>
                      <Hammer className="h-6 w-6 text-violet-400 mb-2" />
                      <h4 className="text-xs font-bold text-slate-200 truncate">{r.name}</h4>
                      <p className="text-[10px] text-slate-500">{r.model}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400">
                        {r.payload}kg payload
                      </span>
                      <button
                        onClick={() => handleDeleteRobot(r.id)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {machines.length === 0 && robots.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-600 text-xs">
                    Floor layout is empty. Add machines or robots below to populate.
                  </div>
                )}
              </div>
            </div>

            {/* Config Forms: Add Machine & Add Robot side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Add Machine Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  Add Machine resource
                </h4>
                <form onSubmit={handleAddMachine} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Name</label>
                      <input
                        type="text"
                        placeholder="CNC Cutter"
                        value={mName}
                        onChange={(e) => setMName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Type</label>
                      <select
                        value={mType}
                        onChange={(e) => setMType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="CNC Cutter">CNC Cutter</option>
                        <option value="Metal Drill">Metal Drill</option>
                        <option value="Packaging Line">Packaging Line</option>
                        <option value="Inspection Station">Inspection Station</option>
                        <option value="Solder Station">Solder Station</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Manufacturer</label>
                      <input
                        type="text"
                        value={mManufacturer}
                        onChange={(e) => setMManufacturer(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Power (kW)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={mPower}
                        onChange={(e) => setMPower(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Operating Speed (Units/min)</label>
                      <input
                        type="number"
                        step="1"
                        value={mSpeed}
                        onChange={(e) => setMSpeed(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Maint. Interval (Hours)</label>
                      <input
                        type="number"
                        value={mMaint}
                        onChange={(e) => setMMaint(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300 font-semibold text-xs py-2.5 rounded-lg transition cursor-pointer flex justify-center items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Machine Resource
                  </button>
                </form>
              </div>

              {/* Add Robot Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-1.5">
                  <Hammer className="h-4 w-4 text-violet-400" />
                  Add Robot resource
                </h4>
                <form onSubmit={handleAddRobot} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Name</label>
                      <input
                        type="text"
                        placeholder="Assembly Arm"
                        value={rName}
                        onChange={(e) => setRName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Model</label>
                      <select
                        value={rModel}
                        onChange={(e) => setRModel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="ABB IRB 1200">ABB IRB 1200</option>
                        <option value="KUKA KR 6 R900">KUKA KR 6 R900</option>
                        <option value="Fanuc M-10iA">Fanuc M-10iA</option>
                        <option value="Universal Robots UR10">Universal Robots UR10</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Payload (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={rPayload}
                        onChange={(e) => setRPayload(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Accuracy (mm)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={rAccuracy}
                        onChange={(e) => setRAccuracy(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {/* Spacer to align buttons */}
                  <div className="h-[52px] hidden md:block"></div>

                  <button
                    type="submit"
                    className="w-full bg-slate-950 border border-slate-800 hover:border-violet-500/40 text-violet-400 hover:text-violet-300 font-semibold text-xs py-2.5 rounded-lg transition cursor-pointer flex justify-center items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Robot Resource
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
