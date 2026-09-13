# K6 Scale

[![CI](https://github.com/mohit919/k6-scale/actions/workflows/ci.yml/badge.svg)](https://github.com/mohit919/k6-scale/actions/workflows/ci.yml)

**Turn real-world business traffic into executable Grafana k6 workloads.**

K6 Scale is an open-source workload modelling layer for [Grafana k6](https://k6.io/). It is designed for teams whose performance requirements are expressed in business terms — transactions/hour, journey mix, peak factors and SLOs — rather than arbitrary virtual-user counts.

K6 already provides excellent executors, scenarios, checks, thresholds and metrics. **K6 Scale sits one layer above them.**

> **business demand → workload model → workload plan → native k6 execution plan**

> Status: early clean-room project (`v0.2`). APIs may change before v1.0.

---

## The problem

Performance requirements usually arrive in terms such as:

- 120,000 transactions per hour;
- 45% browse, 25% search, 15% product, 10% login, 5% checkout;
- 1.3× peak traffic;
- journey-specific latency and error-rate SLOs.

Someone then has to translate those requirements into low-level k6 settings such as arrival rates, VU pools, scenario stages and thresholds.

When that translation is repeated manually across a large suite, several problems appear:

- duplicated calculations;
- inconsistent scenario configuration;
- rounding drift across weighted journeys;
- unexplained VU values;
- workload intent hidden inside test code;
- configuration that product, capacity, SRE and architecture teams cannot easily review.

K6 Scale makes the **workload model itself** a first-class artefact and derives native k6 execution configuration from it.

---

## A simple workload model

```js
export default {
  name: 'retail-peak',
  totalIterationsPerHour: 120000,
  startFactor: 0.10,

  stages: [
    { duration: '5m', factor: 0.25 },
    { duration: '10m', factor: 1.00 },
    { duration: '15m', factor: 1.30 },
    { duration: '5m', factor: 0.00 },
  ],

  journeys: {
    browse:   { exec: 'browseJourney', weight: 45, expectedDurationSeconds: 2.5 },
    search:   { exec: 'searchJourney', weight: 25, expectedDurationSeconds: 2.0 },
    product:  { exec: 'productJourney', weight: 15, expectedDurationSeconds: 2.0 },
    login:    { exec: 'loginJourney', weight: 10, expectedDurationSeconds: 3.0 },
    checkout: { exec: 'checkoutJourney', weight: 5, expectedDurationSeconds: 5.0 },
  },
};
```

At normal load, K6 Scale preserves the requested aggregate volume exactly:

| Journey | Mix | Iterations/hour |
|---|---:|---:|
| Browse | 45% | 54,000 |
| Search | 25% | 30,000 |
| Product | 15% | 18,000 |
| Login | 10% | 12,000 |
| Checkout | 5% | 6,000 |
| **Total** | **100%** | **120,000** |

At a 1.30× peak factor, the aggregate becomes exactly **156,000 iterations/hour**.

The compiler uses deterministic largest-remainder allocation so independent rounding cannot silently change the requested total.

---

## v0.2: inspect the workload before running it

v0.2 adds a pre-execution workload planner. It uses the same profile and sizing logic as the k6 compiler but performs no load generation and makes no target-system calls.

```bash
npm run plan
```

Example output:

```text
K6 SCALE WORKLOAD PLAN — retail-peak
────────────────────────────────────────────────────────────────────────
Base volume: 12,000 iterations/hour
Peak volume: 15,600 iterations/hour (1.3x)
Load factor: 1

Journey            Mix    Peak/h   Avg s   Concurrency   Pre VUs   Max VUs   Risk
────────────────────────────────────────────────────────────────────────────────────────
browse              45%     7,020     2.5          4.88         8        16   low
search              25%     3,900       2          2.17         4         8   low
product             15%     2,340       2           1.3         2         4   low
login               10%     1,560       3           1.3         2         4   low
checkout             5%       780       5          1.08         2         4   low
```

The plan shows:

- scaled base and peak business volume;
- per-journey peak rates;
- expected journey duration;
- estimated peak concurrency;
- generated `preAllocatedVUs` and `maxVUs`;
- static VU sizing risk;
- stage-by-stage aggregate volume;
- warnings when headroom or explicit VU limits look undersized.

This is deliberately a **planning heuristic**, not a runtime guarantee. Real tests should still be validated using observed journey duration and k6 `dropped_iterations`.

See [Workload plan](docs/workload-plan.md) for details.

---

## JSON workload-plan export

The same plan can be emitted as structured JSON for CI artifacts or downstream tooling:

```bash
npm run plan:json
```

or written directly to a file:

```bash
node src/cli/plan.js profiles/retail-peak.js --json --output workload-plan.json
```

The export includes a `schemaVersion` field so consumers can detect future format changes.

A reduced or amplified workload can be reviewed without editing the profile:

```bash
node src/cli/plan.js profiles/retail-peak.js --load-factor 0.25
```

---

## Why not just use plain k6?

You absolutely can. K6 Scale does **not** replace k6.

K6 provides the execution primitives. K6 Scale addresses the layer above them: translating business workload intent into transparent, reproducible k6 scenarios.

A configuration such as:

```js
{
  executor: 'ramping-arrival-rate',
  startRate: 9,
  preAllocatedVUs: 42,
  maxVUs: 84
}
```

may be perfectly correct, but it does not explain why those numbers exist.

K6 Scale keeps the source reasoning visible:

```text
Production demand: 120,000 transactions/hour
Checkout mix:       5%
Peak factor:        1.30
Expected duration:  5 seconds
```

The executor configuration becomes **derived execution detail rather than the source of truth**.

---

## Design principles

### Model demand, not guessed concurrency

When known, production throughput and traffic distribution should drive the workload model.

### Preserve aggregate workload

Weighted allocation must not silently add or remove traffic through independent rounding.

### Keep workload intent separate from journey code

Business flow implementation, workload intent and execution mechanics should be independently maintainable.

### Prefer native k6 primitives

K6 Scale compiles to native k6 scenarios rather than creating a competing load-generation engine.

### Make sizing explainable

VU estimates are derived from arrival rate, expected journey duration and configurable headroom, and can be inspected before execution.

### Keep examples clean-room and vendor-neutral

Public examples contain synthetic data only and must not include proprietary endpoints, credentials, customer information or client-specific history.

---

## Quick start

Requirements:

- Grafana k6;
- Node.js 20+ for framework tooling and unit tests.

```bash
git clone https://github.com/mohit919/k6-scale.git
cd k6-scale

npm test
npm run check
npm run plan
k6 inspect examples/retail/test.js
```

Run the bundled synthetic example at 1% load:

```bash
k6 run -e LOAD_FACTOR=0.01 examples/retail/test.js
```

Point it at another authorised test environment:

```bash
k6 run \
  -e BASE_URL=https://your-test-environment.example \
  -e LOAD_FACTOR=0.01 \
  examples/retail/test.js
```

> Never run performance tests against systems you do not own or have explicit permission to test.

---

## Current capabilities

- business-volume workload profiles;
- weighted journey allocation with exact integer-volume preservation;
- native `ramping-arrival-rate` scenario generation;
- load multipliers;
- VU capacity estimation;
- pre-execution workload planning;
- VU sizing and dropped-iteration risk warnings;
- human-readable and JSON workload-plan output;
- global and journey-specific threshold generation;
- runtime environment and request helpers;
- synthetic reference application;
- unit tests and GitHub Actions CI.

---

## Repository structure

```text
src/model/              Workload compiler, thresholds and plan model
src/cli/                Node-side workload planning CLI
src/runtime/            Thin k6 runtime helpers
profiles/               Reusable workload profiles
examples/retail/        Synthetic reference implementation
tests/                  Pure model and planner unit tests
docs/                   Architecture, modelling and safety documentation
```

---

## Roadmap

v0.2 deliberately focuses on **workload planning and validation**. Remaining observability work and later data/distributed-execution capabilities are tracked in [ROADMAP.md](ROADMAP.md).

Longer-term areas include:

- standard journey/business outcome metrics;
- observability examples;
- data partition strategies;
- distributed execution examples;
- workload calibration;
- multiple reference workloads;
- a stable v1.0 profile schema.

---

## What K6 Scale is not

K6 Scale is not:

- a replacement for Grafana k6;
- a distributed load-generation platform;
- an observability platform;
- a proprietary test runner;
- a generic API testing framework.

Its scope is intentionally narrow:

> **Translate real-world workload intent into transparent, reviewable and reproducible native k6 execution plans.**

---

## Contributing

Contributions, bug reports and workload-modelling discussions are welcome, particularly around weighted journeys, production-volume modelling, arrival-rate testing, capacity planning and SLO-driven performance engineering.

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Documentation

- [Architecture](docs/architecture.md)
- [Workload model](docs/workload-model.md)
- [Workload plan](docs/workload-plan.md)
- [OSS extraction safety](docs/oss-safety.md)
- [Roadmap](ROADMAP.md)
- [Security](SECURITY.md)

---

## License

K6 Scale is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE).

---

## Built on Grafana k6

K6 Scale exists to complement, not replace, Grafana k6.

**K6 provides the execution engine. K6 Scale makes the workload intent explicit.**
