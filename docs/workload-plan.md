# Workload plan

K6 Scale v0.2 adds a pre-execution workload planner. It converts the same profile used by the k6 scenario compiler into a reviewable capacity plan before any load is generated.

The planner is intentionally a pure Node-side tool. It does not call a target system and it does not replace runtime observation in k6.

## Human-readable plan

Run the bundled synthetic profile:

```bash
npm run plan
```

Or point the CLI at another JavaScript profile that default-exports a K6 Scale profile:

```bash
node src/cli/plan.js profiles/retail-peak.js
```

The report shows:

- scaled base and peak iterations/hour;
- journey weights and peak rates;
- expected journey duration;
- estimated peak concurrency;
- generated `preAllocatedVUs` and `maxVUs`;
- a simple pre-execution sizing-risk classification;
- stage-by-stage aggregate business volume;
- actionable warnings when configured VU headroom or explicit limits look undersized.

## Plan a reduced or amplified load

```bash
node src/cli/plan.js profiles/retail-peak.js --load-factor 0.25
```

The load factor is applied before workload allocation, using the same integer-preserving allocation logic as the k6 compiler.

## JSON export

Print the plan as JSON:

```bash
npm run plan:json
```

Write the JSON plan to a file:

```bash
node src/cli/plan.js profiles/retail-peak.js --json --output workload-plan.json
```

The JSON output is suitable for CI artifacts, review automation, or downstream tooling. `schemaVersion` is included so consumers can detect future format changes.

## VU sizing warnings

For each journey, K6 Scale estimates peak concurrency as:

```text
peak iterations/hour ÷ 3600 × expected journey duration in seconds
```

It then compares that estimate with the generated VU pool and configured headroom. The resulting warning is a planning heuristic, not a runtime guarantee.

Always validate the real test with k6 metrics, particularly:

```text
dropped_iterations
```

and observed journey duration. Unexpected latency growth can increase required concurrency beyond the pre-test estimate.

## Clean-room examples

The bundled retail profile and all figures in this repository are synthetic. Workload plans should never contain production credentials, customer data, proprietary endpoints, or other sensitive information.
