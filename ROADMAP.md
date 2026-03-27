# DevPlanner Development Roadmap

**One Phase = One Commit**
Each phase should be independently testable before moving to the next.

---

## ✅ COMPLETED

### Phase 1: Backend Foundation
**Status:** ✅ COMPLETE
**Commit:** `feat: Phase 1 backend foundation`

**Files:**
- `backend/config.py` - Environment configuration
- `backend/database.py` - SQLModel engine & session
- `backend/models/project.py` - Project table
- `backend/models/task.py` - Task table
- `backend/models/dependency.py` - TaskDependency table
- `backend/main.py` - FastAPI app with health checks
- `backend/requirements.txt` - Python dependencies

**Test:** `curl http://localhost:8000/health` returns `{"status":"healthy"}`

---

## 🚧 IN PROGRESS

### Phase 2: Pydantic Schemas (API & LLM DTOs)
**Status:** ⬜ TODO
**Commit:** `feat: add pydantic schemas for API validation and LLM outputs`

**Files to create:**
- `backend/schemas/__init__.py`
- `backend/schemas/prd.py` - PRDSchema, TechStackSchema (PM agent output)
- `backend/schemas/wbs.py` - WBSSchema, WBSTaskSchema (Architect output)
- `backend/schemas/graph.py` - GraphSchema, GraphTaskSchema (Scrum output)
- `backend/schemas/api.py` - NodeSchema, EdgeSchema, ProjectGraphSchema (API responses)

**Test:** Import schemas and validate sample JSON objects

---

### Phase 3: Graph Service (DAG Validation)
**Status:** ⬜ TODO
**Commit:** `feat: add graph service with cycle detection and topological sort`

**Files to create:**
- `backend/services/__init__.py`
- `backend/services/graph_service.py` - `has_cycle()`, `topological_sort()`

**Test:** Unit test with valid DAG and circular dependency DAG

---

### Phase 4: Groq LLM Setup
**Status:** ⬜ TODO
**Commit:** `feat: add Groq LLM singleton configuration`

**Files to create:**
- `backend/agents/__init__.py`
- `backend/agents/llm.py` - Singleton Groq LLM instance with llama-4-scout

**Test:** Import and verify LLM instance is created without errors

---

### Phase 5: Product Manager Agent
**Status:** ⬜ TODO
**Commit:** `feat: add PM agent with conversational task`

**Files to create:**
- `backend/agents/pm_agent.py` - PM agent definition and task

**Test:** Create a minimal crew with just PM agent and run it standalone

---

### Phase 6: Chat Endpoint (PM Agent Only)
**Status:** ⬜ TODO
**Commit:** `feat: add chat endpoint for PM agent conversation`

**Files to create:**
- `backend/routers/__init__.py`
- `backend/routers/chat.py` - `POST /chat` endpoint

**Files to update:**
- `backend/main.py` - Include the chat router via `app.include_router(...)`

**Test:**
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to build a todo app"}'
```

---

### Phase 7: Architect Agent
**Status:** ⬜ TODO
**Commit:** `feat: add architect agent for WBS generation`

**Files to create:**
- `backend/agents/architect_agent.py` - Architect agent definition and task

**Test:** Run architect agent with a mock PRD input

---

### Phase 8: Scrum Master Agent
**Status:** ⬜ TODO
**Commit:** `feat: add scrum master agent for dependency mapping`

**Files to create:**
- `backend/agents/scrum_agent.py` - Scrum Master agent definition and task

**Test:** Run scrum agent with mock WBS input

---

### Phase 9: Full Crew Orchestration
**Status:** ⬜ TODO
**Commit:** `feat: add sequential crew with all three agents`

**Files to create:**
- `backend/agents/crew.py` - Crew assembly and execution logic

**Test:** Run full crew with mock PRD input, verify WBS and DAG output

---

### Phase 10: Project Service (Database Operations)
**Status:** ⬜ TODO
**Commit:** `feat: add project service for CRUD operations`

**Files to create:**
- `backend/services/project_service.py` - Save project, tasks, dependencies to DB

**Test:** Call service methods directly, verify DB records created

---

### Phase 11: Generation Service (Crew Orchestration)
**Status:** ⬜ TODO
**Commit:** `feat: add generation service to orchestrate crew and persist results`

**Files to create:**
- `backend/services/generation_service.py` - Trigger crew, validate DAG, save to DB

**Note:** Keep this service simple — it only needs to call the crew, validate the DAG with `has_cycle()`, and save to DB. Do not over-engineer.

**Test:** Call generation service with PRD, verify full workflow completes

---

### Phase 12: Generate Endpoint
**Status:** ⬜ TODO
**Commit:** `feat: add generate endpoint to trigger full agent workflow`

**Files to create:**
- `backend/routers/generate.py` - `POST /generate` endpoint

**Files to update:**
- `backend/main.py` - Include the generate router via `app.include_router(...)`

**Test:**
```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d @mock_prd.json
```

---

### Phase 13: Projects Endpoints (Read Operations)
**Status:** ⬜ TODO
**Commit:** `feat: add project retrieval endpoints`

**Files to create:**
- `backend/routers/projects.py` - `GET /projects`, `GET /projects/{id}`, `GET /projects/{id}/graph`

**Files to update:**
- `backend/main.py` - Include the projects router via `app.include_router(...)`

**Test:**
```bash
curl http://localhost:8000/projects
curl http://localhost:8000/projects/{id}/graph
```

---

### Phase 14: Task Update Endpoint
**Status:** ⬜ TODO
**Commit:** `feat: add task status update endpoint`

**Files to update:**
- `backend/routers/projects.py` - Add `PATCH /projects/{id}/tasks/{task_id}`
- `backend/main.py` - Ensure projects router is already included from Phase 13

**Test:**
```bash
curl -X PATCH http://localhost:8000/projects/{id}/tasks/{task_id} \
  -H "Content-Type: application/json" \
  -d '{"status": "complete"}'
