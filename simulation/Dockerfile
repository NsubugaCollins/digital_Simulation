# ── Stage 1: install deps ─────────────────────────────────────────────────────
FROM python:3.11-slim AS base
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM base AS runtime
WORKDIR /app

# Non-root user
RUN addgroup --system frex && adduser --system --ingroup frex frex
USER frex

COPY --chown=frex:frex . .

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
