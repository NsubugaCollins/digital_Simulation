import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

// ─── Types ──────────────────────────────────────────────────────────────────

type ModelStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';

interface TrainingState {
  status: ModelStatus;
  metrics: Record<string, any> | null;
  error: string | null;
}

interface TrainingStatusResponse {
  classification: TrainingState;
  rul: TrainingState;
  secom: TrainingState;
}

interface MetricsData {
  status: string;
  metrics?: Record<string, any>;
  features?: string[];
  nFeaturesUsed?: number;
}

type ActiveTab = 'status' | 'classification' | 'rul' | 'secom';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusColor: Record<ModelStatus, string> = {
  IDLE: '#64748b',
  RUNNING: '#f59e0b',
  SUCCESS: '#22c55e',
  FAILED: '#ef4444',
};

const statusBadge = (s: ModelStatus) => (
  <span
    style={{
      background: statusColor[s] + '22',
      color: statusColor[s],
      border: `1px solid ${statusColor[s]}44`,
      borderRadius: 6,
      padding: '2px 10px',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: 1,
    }}
  >
    {s === 'RUNNING' ? '⟳ ' : ''}{s}
  </span>
);

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '12px 18px',
      minWidth: 130,
      flex: '1 1 130px',
    }}>
      <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.7)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: 14,
      padding: 24,
      marginBottom: 20,
    }}>
      <h3 style={{ margin: '0 0 18px', color: '#c7d2fe', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.5 }}>{title}</h3>
      {children}
    </div>
  );
}

// ─── Model Panel (classification / rul / secom) ──────────────────────────────

function ModelPanel({
  label,
  description,
  trainingState,
  onTrain,
  metrics,
  metricsLoading,
  predictionForm,
}: {
  modelKey: 'classification' | 'rul' | 'secom';
  label: string;
  description: string;
  trainingState: TrainingState;
  onTrain: () => void;
  metrics: MetricsData | null;
  metricsLoading: boolean;
  predictionForm: React.ReactNode;
}) {
  const isRunning = trainingState.status === 'RUNNING';

  return (
    <div>
      {/* Header */}
      <SectionCard title={`${label} — Training`}>
        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 0 }}>{description}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Status:</span>
            {statusBadge(trainingState.status)}
          </div>
          <button
            onClick={onTrain}
            disabled={isRunning}
            style={{
              background: isRunning ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 13,
              transition: 'all 0.2s',
            }}
          >
            {isRunning ? 'Training…' : '▶ Train Model'}
          </button>
        </div>
        {trainingState.error && (
          <div style={{ marginTop: 12, color: '#f87171', fontSize: 13, background: 'rgba(239,68,68,0.1)', borderRadius: 6, padding: '8px 12px' }}>
            ⚠ {trainingState.error}
          </div>
        )}
        {trainingState.status === 'SUCCESS' && trainingState.metrics && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#86efac', fontSize: 12, marginBottom: 10 }}>✓ Last training succeeded</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {Object.entries(trainingState.metrics).map(([k, v]) => (
                typeof v === 'number' ? <MetricCard key={k} label={k} value={Number(v).toFixed(4)} /> : null
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Live Metrics */}
      <SectionCard title="Loaded Model Metrics">
        {metricsLoading ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading metrics…</div>
        ) : !metrics || metrics.status === 'NOT_LOADED' ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>No model loaded yet. Train the model to see metrics.</div>
        ) : (
          <div>
            {metrics.nFeaturesUsed !== undefined && (
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
                Features used: <strong style={{ color: '#c7d2fe' }}>{metrics.nFeaturesUsed}</strong>
              </div>
            )}
            {metrics.features && (
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
                Feature columns: <strong style={{ color: '#c7d2fe' }}>{metrics.features.length}</strong>
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {metrics.metrics && Object.entries(metrics.metrics).map(([k, v]) =>
                typeof v === 'number' ? <MetricCard key={k} label={k} value={Number(v).toFixed(4)} /> : null
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Prediction */}
      <SectionCard title="Run Prediction">
        {predictionForm}
      </SectionCard>
    </div>
  );
}

// ─── Classification prediction form ──────────────────────────────────────────

function ClassificationForm() {
  const [form, setForm] = useState({
    type: 'M', airTemperature: 298.1, processTemperature: 308.6,
    rotationalSpeed: 1551, torque: 42.8, toolWear: 0,
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (label: string, key: keyof typeof form, step = 0.1) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</label>
      {key === 'type' ? (
        <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}>
          <option>L</option><option>M</option><option>H</option>
        </select>
      ) : (
        <input type="number" step={step} value={form[key] as number}
          onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
          style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }} />
      )}
    </div>
  );

  const predict = async () => {
    setLoading(true); setError(null); setResult(null);
    try { setResult(await api.predictFailure(form)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
        {field('Product Type', 'type')}
        {field('Air Temp (K)', 'airTemperature')}
        {field('Process Temp (K)', 'processTemperature')}
        {field('Rotational Speed (rpm)', 'rotationalSpeed', 1)}
        {field('Torque (Nm)', 'torque')}
        {field('Tool Wear (min)', 'toolWear', 1)}
      </div>
      <button onClick={predict} disabled={loading}
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', cursor:'pointer', fontWeight:600, fontSize:13 }}>
        {loading ? 'Predicting…' : 'Predict Failure'}
      </button>
      {error && <div style={{ marginTop:12, color:'#f87171', fontSize:13 }}>{error}</div>}
      {result && (
        <div style={{ marginTop:16, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:16 }}>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12 }}>
            <MetricCard label="Machine Failure" value={result.machineFailurePredicted ? '⚠ YES' : '✓ NO'} />
            <MetricCard label="Failure Probability" value={(result.machineFailureProbability * 100).toFixed(1) + '%'} />
          </div>
          <div style={{ color:'#94a3b8', fontSize:12 }}>Failure modes: {
            Object.entries(result.failureModesPredicted || {}).map(([k, v]) =>
              <span key={k} style={{ marginRight:8, color: v ? '#f87171' : '#86efac' }}>{k}: {v ? '⚠' : '✓'}</span>
            )
          }</div>
        </div>
      )}
    </div>
  );
}

