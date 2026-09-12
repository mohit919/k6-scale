# Security policy

## Never commit

- passwords, tokens, cookies, client secrets, certificates, or reusable test credentials;
- real customer data;
- private/internal hostnames or infrastructure addresses;
- proprietary client payloads or business rules.

Use environment variables or your organisation's secret manager for runtime secrets. Commit only synthetic example data.

If you discover a secret in Git history, treat removal from the latest commit as insufficient: rotate/revoke the secret and rewrite the affected history before publication.
