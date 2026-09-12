/** Select one value from [{ value, weight }, ...]. Weights need not sum to 100. */
export function weightedChoice(entries, random = Math.random()) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('weightedChoice requires at least one entry');
  }
  const total = entries.reduce((sum, item) => sum + item.weight, 0);
  if (!(total > 0)) throw new Error('weightedChoice requires positive total weight');

  let cursor = random * total;
  for (const item of entries) {
    if (item.weight < 0) throw new Error('weights cannot be negative');
    cursor -= item.weight;
    if (cursor < 0) return item.value;
  }
  return entries[entries.length - 1].value;
}