```

---

## 🎨 FRONTEND PHASES

### Phase 15: Frontend Scaffolding
**Status:** ⬜ TODO
**Commit:** `feat: initialize Next.js 14 frontend with Tailwind`

**Files to create:**
- `frontend/package.json`
- `frontend/next.config.js`
- `frontend/tailwind.config.js`
- `frontend/app/layout.tsx`
- `frontend/app/page.tsx`

**Test:** `npm run dev` starts successfully

---

### Phase 16: TypeScript Types & API Client
**Status:** ⬜ TODO
**Commit:** `feat: add TypeScript types and API client utilities`

**Files to create:**
- `frontend/types/index.ts` - Mirror backend schemas
- `frontend/lib/api.ts` - Typed fetch wrappers

**Test:** Import types and API functions without errors

---

### Phase 17: Zustand Store
**Status:** ⬜ TODO
**Commit:** `feat: add Zustand store for project state`

**Files to create:**
- `frontend/store/projectStore.ts` - Global state management

**Test:** Import store and verify initial state

---

### Phase 18: Chat Components
**Status:** ⬜ TODO
**Commit:** `feat: add chat UI components`

**Files to create:**
- `frontend/components/chat/ChatWindow.tsx`
- `frontend/components/chat/MessageBubble.tsx`
- `frontend/components/chat/PRDPreview.tsx`

**Test:** Render components in isolation with mock data

---

### Phase 19: Chat Page
**Status:** ⬜ TODO
**Commit:** `feat: add chat page with PM agent integration`

**Files to create:**
- `frontend/app/chat/page.tsx`

**Test:** Navigate to `/chat`, send messages, see PM agent responses

---

### Phase 20: Graph Transformation Utilities
**Status:** ⬜ TODO
**Commit:** `feat: add graph transformation utilities for React Flow`

**Files to create:**
- `frontend/lib/graphUtils.ts` - Transform API response to React Flow format

**Test:** Unit test transformation with mock data

---

### Phase 21: DAG Components
**Status:** ⬜ TODO
**Commit:** `feat: add React Flow DAG visualization components`

**Files to create:**
- `frontend/components/dag/ProjectDAG.tsx`
- `frontend/components/dag/TaskNode.tsx`
- `frontend/components/dag/TaskDetailPanel.tsx`

**Test:** Render components with mock nodes/edges

---

### Phase 22: Auto-Layout with Dagre
**Status:** ⬜ TODO
**Commit:** `feat: add dagre auto-layout for DAG positioning`

**Files to update:**
- `frontend/lib/graphUtils.ts` - Add dagre layout algorithm

**Test:** DAG nodes automatically arrange in proper hierarchy

---

### Phase 23: Project DAG Page
**Status:** ⬜ TODO
**Commit:** `feat: add project DAG visualization page`

**Files to create:**
- `frontend/app/project/[id]/page.tsx`

**Test:** Navigate to `/project/{id}`, see interactive DAG

---

### Phase 24: Landing Page & Navigation
**Status:** ⬜ TODO
**Commit:** `feat: add landing page and navigation`

**Files to update:**
- `frontend/app/page.tsx` - Landing page with project list
- `frontend/components/Navigation.tsx` - Header/nav component

**Test:** Full user flow: land → chat → generate → view DAG

---

## 🎯 TOTAL PHASES: 24

**Backend:** Phases 1-14 (14 commits)
**Frontend:** Phases 15-24 (10 commits)

**Current Status:** Phase 1 ✅ | Phase 2 ⬜ (Next)

---

## Testing Strategy Per Phase

- **Backend phases:** Use `curl` or `pytest` for each endpoint
- **Frontend phases:** Visual verification + component testing
- **Never move to next phase until current phase is verified working**

---

**Last Updated:** 2026-03-27
