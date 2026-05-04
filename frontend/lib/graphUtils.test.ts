/**
 * Unit tests for graph transformation utilities
 */

import {
  transformAPIGraphToFlowGraph,
  calculateGraphBounds,
  analyzeGraphMetrics,
  APIGraph,
} from "./graphUtils";

describe("graphUtils", () => {
  describe("transformAPIGraphToFlowGraph", () => {
    test("should transform single node with no edges", () => {
      const apiGraph: APIGraph = {
        nodes: [
          {
            id: "task1",
            title: "Task 1",
            description: "First task",
            epic: "Epic A",
            effort: "S",
            status: "todo",
          },
        ],
        edges: [],
      };

      const result = transformAPIGraphToFlowGraph(apiGraph);

      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
      expect(result.nodes[0].id).toBe("task1");
      expect(result.nodes[0].data.label).toBe("Task 1");
      expect(result.nodes[0].data.title).toBe("Task 1");
      expect(result.nodes[0].position).toBeDefined();
      expect(result.nodes[0].position.x).toBeDefined();
      expect(result.nodes[0].position.y).toBeDefined();
    });

    test("should transform linear dependency chain", () => {
      const apiGraph: APIGraph = {
        nodes: [
          {
            id: "task1",
            title: "Task 1",
            description: "First task",
            epic: "Epic A",
            effort: "S",
            status: "todo",
          },
          {
            id: "task2",
            title: "Task 2",
            description: "Second task",
            epic: "Epic A",
            effort: "M",
            status: "todo",
          },
          {
            id: "task3",
            title: "Task 3",
            description: "Third task",
            epic: "Epic B",
            effort: "L",
            status: "in_progress",
          },
        ],
        edges: [
          { source: "task1", target: "task2" },
          { source: "task2", target: "task3" },
        ],
      };

      const result = transformAPIGraphToFlowGraph(apiGraph);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);

      // Verify nodes have proper structure
      for (const node of result.nodes) {
        expect(node.id).toBeDefined();
        expect(node.data.label).toBeDefined();
        expect(node.position).toBeDefined();
        expect(node.style).toBeDefined();
      }

      // Verify edges have proper structure
      for (const edge of result.edges) {
        expect(edge.id).toBeDefined();
        expect(edge.source).toBeDefined();
        expect(edge.target).toBeDefined();
      }

      // Verify edge connections
      const edge1 = result.edges.find((e) => e.source === "task1");
      expect(edge1?.target).toBe("task2");

      const edge2 = result.edges.find((e) => e.source === "task2");
      expect(edge2?.target).toBe("task3");
    });

    test("should handle DAG with multiple roots", () => {
      const apiGraph: APIGraph = {
        nodes: [
          {
            id: "task1",
            title: "Task 1",
            description: "First root",
            epic: "Epic A",
            effort: "S",
            status: "complete",
          },
          {
            id: "task2",
            title: "Task 2",
            description: "Second root",
            epic: "Epic A",
            effort: "M",
            status: "todo",
          },
          {
            id: "task3",
            title: "Task 3",
            description: "Join node",
            epic: "Epic B",
            effort: "L",
            status: "todo",
          },
        ],
        edges: [
          { source: "task1", target: "task3" },
          { source: "task2", target: "task3" },
        ],
      };

      const result = transformAPIGraphToFlowGraph(apiGraph);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);

      // task1 and task2 should be at same level (both roots)
      // task3 should be at a lower level
      const task1 = result.nodes.find((n) => n.id === "task1")!;
      const task2 = result.nodes.find((n) => n.id === "task2")!;
      const task3 = result.nodes.find((n) => n.id === "task3")!;

      expect(task1.position.y).toBe(task2.position.y);
      expect(task3.position.y).toBeGreaterThan(task1.position.y);
    });

    test("should apply style colors based on status and effort", () => {
      const apiGraph: APIGraph = {
        nodes: [
          {
            id: "task1",
            title: "Complete Task",
            description: "Done task",
            epic: "Epic A",
            effort: "L",
            status: "complete",
          },
        ],
        edges: [],
      };

      const result = transformAPIGraphToFlowGraph(apiGraph);

      const node = result.nodes[0];
      expect(node.style?.border).toBeDefined();
      // Border should include green color for complete status
      expect(node.style?.border).toContain("22c55e");
    });

    test("should handle empty graph", () => {
      const apiGraph: APIGraph = {
        nodes: [],
        edges: [],
      };

      const result = transformAPIGraphToFlowGraph(apiGraph);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });

  describe("calculateGraphBounds", () => {
    test("should calculate bounds for single node", () => {
      const nodes = [
        {
          id: "task1",
          data: {
            label: "Task 1",
            title: "Task 1",
            description: "Desc",
            epic: "Epic",
            effort: "S",
            status: "todo",
          },
          position: { x: 0, y: 0 },
        },
      ];

      const bounds = calculateGraphBounds(nodes);

      expect(bounds).not.toBeNull();
      expect(bounds!.minX).toBe(0);
      expect(bounds!.minY).toBe(0);
      expect(bounds!.maxX).toBeGreaterThan(0);
      expect(bounds!.maxY).toBeGreaterThan(0);
    });

    test("should calculate bounds for multiple nodes", () => {
      const nodes = [
        {
          id: "task1",
          data: {
            label: "Task 1",
            title: "Task 1",
            description: "Desc",
            epic: "Epic",
            effort: "S",
            status: "todo",
          },
          position: { x: -100, y: -50 },
        },
        {
          id: "task2",
          data: {
            label: "Task 2",
            title: "Task 2",
            description: "Desc",
            epic: "Epic",
            effort: "M",
            status: "todo",
          },
          position: { x: 100, y: 100 },
        },
      ];

      const bounds = calculateGraphBounds(nodes);

      expect(bounds).not.toBeNull();
      expect(bounds!.minX).toBe(-100);
      expect(bounds!.maxX).toBeGreaterThan(100);
      expect(bounds!.minY).toBe(-50);
      expect(bounds!.maxY).toBeGreaterThan(100);
    });

    test("should return null for empty array", () => {
      const bounds = calculateGraphBounds([]);
      expect(bounds).toBeNull();
    });
  });

  describe("analyzeGraphMetrics", () => {
    test("should count nodes and edges correctly", () => {
      const apiGraph: APIGraph = {
        nodes: [
          {
            id: "task1",
            title: "Task 1",
            description: "Desc",
            epic: "Epic",
            effort: "S",
            status: "todo",
          },
          {
            id: "task2",
            title: "Task 2",
            description: "Desc",
            epic: "Epic",
            effort: "M",
            status: "todo",
          },
          {
            id: "task3",
            title: "Task 3",
            description: "Desc",
            epic: "Epic",
            effort: "L",
            status: "todo",
          },
        ],
        edges: [
          { source: "task1", target: "task2" },
          { source: "task2", target: "task3" },
        ],
      };

      const metrics = analyzeGraphMetrics(apiGraph);

      expect(metrics.totalNodes).toBe(3);
      expect(metrics.totalEdges).toBe(2);
    });

    test("should identify most depended on tasks", () => {
      const apiGraph: APIGraph = {
        nodes: [
          {
            id: "task1",
            title: "Task 1",
            description: "Desc",
            epic: "Epic",
            effort: "S",
            status: "todo",
          },
          {
            id: "task2",
            title: "Task 2",
            description: "Desc",
            epic: "Epic",
            effort: "M",
            status: "todo",
          },
          {
            id: "task3",
            title: "Task 3",
            description: "Desc",
            epic: "Epic",
            effort: "L",
            status: "todo",
          },
        ],
        edges: [
          { source: "task1", target: "task2" },
          { source: "task1", target: "task3" },
        ],
      };

      const metrics = analyzeGraphMetrics(apiGraph);

      // task1 has out-degree 2, so task2 and task3 both depend on it
      // But mostDepended looks at in-degree, so task2 and task3 should be there
      expect(metrics.mostDepended).toContain("task2");
      expect(metrics.mostDepended).toContain("task3");
    });

    test("should handle empty graph", () => {
      const apiGraph: APIGraph = {
        nodes: [],
        edges: [],
      };

      const metrics = analyzeGraphMetrics(apiGraph);

      expect(metrics.totalNodes).toBe(0);
      expect(metrics.totalEdges).toBe(0);
      expect(metrics.criticalPath).toEqual([]);
    });
  });
});
