# Distill — Enterprise Financial Data Extraction Platform

High-throughput microservices system that extracts structured financial data from PDFs using multi-agent AI (Gemini/OpenAI/Anthropic).

## Architecture

Polyglot monorepo with 7 microservices + API Gateway + SPA frontend. Each service follows **Hexagonal Architecture**. Services communicate via RabbitMQ events.

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.12+
- Docker and Docker Compose

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd distill
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Environment Setup:**
   Copy `.env.example` to `.env` and fill in API keys.
4. **Start Infrastructure:**
   ```bash
   docker compose -f infra/docker/docker-compose.yml up -d
   ```

Refer to `docs/` and `CLAUDE.md` for architectural patterns and runbooks.
