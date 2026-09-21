const STORAGE_KEY = "metered-locker-demo-state-v1";

const seed = {
  lockers: [
    { id: "L-01", state: "AVAILABLE", weight: 0, elapsed: 0, health: "HEALTHY", signal: -51, battery: 94, temperature: 23.4 },
    { id: "L-02", state: "STORED", weight: 4200, elapsed: 5420, health: "HEALTHY", signal: -58, battery: 87, temperature: 24.1 },
    { id: "L-03", state: "FAULT", weight: 0, elapsed: 0, health: "SENSOR_OFFLINE", signal: null, battery: 42, temperature: 22.8 },
    { id: "L-04", state: "AVAILABLE", weight: 0, elapsed: 0, health: "HEALTHY", signal: -46, battery: 98, temperature: 23.7 },
    { id: "L-05", state: "FAULT", weight: 28600, elapsed: 0, health: "OVERLOAD", signal: -64, battery: 76, temperature: 24.5 },
    { id: "L-06", state: "AVAILABLE", weight: 0, elapsed: 0, health: "HEALTHY", signal: -53, battery: 91, temperature: 23.2 },
  ],
  history: [
    { id: 1, locker: "L-06", duration: 4360, amount: 2.5, outcome: "Completed", timestamp: "2026-09-20T16:18:00" },
    { id: 2, locker: "L-01", duration: 1880, amount: 2, outcome: "Completed", timestamp: "2026-09-20T14:42:00" },
    { id: 3, locker: "L-03", duration: 0, amount: 0, outcome: "Sensor review", timestamp: "2026-09-20T13:05:00" },
    { id: 4, locker: "L-02", duration: 8120, amount: 3, outcome: "Completed", timestamp: "2026-09-19T18:24:00" },
    { id: 5, locker: "L-04", duration: 2650, amount: 2, outcome: "Completed", timestamp: "2026-09-19T11:16:00" },
  ],
  events: [
    { time: "09:18", text: "Fleet health check complete — 4/6 lockers healthy" },
    { time: "09:19", text: "L-03 sensor heartbeat missed" },
    { time: "09:20", text: "L-05 overload threshold exceeded" },
  ],
};

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));

function readState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : clone(seed);
  } catch {
    return clone(seed);
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return clone(state);
}

export const mockApi = {
  async getDashboard() {
    await wait();
    return readState();
  },

  async saveDashboard(nextState) {
    await wait(120);
    return writeState(nextState);
  },

  async resetDemo() {
    await wait();
    localStorage.removeItem(STORAGE_KEY);
    return clone(seed);
  },

  async getAnalytics() {
    await wait(180);
    const state = readState();
    const completed = state.history.filter((item) => item.outcome === "Completed");
    const revenue = completed.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const avgDuration = completed.length
      ? Math.round(completed.reduce((sum, item) => sum + Number(item.duration || 0), 0) / completed.length)
      : 0;
    const utilization = state.lockers.filter((locker) => ["STORED", "RETRIEVAL"].includes(locker.state)).length / state.lockers.length;

    return {
      sessions: completed.length,
      revenue,
      avgDuration,
      utilization,
      faultCount: state.lockers.filter((locker) => locker.health !== "HEALTHY").length,
    };
  },
};

export const mockApiMeta = {
  mode: "localStorage",
  latency: "simulated",
  endpointExamples: [
    "GET /api/lockers",
    "GET /api/sessions",
    "POST /api/access/verify",
    "PATCH /api/lockers/:id/state",
    "GET /api/analytics",
  ],
};
