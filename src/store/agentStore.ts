import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { biomniAPI } from "@/lib/api";
import {
  BiomniConfig,
  ChatMessage,
  AgentQueryRequest,
  AgentInitRequest,
  SystemPrompt,
  ToolSchema,
  DataLakeItem,
  LibraryItem,
  CustomTool,
  CustomData,
  CustomSoftware,
  ResearchSession,
  WebSocketConfig,
  StreamLogMessage,
  StreamErrorMessage,
} from "@/types/biomni";

// Keep a reference to the WebSocket outside the store
let ws: WebSocket | null = null;

interface ExecutorLog {
  id: string;
  type:
    | "planning"
    | "reasoning"
    | "code"
    | "observation"
    | "conclusion"
    | "error"
    | "task"
    | "resource"
    | "visualization";
  title: string;
  status: "running" | "completed" | "error" | "pending";
  content: string;
  timestamp: Date;
  stepNumber?: number;
  duration?: string;
  details?: {
    type: "list" | "table" | "code" | "text" | "visualization";
    data?: any;
  };
  visualizations?: {
    id: string;
    title: string;
    type: "scatter" | "bar" | "line" | "heatmap";
    data: any;
    config?: any;
  }[];
}

interface AgentState {
  // Agent state
  isInitialized: boolean;
  isProcessing: boolean;
  currentTask?: string;
  error?: string;
  config?: BiomniConfig;
  systemPrompt?: SystemPrompt;

  // Chat state
  messages: ChatMessage[];
  currentSession?: ResearchSession;

  // Executor logs
  executorLogs: ExecutorLog[];

  // Resources
  tools: ToolSchema[];
  toolsByCategory: Record<string, ToolSchema[]>;
  dataLake: DataLakeItem[];
  softwareLibrary: LibraryItem[];
  customTools: CustomTool[];
  customData: CustomData[];
  customSoftware: CustomSoftware[];

  // Loading states
  isLoadingTools: boolean;
  isLoadingData: boolean;
  isLoadingSoftware: boolean;
  isLoadingConfig: boolean;

  // WebSocket State
  isConnected: boolean;
  isStreaming: boolean;
  streamingLogs: string[];
  streamingError?: string;

  // Actions
  initializeAgent: (config: AgentInitRequest) => Promise<void>;
  queryAgent: (request: AgentQueryRequest) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setError: (error?: string) => void;
  setProcessing: (processing: boolean) => void;
  setCurrentTask: (task?: string) => void;

  // WebSocket management
  connect: (sessionId: string) => void;
  disconnect: () => void;
  sendWebSocketMessage: (message: AgentQueryRequest) => void;
  clearStreamingLogs: () => void;

  // Executor log actions
  addExecutorLog: (log: ExecutorLog) => void;
  clearExecutorLogs: () => void;

  // Resource management
  loadTools: () => Promise<void>;
  loadDataLake: () => Promise<void>;
  loadSoftwareLibrary: () => Promise<void>;
  loadCustomResources: () => Promise<void>;
  loadConfiguration: () => Promise<void>;

  // Custom resource actions
  addCustomTool: (tool: CustomTool) => Promise<void>;
  removeCustomTool: (name: string) => Promise<void>;
  addCustomData: (data: CustomData) => Promise<void>;
  removeCustomData: (name: string) => Promise<void>;
  addCustomSoftware: (software: CustomSoftware) => Promise<void>;
  removeCustomSoftware: (name: string) => Promise<void>;

  // Session management
  createSession: (title: string, description: string) => void;
  loadSession: (session: ResearchSession) => void;
  saveSession: () => void;
}

