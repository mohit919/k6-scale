# K6 Scale

**Business-volume driven workload modelling for Grafana k6.**

K6 Scale is a small open-source framework for teams whose performance requirements are expressed in business volumes — for example orders/hour, logins/hour, searches/hour, or a weighted mix of user journeys — rather than an arbitrary number of virtual users.

It compiles a workload profile into native k6 arrival-rate scenarios, estimates VU capacity, applies journey-level SLO thresholds, and keeps workload modelling separate from application-specific journey code.

> Status: early clean-room prototype (`v0.1`). APIs may change.

## The problem

Large performance suites tend to accumulate three different concerns in the same scripts:

1. **journey implementation** — HTTP calls, correlation, authentication, payloads;
2. **workload intent** — how much browse/login/checkout traffic should occur;
3. **execution mechanics** — k6 executors, rates, VU pools, thresholds.

K6 Scale separates those concerns.

## Example

```js
export default {
  name: 'retail-peak',
  totalIterationsPerHour: 12000,
  startFactor: 0.1,
  stages: [
    { duration: '2m', factor: 0.25 },
    { duration: '5m', factor: 1.00 },
    { duration: '5m', factor: 1.30 },
    { duration: '2m', factor: 0.00 },
  ],
  journeys: {
    browse:   { exec: 'browseJourney',   weight: 45, expectedDurationSeconds: 2.5 },
    search:   { exec: 'searchJourney',   weight: 25, expectedDurationSeconds: 2.0 },
    product:  { exec: 'productJourney',  weight: 15, expectedDurationSeconds: 2.0 },
    login:    { exec: 'loginJourney',    weight: 10, expectedDurationSeconds: 3.0 },
    checkout: { exec: 'checkoutJourney', weight: 5,  expectedDurationSeconds: 5.0 },
  },
};
```

The compiler turns this into five native `ramping-arrival-rate` scenarios. At 100% load the aggregate target remains exactly 12,000 iterations/hour; at 130% it becomes exactly 15,600/hour, allocated according to the journey mix.

## Why this is different from another k6 wrapper

K6 already provides excellent executors, scenarios, metrics, checks, thresholds, and modules. K6 Scale deliberately does **not** replace those primitives.

Its focus is the layer above them:

**business demand → workload mix → native k6 execution plan**

That makes performance models easier to review with product, capacity, SRE, and architecture teams because the source numbers remain visible as business volumes.

## Quick start

Requirements: Grafana k6. Node.js is needed only to run the framework's unit tests.

```bash
# Inspect the generated k6 configuration
k6 inspect examples/retail/test.js

# Run at 1% of the example profile
k6 run -e LOAD_FACTOR=0.01 examples/retail/test.js

# Point the example journeys at another test environment
k6 run -e BASE_URL=https://your-test-host.example -e LOAD_FACTOR=0.01 examples/retail/test.js

# Framework tests
npm test
```

**Do not point the bundled example at a system you do not own or have permission to load test.**

## Repository layout

```text
src/model/             Pure workload compiler and threshold policy
src/runtime/           Thin k6 runtime helpers
profiles/              Reusable workload profiles
examples/retail/       Synthetic reference implementation
tests/                 Node unit tests for pure model logic
docs/                  Architecture and modelling rationale
```

## Design principles

- Model measurable business demand, not guessed VUs.
- Preserve aggregate workload when integer rates are allocated across journeys.
- Separate workload profiles from journey implementation.
- Prefer native k6 capabilities over framework magic.
- Make SLOs explicit and version-controlled.
- Keep examples synthetic and vendor-neutral.
- Never place secrets or proprietary test data in Git.

## Current limitations

- v0.1 generates ramping arrival-rate scenarios only.
- Expected journey duration is supplied by the user; automatic calibration is future work.
- VU capacity is an estimate. Monitor k6 `dropped_iterations` and tune headroom.
- This is a code framework, not a distributed test-control plane.

## Documentation

- [Architecture](docs/architecture.md)
- [Workload model](docs/workload-model.md)
- [OSS extraction safety](docs/oss-safety.md)
- [Roadmap](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## License

Apache License 2.0. See [LICENSE](LICENSE).
