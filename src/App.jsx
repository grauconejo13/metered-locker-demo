import { useEffect, useMemo, useRef, useState } from "react";
import { mockApi, mockApiMeta } from "./mockApi";

const EMPTY_THRESHOLD_GRAMS = 40;
const OVERLOAD_GRAMS = 25000;
const BASE_FEE = 2;
const INCLUDED_MINUTES = 60;
const STEP_MINUTES = 30;
const STEP_FEE = 0.5;
const DEMO_CODE = "2468";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours > 0) return `${hours}h ${remainingMins}m`;
  return `${remainingMins}m ${secs}s`;
};

const calculateCharge = (seconds) => {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes <= INCLUDED_MINUTES) return BASE_FEE;
  const extraSteps = Math.ceil((minutes - INCLUDED_MINUTES) / STEP_MINUTES);
  return BASE_FEE + extraSteps * STEP_FEE;
};

const labelFor = (locker) => {
  if (locker.health === "SENSOR_OFFLINE") return "Sensor Fault";
  if (locker.health === "OVERLOAD") return "Overload";
  return {
    AVAILABLE: "Available",
    OPEN: "Door Open",
    STORED: "Occupied",
    RETRIEVAL: "Retrieval",
    COMPLETE: "Complete",
    FAULT: "Fault",
  }[locker.state] ?? locker.state;
};

