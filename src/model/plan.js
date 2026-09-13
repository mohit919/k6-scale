import { compileArrivalRateScenarios, validateProfile } from './workload.js';

const DEFAULT_VU_HEADROOM = 1.5;

export function buildWorkloadPlan(profile, options = {}) {
  validateProfile(profile);

  const loadFactor = options.loadFactor ?? 1;
  if (!Number.isFinite(loadFactor) || loadFactor <= 0) {
    throw new Error('loadFactor must be > 0');
  }

  const scenarios = compileArrivalRateScenarios(profile, options);
  const stageTotals = profile.stages.map((stage, index) => ({
    duration: stage.duration,
    factor: stage.factor,
    iterationsPerHour: Object.values(scenarios).reduce(
      (sum, scenario) => sum + scenario.stages[index].target,
      0,
    ),
  }));

  const peakStage = stageTotals.reduce((peak, stage) => (
    stage.iterationsPerHour > peak.iterationsPerHour ? stage : peak
  ));

  const vuHeadroom = options.vuHeadroom
    ?? profile.execution?.vuHeadroom
    ?? DEFAULT_VU_HEADROOM;

  const warnings = [];
  const journeys = Object.entries(profile.journeys).map(([name, journey]) => {
    const scenario = scenarios[name];
    const peakRatePerHour = Math.max(
      scenario.startRate,
      ...scenario.stages.map((stage) => stage.target),
    );
    const estimatedConcurrency = (peakRatePerHour / 3600) * journey.expectedDurationSeconds;
    const minimumVUsAtPeak = Math.max(1, Math.ceil(estimatedConcurrency));
    const recommendedPreAllocatedVUs = Math.max(
      journey.minPreAllocatedVUs ?? profile.execution?.minPreAllocatedVUs ?? 1,
      Math.ceil(estimatedConcurrency * vuHeadroom),
    );

    let risk = 'low';
    if (scenario.preAllocatedVUs < minimumVUsAtPeak) {
      risk = 'high';
      warnings.push(
        `${name}: preAllocatedVUs=${scenario.preAllocatedVUs} is below estimated peak concurrency `
        + `${minimumVUsAtPeak}; dropped iterations are likely if duration assumptions hold.`,
      );
    } else if (scenario.preAllocatedVUs < recommendedPreAllocatedVUs) {
      risk = 'moderate';
      warnings.push(
        `${name}: preAllocatedVUs=${scenario.preAllocatedVUs} is below the recommended `
        + `${recommendedPreAllocatedVUs} VUs for the configured headroom.`,
      );
    }

    if (journey.maxVUs !== undefined && journey.maxVUs < recommendedPreAllocatedVUs) {
      warnings.push(
        `${name}: configured maxVUs=${journey.maxVUs} is below the estimated pre-allocation requirement `
        + `${recommendedPreAllocatedVUs}; the compiler will elevate maxVUs to preserve a valid scenario.`,
      );
    }

    return {
      journey: name,
      weight: journey.weight,
      expectedDurationSeconds: journey.expectedDurationSeconds,
      peakRatePerHour,
      estimatedConcurrency: Number(estimatedConcurrency.toFixed(2)),
      minimumVUsAtPeak,
      preAllocatedVUs: scenario.preAllocatedVUs,
      maxVUs: scenario.maxVUs,
      risk,
    };
  });

  if (vuHeadroom < 1) {
    warnings.push(
      `Configured VU headroom is ${vuHeadroom}; values below 1.0 can under-size preAllocatedVUs.`,
    );
  } else if (vuHeadroom < 1.2) {
    warnings.push(
      `Configured VU headroom is ${vuHeadroom}; consider >= 1.2 when journey duration is variable.`,
    );
  }

  return {
    schemaVersion: 1,
    workload: profile.name || 'unnamed',
    loadFactor,
    baseIterationsPerHour: Math.round(profile.totalIterationsPerHour * loadFactor),
    peak: peakStage,
    stages: stageTotals,
    journeys,
    warnings,
    guidance: 'This is a pre-execution sizing heuristic. Validate capacity with k6 dropped_iterations and observed journey duration.',
  };
}

export function formatWorkloadPlan(plan) {
  const lines = [
    `K6 SCALE WORKLOAD PLAN — ${plan.workload}`,
    ''.padEnd(72, '─'),
    `Base volume: ${plan.baseIterationsPerHour.toLocaleString()} iterations/hour`,
    `Peak volume: ${plan.peak.iterationsPerHour.toLocaleString()} iterations/hour (${plan.peak.factor}x)`,
    `Load factor: ${plan.loadFactor}`,
    '',
    'Journey            Mix    Peak/h   Avg s   Concurrency   Pre VUs   Max VUs   Risk',
    ''.padEnd(88, '─'),
  ];

  for (const journey of plan.journeys) {
    lines.push(
      `${journey.journey.padEnd(18)}`
      + `${`${journey.weight}%`.padStart(5)}  `
      + `${journey.peakRatePerHour.toLocaleString().padStart(8)}  `
      + `${String(journey.expectedDurationSeconds).padStart(6)}  `
      + `${String(journey.estimatedConcurrency).padStart(12)}  `
      + `${String(journey.preAllocatedVUs).padStart(8)}  `
      + `${String(journey.maxVUs).padStart(8)}   `
      + journey.risk,
    );
  }

  lines.push('', 'Stages:');
  for (const stage of plan.stages) {
    lines.push(
      `  ${stage.duration.padEnd(8)} ${String(stage.factor).padStart(5)}x  `
      + `${stage.iterationsPerHour.toLocaleString().padStart(10)} iterations/hour`,
    );
  }

  if (plan.warnings.length > 0) {
    lines.push('', 'Warnings:');
    for (const warning of plan.warnings) lines.push(`  - ${warning}`);
  } else {
    lines.push('', 'Warnings: none');
  }

  lines.push('', plan.guidance);
  return lines.join('\n');
}
