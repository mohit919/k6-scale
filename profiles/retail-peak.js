/**
 * Illustrative profile only. The figures are synthetic and are not taken from
 * any client or production system.
 */
export default {
  name: 'retail-peak',
  totalIterationsPerHour: 12000,
  startFactor: 0.1,

  stages: [
    { duration: '2m', factor: 0.25 },
    { duration: '3m', factor: 0.50 },
    { duration: '5m', factor: 1.00 },
    { duration: '5m', factor: 1.30 },
    { duration: '3m', factor: 1.00 },
    { duration: '2m', factor: 0.00 },
  ],

  execution: {
    timeUnit: '1h',
    vuHeadroom: 1.5,
    maxVUsFactor: 2,
    gracefulStop: '30s',
  },

  journeys: {
    browse:   { exec: 'browseJourney',   weight: 45, expectedDurationSeconds: 2.5 },
    search:   { exec: 'searchJourney',   weight: 25, expectedDurationSeconds: 2.0 },
    product:  { exec: 'productJourney',  weight: 15, expectedDurationSeconds: 2.0 },
    login:    { exec: 'loginJourney',    weight: 10, expectedDurationSeconds: 3.0 },
    checkout: { exec: 'checkoutJourney', weight: 5,  expectedDurationSeconds: 5.0 },
  },

  thresholds: {
    global: {
      maxFailureRate: 0.01,
      p95Ms: 1000,
      minCheckRate: 0.99,
    },
    journeys: {
      checkout: { p95Ms: 1500, maxFailureRate: 0.01 },
      login: { p95Ms: 1200 },
    },
  },
};
