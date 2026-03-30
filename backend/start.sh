#!/bin/bash

echo "Starting PostgreSQL service..."
sudo service postgresql start

echo "Activating virtual environment..."
source venv/bin/activate

echo "Starting FastAPI server..."
uvicorn main:app --reload --port 8001