// ─── RUL prediction form ──────────────────────────────────────────────────────

function RulForm() {
  const subsets = ['FD001', 'FD002', 'FD003', 'FD004'];
  const [subset, setSubset] = useState('FD001');
  const defaultSensors = {
    setting1: 0, setting2: 0.0002, setting3: 100,
    sensor1: 518.67, sensor2: 641.82, sensor3: 1589.7, sensor4: 1400.6,
    sensor5: 14.62, sensor6: 21.61, sensor7: 554.36, sensor8: 2388.0,
    sensor9: 9046.19, sensor10: 1.3, sensor11: 47.47, sensor12: 521.66,
    sensor13: 2388.0, sensor14: 8138.62, sensor15: 8.4195, sensor16: 0.03,
    sensor17: 392, sensor18: 2388, sensor19: 100.0, sensor20: 39.06, sensor21: 23.4190,
  };
  const [sensors, setSensors] = useState<Record<string, number>>(defaultSensors);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = async () => {
    setLoading(true); setError(null); setResult(null);
    try { setResult(await api.predictRul({ subset, ...sensors })); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <label style={{ color:'#94a3b8', fontSize:11, textTransform:'uppercase', letterSpacing:0.8 }}>C-MAPSS Subset</label>
        <select value={subset} onChange={e => setSubset(e.target.value)}
          style={{ display:'block', marginTop:4, background:'#0f172a', border:'1px solid rgba(99,102,241,0.3)', color:'#e2e8f0', borderRadius:6, padding:'6px 10px', fontSize:13 }}>
          {subsets.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <details style={{ marginBottom:14 }}>
        <summary style={{ color:'#94a3b8', fontSize:13, cursor:'pointer' }}>Sensor readings (21 sensors + 3 settings) — click to expand</summary>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:8, marginTop:10 }}>
          {Object.entries(sensors).map(([k, v]) => (
            <div key={k} style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <label style={{ color:'#64748b', fontSize:10 }}>{k}</label>
              <input type="number" step="any" value={v}
                onChange={e => setSensors(s => ({ ...s, [k]: parseFloat(e.target.value) }))}
                style={{ background:'#0f172a', border:'1px solid rgba(99,102,241,0.2)', color:'#e2e8f0', borderRadius:5, padding:'4px 8px', fontSize:12 }} />
            </div>
          ))}
        </div>
      </details>
      <button onClick={predict} disabled={loading}
        style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', cursor:'pointer', fontWeight:600, fontSize:13 }}>
        {loading ? 'Predicting…' : 'Predict RUL'}
      </button>
      {error && <div style={{ marginTop:12, color:'#f87171', fontSize:13 }}>{error}</div>}
      {result && (
        <div style={{ marginTop:16, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:16 }}>
          <MetricCard label={`Predicted RUL (${result.subset})`} value={`${result.predictedRUL} cycles`} />
        </div>
      )}
    </div>
  );
}

// ─── Status Overview ─────────────────────────────────────────────────────────

