export type DiagramType = "architecture" | "erd";
export type Effort = "S" | "M" | "L";
export type TaskStatus = "todo" | "in_progress" | "complete";

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  other: string[];
}

export interface PRD {
  project_name: string;
  problem_statement: string;
  target_users: string;
  core_features: string[];
  out_of_scope: string[];
  tech_stack: TechStack;
}

export interface Diagram {
  title: string;
  type: DiagramType;
  mermaid: string;
}

export interface ArchitectOutput {
  diagrams: Diagram[];
}

export interface ScrumTask {
  title: string;
  description: string;
  epic: string;
  effort: Effort;
}

export interface ScrumTaskList {
  tasks: ScrumTask[];
}

export interface GraphTask {
  title: string;
  depends_on: string[];
}

export interface Graph {
  tasks: GraphTask[];
}

export interface TaskDependency {
  title: string;
  depends_on: string[];
}

export interface DependencyGraph {
  dependencies: TaskDependency[];
}

export interface Node {
  id: string;
  title: string;
  description: string;
  epic: string;
  effort: Effort;
  status: TaskStatus;
}

export interface Edge {
  source: string;
  target: string;
}

export interface ProjectGraph {
  nodes: Node[];
  edges: Edge[];
}

export interface ChatRequest {
  session_id?: string;
  message: string;
}

export interface ChatResponse {
  session_id: string;
  message: string;
  prd_draft?: PRD | null;
  is_final: boolean;
  questions?: string[] | null;
}

export interface GenerateRequest {
  session_id: string;
}

export interface GenerateEvent {
  stage: string;
  status: string;
  message: string;
  project_id?: string;
  warnings_count?: number;
}

export interface ProjectSummary {
  id: string;
  session_id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export interface ProjectDetail extends ProjectSummary {
  prd_json: PRD;
  diagrams_json?: ArchitectOutput | null;
  tasks_count: number;
  dependencies_count: number;
}

export interface TaskStatusUpdateRequest {
  status: TaskStatus;
}
