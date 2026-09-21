# Metered Locker Demo

A public proof-of-concept for a **weight-aware, usage-based smart storage locker platform**.

The idea: a customer authenticates, deposits an item, storage time is metered, and the session automatically closes after authorized retrieval when the locker returns to its empty-weight threshold.

> This repository is intentionally a demonstration implementation. Production hardware integration, billing logic, security controls, anti-tamper rules, and operational systems are maintained separately.

## Current public demo — Phase 3

Phase 3 keeps the project public-safe while making it behave more like a complete system demo.

It now includes:

- Multi-locker operator dashboard
- Locker selection and individual compartment states
- Simulated access-code authentication
- Locker states: `AVAILABLE → OPEN → STORED → RETRIEVAL → COMPLETE`
- Simulated load-cell readings
- Empty-weight threshold logic
- Running storage timers
- Example metered pricing
- Fleet health summary
- Sensor-offline and overload fault states
- Maintenance reset simulation
- Event / audit trail
- Session history
- Automatic session finalization after item removal
- Receipt generation
- Browser-local persistence with `localStorage`
- Asynchronous mock service layer
- Mock API contract view
- Operator analytics
- Simulated telemetry for signal, battery, and device temperature
- Reset-to-seed demo data
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

### Phase 3
- Mock asynchronous service layer
- Browser-local persisted demo state
- Seed/reset workflow
- Operator analytics
- Simulated telemetry
- Public mock API contract view

## Mock API shape

The public demo documents an API-shaped contract without exposing a production backend:

```text
GET   /api/lockers
GET   /api/sessions
POST  /api/access/verify
PATCH /api/lockers/:id/state
GET   /api/analytics
```

The current implementation is intentionally local and simulated.

## Concept architecture

```text
Customer / operator
        ↓
Access + locker state
        ↓
Weight signal / mock telemetry
        ↓
Mock service layer
        ↓
Session engine
        ↓
Metered charge
        ↓
Audit event + persisted history + analytics + receipt
```

## Public/private boundary

This public repository demonstrates product behavior and front-end architecture.

The following remain outside the public demo:

- Physical ESP32 / sensor communication
- Real RFID or identity integration
- Real payment processing
- Production authentication and authorization
- Anti-tamper implementation
- Production database design
- Deployment infrastructure
- Operational security rules
- Production billing rules

## Why this exists

The project explores a systems question:

**Can the physical state of a locker help drive the software state of a storage transaction?**

The public demo uses weight as one occupancy signal while accounting for sensor drift, device faults, telemetry, persistence, and session state — without exposing a production implementation.
