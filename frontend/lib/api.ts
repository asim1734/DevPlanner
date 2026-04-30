import type {
  ChatRequest,
  ChatResponse,
  GenerateEvent,
  Node,
  ProjectDetail,
  ProjectGraph,
  ProjectSummary,
  TaskStatus,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function parseErrorResponse(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") {
        return data.detail;
      }
      return JSON.stringify(data);
    } catch {
      return response.statusText;
    }
  }
  try {
    return await response.text();
  } catch {
    return response.statusText;
  }
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function postChat(request: ChatRequest): Promise<ChatResponse> {
  return fetchJson<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function lockChat(sessionId: string): Promise<ChatResponse> {
  return fetchJson<ChatResponse>(`/chat/${sessionId}/lock`, {
    method: "POST",
  });
}

export function listProjects(params: {
  limit?: number;
  offset?: number;
} = {}): Promise<ProjectSummary[]> {
  const search = new URLSearchParams();
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const query = search.toString();
  const path = query ? `/projects?${query}` : "/projects";
  return fetchJson<ProjectSummary[]>(path);
}

export function getProject(projectId: string): Promise<ProjectDetail> {
  return fetchJson<ProjectDetail>(`/projects/${projectId}`);
}

export function getProjectGraph(projectId: string): Promise<ProjectGraph> {
  return fetchJson<ProjectGraph>(`/projects/${projectId}/graph`);
}

export function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: TaskStatus,
): Promise<Node> {
  return fetchJson<Node>(`/projects/${projectId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function streamGenerate(
  sessionId: string,
  onEvent: (event: GenerateEvent) => void,
  onError?: (error: Error) => void,
): Promise<void> {
  const response = await fetch(buildUrl("/generate"), {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming response body was empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith("data:"));

      if (!line) {
        continue;
      }

      const payload = line.replace(/^data:\s*/, "");
      try {
        onEvent(JSON.parse(payload) as GenerateEvent);
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
      }
    }
  }
}
