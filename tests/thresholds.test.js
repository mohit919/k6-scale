import test from 'node:test';
import assert from 'node:assert/strict';
import { buildThresholds } from '../src/model/thresholds.js';

test('buildThresholds emits global and journey-specific SLOs', () => {
  const result = buildThresholds({
    global: { maxFailureRate: 0.01, p95Ms: 750, minCheckRate: 0.99 },
    journeys: { checkout: { p95Ms: 1200 } },
  });

  assert.deepEqual(result.http_req_failed, ['rate<0.01']);
  assert.deepEqual(result.http_req_duration, ['p(95)<750']);
  assert.deepEqual(result['http_req_duration{journey:checkout}'], ['p(95)<1200']);
});
