# Distill Security Baseline

This document outlines the core security invariants and guidelines for the Distill platform.

## 1. Secret Management Policy

- **No Hardcoded Secrets**: Secrets (API keys, database passwords, JWT signing keys) must NEVER be hardcoded in the codebase.
- **Environment Variables**: Local development uses `.env` files (never committed to git).
- **Kubernetes Secrets**: Production environments use Kubernetes Secrets managed via AWS Secrets Manager and external-secrets operator.
- **Secret Detection**: The central repository uses a pre-commit hook with `detect-secrets` and Regex to block known secret token patterns (like AWS `AKIA` or Github `ghp_`) from being committed accidentally.

## 2. Authentication and Authorization

- **OIDC/PKCE**: All authentication sequences using external providers (Okta, Auth0, etc.) MUST use the Authorization Code Flow with PKCE.
- **JWT Standard**: Tokens are signed using ECDSA (`ES256`).
- **Token Lifetimes**:
  - Access Token TTL: `15 minutes`
  - Refresh Token TTL: `7 days`
- **Tenant Context Stripping**: The API Gateway is responsible for adding `X-Tenant-ID` headers to internal requests. Any incoming request from a client with these headers will have them explicitly stripped to avoid tenant spoofing.

## 3. Data Encryption

- **In Transit**: All components inside Kubernetes MUST communicate over mTLS or basic HTTPS. Client-to-server traffic is exclusively HTTPS (TLS 1.3 preferred).
- **At Rest**:
  - S3 Object Storage must be configured with `SSE-S3` or `SSE-KMS`.
  - Databases (RDS/TimescaleDB) and Redis must use EBS Volume Encryption (KMS).

## 4. API Security & Rate Limiting

- **Global Rate Limiting**: The gateway enforces rate limit blocks (e.g. `100 req/min per IP` for standard unauthenticated endpoints).
- **Helmet Headers**: Every Node.js Fastify service responds with strict `helmet` guidelines (HSTS, No MIME-sniffing, XSS protection, anti-clickjacking).
- **Request Body Limits**: Maximum payload size for JSON payloads is `1MB`. PDF uploads to S3 endpoints have a maximum limit of `50MB`.

## 5. Dependency Management Workflow

- Weekly updates are run and managed via **Dependabot**.
- PRs containing bumps for core critical tooling (ex: `jose`, `@fastify/helmet`) require explicit review from `@distill-admin`.
- Container builds use a secure baseline (`node:alpine` / `python:slim`), run under a non-root user (`USER node`), and are scanned using **Trivy** during CI prior to deployment.
