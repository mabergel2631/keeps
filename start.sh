#!/bin/bash
cd apps/api
pip install -r requirements.txt
pip install anthropic openai httpx
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
