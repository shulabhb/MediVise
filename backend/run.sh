#!/bin/zsh

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

source .venv/bin/activate
echo "Starting MediVise backend on :8000"
echo "LLM_BASE_URL=${LLM_BASE_URL:-not-set}  LLM_MODEL=${LLM_MODEL:-not-set}"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
