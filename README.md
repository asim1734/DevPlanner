# DevPlanner

AI-powered project scaffolding tool that transforms ideas into visual task DAGs.

## Phase 1 Setup (Backend Foundation)

### Prerequisites
- Python 3.11
- PostgreSQL running locally
- Database credentials: `postgresql://taskuser:123@localhost/devplanner`

### Installation

1. **Create the database**
```bash
psql -U postgres
CREATE DATABASE devplanner;
CREATE USER taskuser WITH PASSWORD '123';
GRANT ALL PRIVILEGES ON DATABASE devplanner TO taskuser;
\q
```

2. **Set up Python virtual environment**
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Configure environment variables**
```bash
cd ..
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

4. **Run the server**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

5. **Test the API**
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "api_version": "1.0.0"
}
```

---

## Project Status

✅ **Phase 1: Backend Foundation** - COMPLETE
- [x] Configuration management (`config.py`)
- [x] Database setup (`database.py`)
- [x] SQLModel models (Project, Task, TaskDependency)
- [x] FastAPI app with CORS and health checks
- [x] Dependencies and environment setup

⬜ **Phase 2: PM Agent Chat Endpoint** - TODO
⬜ **Phase 3: Full Crew (Architect + Scrum Master)** - TODO
⬜ **Phase 4: Frontend Chat Interface** - TODO
⬜ **Phase 5: Frontend DAG Visualization** - TODO
