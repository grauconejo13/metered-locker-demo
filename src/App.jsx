import { useEffect, useMemo, useRef, useState } from "react";

const EMPTY_THRESHOLD_GRAMS = 40;
const BASE_FEE = 2;
const INCLUDED_MINUTES = 60;
const STEP_MINUTES = 30;
const STEP_FEE = 0.5;

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours > 0) return `${hours}h ${remainingMins}m ${secs}s`;
  return `${remainingMins}m ${secs}s`;
};

const calculateCharge = (seconds) => {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes <= INCLUDED_MINUTES) return BASE_FEE;
  const extraSteps = Math.ceil((minutes - INCLUDED_MINUTES) / STEP_MINUTES);
  return BASE_FEE + extraSteps * STEP_FEE;
};

const initialEvents = [
  { time: "09:18", text: "Locker L-04 health check passed" },
  { time: "09:19", text: "Scale auto-zero complete" },
];

export default function App() {
  const [state, setState] = useState("AVAILABLE");
  const [weight, setWeight] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [events, setEvents] = useState(initialEvents);
  const [receipt, setReceipt] = useState(null);
  const startedAt = useRef(null);

  const occupied = weight > EMPTY_THRESHOLD_GRAMS;
  const charge = useMemo(() => calculateCharge(elapsed), [elapsed]);

  useEffect(() => {
    if (state !== "STORED") return;
    const timer = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  const pushEvent = (text) => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setEvents((items) => [{ time, text }, ...items].slice(0, 8));
  };

  const openLocker = () => {
    setReceipt(null);
    setState("OPEN");
    pushEvent("Access code accepted — Locker L-04 opened");
  };

  const depositItem = () => {
    const simulatedWeight = 1840;
    setWeight(simulatedWeight);
    setElapsed(0);
    startedAt.current = new Date();
    setState("STORED");
    pushEvent(`Deposit confirmed — ${(simulatedWeight / 1000).toFixed(2)} kg detected`);
    pushEvent("Metered storage session started");
  };

  const beginRetrieval = () => {
    setState("RETRIEVAL");
    pushEvent("Customer authenticated for retrieval");
  };

  const removeItem = () => {
    setWeight(0);
    const endedAt = new Date();
    const finalCharge = calculateCharge(elapsed);
    setReceipt({
      locker: "L-04",
      started: startedAt.current ?? new Date(),
      ended: endedAt,
      duration: elapsed,
      amount: finalCharge,
    });
    setState("COMPLETE");
    pushEvent("Scale returned to empty threshold");
    pushEvent(`Session finalized — ${formatMoney(finalCharge)}`);
  };

  const reset = () => {
    setState("AVAILABLE");
    setWeight(0);
    setElapsed(0);
    startedAt.current = null;
    pushEvent("Locker reset and available");
  };

  const stateLabel = {
    AVAILABLE: "Available",
    OPEN: "Door Open",
    STORED: "Occupied",
    RETRIEVAL: "Retrieval",
    COMPLETE: "Complete",
  }[state];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PUBLIC PROTOTYPE</p>
          <h1>Metered Locker</h1>
        </div>
        <span className="demo-pill">SIMULATION MODE</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">LOCKER L-04</p>
          <h2>Storage that closes the tab when the locker is empty.</h2>
          <p className="lede">
            A front-end proof of concept for weight-aware, usage-based smart storage.
            Hardware readings are simulated in this public demo.
          </p>
        </div>
        <div className="status-panel">
          <span className="status-dot" />
          <div>
            <small>Current state</small>
            <strong>{stateLabel}</strong>
          </div>
        </div>
      </section>

      <section className="grid">
        <article className="card locker-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">LIVE LOCKER</p>
              <h3>Compartment L-04</h3>
            </div>
            <span className="badge">{stateLabel}</span>
          </div>

          <div className="locker-visual" aria-label="Simulated locker">
            <div className={`locker-door ${state === "OPEN" || state === "RETRIEVAL" ? "door-open" : ""}`}>
              <div className="locker-number">04</div>
              <div className="locker-display">
                <span>{occupied ? "ITEM DETECTED" : "READY"}</span>
                <strong>{(weight / 1000).toFixed(2)} kg</strong>
              </div>
              <div className="locker-handle" />
            </div>
          </div>

          <div className="metrics">
            <div>
              <small>Weight</small>
              <strong>{weight} g</strong>
            </div>
            <div>
              <small>Elapsed</small>
              <strong>{formatDuration(elapsed)}</strong>
            </div>
            <div>
              <small>Current charge</small>
              <strong>{state === "AVAILABLE" ? "—" : formatMoney(charge)}</strong>
            </div>
          </div>
        </article>

        <article className="card controls-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">DEMO CONTROLS</p>
              <h3>Run a storage session</h3>
            </div>
          </div>

          <div className="flow">
            <div className={`flow-step ${state === "AVAILABLE" ? "active" : ""}`}>1<span>Authenticate</span></div>
            <div className={`flow-step ${state === "OPEN" ? "active" : ""}`}>2<span>Deposit</span></div>
            <div className={`flow-step ${state === "STORED" ? "active" : ""}`}>3<span>Meter</span></div>
            <div className={`flow-step ${state === "RETRIEVAL" ? "active" : ""}`}>4<span>Retrieve</span></div>
            <div className={`flow-step ${state === "COMPLETE" ? "active" : ""}`}>5<span>Receipt</span></div>
          </div>

          <div className="actions">
            {state === "AVAILABLE" && <button onClick={openLocker}>Enter demo code</button>}
            {state === "OPEN" && <button onClick={depositItem}>Simulate item deposit</button>}
            {state === "STORED" && <button onClick={beginRetrieval}>Return to locker</button>}
            {state === "RETRIEVAL" && <button onClick={removeItem}>Simulate item removal</button>}
            {state === "COMPLETE" && <button onClick={reset}>Reset locker</button>}
          </div>

          <div className="pricing">
            <div>
              <small>Demo pricing</small>
              <strong>{formatMoney(BASE_FEE)} first hour</strong>
            </div>
            <span>+</span>
            <div>
              <small>After first hour</small>
              <strong>{formatMoney(STEP_FEE)} / 30 min</strong>
            </div>
          </div>

          <p className="threshold-note">
            Empty is treated as ≤ {EMPTY_THRESHOLD_GRAMS} g, allowing for real-world sensor drift.
          </p>
        </article>
      </section>

      <section className="grid lower-grid">
        <article className="card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">AUDIT TRAIL</p>
              <h3>Recent events</h3>
            </div>
          </div>
          <div className="event-list">
            {events.map((event, index) => (
              <div className="event" key={`${event.time}-${index}`}>
                <time>{event.time}</time>
                <span>{event.text}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card receipt-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">SESSION OUTPUT</p>
              <h3>Receipt</h3>
            </div>
          </div>

          {receipt ? (
            <div className="receipt">
              <div className="receipt-title">METERED LOCKER</div>
              <div><span>Locker</span><strong>{receipt.locker}</strong></div>
              <div><span>Started</span><strong>{receipt.started.toLocaleTimeString()}</strong></div>
              <div><span>Ended</span><strong>{receipt.ended.toLocaleTimeString()}</strong></div>
              <div><span>Duration</span><strong>{formatDuration(receipt.duration)}</strong></div>
              <div className="receipt-total"><span>Total</span><strong>{formatMoney(receipt.amount)}</strong></div>
              <p>Thank you. Your storage session is closed.</p>
            </div>
          ) : (
            <div className="empty-receipt">
              <div className="receipt-icon">▤</div>
              <p>A receipt will appear when the item is removed and the scale confirms the locker is empty.</p>
            </div>
          )}
        </article>
      </section>

      <footer>
        <span>Metered Locker Demo</span>
        <span>Public simulation — no real billing or hardware control</span>
      </footer>
    </main>
  );
}
