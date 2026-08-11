# ── Stage 1: install deps ─────────────────────────────────────────────────────
FROM python:3.11-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM base AS runtime
WORKDIR /app

# Non-root user
RUN addgroup --system frex && adduser --system --ingroup frex frex
RUN chown -R frex:frex /app
USER frex

COPY --chown=frex:frex . .

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
