import { useEffect, useMemo, useState } from "react";

const EMPTY_THRESHOLD_GRAMS = 40;
const OVERLOAD_GRAMS = 25000;
const BASE_FEE = 2;
const INCLUDED_MINUTES = 60;
const STEP_MINUTES = 30;
const STEP_FEE = 0.5;
const DEMO_CODE = "2468";

const initialLockers = [
  { id: "L-01", state: "AVAILABLE", weight: 0, elapsed: 0, health: "HEALTHY" },
  { id: "L-02", state: "STORED", weight: 4200, elapsed: 5420, health: "HEALTHY" },
  { id: "L-03", state: "FAULT", weight: 0, elapsed: 0, health: "SENSOR_OFFLINE" },
  { id: "L-04", state: "AVAILABLE", weight: 0, elapsed: 0, health: "HEALTHY" },
  { id: "L-05", state: "FAULT", weight: 28600, elapsed: 0, health: "OVERLOAD" },
  { id: "L-06", state: "AVAILABLE", weight: 0, elapsed: 0, health: "HEALTHY" },
];

const initialHistory = [
  { id: 1, locker: "L-06", duration: 4360, amount: 2.5, outcome: "Completed" },
  { id: 2, locker: "L-01", duration: 1880, amount: 2, outcome: "Completed" },
  { id: 3, locker: "L-03", duration: 0, amount: 0, outcome: "Sensor review" },
];

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
  const [lockers, setLockers] = useState(initialLockers);
  const [selectedId, setSelectedId] = useState("L-04");
  const [code, setCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [events, setEvents] = useState([
    { time: "09:18", text: "Fleet health check complete — 4/6 lockers healthy" },
    { time: "09:19", text: "L-03 sensor heartbeat missed" },
    { time: "09:20", text: "L-05 overload threshold exceeded" },
  ]);
  const [receipt, setReceipt] = useState(null);
  const [history, setHistory] = useState(initialHistory);

  const selected = lockers.find((locker) => locker.id === selectedId) ?? lockers[0];
  const selectedLabel = labelFor(selected);
  const selectedCharge = useMemo(() => calculateCharge(selected.elapsed), [selected.elapsed]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLockers((items) =>
        items.map((locker) =>
          locker.state === "STORED" && locker.health === "HEALTHY"
            ? { ...locker, elapsed: locker.elapsed + 1 }
            : locker
        )
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const updateLocker = (id, patch) => {
    setLockers((items) =>
      items.map((locker) => (locker.id === id ? { ...locker, ...patch } : locker))
    );
  };

  const pushEvent = (text) => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setEvents((items) => [{ time, text }, ...items].slice(0, 10));
  };

  const chooseLocker = (id) => {
    setSelectedId(id);
    setCode("");
    setAccessError("");
    setReceipt(null);
  };

  const authenticate = () => {
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
      },
      ...items,
    ].slice(0, 6));
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
        : { state: "FAULT", health: "SENSOR_OFFLINE", weight: 0 };
    updateLocker(selected.id, patch);
    setAccessError("");
    pushEvent(`${selected.id} entered ${fault === "OVERLOAD" ? "overload" : "sensor offline"} fault state`);
  };

  const clearFault = () => {
    updateLocker(selected.id, { state: "AVAILABLE", health: "HEALTHY", weight: 0, elapsed: 0 });
    pushEvent(`${selected.id} maintenance reset passed — locker available`);
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PUBLIC PROTOTYPE · PHASE 2</p>
          <h1>Metered Locker</h1>
        </div>
        <span className="demo-pill">SIMULATION MODE</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">SMART STORAGE FLEET</p>
          <h2>Identity, weight, time, state.</h2>
          <p className="lede">
            A simulated operator console for usage-based lockers. Select a compartment,
            authenticate with a demo code, run a storage session, or inspect fault states.
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
          <div>
            <p className="eyebrow">LOCKER FLEET</p>
            <h3>Select a compartment</h3>
          </div>
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
            <div>
              <p className="eyebrow">SELECTED LOCKER</p>
              <h3>Compartment {selected.id}</h3>
            </div>
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
        </article>

        <article className="card controls-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">ACCESS + CONTROL</p>
              <h3>{selected.id} workflow</h3>
            </div>
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
            <div><p className="eyebrow">SESSION HISTORY</p><h3>Recent transactions</h3></div>
          </div>
          <div className="history-list">
            {history.map((item) => (
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

      <footer>
        <span>Metered Locker Demo · Phase 2</span>
        <span>Public simulation — no real billing, authentication, or hardware control</span>
      </footer>
    </main>
  );
}
