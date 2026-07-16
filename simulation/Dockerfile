# ── Stage 1: install deps ─────────────────────────────────────────────────────
FROM python:3.11-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM base AS runtime
WORKDIR /app

# Download pre-trained models from Hugging Face
RUN curl -L -o predictive_model.joblib https://huggingface.co/collo-123-coll/Ai4i2020_model/resolve/main/predictive_model.joblib && \
    curl -L -o secom_model.joblib https://huggingface.co/collo-123-coll/secom_model/resolve/main/secom_model.joblib && \
    curl -L -o cmapss_models.joblib https://huggingface.co/collo-123-coll/cmapss/resolve/main/cmapss_models.joblib

# Non-root user
RUN addgroup --system frex && adduser --system --ingroup frex frex
RUN chown -R frex:frex /app
USER frex

COPY --chown=frex:frex . .

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
