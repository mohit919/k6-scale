/**
 * Pure workload compiler. This module has no k6 dependencies, so it can be
 * unit-tested with Node and used during k6 init context.
 */

const DEFAULTS = Object.freeze({
  timeUnit: '1h',
  gracefulStop: '30s',
  vuHeadroom: 1.5,
  maxVUsFactor: 2,
  minPreAllocatedVUs: 1,
});

export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    throw new Error('profile must be an object');
  }
  if (!Number.isFinite(profile.totalIterationsPerHour) || profile.totalIterationsPerHour <= 0) {
    throw new Error('profile.totalIterationsPerHour must be a positive number');
  }
  if (!Array.isArray(profile.stages) || profile.stages.length === 0) {
    throw new Error('profile.stages must contain at least one stage');
  }

  const journeys = Object.entries(profile.journeys || {});
  if (journeys.length === 0) {
    throw new Error('profile.journeys must contain at least one journey');
  }

  let weightTotal = 0;
  for (const [name, journey] of journeys) {
    if (!journey.exec || typeof journey.exec !== 'string') {
      throw new Error(`journey ${name} must define an exec function name`);
    }
    if (!Number.isFinite(journey.weight) || journey.weight <= 0) {
      throw new Error(`journey ${name} must define a positive weight`);
    }
    if (!Number.isFinite(journey.expectedDurationSeconds) || journey.expectedDurationSeconds <= 0) {
      throw new Error(`journey ${name} must define expectedDurationSeconds > 0`);
    }
    weightTotal += journey.weight;
  }

  if (Math.abs(weightTotal - 100) > 0.0001) {
    throw new Error(`journey weights must sum to 100; got ${weightTotal}`);
  }

  for (const [index, stage] of profile.stages.entries()) {
    if (!stage.duration || typeof stage.duration !== 'string') {
      throw new Error(`stage ${index} must define duration`);
    }
    if (!Number.isFinite(stage.factor) || stage.factor < 0) {
      throw new Error(`stage ${index} must define factor >= 0`);
    }
  }
}

/**
 * Allocate an integer total across weighted buckets while preserving the total.
 * Uses the largest-remainder method, avoiding drift caused by independent rounding.
 */
export function allocateByWeight(total, weightedEntries) {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error('total must be a non-negative integer');
  }

  const raw = weightedEntries.map(([name, weight], index) => {
    const exact = (total * weight) / 100;
    const floor = Math.floor(exact);
    return { name, index, floor, remainder: exact - floor };
  });

  let remaining = total - raw.reduce((sum, item) => sum + item.floor, 0);
  raw
    .slice()
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .slice(0, remaining)
    .forEach((item) => {
      raw[item.index].floor += 1;
    });

  return Object.fromEntries(raw.map((item) => [item.name, item.floor]));
}

function estimateVUs(ratePerHour, expectedDurationSeconds, settings) {
  const concurrency = (ratePerHour / 3600) * expectedDurationSeconds;
  return Math.max(
    settings.minPreAllocatedVUs,
    Math.ceil(concurrency * settings.vuHeadroom),
  );
}

/**
 * Compile business volumes into k6 ramping-arrival-rate scenarios.
 *
 * The profile expresses user/business iterations per hour, journey mix, and
 * stage multipliers. The compiler converts those into independent k6 scenarios
 * while preserving the intended aggregate volume at every stage.
 */
export function compileArrivalRateScenarios(profile, options = {}) {
  validateProfile(profile);

  const settings = { ...DEFAULTS, ...(profile.execution || {}), ...options };
  const loadFactor = options.loadFactor ?? 1;
  if (!Number.isFinite(loadFactor) || loadFactor <= 0) {
    throw new Error('loadFactor must be > 0');
  }

  const journeyEntries = Object.entries(profile.journeys);
  const weights = journeyEntries.map(([name, journey]) => [name, journey.weight]);
  const baseTotal = Math.round(profile.totalIterationsPerHour * loadFactor);
  const startTotal = Math.round(baseTotal * (profile.startFactor ?? 0));

  const startAlloc = allocateByWeight(startTotal, weights);
  const stageAllocs = profile.stages.map((stage) => ({
    duration: stage.duration,
    allocation: allocateByWeight(Math.round(baseTotal * stage.factor), weights),
  }));

  const scenarios = {};

  for (const [name, journey] of journeyEntries) {
    const maxRate = Math.max(startAlloc[name], ...stageAllocs.map((stage) => stage.allocation[name]));
    const preAllocatedVUs = Math.max(
      journey.minPreAllocatedVUs ?? settings.minPreAllocatedVUs,
      estimateVUs(maxRate, journey.expectedDurationSeconds, settings),
    );
    const maxVUs = Math.max(
      preAllocatedVUs,
      journey.maxVUs ?? Math.ceil(preAllocatedVUs * settings.maxVUsFactor),
    );

    scenarios[name] = {
      executor: 'ramping-arrival-rate',
      exec: journey.exec,
      startRate: startAlloc[name],
      timeUnit: settings.timeUnit,
      preAllocatedVUs,
      maxVUs,
      gracefulStop: settings.gracefulStop,
      stages: stageAllocs.map((stage) => ({
        duration: stage.duration,
        target: stage.allocation[name],
      })),
      tags: {
        workload: profile.name || 'unnamed',
        journey: name,
      },
    };
  }

  return scenarios;
}

export function summarizeProfile(profile, options = {}) {
  validateProfile(profile);
  const loadFactor = options.loadFactor ?? 1;
  const journeyEntries = Object.entries(profile.journeys);
  const weights = journeyEntries.map(([name, journey]) => [name, journey.weight]);
  const total = Math.round(profile.totalIterationsPerHour * loadFactor);
  const allocation = allocateByWeight(total, weights);

  return journeyEntries.map(([name, journey]) => ({
    journey: name,
    weight: journey.weight,
    iterationsPerHour: allocation[name],
    expectedDurationSeconds: journey.expectedDurationSeconds,
  }));
}
