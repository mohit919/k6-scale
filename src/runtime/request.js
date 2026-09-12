import http from 'k6/http';
import { check, fail } from 'k6';

function statusMatches(actual, expected) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  return allowed.includes(actual);
}

/**
 * Standard request primitive that creates stable k6 metric names and tags.
 * It deliberately stays thin: application-specific auth/body logic belongs in journeys.
 */
export function requestStep({
  method = 'GET',
  url,
  body = null,
  params = {},
  journey,
  step,
  expectedStatus = 200,
  fatal = false,
}) {
  if (!journey || !step) {
    throw new Error('requestStep requires journey and step');
  }

  const tags = {
    ...(params.tags || {}),
    journey,
    step,
    name: `${journey}:${step}`,
  };

  const response = http.request(method, url, body, { ...params, tags });
  const passed = check(
    response,
    { [`${journey}/${step} returned expected status`]: (r) => statusMatches(r.status, expectedStatus) },
    { journey, step },
  );

  if (!passed && fatal) {
    fail(`${journey}/${step} failed with HTTP ${response.status}`);
  }

  return response;
}

export function joinUrl(baseUrl, path) {
  return `${String(baseUrl).replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
}
