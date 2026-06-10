# Production-ready Dockerfile for Umoja AI Server

FROM python:3.11-slim

WORKDIR /app

# Keep local embedding work from spawning extra CPU threads.
ENV OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    TOKENIZERS_PARALLELISM=false

# Keep the build-time preload aligned with the runtime model.
ARG EMBEDDING_MODEL=intfloat/e5-large-v2
ENV EMBEDDING_MODEL=${EMBEDDING_MODEL}

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download and cache the same embedding model used at runtime.
RUN echo "Pre-loading sentence-transformers model..." && \
    python -c "from sentence_transformers import SentenceTransformer; import os; model_name = os.environ['EMBEDDING_MODEL']; print(f'Downloading {model_name}...'); SentenceTransformer(model_name, device='cpu'); print('Model cached - server will start faster.')"

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 umoja && chown -R umoja:umoja /app
USER umoja

EXPOSE 8000

# Keep the health check cheap so it does not create extra app work.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/ai/hello || exit 1

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
