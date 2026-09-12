function runtimeEnv() {
  return typeof __ENV !== 'undefined' ? __ENV : {};
}

export function env(name, defaultValue = undefined) {
  const value = runtimeEnv()[name];
  return value === undefined || value === '' ? defaultValue : value;
}

export function requiredEnv(name) {
  const value = env(name);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function numberEnv(name, defaultValue) {
  const raw = env(name);
  if (raw === undefined) return defaultValue;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be numeric; received ${raw}`);
  }
  return parsed;
}

export function booleanEnv(name, defaultValue = false) {
  const raw = env(name);
  if (raw === undefined) return defaultValue;
  return String(raw).toLowerCase() === 'true';
}
