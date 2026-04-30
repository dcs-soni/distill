# Extraction Service — Python/FastAPI Rules

This is the ONLY Python service in the monorepo. It runs the multi-agent AI extraction pipeline.

## Internal Structure

```
app/
  domain/entities/    → Extraction, FinancialData (Pydantic models)
  domain/events/      → ExtractionStarted, ExtractionCompleted
  application/ports/  → Abstract interfaces: AIProvider, PDFReader, ExtractionRepo, EventPublisher
  application/use_cases/ → ExtractDocument, ReextractDocument
  infrastructure/ai/  → Provider adapters: gemini_provider.py, openai_provider.py, anthropic_provider.py, provider_factory.py
  infrastructure/pdf/ → PDF readers: pymupdf_reader.py, pdfplumber_reader.py
  infrastructure/persistence/ → sqlalchemy_repo.py
  infrastructure/messaging/   → rabbitmq_publisher.py, rabbitmq_consumer.py
  agents/             → Multi-agent pipeline: classifier → section_finder → extractor → normalizer → pipeline.py
  prompts/            → Versioned prompt templates (.txt files)
  main.py             → FastAPI app entry point
  config.py           → Environment configuration
```

## Rules

- Use Pydantic v2 BaseModel for ALL data schemas — never use plain dicts
- Use abstract base classes (ABC) for all ports in `application/ports/`
- AI provider fallback order: Gemini → OpenAI → Anthropic (configured in provider_factory.py)
- Provider factory implements circuit breaker: 5 failures in 2 minutes = skip provider temporarily
- Every extraction result must include: `tenant_id`, `provider_used`, `model_used`, `prompt_version`, `processing_time_ms`, `token_count`, `cost_usd`
- Prompt templates are versioned files in `prompts/` — changing a prompt should NOT require code changes
- Normalization agent uses local logic (no AI call) for currency/number conversion
- RabbitMQ consumer uses manual ack — ack after successful processing, nack+requeue on failure, DLX after 3 failures
- All database queries filtered by `tenant_id`
- Use structlog for structured JSON logging
- Use alembic for database migrations (not raw SQL)
