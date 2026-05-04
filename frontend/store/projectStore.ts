import { create } from "zustand";

import type {
  GenerateEvent,
  PRD,
  ProjectDetail,
  ProjectGraph,
  ProjectSummary,
} from "@/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

type ProjectState = {
  sessionId: string | null;
  chatMessages: ChatMessage[];
  chatQuestions: string[];
  prdDraft: PRD | null;
  isFinal: boolean;
  isLocked: boolean;
  generationEvents: GenerateEvent[];
  generationAttempts: number;
  projects: ProjectSummary[];
  selectedProject: ProjectDetail | null;
  projectGraph: ProjectGraph | null;
  isLoading: boolean;
  error: string | null;
  setSessionId: (sessionId: string | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatQuestions: (questions: string[]) => void;
  setPrdDraft: (prd: PRD | null) => void;
  setIsFinal: (isFinal: boolean) => void;
  setIsLocked: (isLocked: boolean) => void;
  addGenerationEvent: (event: GenerateEvent) => void;
  incrementGenerationAttempts: () => void;
  resetGenerationAttempts: () => void;
  setProjects: (projects: ProjectSummary[]) => void;
  setSelectedProject: (project: ProjectDetail | null) => void;
  setProjectGraph: (graph: ProjectGraph | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetChat: () => void;
};

const initialChatState = {
  chatMessages: [],
  chatQuestions: [],
  prdDraft: null,
  isFinal: false,
  isLocked: false,
  generationEvents: [],
  generationAttempts: 0,
};

export const useProjectStore = create<ProjectState>((set) => ({
  sessionId: null,
  projects: [],
  selectedProject: null,
  projectGraph: null,
  isLoading: false,
  error: null,
  ...initialChatState,
  setSessionId: (sessionId) => set({ sessionId }),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  setChatQuestions: (chatQuestions) => set({ chatQuestions }),
  setPrdDraft: (prdDraft) => set({ prdDraft }),
  setIsFinal: (isFinal) => set({ isFinal }),
  setIsLocked: (isLocked) => set({ isLocked }),
  addGenerationEvent: (event) =>
    set((state) => ({
      generationEvents: [...state.generationEvents, event],
    })),
  incrementGenerationAttempts: () =>
    set((state) => ({
      generationAttempts: state.generationAttempts + 1,
    })),
  resetGenerationAttempts: () =>
    set({
      generationAttempts: 0,
      generationEvents: [],
    }),
  setProjects: (projects) => set({ projects }),
  setSelectedProject: (selectedProject) => set({ selectedProject }),
  setProjectGraph: (projectGraph) => set({ projectGraph }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  resetChat: () => set({ ...initialChatState, sessionId: null }),
}));
