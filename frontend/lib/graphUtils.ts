/**
 * Graph transformation utilities for React Flow.
 * Converts API response format to React Flow node/edge format.
 */

// React Flow types
export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  title: string;
  description: string;
  epic: string;
  effort: string;
  status: string;
}

export interface FlowNode {
  id: string;
  data: NodeData;
  position: Position;
  type?: string;
  style?: React.CSSProperties;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
}

// API types (mirror backend schemas)
export interface APINode {
  id: string;
  title: string;
  description: string;
  epic: string;
  effort: string;
  status: string;
}

export interface APIEdge {
  source: string;
  target: string;
}

export interface APIGraph {
  nodes: APINode[];
  edges: APIEdge[];
}

/**
 * Layout strategy: Compute approximate positions using a simple grid/level approach.
 * Groups nodes by depth level in the DAG and positions them in rows.
 *
 * @param nodes - Array of nodes
 * @param edges - Array of edges defining dependencies
 * @returns Map of nodeId -> Position
 */
function computeNodePositions(
  nodes: APINode[],
  edges: APIEdge[]
): Map<string, Position> {
  const positions = new Map<string, Position>();

  // Build adjacency map and compute in-degree for each node
  const adjMap = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const node of nodes) {
    adjMap.set(node.id, new Set());
    inDegree.set(node.id, 0);
  }

  // Build graph
  for (const edge of edges) {
    adjMap.get(edge.source)?.add(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Compute topological levels using BFS
  const levels = new Map<string, number>();
  const queue: string[] = [];

  // Find root nodes (in-degree = 0)
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
      levels.set(nodeId, 0);
    }
  }

  // BFS to assign levels
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentLevel = levels.get(nodeId) || 0;

    for (const childId of adjMap.get(nodeId) || []) {
      const childLevel = Math.max(currentLevel + 1, levels.get(childId) || 0);
      levels.set(childId, childLevel);

      // Check if all prerequisites are processed
      let allPrerequisitesProcessed = true;
      for (const [depNodeId, children] of adjMap) {
        if (children.has(childId) && !levels.has(depNodeId)) {
          allPrerequisitesProcessed = false;
          break;
        }
      }

      if (allPrerequisitesProcessed && !queue.includes(childId)) {
        queue.push(childId);
      }
    }
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, string[]>();
  for (const [nodeId, level] of levels) {
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(nodeId);
  }

  // Position nodes
  const horizontalSpacing = 300;
  const verticalSpacing = 150;
  const nodeWidth = 250;

  for (const [level, nodeIds] of nodesByLevel) {
    const y = level * verticalSpacing;
    const levelWidth = nodeIds.length * horizontalSpacing;
    const startX = -(levelWidth / 2) + horizontalSpacing / 2;

    nodeIds.forEach((nodeId, index) => {
      const x = startX + index * horizontalSpacing;
      positions.set(nodeId, { x, y });
    });
  }

  // Handle unvisited nodes (disconnected components)
  // Place them in a separate area
  let disconnectedY = Math.max(...levels.values(), 0) * verticalSpacing + 300;
  let disconnectedX = 0;

  for (const node of nodes) {
    if (!positions.has(node.id)) {
      positions.set(node.id, { x: disconnectedX, y: disconnectedY });
      disconnectedX += horizontalSpacing;
    }
  }

  return positions;
}

/**
 * Get color for effort badge
 */
function getEffortColor(effort: string): string {
  switch (effort) {
    case "S":
      return "#4ade80"; // green
    case "M":
      return "#facc15"; // yellow
    case "L":
      return "#f87171"; // red
    default:
      return "#d1d5db"; // gray
  }
}

/**
 * Get color for status badge
 */
function getStatusColor(status: string): string {
  switch (status) {
    case "complete":
      return "#22c55e"; // green
    case "in_progress":
      return "#3b82f6"; // blue
    case "todo":
      return "#9ca3af"; // gray
    default:
      return "#6b7280"; // muted gray
  }
}

/**
 * Transform API graph to React Flow format
 */
export function transformAPIGraphToFlowGraph(apiGraph: APIGraph): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  // Compute positions for nodes
  const positions = computeNodePositions(apiGraph.nodes, apiGraph.edges);

  // Transform nodes
  const flowNodes: FlowNode[] = apiGraph.nodes.map((apiNode) => {
    const position = positions.get(apiNode.id) || { x: 0, y: 0 };

    return {
      id: apiNode.id,
      data: {
        label: apiNode.title,
        title: apiNode.title,
        description: apiNode.description,
        epic: apiNode.epic,
        effort: apiNode.effort,
        status: apiNode.status,
      },
      position,
      type: "default",
      style: {
        background: "#fff",
        border: `2px solid ${getStatusColor(apiNode.status)}`,
        borderRadius: "8px",
        padding: "12px",
        minWidth: "250px",
        fontSize: "14px",
        fontWeight: "500",
      },
    };
  });

  // Transform edges
  const flowEdges: FlowEdge[] = apiGraph.edges.map((apiEdge, index) => {
    return {
      id: `edge-${apiEdge.source}-${apiEdge.target}-${index}`,
      source: apiEdge.source,
      target: apiEdge.target,
      type: "smoothstep",
      animated: false,
    };
  });

  return { nodes: flowNodes, edges: flowEdges };
}

/**
 * Calculate bounds of all nodes (for fitting view)
 */
export function calculateGraphBounds(
  nodes: FlowNode[]
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  if (nodes.length === 0) return null;

  const nodeWidth = 250;
  const nodeHeight = 100;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Count task dependencies and dependents
 */
export function analyzeGraphMetrics(apiGraph: APIGraph): {
  totalNodes: number;
  totalEdges: number;
  criticalPath: string[];
  mostDepended: string[];
} {
  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();

  // Initialize counts
  for (const node of apiGraph.nodes) {
    outDegree.set(node.id, 0);
    inDegree.set(node.id, 0);
  }

  // Count edges
  for (const edge of apiGraph.edges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find most depended on tasks (highest in-degree)
  const mostDepended = Array.from(inDegree.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  // Find critical path (for now, just the longest path from sources to sinks)
  const criticalPath: string[] = [];
  const sources = Array.from(inDegree.entries())
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id);

  if (sources.length > 0) {
    // Use first source as starting point
    criticalPath.push(sources[0]);
  }

  return {
    totalNodes: apiGraph.nodes.length,
    totalEdges: apiGraph.edges.length,
    criticalPath,
    mostDepended,
  };
}
