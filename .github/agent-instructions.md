# DevPlanner — Master Architecture Prompt

> Use this as your initial prompt when starting a new AI coding session. It gives the AI everything it needs to understand the project before writing a single line of code.

---

## PROMPT START

You are helping me build **DevPlanner**, an AI-powered project scaffolding tool. Before writing any code, read this entire document carefully. It defines the project's purpose, architecture, data flow, folder structure, and technical constraints. All code you write must be consistent with this specification.

---

## 1. What DevPlanner Does

DevPlanner takes a user's raw, unstructured project idea and transforms it into a formal, visual project plan through the following flow:

1. The user types a messy natural language description of their idea into a chat interface.
2. A **Product Manager AI agent** converses with the user, asking clarifying questions until the scope is clear. It then generates a structured **Product Requirements Document (PRD)** as a validated JSON object.
3. Once the user approves the PRD, the backend triggers two more agents in sequence:
   - An **Architect agent** reads the PRD and generates a technical Work Breakdown Structure (WBS) — a list of development tasks with metadata.
   - A **Scrum Master agent** reads the WBS and assigns dependency relationships between tasks, producing a **Directed Acyclic Graph (DAG)** — a graph where each task node points to the tasks that depend on it.
4. The backend validates the DAG for circular dependencies using **topological sort**, then persists it as an adjacency list in PostgreSQL.
5. The frontend fetches the graph data and renders it as an interactive visual DAG using **React Flow**.
6. The user can click nodes to view task details and mark tasks as complete.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Use the `app/` directory, not `pages/` |
| Styling | Tailwind CSS | Utility classes only, no custom CSS files |
| State Management | Zustand | For global project/graph state |
| DAG Visualization | React Flow | `@xyflow/react` package |
| Backend | FastAPI (Python) | Async endpoints throughout |
| Schema Validation | Pydantic v2 | All request/response models use Pydantic |
| Agent Framework | CrewAI | Sequential process, 3 agents |
| AI Model | Groq (`meta-llama/llama-4-scout-17b-16e-instruct`) | Via CrewAI's `LLM` class with `groq/` prefix |
| Database | PostgreSQL | Managed via SQLModel |
| ORM | SQLModel | Combines SQLAlchemy + Pydantic |
| Environment | Python `venv` for backend, Node for frontend |

---

## 3. Complete Folder Structure

```
devplanner/
│
├── backend/                        # FastAPI Python application
│   ├── main.py                     # FastAPI app entry point, middleware, lifespan
│   ├── config.py                   # Settings via pydantic-settings (reads .env)
│   ├── database.py                 # Engine creation, get_session dependency
│   │
│   ├── models/                     # SQLModel database models
│   │   ├── __init__.py
│   │   ├── project.py              # Project model
│   │   ├── task.py                 # Task model (stores DAG nodes)
│   │   └── dependency.py          # TaskDependency model (stores DAG edges)
│   │
│   ├── schemas/                    # Pydantic schemas (request/response, not DB)
│   │   ├── __init__.py
│   │   ├── prd.py                  # PRDSchema - output of PM agent
│   │   ├── wbs.py                  # WBSSchema, TaskSchema - output of Architect
│   │   └── graph.py               # GraphSchema, NodeSchema, EdgeSchema - API response
│   │
│   ├── agents/                     # CrewAI agent and task definitions
│   │   ├── __init__.py
│   │   ├── pm_agent.py             # Product Manager agent + task
│   │   ├── architect_agent.py     # Architect agent + task
│   │   ├── scrum_agent.py          # Scrum Master agent + task
│   │   └── crew.py                 # Assembles and runs the full crew
│   │
│   ├── services/                   # Business logic, separate from routes
│   │   ├── __init__.py
│   │   ├── graph_service.py        # DAG cycle detection, topological sort
│   │   └── project_service.py     # Save project + graph to DB
│   │
│   ├── routers/                    # FastAPI route handlers
│   │   ├── __init__.py
│   │   ├── chat.py                 # POST /chat (PM agent conversation)
│   │   ├── generate.py             # POST /generate (trigger full crew)
│   │   └── projects.py            # GET /projects, GET /projects/{id}/graph
│   │
│   └── requirements.txt
│
├── frontend/                       # Next.js application
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Landing / redirect
│   │   ├── chat/
│   │   │   └── page.tsx            # Chat interface with PM agent
│   │   └── project/
│   │       └── [id]/
│   │           └── page.tsx        # DAG visualization page
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx      # Message list + input box
│   │   │   ├── MessageBubble.tsx   # Individual message component
│   │   │   └── PRDPreview.tsx      # Renders the PRD JSON as readable card
│   │   └── dag/
│   │       ├── ProjectDAG.tsx      # React Flow wrapper, node/edge state
│   │       ├── TaskNode.tsx        # Custom React Flow node component
│   │       └── TaskDetailPanel.tsx # Sidebar showing selected node details
│   │
│   ├── store/
│   │   └── projectStore.ts         # Zustand store (project, PRD, graph state)
│   │
│   ├── lib/
│   │   ├── api.ts                  # Typed fetch wrappers for all backend calls
│   │   └── graphUtils.ts          # Transform adjacency list → React Flow nodes/edges
│   │
│   └── types/
│       └── index.ts                # Shared TypeScript types mirroring backend schemas
│
├── .env                            # Never commit this
└── .env.example                    # Commit this
```

