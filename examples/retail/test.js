import { compileArrivalRateScenarios } from '../../src/model/workload.js';
import { buildThresholds } from '../../src/model/thresholds.js';
import { numberEnv } from '../../src/runtime/env.js';
import profile from '../../profiles/retail-peak.js';
import { runBrowse } from './journeys/browse.js';
import { runSearch } from './journeys/search.js';
import { runProduct } from './journeys/product.js';
import { runLogin } from './journeys/login.js';
import { runCheckout } from './journeys/checkout.js';

const loadFactor = numberEnv('LOAD_FACTOR', 1);

export const options = {
  scenarios: compileArrivalRateScenarios(profile, { loadFactor }),
  thresholds: buildThresholds(profile.thresholds),
  discardResponseBodies: true,
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function browseJourney() { runBrowse(); }
export function searchJourney() { runSearch(); }
export function productJourney() { runProduct(); }
export function loginJourney() { runLogin(); }
export function checkoutJourney() { runCheckout(); }
