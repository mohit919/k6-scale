import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateByWeight, compileArrivalRateScenarios, validateProfile } from '../src/model/workload.js';
import profile from '../profiles/retail-peak.js';

test('largest-remainder allocation preserves the requested total', () => {
  const result = allocateByWeight(17, [['a', 33], ['b', 33], ['c', 34]]);
  assert.equal(Object.values(result).reduce((a, b) => a + b, 0), 17);
});

test('profile is valid', () => {
  assert.doesNotThrow(() => validateProfile(profile));
});

test('compiled scenarios preserve aggregate stage volume', () => {
  const scenarios = compileArrivalRateScenarios(profile);
  const names = Object.keys(scenarios);
  assert.deepEqual(names, ['browse', 'search', 'product', 'login', 'checkout']);

  profile.stages.forEach((stage, stageIndex) => {
    const compiledTotal = names.reduce((sum, name) => sum + scenarios[name].stages[stageIndex].target, 0);
    assert.equal(compiledTotal, Math.round(profile.totalIterationsPerHour * stage.factor));
  });
});

test('loadFactor scales business volume', () => {
  const scenarios = compileArrivalRateScenarios(profile, { loadFactor: 0.5 });
  const steadyStageIndex = profile.stages.findIndex((stage) => stage.factor === 1);
  const total = Object.values(scenarios).reduce(
    (sum, scenario) => sum + scenario.stages[steadyStageIndex].target,
    0,
  );
  assert.equal(total, 6000);
});