export default function App() {
  const [view, setView] = useState("operator");
  const [lockers, setLockers] = useState([]);
  const [selectedId, setSelectedId] = useState("L-04");
  const [code, setCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [events, setEvents] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const hydrated = useRef(false);

  const selected = lockers.find((locker) => locker.id === selectedId) ?? lockers[0];
  const selectedLabel = selected ? labelFor(selected) : "Loading";
  const selectedCharge = useMemo(
    () => calculateCharge(selected?.elapsed ?? 0),
    [selected?.elapsed]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      const data = await mockApi.getDashboard();
      if (!active) return;
      setLockers(data.lockers);
      setHistory(data.history);
      setEvents(data.events);
      setLoading(false);
      hydrated.current = true;
    }

    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const timer = window.setTimeout(() => {
      mockApi.saveDashboard({ lockers, history, events });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [lockers, history, events]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLockers((items) =>
        items.map((locker) => {
          if (locker.state === "STORED" && locker.health === "HEALTHY") {
            return {
              ...locker,
              elapsed: locker.elapsed + 1,
              signal: Math.max(-75, Math.min(-40, (locker.signal ?? -55) + (Math.random() > 0.5 ? 1 : -1))),
              temperature: Number((locker.temperature + (Math.random() - 0.5) * 0.08).toFixed(1)),
            };
          }
          return locker;
        })
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (view !== "analytics" || loading) return;
    mockApi.getAnalytics().then(setAnalytics);
  }, [view, lockers, history, loading]);

  const updateLocker = (id, patch) => {
    setLockers((items) =>
      items.map((locker) => (locker.id === id ? { ...locker, ...patch } : locker))
    );
  };

  const pushEvent = (text) => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setEvents((items) => [{ time, text }, ...items].slice(0, 12));
  };

  const chooseLocker = (id) => {
    setSelectedId(id);
    setCode("");
    setAccessError("");
    setReceipt(null);
  };

  const authenticate = () => {
    if (!selected) return;
    if (selected.health !== "HEALTHY") {
      setAccessError("This locker is unavailable until the fault is cleared.");
      return;
    }
    if (code !== DEMO_CODE) {
      setAccessError("Demo code not accepted. Try 2468.");
      pushEvent(`${selected.id} rejected an invalid access code`);
      return;
    }
    setAccessError("");
    if (selected.state === "AVAILABLE") {
      updateLocker(selected.id, { state: "OPEN" });
      pushEvent(`${selected.id} access accepted — door opened for deposit`);
    } else if (selected.state === "STORED") {
      updateLocker(selected.id, { state: "RETRIEVAL" });
      pushEvent(`${selected.id} access accepted — retrieval authorized`);
    }
  };

  const depositItem = () => {
    const simulatedWeight = 1840;
    updateLocker(selected.id, {
      state: "STORED",
      weight: simulatedWeight,
      elapsed: 0,
      startedAt: Date.now(),
    });
    pushEvent(`${selected.id} deposit confirmed — 1.84 kg detected`);
    pushEvent(`${selected.id} metered storage session started`);
  };

  const removeItem = () => {
    const finalCharge = calculateCharge(selected.elapsed);
    const sessionReceipt = {
      locker: selected.id,
      duration: selected.elapsed,
      amount: finalCharge,
      ended: new Date(),
    };

    updateLocker(selected.id, { state: "COMPLETE", weight: 0 });
    setReceipt(sessionReceipt);
    setHistory((items) => [
      {
        id: Date.now(),
        locker: selected.id,
        duration: selected.elapsed,
        amount: finalCharge,
        outcome: "Completed",
        timestamp: new Date().toISOString(),
      },
      ...items,
    ].slice(0, 10));
    pushEvent(`${selected.id} scale returned below ${EMPTY_THRESHOLD_GRAMS} g`);
    pushEvent(`${selected.id} session finalized — ${formatMoney(finalCharge)}`);
  };

  const resetLocker = () => {
    updateLocker(selected.id, {
      state: "AVAILABLE",
      weight: 0,
      elapsed: 0,
      startedAt: null,
    });
    setReceipt(null);
    setCode("");
    pushEvent(`${selected.id} reset and returned to service`);
  };

  const simulateFault = (fault) => {
    const patch =
      fault === "OVERLOAD"
        ? { state: "FAULT", health: "OVERLOAD", weight: OVERLOAD_GRAMS + 3200 }
        : { state: "FAULT", health: "SENSOR_OFFLINE", weight: 0, signal: null };
    updateLocker(selected.id, patch);
    setAccessError("");
    pushEvent(`${selected.id} entered ${fault === "OVERLOAD" ? "overload" : "sensor offline"} fault state`);
  };

  const clearFault = () => {
    updateLocker(selected.id, {
      state: "AVAILABLE",
      health: "HEALTHY",
      weight: 0,
      elapsed: 0,
      signal: -52,
      battery: Math.max(selected.battery ?? 80, 80),
    });
    pushEvent(`${selected.id} maintenance reset passed — locker available`);
  };

  const resetDemo = async () => {
    setLoading(true);
    const data = await mockApi.resetDemo();
    setLockers(data.lockers);
    setHistory(data.history);
    setEvents(data.events);
    setSelectedId("L-04");
    setCode("");
    setReceipt(null);
    setAnalytics(null);
    setLoading(false);
    pushEvent("Demo data reset to seed state");
  };

  const fleetCounts = lockers.reduce(
    (acc, locker) => {
      if (locker.health !== "HEALTHY") acc.fault += 1;
      else if (locker.state === "STORED" || locker.state === "RETRIEVAL") acc.occupied += 1;
      else acc.available += 1;
      return acc;
    },
    { available: 0, occupied: 0, fault: 0 }
  );

  if (loading || !selected) {
    return (
      <main className="app-shell loading-screen">
        <p className="eyebrow">PUBLIC PROTOTYPE · PHASE 3</p>
        <h1>Metered Locker</h1>
        <div className="loading-card">Loading mock operator data…</div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PUBLIC PROTOTYPE · PHASE 3</p>
          <h1>Metered Locker</h1>
        </div>
        <div className="top-actions">
          <span className="demo-pill">MOCK API + LOCAL DATA</span>
          <button className="reset-button" onClick={resetDemo}>Reset demo</button>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Demo views">
        <button className={view === "operator" ? "active" : ""} onClick={() => setView("operator")}>Operator</button>
        <button className={view === "analytics" ? "active" : ""} onClick={() => setView("analytics")}>Analytics</button>
        <button className={view === "api" ? "active" : ""} onClick={() => setView("api")}>Mock API</button>
      </nav>

      {view === "operator" && (
        <>
          <section className="hero">
            <div>
              <p className="eyebrow">SMART STORAGE FLEET</p>
              <h2>Identity, weight, time, state.</h2>
              <p className="lede">
                Phase 3 adds persistent mock sessions, simulated device telemetry,
                analytics, and an API-shaped data layer without exposing production logic.
              </p>
            </div>
            <div className="fleet-summary">
              <div><strong>{fleetCounts.available}</strong><span>Available</span></div>
              <div><strong>{fleetCounts.occupied}</strong><span>Occupied</span></div>
              <div><strong>{fleetCounts.fault}</strong><span>Needs review</span></div>
            </div>
          </section>

          <section className="fleet-section">
            <div className="section-heading">
              <div><p className="eyebrow">LOCKER FLEET</p><h3>Select a compartment</h3></div>
              <span className="microcopy">Demo access code: 2468</span>
            </div>

            <div className="locker-grid">
              {lockers.map((locker) => {
                const fault = locker.health !== "HEALTHY";
                const occupied = locker.state === "STORED" || locker.state === "RETRIEVAL";
                return (
                  <button
                    className={`locker-tile ${selectedId === locker.id ? "selected" : ""} ${fault ? "fault" : ""}`}
                    key={locker.id}
                    onClick={() => chooseLocker(locker.id)}
                  >
                    <div className="tile-top">
                      <span>{locker.id}</span>
                      <span className={`mini-dot ${fault ? "fault-dot" : occupied ? "occupied-dot" : ""}`} />
                    </div>
                    <strong>{labelFor(locker)}</strong>
                    <small>{fault ? locker.health.replace("_", " ") : occupied ? `${(locker.weight / 1000).toFixed(2)} kg · ${formatMoney(calculateCharge(locker.elapsed))}` : "Ready for use"}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid">
            <article className="card locker-card">
              <div className="card-heading">
                <div><p className="eyebrow">SELECTED LOCKER</p><h3>Compartment {selected.id}</h3></div>
                <span className={`badge ${selected.health !== "HEALTHY" ? "badge-fault" : ""}`}>{selectedLabel}</span>
              </div>

              <div className="locker-visual" aria-label="Simulated locker">
                <div className={`locker-door ${selected.state === "OPEN" || selected.state === "RETRIEVAL" ? "door-open" : ""} ${selected.health !== "HEALTHY" ? "locker-fault" : ""}`}>
                  <div className="locker-number">{selected.id.replace("L-", "")}</div>
                  <div className="locker-display">
                    <span>{selected.health !== "HEALTHY" ? selected.health.replace("_", " ") : selected.weight > EMPTY_THRESHOLD_GRAMS ? "ITEM DETECTED" : "READY"}</span>
                    <strong>{(selected.weight / 1000).toFixed(2)} kg</strong>
                  </div>
                  <div className="locker-handle" />
                </div>
              </div>

              <div className="metrics">
                <div><small>Weight</small><strong>{selected.weight} g</strong></div>
                <div><small>Elapsed</small><strong>{formatDuration(selected.elapsed)}</strong></div>
                <div><small>Current charge</small><strong>{selected.state === "AVAILABLE" || selected.state === "FAULT" ? "—" : formatMoney(selectedCharge)}</strong></div>
              </div>

              <div className="telemetry-strip">
                <div><small>Signal</small><strong>{selected.signal == null ? "Offline" : `${selected.signal} dBm`}</strong></div>
                <div><small>Battery</small><strong>{selected.battery}%</strong></div>
                <div><small>Temp</small><strong>{selected.temperature}°C</strong></div>
              </div>
            </article>

            <article className="card controls-card">
              <div className="card-heading">
                <div><p className="eyebrow">ACCESS + CONTROL</p><h3>{selected.id} workflow</h3></div>
              </div>

              {selected.health === "HEALTHY" && (selected.state === "AVAILABLE" || selected.state === "STORED") && (
                <div className="access-box">
                  <label htmlFor="accessCode">Demo access code</label>
                  <div className="access-row">
                    <input
                      id="accessCode"
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
                      inputMode="numeric"
                      placeholder="••••"
                      aria-label="Demo access code"
                    />
                    <button onClick={authenticate}>Unlock</button>
                  </div>
                  {accessError && <p className="error-text">{accessError}</p>}
                </div>
              )}

              <div className="flow">
                {["AVAILABLE", "OPEN", "STORED", "RETRIEVAL", "COMPLETE"].map((step, index) => (
                  <div className={`flow-step ${selected.state === step ? "active" : ""}`} key={step}>
                    {index + 1}<span>{["Access", "Deposit", "Meter", "Retrieve", "Receipt"][index]}</span>
                  </div>
                ))}
              </div>

              <div className="actions">
                {selected.state === "OPEN" && <button onClick={depositItem}>Simulate 1.84 kg deposit</button>}
                {selected.state === "RETRIEVAL" && <button onClick={removeItem}>Simulate item removal</button>}
                {selected.state === "COMPLETE" && <button onClick={resetLocker}>Return locker to service</button>}
                {selected.health !== "HEALTHY" && <button onClick={clearFault}>Simulate maintenance reset</button>}
              </div>

              <div className="fault-controls">
                <span>Operator test controls</span>
                <div>
                  <button disabled={selected.health !== "HEALTHY"} onClick={() => simulateFault("SENSOR_OFFLINE")}>Sensor offline</button>
                  <button disabled={selected.health !== "HEALTHY"} onClick={() => simulateFault("OVERLOAD")}>Overload</button>
                </div>
              </div>

              <div className="pricing">
                <div><small>Demo pricing</small><strong>{formatMoney(BASE_FEE)} first hour</strong></div>
                <span>+</span>
                <div><small>After first hour</small><strong>{formatMoney(STEP_FEE)} / 30 min</strong></div>
              </div>

              <p className="threshold-note">
                Empty threshold ≤ {EMPTY_THRESHOLD_GRAMS} g · Overload threshold &gt; {(OVERLOAD_GRAMS / 1000).toFixed(0)} kg.
              </p>
            </article>
          </section>

          <section className="grid lower-grid">
            <article className="card">
              <div className="card-heading">
                <div><p className="eyebrow">AUDIT TRAIL</p><h3>Recent events</h3></div>
              </div>
              <div className="event-list">
                {events.map((event, index) => (
                  <div className="event" key={`${event.time}-${index}`}>
                    <time>{event.time}</time><span>{event.text}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <div className="card-heading">
                <div><p className="eyebrow">SESSION HISTORY</p><h3>Persisted demo transactions</h3></div>
              </div>
              <div className="history-list">
                {history.slice(0, 6).map((item) => (
                  <div className="history-row" key={item.id}>
                    <div><strong>{item.locker}</strong><small>{item.outcome}</small></div>
                    <span>{item.duration ? formatDuration(item.duration) : "—"}</span>
                    <strong>{item.amount ? formatMoney(item.amount) : "Review"}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="receipt-wrap card">
            <div className="card-heading">
              <div><p className="eyebrow">SESSION OUTPUT</p><h3>Receipt</h3></div>
            </div>
            {receipt ? (
              <div className="receipt">
                <div className="receipt-title">METERED LOCKER</div>
                <div><span>Locker</span><strong>{receipt.locker}</strong></div>
                <div><span>Duration</span><strong>{formatDuration(receipt.duration)}</strong></div>
                <div><span>Ended</span><strong>{receipt.ended.toLocaleTimeString()}</strong></div>
                <div className="receipt-total"><span>Total</span><strong>{formatMoney(receipt.amount)}</strong></div>
                <p>Weight returned to empty threshold. Storage session closed.</p>
              </div>
            ) : (
              <div className="empty-receipt">
                <div className="receipt-icon">▤</div>
                <p>Complete a retrieval from the selected locker to generate a demo receipt.</p>
              </div>
            )}
          </section>
        </>
      )}

      {view === "analytics" && (
        <section className="phase-view">
          <div className="section-heading">
            <div><p className="eyebrow">DEMO ANALYTICS</p><h2 className="view-title">What the fleet is doing.</h2></div>
          </div>

          <div className="analytics-grid">
            <article className="stat-card"><small>Completed sessions</small><strong>{analytics?.sessions ?? "…"}</strong><span>from persisted mock history</span></article>
            <article className="stat-card"><small>Demo revenue</small><strong>{analytics ? formatMoney(analytics.revenue) : "…"}</strong><span>illustrative only</span></article>
            <article className="stat-card"><small>Average duration</small><strong>{analytics ? formatDuration(analytics.avgDuration) : "…"}</strong><span>completed sessions</span></article>
            <article className="stat-card"><small>Current utilization</small><strong>{analytics ? `${Math.round(analytics.utilization * 100)}%` : "…"}</strong><span>occupied / fleet size</span></article>
          </div>

          <div className="grid lower-grid">
            <article className="card">
              <div className="card-heading"><div><p className="eyebrow">LOCKER HEALTH</p><h3>Telemetry snapshot</h3></div></div>
              <div className="telemetry-table">
                <div className="telemetry-head"><span>Locker</span><span>Status</span><span>Signal</span><span>Battery</span></div>
                {lockers.map((locker) => (
                  <div className="telemetry-row" key={locker.id}>
                    <strong>{locker.id}</strong>
                    <span>{labelFor(locker)}</span>
                    <span>{locker.signal == null ? "Offline" : `${locker.signal} dBm`}</span>
                    <span>{locker.battery}%</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <div className="card-heading"><div><p className="eyebrow">OPERATIONS</p><h3>Exception summary</h3></div></div>
              <div className="exception-panel">
                <strong>{analytics?.faultCount ?? fleetCounts.fault}</strong>
                <span>lockers currently need review</span>
                <p>Fault counts come from the same mock data layer as the operator console, so changes are reflected across views.</p>
              </div>
            </article>
          </div>
        </section>
      )}

      {view === "api" && (
        <section className="phase-view">
          <p className="eyebrow">MOCK SERVICE LAYER</p>
          <h2 className="view-title">API-shaped without pretending it is production.</h2>
          <p className="lede">
            Phase 3 moves seeded data behind asynchronous mock methods and persists the demo in the browser.
            These endpoint names document the intended public-demo contract; no live server or production backend is exposed.
          </p>

          <div className="api-grid">
            {mockApiMeta.endpointExamples.map((endpoint) => {
              const [method, ...rest] = endpoint.split(" ");
              return (
                <div className="api-row" key={endpoint}>
                  <span className={`method method-${method.toLowerCase()}`}>{method}</span>
                  <code>{rest.join(" ")}</code>
                  <span className="api-status">mock</span>
                </div>
              );
            })}
          </div>

          <div className="grid lower-grid">
            <article className="card">
              <p className="eyebrow">PERSISTENCE</p>
              <h3>Browser-local demo state</h3>
              <p className="body-copy">
                Locker states, events, and session history survive page refreshes using localStorage.
                Reset Demo restores the original seed dataset.
              </p>
            </article>
            <article className="card">
              <p className="eyebrow">BOUNDARY</p>
              <h3>Still intentionally simulated</h3>
              <p className="body-copy">
                Authentication, payment processing, hardware commands, anti-tamper logic, and production infrastructure remain outside this public repository.
              </p>
            </article>
          </div>
        </section>
      )}

      <footer>
        <span>Metered Locker Demo · Phase 3</span>
        <span>Public simulation — mock API, mock telemetry, browser-local persistence</span>
      </footer>
    </main>
  );
}
