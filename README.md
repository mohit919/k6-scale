# K6 Scale

[![CI](https://github.com/mohit919/k6-scale/actions/workflows/ci.yml/badge.svg)](https://github.com/mohit919/k6-scale/actions/workflows/ci.yml)

**Turn real-world business traffic into executable Grafana k6 workloads.**

K6 Scale is an open-source workload modelling layer for [Grafana k6](https://k6.io/).

It is designed for teams whose performance requirements are expressed in business terms such as:

- 120,000 transactions per hour
- 45% browse traffic
- 25% search traffic
- 10% authentication traffic
- 5% checkout traffic
- 1.3× peak demand
- journey-specific latency and error-rate SLOs

rather than low-level executor settings such as:

```text
preAllocatedVUs = 147
maxVUs          = 220
rate            = 27
timeUnit        = 1s
```

K6 already provides excellent executors, scenarios, checks, thresholds, metrics and runtime primitives.

**K6 Scale sits one layer above them.**

It translates a human-readable workload model into native k6 arrival-rate scenarios while preserving the intended aggregate traffic volume, journey mix and SLO policy.

> **business demand → workload model → native k6 execution plan**

> Status: early clean-room prototype (`v0.1`). APIs may change.

---

## The problem

Performance engineers rarely receive requirements in terms of virtual users.

A capacity or architecture conversation is more likely to sound like this:

> “The platform processes approximately 120,000 customer journeys per hour. Browse represents around 45% of traffic, search 25%, product views 15%, login 10%, and checkout 5%. We expect peak events to reach around 130% of normal production volume.”

Someone then has to translate that into executable test configuration.

For every journey, that typically means calculating:

1. target transaction volume;
2. percentage traffic distribution;
3. peak or stress multiplier;
4. iterations per second/minute;
5. executor configuration;
6. estimated VU requirements;
7. thresholds and SLOs.

That calculation is often repeated manually across scripts.

As workload models evolve, several problems appear:

- duplicated calculations;
- inconsistent scenario configuration;
- rounding errors;
- accidental changes to aggregate traffic;
- unexplained VU values;
- workload intent hidden inside test code;
- configuration that product, SRE and architecture teams cannot easily review.

K6 Scale makes the **workload model itself** a first-class artefact.

---

## A simple example

Instead of manually constructing five k6 scenarios, define the workload:

```js
export default {
  name: 'retail-peak',

  totalIterationsPerHour: 120000,

  startFactor: 0.10,

  stages: [
    { duration: '5m',  factor: 0.25 },
    { duration: '10m', factor: 1.00 },
    { duration: '15m', factor: 1.30 },
    { duration: '5m',  factor: 0.00 },
  ],

  journeys: {
    browse: {
      exec: 'browseJourney',
      weight: 45,
      expectedDurationSeconds: 2.5,
    },

    search: {
      exec: 'searchJourney',
      weight: 25,
      expectedDurationSeconds: 2.0,
    },

    product: {
      exec: 'productJourney',
      weight: 15,
      expectedDurationSeconds: 2.0,
    },

    login: {
      exec: 'loginJourney',
      weight: 10,
      expectedDurationSeconds: 3.0,
    },

    checkout: {
      exec: 'checkoutJourney',
      weight: 5,
      expectedDurationSeconds: 5.0,
    },
  },
};
```

K6 Scale converts that model into native `ramping-arrival-rate` scenarios.

At normal production load:

| Journey | Traffic mix | Iterations/hour |
|---|---:|---:|
| Browse | 45% | 54,000 |
| Search | 25% | 30,000 |
| Product | 15% | 18,000 |
| Login | 10% | 12,000 |
| Checkout | 5% | 6,000 |
| **Total** | **100%** | **120,000** |

At a **1.30× peak factor**:

| Journey | Iterations/hour |
|---|---:|
| Browse | 70,200 |
| Search | 39,000 |
| Product | 23,400 |
| Login | 15,600 |
| Checkout | 7,800 |
| **Total** | **156,000** |

The aggregate workload remains exactly what was requested.

---

## Why not just use plain k6?

You absolutely can.

K6 Scale does **not** attempt to replace k6.

K6 already gives engineers the primitives required to build almost any performance workload:

- scenarios;
- executors;
- arrival rates;
- VUs;
- thresholds;
- metrics;
- checks;
- lifecycle functions.

The problem K6 Scale addresses is the layer above those primitives.

Consider this configuration:

```js
{
  executor: 'ramping-arrival-rate',
  startRate: 9,
  timeUnit: '1s',
  preAllocatedVUs: 42,
  maxVUs: 84
}
```

It may be perfectly correct.

But six months later, another engineer may reasonably ask:

> Why is the rate 9?

Or an architect may ask:

> What production traffic does this test actually represent?

K6 Scale keeps that reasoning visible.

Instead of starting with executor configuration, it starts with:

```text
Production demand: 120,000 transactions/hour
Checkout mix:       5%
Peak factor:        1.30
```

The low-level k6 configuration becomes **derived execution detail rather than the source of truth**.

---

## Why K6 Scale?

### Business-readable workload definitions

Define workloads using values that capacity, product, architecture and operations teams already understand:

```text
transactions/hour
journey mix
peak multiplier
expected journey duration
SLOs
```

### Exact aggregate workload preservation

Splitting integer request rates across several weighted journeys introduces rounding problems.

Naively rounding every scenario independently can cause:

```text
requested workload ≠ executed workload
```

K6 Scale uses deterministic allocation logic so the sum of the generated journey workloads remains equal to the requested aggregate workload.

### Native k6 execution

K6 Scale does not introduce a custom load-generation engine.

The compiler produces standard k6 configuration using native executors such as `ramping-arrival-rate`.

The resulting workload remains understandable to engineers who already know k6.

### Workload intent separated from journey implementation

K6 Scale separates three concerns that often become mixed together in large test repositories.

**Journey implementation**

```text
authentication
HTTP calls
correlation
payload generation
business flow
```

**Workload intent**

```text
transactions/hour
journey percentages
peak factors
traffic ramps
```

**Execution mechanics**

```text
arrival rates
executors
VU pools
threshold configuration
```

This separation makes larger performance suites easier to reason about and maintain.

### VU capacity estimation

Arrival-rate workloads require sufficient VUs to sustain the requested throughput.

K6 Scale estimates initial capacity using:

```text
arrival rate × expected journey duration
```

plus configurable headroom.

This is intended as a starting point rather than an automatic substitute for observing `dropped_iterations` and tuning capacity using real test results.

### SLO-driven thresholds

Threshold policy can be associated with the workload and individual journeys so performance expectations remain version-controlled alongside the traffic model.

Examples include:

```text
p95 latency
p99 latency
HTTP failure rate
journey success rate
```

---

## Who is this for?

K6 Scale is particularly useful when performance tests need to represent **real production demand rather than arbitrary concurrency**.

Typical users may include:

- performance engineers;
- SRE teams;
- platform engineers;
- capacity planners;
- solution architects;
- engineering teams adopting k6 for large performance suites.

---

## Example use cases

### Production traffic modelling

Translate analytics or production telemetry into an executable workload:

```text
Browse      45%
Search      25%
Product     15%
Login       10%
Checkout     5%
```

### Peak-event testing

Model expected traffic amplification:

```text
baseline = 1.00×
peak     = 1.30×
stress   = 2.00×
```

without rewriting individual scenarios.

### Capacity planning

Express the question directly:

> Can the system sustain 250,000 transactions/hour while maintaining checkout p95 below the required SLO?

### Architecture validation

Provide architects with a workload definition that explains **what the performance test represents**, rather than asking them to review low-level VU configuration.

### Migration testing

Run equivalent traffic models against different versions or platforms while keeping the business workload constant.

### CI performance tests

Use reduced load factors for continuous performance validation while retaining the same journey distribution as the production model.

```bash
k6 run \
  -e LOAD_FACTOR=0.01 \
  examples/retail/test.js
```

---

## Architecture

```text
                 Business traffic model
                         │
                         ▼
                ┌─────────────────┐
                │    K6 Scale     │
                │ workload model  │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │    compiler     │
                │                 │
                │ volume split    │
                │ rate conversion │
                │ VU estimation   │
                │ thresholds      │
                └────────┬────────┘
                         │
                         ▼
              Native Grafana k6 scenarios
                         │
                         ▼
             ramping-arrival-rate executor
```

Repository structure:

```text
src/model/
    workload.js
    thresholds.js

src/runtime/
    env.js
    request.js
    data.js
    logger.js
    weighted.js

profiles/
    retail-peak.js

examples/
    retail/
        journeys/
        data/
        test.js

tests/

docs/
    architecture.md
    workload-model.md
    oss-safety.md
```

---

## Quick start

### Requirements

- Grafana k6
- Node.js 22+ for framework unit tests

Clone the repository:

```bash
git clone https://github.com/mohit919/k6-scale.git
cd k6-scale
```

Run the unit tests:

```bash
npm test
```

Run syntax validation:

```bash
npm run check
```

Inspect the generated k6 workload:

```bash
k6 inspect examples/retail/test.js
```

Run the synthetic example at 1% load:

```bash
k6 run \
  -e LOAD_FACTOR=0.01 \
  examples/retail/test.js
```

Use another authorised test environment:

```bash
k6 run \
  -e BASE_URL=https://your-test-environment.example \
  -e LOAD_FACTOR=0.01 \
  examples/retail/test.js
```

> Never run performance tests against systems you do not own or have explicit permission to test.

---

## Design principles

### Model demand, not guessed concurrency

When known, production throughput and traffic distribution should drive the workload.

### Keep the source numbers visible

Engineers should be able to trace generated k6 configuration back to the business workload that produced it.

### Preserve workload totals

Scenario allocation should not silently change aggregate traffic.

### Prefer k6 primitives over framework magic

Where k6 already provides a capability, K6 Scale should use it rather than replace it.

### Separate workload from journeys

Changing traffic volume should not require rewriting business-flow code.

### Make SLOs explicit

Performance expectations should be visible, reviewable and version-controlled.

### Keep examples synthetic

Public examples must remain vendor-neutral and contain no proprietary test data, credentials or internal endpoints.

---

## Current status

K6 Scale is currently an **early clean-room prototype**.

The APIs may change while the workload model is refined.

Current capabilities include:

- business-volume based workload profiles;
- weighted journey allocation;
- exact integer workload distribution;
- `ramping-arrival-rate` scenario generation;
- load multipliers;
- VU capacity estimation;
- global and journey-specific threshold generation;
- runtime environment helpers;
- synthetic reference application;
- unit tests;
- GitHub Actions CI.

---

## Roadmap

### v0.2

The next release is focused on strengthening the workload-modelling interface.

Planned areas include:

- YAML/JSON workload definitions;
- human-readable workload-plan output;
- baseline / peak / stress profiles;
- enhanced model validation;
- clearer rate and VU diagnostics;
- improved CLI/developer experience.

Example future workload definition:

```yaml
volume:
  transactions_per_hour: 120000

journeys:
  browse: 45
  search: 25
  product: 15
  login: 10
  checkout: 5

profiles:
  baseline: 1.0
  peak: 1.3
  stress: 2.0
```

Potential output:

```text
K6 SCALE WORKLOAD PLAN
───────────────────────────────────────────
                 BASE       PEAK      STRESS

Browse         54,000     70,200     108,000
Search         30,000     39,000      60,000
Product        18,000     23,400      36,000
Login          12,000     15,600      24,000
Checkout        6,000      7,800      12,000
───────────────────────────────────────────
TOTAL         120,000    156,000     240,000
```

Longer-term ideas include:

- automatic workload calibration;
- production analytics import;
- workload comparison;
- test-plan visualisation;
- distributed execution integration;
- historical workload/version comparison.

See [ROADMAP.md](ROADMAP.md) for the current project roadmap.

---

## What K6 Scale is not

K6 Scale is not:

- a replacement for Grafana k6;
- a distributed load-generation platform;
- an observability platform;
- a proprietary test runner;
- a generic API testing framework.

Its scope is deliberately narrower:

> **Translate real-world workload intent into transparent, reproducible native k6 execution plans.**

---

## Contributing

Contributions, bug reports and workload-modelling discussions are welcome.

If you have experience modelling production traffic in k6, particularly around:

- weighted journeys;
- transaction-volume modelling;
- arrival-rate testing;
- capacity planning;
- SLO-based performance testing;

then your feedback is especially useful.

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Security and test data

Do not commit:

- credentials;
- production customer information;
- proprietary endpoints;
- internal hostnames;
- client-specific test data;
- secrets or access tokens.

See [SECURITY.md](SECURITY.md) and [docs/oss-safety.md](docs/oss-safety.md).

---

## License

K6 Scale is licensed under the **Apache License 2.0**.

See [LICENSE](LICENSE).

---

## Built on Grafana k6

K6 Scale exists to complement, not replace, Grafana k6.

K6 provides the execution engine.

**K6 Scale makes the workload intent explicit.**
