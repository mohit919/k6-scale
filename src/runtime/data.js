import exec from 'k6/execution';

/**
 * Select data deterministically by scenario iteration, avoiding Math.random()
 * collisions and making reruns easier to reason about.
 */
export function rowForIteration(rows, offset = 0) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('rowForIteration requires a non-empty array');
  }
  const iteration = exec.scenario.iterationInTest;
  return rows[(iteration + offset) % rows.length];
}
