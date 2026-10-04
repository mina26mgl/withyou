FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini pyproject.toml ./
COPY app ./app
COPY config ./config
COPY migrations ./migrations
COPY scripts ./scripts
COPY data ./data

EXPOSE 8001
# Apply migrations then serve. Use several workers only with an external cache:
# each worker keeps its own in-memory catalogue index.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8001"]
