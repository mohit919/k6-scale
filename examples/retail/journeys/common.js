import { sleep } from 'k6';
import { env } from '../../../src/runtime/env.js';
import { joinUrl, requestStep } from '../../../src/runtime/request.js';

export function baseUrl() {
  return env('BASE_URL', 'https://test.k6.io');
}

export function getStep(journey, step, path, thinkSeconds = 0.2) {
  const response = requestStep({
    url: joinUrl(baseUrl(), path),
    journey,
    step,
    expectedStatus: [200, 301, 302],
  });
  if (thinkSeconds > 0) sleep(thinkSeconds);
  return response;
}
