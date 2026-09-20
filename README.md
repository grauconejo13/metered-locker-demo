# Metered Locker Demo

A public proof-of-concept for a **weight-aware, usage-based smart storage locker platform**.

The idea: a customer authenticates, deposits an item, storage time is metered, and the session automatically closes after authorized retrieval when the locker returns to its empty-weight threshold.

> This repository is intentionally a demonstration implementation. Production hardware integration, billing logic, security controls, anti-tamper rules, and operational systems are maintained separately.

## Current public demo — Phase 2

The demo now includes:

- Multi-locker operator dashboard
- Locker selection and individual compartment states
- Simulated access-code authentication
- Locker states: `AVAILABLE → OPEN → STORED → RETRIEVAL → COMPLETE`
- Simulated load-cell readings
- Empty-weight threshold logic
- Running storage timers
- Example metered pricing
- Fleet health summary
- Fault states for sensor offline and overload conditions
- Maintenance reset simulation
- Event / audit trail
- Session history
- Automatic session finalization after item removal
- Receipt generation
- Responsive desktop/mobile UI

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

## Demo controls

Use this access code in the public simulation:

```text
2468
```

Example public-demo rules:

- $2.00 includes the first hour
- $0.50 per additional 30 minutes
- Empty threshold: ≤ 40 g
- Demo overload threshold: > 25 kg

These values exist only to demonstrate the workflow and state transitions.

## Phase history

### Phase 1
- Single-locker workflow
- Simulated load-cell readings
- Metered timer and charge
- Audit events
- Receipt generation

### Phase 2
- Multi-locker fleet
- Access-code simulation
- Session history
- Fleet status summary
- Sensor-offline state
- Overload state
- Operator fault simulation
- Maintenance reset workflow

## Planned public-demo Phase 3

- Mock REST API
- Persisted demo sessions
- Dedicated operator view
- Basic analytics
- Additional simulated device telemetry

Physical sensor integration, production authentication, real payment processing, deployment infrastructure, and production anti-tamper logic remain outside the public demo.

## Concept architecture

```text
Customer / operator
        ↓
Access + locker state
        ↓
Weight signal / simulated telemetry
        ↓
Session engine
        ↓
Metered charge
        ↓
Audit event + session history + receipt
```

## Why this exists

The project explores a systems question:

**Can the physical state of a locker help drive the software state of a storage transaction?**

The public demo uses weight as one occupancy signal while accounting for real-world sensor drift and possible sensor failure through explicit thresholds and fault states.
