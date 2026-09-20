# Metered Locker Demo

A public proof-of-concept for a **weight-aware, usage-based smart storage locker**.

The idea: a customer authenticates, deposits an item, storage time is metered, and the session automatically closes after authorized retrieval when the locker returns to its empty-weight threshold.

> This repository is intentionally a demonstration implementation. Production hardware integration, billing logic, security controls, anti-tamper rules, and operational systems are maintained separately.

## Phase 1 — simulated workflow

This version demonstrates:

- Locker states: `AVAILABLE → OPEN → STORED → RETRIEVAL → COMPLETE`
- Simulated load-cell readings
- Empty-weight threshold logic
- Running storage timer
- Example metered pricing
- Event / audit trail
- Automatic session finalization after item removal
- Receipt generation
- Responsive UI

No real payments are processed and no physical locker is controlled by this repository.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Demo pricing

For the public simulation:

- $2.00 includes the first hour
- $0.50 per additional 30 minutes
- Empty threshold: ≤ 40 g

These values exist only to demonstrate the metering workflow.

## Planned public-demo milestones

**Phase 2**
- Multi-locker dashboard
- Simulated access codes
- Session history
- Fault states such as overload, unstable weight, and sensor offline

**Phase 3**
- Mock REST API
- Persisted demo sessions
- Operator view
- Basic analytics

Physical sensor integration and production billing remain outside the public demo.

## Concept architecture

```text
Customer
   ↓
Access / locker state
   ↓
Weight signal
   ↓
Session engine
   ↓
Metered charge
   ↓
Audit event + receipt
```

## Why this exists

The project explores a simple systems question:

**Can the physical state of a locker help drive the software state of a storage transaction?**

The demo uses weight as one signal for occupancy and session completion while accounting for real-world sensor drift through a configurable empty threshold.
