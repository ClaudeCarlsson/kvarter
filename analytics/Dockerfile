FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

COPY pyproject.toml .python-version ./
RUN uv sync --frozen

COPY src/ src/
COPY tests/ tests/

CMD ["uv", "run", "python", "-m", "analytics.pipeline.runner"]
