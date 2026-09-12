# Contributing

Thanks for improving K6 Scale.

## Principles

1. Keep workload modelling separate from application-specific journey code.
2. Prefer business volumes (iterations/hour, orders/hour, logins/hour) over guessed VU counts.
3. Keep the framework thin around k6 primitives; do not hide useful k6 behaviour behind unnecessary abstractions.
4. Add tests for compiler or allocation logic.
5. Never commit real credentials, production customer data, private endpoints, or proprietary client material.

## Pull requests

- Explain the performance-engineering problem being solved.
- Add or update tests.
- Update docs if the public API changes.
- Keep examples synthetic and vendor-neutral.