---

## 4. Database Schema

### Tables

**projects**
```
id          UUID, primary key
name        VARCHAR
description TEXT
prd_json    JSONB        -- stores full PRD object
status      VARCHAR      -- "active" | "complete"
created_at  TIMESTAMP
```

**tasks**
```
id           UUID, primary key
project_id   UUID, foreign key → projects.id
title        VARCHAR
description  TEXT
epic         VARCHAR      -- grouping label (e.g. "Backend", "Frontend")
effort       VARCHAR      -- "S" | "M" | "L"
status       VARCHAR      -- "todo" | "in_progress" | "complete"
```

**task_dependencies**
```
id              UUID, primary key
task_id         UUID, foreign key → tasks.id   -- the dependent task
depends_on_id   UUID, foreign key → tasks.id   -- the prerequisite task
```

> A row in task_dependencies means: task_id CANNOT start until depends_on_id is complete.

---

## 5. API Endpoints

```
POST   /chat                    -- Send message to PM agent, returns streamed response
POST   /generate                -- Trigger Architect + Scrum Master crew with approved PRD
GET    /projects                -- List all projects
GET    /projects/{id}           -- Get single project with PRD
GET    /projects/{id}/graph     -- Get full DAG as nodes + edges JSON
PATCH  /projects/{id}/tasks/{task_id}  -- Update task status
```

---

## 6. Key Data Schemas (Pydantic)

### PRDSchema (output of PM agent)
```python
class PRDSchema(BaseModel):
    project_name: str
    problem_statement: str
    target_users: str
    core_features: List[str]
    out_of_scope: List[str]
    tech_stack: TechStackSchema

class TechStackSchema(BaseModel):
    frontend: str
    backend: str
    database: str
    other: List[str]
```

### WBSTaskSchema (output of Architect agent)
```python
class WBSTaskSchema(BaseModel):
    title: str
    description: str
    epic: str
    effort: Literal["S", "M", "L"]

class WBSSchema(BaseModel):
    tasks: List[WBSTaskSchema]
```

### GraphTaskSchema (output of Scrum Master agent)
```python
class GraphTaskSchema(BaseModel):
    title: str
    depends_on: List[str]  # list of task titles this task depends on

class GraphSchema(BaseModel):
    tasks: List[GraphTaskSchema]
```

### API Response Schema (sent to frontend)
```python
class NodeSchema(BaseModel):
    id: str
    title: str
    description: str
    epic: str
    effort: str
    status: str

class EdgeSchema(BaseModel):
    source: str   # task id
    target: str   # task id

class ProjectGraphSchema(BaseModel):
    nodes: List[NodeSchema]
    edges: List[EdgeSchema]
```

---

## 7. Agent Definitions

### LLM Setup (used by all agents)
```python
from crewai import LLM

groq_llm = LLM(
    model="groq/meta-llama/llama-4-scout-17b-16e-instruct",
    api_key=os.environ.get("GROQ_API_KEY")
)
```
Pass `llm=groq_llm` to every agent definition.

### Why llama-4-scout over llama-3.3-70b-versatile
On Groq's free tier, llama-4-scout provides 30K TPM and 500K TPD vs 12K TPM and 100K TPD for 70b-versatile. The 3-agent sequential crew burns tokens fast during development — scout's limits prevent constant rate limit errors while testing without needing to mock every run.

