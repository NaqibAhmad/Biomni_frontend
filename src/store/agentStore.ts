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
  connect: (sessionId: string) => Promise<void>;
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
    connect: (sessionId: string): Promise<void> => {
      // If already connected, return immediately
      if (ws?.readyState === WebSocket.OPEN) {
        return Promise.resolve();
      }

      // If connecting, wait for it to complete
      if (ws?.readyState === WebSocket.CONNECTING) {
        return new Promise((resolve, reject) => {
          const checkConnection = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              clearInterval(checkConnection);
              resolve();
            } else if (
              ws?.readyState === WebSocket.CLOSED ||
              ws?.readyState === WebSocket.CLOSING
            ) {
              clearInterval(checkConnection);
              reject(new Error("WebSocket connection failed"));
            }
          }, 100);

          // Timeout after 10 seconds
          setTimeout(() => {
            clearInterval(checkConnection);
            reject(new Error("WebSocket connection timeout"));
          }, 10000);
        });
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

      return new Promise((resolve, reject) => {
        try {
          ws = biomniAPI.createWebSocketConnection(config);

          // Set up connection timeout
          const connectionTimeout = setTimeout(() => {
            if (ws && ws.readyState !== WebSocket.OPEN) {
              ws.close();
              set({
                streamingError: "WebSocket connection timed out",
                isConnected: false,
              });
              reject(
                new Error("WebSocket connection timed out after 10 seconds")
              );
            }
          }, 10000);

          // Override onopen to resolve promise
          const originalOnOpen = ws.onopen;
          ws.onopen = (event) => {
            clearTimeout(connectionTimeout);
            if (originalOnOpen && ws) {
              try {
                originalOnOpen.call(ws, event);
              } catch {
                // Ignore errors from original handler
              }
            }
            set({ isConnected: true });
            resolve(); // Resolve when connected
          };

          // Override onerror to reject promise
          const originalOnError = ws.onerror;
          ws.onerror = (error) => {
            clearTimeout(connectionTimeout);
            if (originalOnError && ws) {
              try {
                originalOnError.call(ws, error);
              } catch {
                // Ignore errors from original handler
              }
            }
            set({
              streamingError: "Failed to connect to WebSocket",
              isConnected: false,
            });
            reject(new Error("WebSocket connection failed"));
          };

          // Override onclose to handle unexpected closures
          const originalOnClose = ws.onclose;
          ws.onclose = (event) => {
            clearTimeout(connectionTimeout);
            if (originalOnClose && ws) {
              try {
                originalOnClose.call(ws, event);
              } catch {
                // Ignore errors from original handler
              }
            }
            set({ isConnected: false, isStreaming: false });
            // Only reject if we haven't resolved yet (connection was closed before opening)
            if (ws?.readyState === WebSocket.CLOSED && !get().isConnected) {
              reject(
                new Error(
                  `WebSocket closed: ${event.code} ${
                    event.reason || "Unknown reason"
                  }`
                )
              );
            }
          };
        } catch (err) {
          set({
            streamingError:
              err instanceof Error
                ? err.message
                : "Failed to connect to WebSocket",
            isConnected: false,
          });
          reject(err);
        }
      });
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
        console.log("[agentStore] loadCustomResources: Starting...");

        // Use Promise.allSettled to handle individual failures without breaking the entire operation
        const [toolsResult, dataResult, softwareResult] =
          await Promise.allSettled([
            biomniAPI.getCustomTools(),
            biomniAPI.getCustomData(),
            biomniAPI.getCustomSoftware(),
          ]);

        // Extract results, handling both fulfilled and rejected promises
        const toolsResponse =
          toolsResult.status === "fulfilled"
            ? toolsResult.value
            : { success: false, data: [] };
        const dataResponse =
          dataResult.status === "fulfilled"
            ? dataResult.value
            : { success: false, data: [] };
        const softwareResponse =
          softwareResult.status === "fulfilled"
            ? softwareResult.value
            : { success: false, data: [] };

        // Log any errors but continue processing
        if (toolsResult.status === "rejected") {
          console.warn(
            "[agentStore] getCustomTools failed:",
            toolsResult.reason
          );
        }
        if (dataResult.status === "rejected") {
          console.warn("[agentStore] getCustomData failed:", dataResult.reason);
        }
        if (softwareResult.status === "rejected") {
          console.warn(
            "[agentStore] getCustomSoftware failed:",
            softwareResult.reason
          );
        }

        console.log("[agentStore] dataResponse:", dataResponse);
        console.log("[agentStore] dataResponse.success:", dataResponse.success);
        console.log("[agentStore] dataResponse.data:", dataResponse.data);

        const loadedCustomData = dataResponse.success
          ? dataResponse.data || []
          : [];
        console.log("[agentStore] Setting customData:", loadedCustomData);
        console.log(
          "[agentStore] customData with tags:",
          loadedCustomData.filter((item) => item.tags && item.tags.length > 0)
        );

        set({
          customTools: toolsResponse.success ? toolsResponse.data || [] : [],
          customData: loadedCustomData,
          customSoftware: softwareResponse.success
            ? softwareResponse.data || []
            : [],
        });

        console.log(
          "[agentStore] Store updated. Current customData:",
          get().customData
        );
      } catch (error) {
        console.error(
          "[agentStore] Unexpected error loading custom resources:",
          error
        );
        // Don't set error state here as individual failures are handled above
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
        // Find the custom data item to get the file ID
        const customDataItem = get().customData.find(
          (data) => data.name === name
        );
        if (!customDataItem) {
          throw new Error("Custom data not found");
        }

        // Get file ID - use id if available, otherwise try to extract from path
        let fileId: string;
        if (customDataItem.id) {
          fileId = customDataItem.id;
        } else {
          // Fallback: try to extract from path (filename with timestamp prefix)
          const pathParts = customDataItem.path.split(/[/\\]/);
          const filename = pathParts[pathParts.length - 1];
          fileId = filename;
        }

        // Call backend to delete the file using the API client
        await biomniAPI.deleteFile(fileId);

        // Reload custom resources to refresh the list
        await get().loadCustomResources();
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
