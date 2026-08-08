# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main branch) | Yes |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** create a public GitHub Issue for security vulnerabilities
2. Send a report via [GitHub Security Advisories](https://github.com/Kenta-Matsuda/Kenta-Matsuda.github.io-aws-study/security/advisories/new)
3. Include a description of the vulnerability and steps to reproduce

## Response Timeline

- Acknowledgment: within 48 hours
- Fix timeline: depends on severity, typically within 7 days

## Scope

This application runs entirely in the browser. API keys are stored in localStorage and are never transmitted to third-party servers. The primary security concerns are:

- XSS (Cross-Site Scripting) via user input or AI-generated content
- Exposure of API keys in shared environments
- Integrity of third-party CDN resources

## Best Practices for Users

- Do not use this application on shared/public computers without clearing your API keys afterward
- Use API keys with minimal permissions where possible
