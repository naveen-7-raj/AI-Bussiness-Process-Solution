FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends gcc g++ libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy backend requirements & application code
COPY backend/ /app/backend/
COPY ml/ /app/ml/

# Install Python packages
RUN pip install --no-cache-dir fastapi uvicorn asyncpg kafka-python xgboost shap pyjwt passlib[bcrypt] python-dotenv pydantic requests google-auth httpx

EXPOSE 8000

ENV PYTHONPATH=/app/backend:/app

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
