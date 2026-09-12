import { env } from './env.js';

const LEVELS = Object.freeze({ DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40, OFF: 99 });

function configuredLevel() {
  const requested = String(env('LOG_LEVEL', 'WARN')).toUpperCase();
  return LEVELS[requested] ?? LEVELS.WARN;
}

export function log(level, message, context = undefined) {
  const normalized = String(level).toUpperCase();
  const severity = LEVELS[normalized] ?? LEVELS.INFO;
  if (severity < configuredLevel()) return;

  const suffix = context === undefined ? '' : ` ${JSON.stringify(context)}`;
  const line = `[${normalized}] ${message}${suffix}`;

  if (normalized === 'ERROR') console.error(line);
  else if (normalized === 'WARN') console.warn(line);
  else console.log(line);
}
