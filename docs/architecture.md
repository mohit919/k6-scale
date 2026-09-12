# Architecture

K6 Scale has three layers.

## 1. Workload model

`src/model/` is pure JavaScript. It converts business intent into k6 configuration and can be tested without k6.

A profile defines:

- aggregate iterations per hour;
- journey mix as percentages;
- an arrival-rate curve as stage multipliers;
- expected journey duration for VU capacity planning;
- performance SLOs.

The compiler uses the largest-remainder method so integer k6 rates preserve the requested aggregate volume instead of drifting because each journey was independently rounded.

## 2. Runtime primitives

`src/runtime/` contains deliberately small helpers for environment configuration, request tags/checks, deterministic data selection, logging, and weighted choices.

The framework does not attempt to replace k6. Application-specific authentication, correlation, payload construction, and domain logic remain inside journey modules.

## 3. Journeys and profiles

Journeys model user or business flows. Profiles model how often those flows happen. Keeping them separate means the same journey can be reused in smoke, BAU, peak, stress, or event-specific profiles.

## Design rule

The framework should answer:

> Given a measured or forecast business workload, what should k6 execute?

It should not answer application-domain questions that belong to the system under test.
