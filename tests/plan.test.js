import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkloadPlan, formatWorkloadPlan } from '../src/model/plan.js';
import profile from '../profiles/retail-peak.js';

test('workload plan preserves base and peak business volume', () => {
  const plan = buildWorkloadPlan(profile);
  assert.equal(plan.baseIterationsPerHour, profile.totalIterationsPerHour);
  assert.equal(plan.peak.iterationsPerHour, 15600);
  assert.equal(plan.journeys.reduce((sum, item) => sum + item.peakRatePerHour, 0), 15600);
});

test('workload plan reports generated VU sizing', () => {
  const plan = buildWorkloadPlan(profile);
  for (const journey of plan.journeys) {
    assert.ok(journey.preAllocatedVUs >= journey.minimumVUsAtPeak);
    assert.ok(journey.maxVUs >= journey.preAllocatedVUs);
    assert.equal(journey.risk, 'low');
  }
  assert.deepEqual(plan.warnings, []);
});

test('low headroom produces an actionable dropped-iteration warning', () => {
  const lowHeadroom = {
    ...profile,
    execution: {
      ...(profile.execution || {}),
      vuHeadroom: 0.5,
    },
  };

  const plan = buildWorkloadPlan(lowHeadroom);
  assert.ok(plan.warnings.some((warning) => warning.includes('dropped iterations are likely')));
  assert.ok(plan.warnings.some((warning) => warning.includes('headroom is 0.5')));
  assert.ok(plan.journeys.some((journey) => journey.risk === 'high'));
});

test('human-readable plan contains business volume and risk columns', () => {
  const report = formatWorkloadPlan(buildWorkloadPlan(profile));
  assert.match(report, /K6 SCALE WORKLOAD PLAN/);
  assert.match(report, /Peak volume: 15,600 iterations\/hour/);
  assert.match(report, /Pre VUs/);
  assert.match(report, /Warnings: none/);
});
