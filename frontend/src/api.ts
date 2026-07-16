const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';

const getHeaders = () => {
  const token = localStorage.getItem('frex_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Auth
  login: async (payload: any) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text() || 'Login failed');
    return res.json();
  },

  register: async (payload: any) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text() || 'Registration failed');
    return res.json();
  },

  // Factories
  getFactories: async () => {
    const res = await fetch(`${API_BASE_URL}/factories`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch factories');
    return res.json();
  },

  createFactory: async (payload: any) => {
    const res = await fetch(`${API_BASE_URL}/factories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create factory');
    return res.json();
  },

  deleteFactory: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/factories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete factory');
  },

  // Machines
  getMachines: async (factoryId: number) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/machines`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch machines');
    return res.json();
  },

  createMachine: async (factoryId: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/machines`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create machine');
    return res.json();
  },

  updateMachine: async (id: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/machines/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update machine');
    return res.json();
  },

  deleteMachine: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/machines/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete machine');
  },

  // Robots
  getRobots: async (factoryId: number) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/robots`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch robots');
    return res.json();
  },

  createRobot: async (factoryId: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/robots`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create robot');
    return res.json();
  },

  updateRobot: async (id: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/robots/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update robot');
    return res.json();
  },

  deleteRobot: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/robots/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete robot');
  },

  // Processes
  getProcesses: async (factoryId: number) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/processes`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch processes');
    return res.json();
  },

  createProcess: async (factoryId: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/processes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create process');
    return res.json();
  },

  updateProcess: async (id: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/processes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update process');
    return res.json();
  },

  deleteProcess: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/processes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete process');
  },

  // Process Steps
  addProcessStep: async (processId: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/processes/${processId}/steps`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to add process step');
    return res.json();
  },

  updateProcessStep: async (stepId: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/processes/steps/${stepId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update process step');
    return res.json();
  },

  deleteProcessStep: async (stepId: number) => {
    const res = await fetch(`${API_BASE_URL}/processes/steps/${stepId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete process step');
  },

  // Simulations
  getSimulations: async (factoryId: number) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/simulations`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch simulations');
    return res.json();
  },

  runSimulation: async (factoryId: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/simulations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to run simulation');
    return res.json();
  },

  compareScenarios: async (factoryId: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/simulations/compare`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to run scenario comparison');
    return res.json();
  },

  optimizeProcess: async (processId: number) => {
    const res = await fetch(`${API_BASE_URL}/processes/${processId}/optimize`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to run optimization');
    return res.json();
  },

  // Predictive Maintenance
  getTrainingStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/predictive/status`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch training status');
    return res.json();
  },

  trainClassification: async () => {
    const res = await fetch(`${API_BASE_URL}/predictive/train/classification`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to trigger classification training');
    return res.json();
  },

  trainRul: async () => {
    const res = await fetch(`${API_BASE_URL}/predictive/train/rul`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to trigger RUL training');
    return res.json();
  },

  trainSecom: async () => {
    const res = await fetch(`${API_BASE_URL}/predictive/train/secom`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to trigger SECOM training');
    return res.json();
  },

  getClassificationMetrics: async () => {
    const res = await fetch(`${API_BASE_URL}/predictive/metrics/classification`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch classification metrics');
    return res.json();
  },

  getRulMetrics: async () => {
    const res = await fetch(`${API_BASE_URL}/predictive/metrics/rul`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch RUL metrics');
    return res.json();
  },

  getSecomMetrics: async () => {
    const res = await fetch(`${API_BASE_URL}/predictive/metrics/secom`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch SECOM metrics');
    return res.json();
  },

  predictFailure: async (payload: any) => {
    const res = await fetch(`${API_BASE_URL}/predictive/predict/failure`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to run failure prediction');
    return res.json();
  },

  predictRul: async (payload: any) => {
    const res = await fetch(`${API_BASE_URL}/predictive/predict/rul`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to run RUL prediction');
    return res.json();
  },

  // Operational Logs & Reports
  getOperationalLogs: async (factoryId: number) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/operational-logs`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch operational logs');
    return res.json();
  },

  getOperationalLogsByProcess: async (processId: number) => {
    const res = await fetch(`${API_BASE_URL}/processes/${processId}/operational-logs`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch operational logs for process');
    return res.json();
  },

  createOperationalLog: async (factoryId: number, payload: any) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/operational-logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create operational log');
    return res.json();
  },

  generateMockOperationalLog: async (factoryId: number, simulationId: number) => {
    const res = await fetch(`${API_BASE_URL}/factories/${factoryId}/operational-logs/generate?simulationId=${simulationId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate mock operational log');
    return res.json();
  },

  deleteOperationalLog: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/operational-logs/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete operational log');
  },

  getEngineeringReport: async (simulationId: number) => {
    const res = await fetch(`${API_BASE_URL}/simulations/${simulationId}/report`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch engineering report');
    return res.json();
  },
};
