# ACIA Backend - Production Container for Cloud Run
# Single-stage build to avoid permission issues with multi-stage user switching.
# Cloud Run provides container-level isolation so root inside the container
# is safe — it does not have host root privileges.

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Cloud Run injects PORT environment variable — default 8080
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start FastAPI with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]