### Agent 1: Product Manager
```
role: "Senior Product Manager"
goal: "Clarify the user's raw idea into a precise, structured PRD with no ambiguity"
backstory: "You are a precise PM who asks one clarifying question at a time.
            You never make assumptions. You confirm scope, users, and features
            before formalizing anything."

task expected_output: PRDSchema (output_pydantic=PRDSchema)
```

### Agent 2: Architect
```
role: "Senior Software Architect"
goal: "Break down the approved PRD into atomic, implementable development tasks"
backstory: "You are a pragmatic architect who creates task lists with no overlap.
            Every task is independently implementable. Tasks are grouped into epics.
            You do not invent features not in the PRD."

task expected_output: WBSSchema (output_pydantic=WBSSchema)
task context: [pm_task]   -- receives PRD as input
```

### Agent 3: Scrum Master
```
role: "Senior Scrum Master"
goal: "Map task dependencies accurately. A task only depends on another if it
       literally cannot start without it being complete."
backstory: "You are conservative with dependencies. You only add a dependency
            when it is technically necessary, not just logically related.
            You never create circular dependencies."

task expected_output: GraphSchema (output_pydantic=GraphSchema)
task context: [pm_task, architect_task]   -- receives PRD + WBS as input
```

---

## 8. DAG Cycle Detection (graph_service.py)

Before persisting the graph, run a topological sort to detect cycles.
If a cycle is detected, raise an HTTPException with a clear error message.

```python
from collections import defaultdict, deque

def has_cycle(tasks: list[GraphTaskSchema]) -> bool:
    """
    Kahn's algorithm topological sort.
    Returns True if a cycle exists, False if the graph is valid.
    """
    in_degree = defaultdict(int)
    adjacency = defaultdict(list)

    task_titles = {t.title for t in tasks}

    for task in tasks:
        for dep in task.depends_on:
            if dep in task_titles:
                adjacency[dep].append(task.title)
                in_degree[task.title] += 1

    queue = deque([t.title for t in tasks if in_degree[t.title] == 0])
    visited = 0

    while queue:
        node = queue.popleft()
        visited += 1
        for neighbor in adjacency[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return visited != len(tasks)  # True = cycle exists
```

---

## 9. Frontend: Transforming API Response to React Flow

The function in `lib/graphUtils.ts` converts the backend's nodes/edges response into React Flow's format:

```typescript
import { Node, Edge } from '@xyflow/react';

export function transformToReactFlow(
  nodes: NodeSchema[],
  edges: EdgeSchema[]
): { nodes: Node[]; edges: Edge[] } {
  const rfNodes: Node[] = nodes.map((node, index) => ({
    id: node.id,
    type: 'taskNode',          // custom node component
    position: { x: (index % 4) * 220, y: Math.floor(index / 4) * 140 },
    data: { ...node },
  }));

  const rfEdges: Edge[] = edges.map((edge) => ({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    animated: false,
    style: { stroke: '#94a3b8' },
  }));

  return { nodes: rfNodes, edges: rfEdges };
}
```

> Note: Initial positions are a rough grid. React Flow's auto-layout or dagre layout library should be used for proper DAG layout.

---

## 10. Environment Variables

```
# .env.example

# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/devplanner
GROQ_API_KEY=your_groq_api_key_here

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 11. Critical Constraints

1. **Never hardcode API keys.** Always read from environment variables via `config.py` (backend) and `.env.local` (frontend).

2. **All agent outputs must use `output_pydantic`.** Never parse raw string output from agents. Always enforce schema via CrewAI's `output_pydantic` parameter.

3. **Validate the DAG before saving.** Always run `has_cycle()` from `graph_service.py` before calling any DB write in the generate endpoint.

4. **Use async FastAPI endpoints.** All route handlers should be `async def`. DB sessions use the `get_session` dependency injection pattern.

5. **Never store the full conversation history in the DB.** Only the final approved PRD JSON is persisted. Conversation context is managed in frontend Zustand state during the chat phase.

6. **React Flow needs `@xyflow/react` not `reactflow`.** The package was renamed. Use `@xyflow/react` throughout.

7. **The PM agent is conversational, not a single-shot crew run.** The `/chat` endpoint is called once per user message. The crew is only triggered at `/generate` after the user approves the PRD.

---

## 12. What Is Out of Scope (Do Not Build)

- Dynamic schedule self-healing (auto-shifting deadlines)
- Celery / Redis job queues
- User authentication / multi-user support
- Email notifications
- Mobile responsive design (desktop only for MVP)

---

## PROMPT END