export const useAgentStore = create<AgentState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isInitialized: false,
    isProcessing: false,
    messages: [],
    executorLogs: [],
    tools: [],
    toolsByCategory: {},
    dataLake: [],
    softwareLibrary: [],
    customTools: [],
    customData: [],
    customSoftware: [],
    isLoadingTools: false,
    isLoadingData: false,
    isLoadingSoftware: false,
    isLoadingConfig: false,

    // WebSocket initial state
    isConnected: false,
    isStreaming: false,
    streamingLogs: [],
    streamingError: undefined,

    // Agent initialization
    initializeAgent: async (config: AgentInitRequest) => {
      try {
        set({ isProcessing: true, error: undefined });

        const response = await biomniAPI.initializeAgent(config);

        if (response.success && response.data) {
          set({
            isInitialized: true,
            config: response.data,
            isProcessing: false,
          });

          // Load resources after initialization
          await Promise.all([
            get().loadTools(),
            get().loadDataLake(),
            get().loadSoftwareLibrary(),
            get().loadCustomResources(),
          ]);
        } else {
          throw new Error(response.error || "Failed to initialize agent");
        }
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
          isProcessing: false,
        });
        throw error;
      }
    },

    // Agent querying (this will be refactored out in favor of ChatPanel logic)
    queryAgent: async (request: AgentQueryRequest) => {
      // This will be deprecated by the streaming implementation in ChatPanel
      // but is kept for non-streaming mode.
      try {
        set({ isProcessing: true, error: undefined });
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "user",
          content: request.prompt,
          timestamp: new Date(),
        };
        get().addMessage(userMessage);

        const response = await biomniAPI.queryAgent(request);

        if (response.success && response.data) {
          const assistantMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: response.data.content,
            timestamp: new Date(),
            metadata: {
              status: "success",
              log: response.data.log.join("\n"),
            },
          };
          get().addMessage(assistantMessage);
        } else {
          throw new Error(response.error || "Failed to query agent");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        set({ error: errorMessage });
        get().addMessage({
          id: Date.now().toString(),
          role: "assistant",
          content: `An error occurred: ${errorMessage}`,
          timestamp: new Date(),
          metadata: { status: "error" },
        });
      } finally {
        set({ isProcessing: false });
      }
    },

    // Message management
    addMessage: (message: ChatMessage) => {
      set((state) => ({
        messages: [...state.messages, message],
      }));
    },

    clearMessages: () => {
      set({ messages: [] });
    },

    setError: (error?: string) => {
      set({ error });
    },

    setProcessing: (processing: boolean) => {
      set({ isProcessing: processing });
    },

    setCurrentTask: (task?: string) => {
      set({ currentTask: task });
    },

    // WebSocket management
    connect: (sessionId: string) => {
      if (ws?.readyState === WebSocket.OPEN) {
        return;
      }

      get().clearStreamingLogs();
      set({ isStreaming: false, streamingError: undefined });

      const config: WebSocketConfig = {
        sessionId,
        onLog: (logMessage: StreamLogMessage) => {
          set((state) => ({
            streamingLogs: [...state.streamingLogs, logMessage.data.message],
            isStreaming: true,
          }));
        },
        onError: (errorMessage: StreamErrorMessage) => {
          set({
            streamingError: errorMessage.data.message,
            isStreaming: false,
          });
        },
        onComplete: () => {
          setTimeout(() => set({ isStreaming: false }), 100);
        },
        onClose: () => {
          set({ isConnected: false, isStreaming: false });
        },
      };

      try {
        ws = biomniAPI.createWebSocketConnection(config);
        set({ isConnected: true });
      } catch (err) {
        set({
          streamingError:
            err instanceof Error
              ? err.message
              : "Failed to connect to WebSocket",
          isConnected: false,
        });
      }
    },

    disconnect: () => {
      if (ws) {
        biomniAPI.closeWebSocketConnection(ws);
        ws = null;
      }
      set({ isConnected: false, isStreaming: false });
    },

    sendWebSocketMessage: (message: AgentQueryRequest) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        set({ streamingError: "WebSocket is not connected" });
        return;
      }

      try {
        biomniAPI.sendWebSocketMessage(ws, message);
        set({ streamingError: undefined });
      } catch (err) {
        set({
          streamingError:
            err instanceof Error ? err.message : "Failed to send message",
        });
      }
    },

    clearStreamingLogs: () => {
      set({ streamingLogs: [] });
    },

    // Executor log management
    addExecutorLog: (log: ExecutorLog) => {
      set((state) => ({
        executorLogs: [...state.executorLogs, log],
      }));
    },

    clearExecutorLogs: () => {
      set({ executorLogs: [] });
    },

    // Resource loading
    loadTools: async () => {
      try {
        set({ isLoadingTools: true });

        const [registryResponse, categoriesResponse] = await Promise.all([
          biomniAPI.getToolRegistry(),
          biomniAPI.getToolsByCategory(),
        ]);

        if (registryResponse.success && categoriesResponse.success) {
          set({
            tools: registryResponse.data?.tools || [],
            toolsByCategory: categoriesResponse.data || {},
            isLoadingTools: false,
          });
        } else {
          throw new Error("Failed to load tools");
        }
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to load tools",
          isLoadingTools: false,
        });
      }
    },

    loadDataLake: async () => {
      try {
        set({ isLoadingData: true });

        const response = await biomniAPI.getDataLake();

        if (response.success) {
          set({
            dataLake: response.data || [],
            isLoadingData: false,
          });
        } else {
          throw new Error("Failed to load data lake");
        }
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to load data lake",
          isLoadingData: false,
        });
      }
    },

    loadSoftwareLibrary: async () => {
      try {
        set({ isLoadingSoftware: true });

        const response = await biomniAPI.getSoftwareLibrary();

        if (response.success) {
          set({
            softwareLibrary: response.data || [],
            isLoadingSoftware: false,
          });
        } else {
          throw new Error("Failed to load software library");
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load software library",
          isLoadingSoftware: false,
        });
      }
    },

    loadCustomResources: async () => {
      try {
        const [toolsResponse, dataResponse, softwareResponse] =
          await Promise.all([
            biomniAPI.getCustomTools(),
            biomniAPI.getCustomData(),
            biomniAPI.getCustomSoftware(),
          ]);

        set({
          customTools: toolsResponse.success ? toolsResponse.data || [] : [],
          customData: dataResponse.success ? dataResponse.data || [] : [],
          customSoftware: softwareResponse.success
            ? softwareResponse.data || []
            : [],
        });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load custom resources",
        });
      }
    },

    loadConfiguration: async () => {
      try {
        set({ isLoadingConfig: true });

        const response = await biomniAPI.getConfiguration();

        if (response.success) {
          set({
            config: response.data,
            isLoadingConfig: false,
            isInitialized: true, // Set initialized to true after loading config
          });
        } else {
          throw new Error("Failed to load configuration");
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load configuration",
          isLoadingConfig: false,
        });
      }
    },

    // Custom resource actions
    addCustomTool: async (tool: CustomTool) => {
      try {
        const response = await biomniAPI.addCustomTool({
          name: tool.name,
          description: tool.description,
          required_parameters: [],
          optional_parameters: [],
          module: tool.module,
          function_code: "",
        });

        if (response.success) {
          set((state) => ({
            customTools: [...state.customTools, tool],
          }));
        } else {
          throw new Error("Failed to add custom tool");
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to add custom tool",
        });
        throw error;
      }
    },

    removeCustomTool: async (name: string) => {
      try {
        const response = await biomniAPI.removeCustomTool(name);

        if (response.success) {
          set((state) => ({
            customTools: state.customTools.filter((tool) => tool.name !== name),
          }));
        } else {
          throw new Error("Failed to remove custom tool");
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to remove custom tool",
        });
        throw error;
      }
    },

    addCustomData: async (data: CustomData) => {
      try {
        // Add directly to store since the upload is handled by the modal
        set((state) => ({
          customData: [...state.customData, data],
        }));
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to add custom data",
        });
        throw error;
      }
    },

    removeCustomData: async (name: string) => {
      try {
        // Find the custom data item to get the filename
        const customDataItem = get().customData.find(
          (data) => data.name === name
        );
        if (!customDataItem) {
          throw new Error("Custom data not found");
        }

        // Extract filename from path (remove timestamp prefix)
        const filename = customDataItem.path.split("/").pop() || name;

        // Call backend to delete the file
        const response = await fetch(
          `https://api.mybioai.net/api/data/${filename}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete file: ${response.statusText}`);
        }

        // Remove from store
        set((state) => ({
          customData: state.customData.filter((data) => data.name !== name),
        }));
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to remove custom data",
        });
        throw error;
      }
    },

    addCustomSoftware: async (software: CustomSoftware) => {
      try {
        const response = await biomniAPI.addCustomSoftware({
          software_name: software.name,
          description: software.description,
        });

        if (response.success) {
          set((state) => ({
            customSoftware: [...state.customSoftware, software],
          }));
        } else {
          throw new Error("Failed to add custom software");
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to add custom software",
        });
        throw error;
      }
    },

    removeCustomSoftware: async (name: string) => {
      try {
        const response = await biomniAPI.removeCustomSoftware(name);

        if (response.success) {
          set((state) => ({
            customSoftware: state.customSoftware.filter(
              (software) => software.name !== name
            ),
          }));
        } else {
          throw new Error("Failed to remove custom software");
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to remove custom software",
        });
        throw error;
      }
    },

    // Session management
    createSession: (title: string, description: string) => {
      const session: ResearchSession = {
        id: Date.now().toString(),
        title,
        description,
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        tools_used: [],
        data_accessed: [],
      };

      set({
        currentSession: session,
        messages: [],
      });
    },

    loadSession: (session: ResearchSession) => {
      set({
        currentSession: session,
        messages: session.messages,
      });
    },

    saveSession: () => {
      const { currentSession, messages } = get();

      if (currentSession) {
        const updatedSession: ResearchSession = {
          ...currentSession,
          messages,
          updated_at: new Date(),
        };

        set({ currentSession: updatedSession });

        // In a real app, you'd save this to localStorage or a backend
        localStorage.setItem(
          `session_${updatedSession.id}`,
          JSON.stringify(updatedSession)
        );
      }
    },
  }))
);
