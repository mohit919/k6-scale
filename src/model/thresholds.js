/** Build k6 threshold configuration from a small SLO-oriented policy object. */
export function buildThresholds(policy = {}) {
  const thresholds = {};
  const global = policy.global || {};

  if (Number.isFinite(global.maxFailureRate)) {
    thresholds.http_req_failed = [`rate<${global.maxFailureRate}`];
  }
  if (Number.isFinite(global.p95Ms)) {
    thresholds.http_req_duration = [`p(95)<${global.p95Ms}`];
  }
  if (Number.isFinite(global.minCheckRate)) {
    thresholds.checks = [`rate>${global.minCheckRate}`];
  }

  for (const [journey, slo] of Object.entries(policy.journeys || {})) {
    if (Number.isFinite(slo.p95Ms)) {
      thresholds[`http_req_duration{journey:${journey}}`] = [`p(95)<${slo.p95Ms}`];
    }
    if (Number.isFinite(slo.maxFailureRate)) {
      thresholds[`http_req_failed{journey:${journey}}`] = [`rate<${slo.maxFailureRate}`];
    }
  }

  return thresholds;
}
