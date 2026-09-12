# Workload model

## Why arrival rate?

For many API and transactional systems, the business requirement is expressed as throughput: orders/hour, logins/minute, searches/second, and so on. An arrival-rate executor lets the test model that demand directly instead of assuming a fixed VU count represents a fixed load.

## Example

A profile might define 12,000 iterations/hour with this journey mix:

| Journey | Weight | Base iterations/hour |
|---|---:|---:|
| Browse | 45% | 5,400 |
| Search | 25% | 3,000 |
| Product | 15% | 1,800 |
| Login | 10% | 1,200 |
| Checkout | 5% | 600 |

A stage factor of `1.30` means 15,600 aggregate iterations/hour. The compiler allocates that integer total across journeys while preserving the mix.

## VU capacity

Arrival-rate executors still need VUs to execute iterations. K6 Scale estimates initial VU capacity from Little's Law style concurrency:

`concurrency ≈ arrival_rate_per_second × expected_iteration_duration_seconds`

A configurable headroom factor is then applied. This is a starting estimate; k6 dropped-iteration metrics remain the operational signal that capacity is insufficient.

## What a business iteration means

An iteration should represent a meaningful unit such as one browse journey, one login, or one checkout attempt. Do not confuse iteration rate with raw HTTP request rate: a journey can contain many requests.