function StatusOverview({ status }: { status: TrainingStatusResponse | null }) {
  if (!status) return <div style={{ color:'#94a3b8', fontSize:13 }}>Loading status…</div>;

  const models = [
    { key: 'classification', label: 'AI4I 2020 — Failure Classification' },
    { key: 'rul', label: 'C-MAPSS — Remaining Useful Life' },
    { key: 'secom', label: 'SECOM — Wafer Defect Detection' },
  ] as const;

  return (
    <div style={{ display:'grid', gap:14 }}>
      {models.map(({ key, label }) => {
        const s = status[key];
        return (
          <div key={key} style={{
            background:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:12,
            padding:'16px 20px',
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            flexWrap:'wrap',
            gap:12,
          }}>
            <div>
              <div style={{ color:'#e2e8f0', fontWeight:600, fontSize:14 }}>{label}</div>
              {s.error && <div style={{ color:'#f87171', fontSize:12, marginTop:4 }}>Error: {s.error}</div>}
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              {statusBadge(s.status)}
              {s.metrics && s.status === 'SUCCESS' && (
                <span style={{ color:'#86efac', fontSize:12 }}>
                  {Object.entries(s.metrics).filter(([,v]) => typeof v === 'number').slice(0, 2).map(([k, v]) =>
                    `${k}: ${Number(v).toFixed(3)}`
                  ).join(' · ')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PredictiveMaintenance() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('status');
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatusResponse | null>(null);
  const [metrics, setMetrics] = useState<{
    classification: MetricsData | null;
    rul: MetricsData | null;
    secom: MetricsData | null;
  }>({ classification: null, rul: null, secom: null });
  const [metricsLoading, setMetricsLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await api.getTrainingStatus();
      setTrainingStatus(s);
    } catch { /* engine may not be running */ }
  }, []);

  const refreshMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const [cls, rul, secom] = await Promise.allSettled([
        api.getClassificationMetrics(),
        api.getRulMetrics(),
        api.getSecomMetrics(),
      ]);
      setMetrics({
        classification: cls.status === 'fulfilled' ? cls.value : null,
        rul: rul.status === 'fulfilled' ? rul.value : null,
        secom: secom.status === 'fulfilled' ? secom.value : null,
      });
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Poll status every 4 s while a training job is running
  useEffect(() => {
    refreshStatus();
    const id = setInterval(refreshStatus, 4000);
    return () => clearInterval(id);
  }, [refreshStatus]);

  useEffect(() => { refreshMetrics(); }, [refreshMetrics]);

  const train = async (model: 'classification' | 'rul' | 'secom') => {
    try {
      if (model === 'classification') await api.trainClassification();
      else if (model === 'rul') await api.trainRul();
      else await api.trainSecom();
      await refreshStatus();
    } catch (e: any) {
      console.error('Training trigger error:', e.message);
    }
  };

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'status', label: '🔍 Overview' },
    { key: 'classification', label: '🤖 Failure Classification' },
    { key: 'rul', label: '⏱ RUL (C-MAPSS)' },
    { key: 'secom', label: '🔬 Defect Detection' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, color: '#e2e8f0', fontSize: 24, fontWeight: 700 }}>
          Predictive Maintenance
        </h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 14 }}>
          ML-powered prognostics — machine failure, remaining useful life, and wafer defect detection
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px',
              color: activeTab === t.key ? '#818cf8' : '#64748b',
              fontWeight: activeTab === t.key ? 700 : 500,
              fontSize: 13,
              borderBottom: activeTab === t.key ? '2px solid #818cf8' : '2px solid transparent',
              transition: 'all 0.2s',
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
        <button onClick={() => { refreshStatus(); refreshMetrics(); }}
          title="Refresh all"
          style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'center' }}>
          ↺ Refresh
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'status' && (
        <div>
          <SectionCard title="Training Job Status">
            <StatusOverview status={trainingStatus} />
          </SectionCard>
        </div>
      )}

      {activeTab === 'classification' && (
        <ModelPanel
          modelKey="classification"
          label="AI4I 2020"
          description="Multi-label random-forest classifier trained on the AI4I 2020 Predictive Maintenance dataset. Predicts machine failure and individual failure modes (TWF, HDF, PWF, OSF, RNF)."
          trainingState={trainingStatus?.classification || { status: 'IDLE', metrics: null, error: null }}
          onTrain={() => train('classification')}
          metrics={metrics.classification}
          metricsLoading={metricsLoading}
          predictionForm={<ClassificationForm />}
        />
      )}

      {activeTab === 'rul' && (
        <ModelPanel
          modelKey="rul"
          label="C-MAPSS (NASA)"
          description="Gradient-boosted regressor trained on the NASA C-MAPSS turbofan engine degradation dataset. Predicts Remaining Useful Life (RUL) in engine cycles across subsets FD001–FD004."
          trainingState={trainingStatus?.rul || { status: 'IDLE', metrics: null, error: null }}
          onTrain={() => train('rul')}
          metrics={metrics.rul}
          metricsLoading={metricsLoading}
          predictionForm={<RulForm />}
        />
      )}

      {activeTab === 'secom' && (
        <ModelPanel
          modelKey="secom"
          label="SECOM"
          description="Calibrated random-forest classifier for semiconductor wafer defect detection. Trained on the SECOM dataset (590 sensor features). Supports balanced and precision operating modes."
          trainingState={trainingStatus?.secom || { status: 'IDLE', metrics: null, error: null }}
          onTrain={() => train('secom')}
          metrics={metrics.secom}
          metricsLoading={metricsLoading}
          predictionForm={
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              SECOM predictions require 590 sensor readings. Use the Python engine API directly at
              <code style={{ color: '#818cf8', marginLeft: 6 }}>POST /predict/secom</code> with your sensor array,
              or integrate the sensor inputs into your manufacturing data pipeline.
            </div>
          }
        />
      )}
    </div>
  );
}
