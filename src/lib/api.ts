import axios, { AxiosInstance, AxiosResponse } from "axios";
import { supabase } from "./supabase";
import {
  BiomniConfig,
  AgentResponse,
  StreamResponse,
  ToolSchema,
  DataLakeItem,
  LibraryItem,
  CustomTool,
  CustomData,
  CustomSoftware,
  AgentInitRequest,
  AgentQueryRequest,
  ToolAddRequest,
  DataAddRequest,
  SoftwareAddRequest,
  MCPAddRequest,
  APIResponse,
  AgentStatus,
  SystemPrompt,
  ToolRegistry,
  RetrieverResult,
  WebSocketConfig,
  BackendWebSocketMessage,
} from "@/types/biomni";
import {
  ChatMessage,
  SessionWithMessages,
  SessionListResponse,
  FeedbackSchema,
  FeedbackSubmission,
  FeedbackResponse,
  PromptTemplate,
  CreatePromptRequest,
  UpdatePromptRequest,
  ExecutePromptRequest,
  ExecutePromptResponse,
  PromptAnalytics,
  UserPromptStats,
  QueryRecord,
  QueryListResponse,
  QueryAnalytics,
  PaginationParams,
  DateRangeParams,
} from "@/types/services";

// Backend response types that match the actual API
interface BackendChatResponse {
  session_id: string;
  response: string;
  log: string[];
  timestamp: string;
  status: string;
}

interface BackendSystemInfo {
  tools: Array<{
    name: string;
    description: string;
    module: string;
    parameters: Record<string, any>;
  }>;
  data_lake: Array<{
    name: string;
    description: string;
    path: string;
  }>;
  software: Array<{
    name: string;
    description: string;
  }>;
  configuration: Record<string, any>;
}

interface BackendHealthResponse {
  status: string;
  agent_initialized: boolean;
  timestamp: string;
}

class BiomniAPI {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL?: string) {
    // Use environment variable for production, fallback to Vercel proxy for production
    const isProduction = window.location.hostname.includes("vercel.app");
    const defaultUrl = isProduction
      ? "/api/proxy" // Use Vercel proxy route for production
      : "http://localhost:8000";
    // : 'https://api.mybioai.net'

    this.baseURL = baseURL || import.meta.env.VITE_API_BASE_URL || defaultUrl;

    // Debug logging
    console.log("API Base URL:", this.baseURL);
    console.log(
      "Environment VITE_API_BASE_URL:",
      import.meta.env.VITE_API_BASE_URL
    );
    console.log("Is Production:", isProduction);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000, // 5 minutes for long-running queries
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "69420",
      },
    });

    // Add request interceptor for logging and auth
    this.client.interceptors.request.use(
      async (config) => {
        console.log(
          `API Request: ${config.method?.toUpperCase()} ${config.url}`
        );

        // Add authentication token if available
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("[API] Error getting session:", sessionError);
            // Try to refresh the session if there's an error
            try {
              const {
                data: { session: refreshedSession },
              } = await supabase.auth.refreshSession();
              if (refreshedSession?.access_token) {
                config.headers.Authorization = `Bearer ${refreshedSession.access_token}`;
                console.log(`[API] Refreshed and added auth token`);
                return config;
              }
            } catch (refreshError) {
              console.error("[API] Error refreshing session:", refreshError);
            }
          }

          if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
            console.log(
              `[API] Added auth token for ${config.method?.toUpperCase()} ${
                config.url
              }`
            );
          } else {
            console.warn(
              `[API] No auth token available for ${config.method?.toUpperCase()} ${
                config.url
              }. Session:`,
              session ? "exists but no access_token" : "null",
              session?.user ? `User ID: ${session.user.id}` : "No user"
            );
            // Log more details for debugging
            if (session) {
              console.warn("[API] Session details:", {
                hasAccessToken: !!session.access_token,
                hasRefreshToken: !!session.refresh_token,
                expiresAt: session.expires_at,
                user: session.user?.id,
              });
            }
          }
        } catch (error) {
          console.error("[API] Error adding auth token:", error);
        }

        return config;
      },
      (error) => {
        console.error("API Request Error:", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error("API Response Error:", error);
        if (error.response?.status === 500) {
          throw new Error(
            "Internal server error. Please check the backend logs."
          );
        }
        throw error;
      }
    );
  }

  // Agent Management
  async initializeAgent(
    config: AgentInitRequest
  ): Promise<APIResponse<BiomniConfig>> {
    try {
      // Use configure endpoint to update agent settings
      const response: AxiosResponse<{ message: string; timestamp: string }> =
        await this.client.post("/api/configure", config);
      return {
        success: true,
        data: config as BiomniConfig,
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to initialize agent");
    }
  }

  async queryAgent(
    request: AgentQueryRequest
  ): Promise<APIResponse<AgentResponse>> {
    try {
      // Convert frontend request to backend format
      const backendRequest: any = {
        message: request.prompt,
        session_id: undefined, // Will be generated by backend
        use_tool_retriever: true, // Default value
        self_critic: request.self_critic || false,
      };
      // Add model and source if provided
      if (request.model) {
        backendRequest.model = request.model;
      }
      if (request.source) {
        backendRequest.source = request.source;
      }

      const response: AxiosResponse<BackendChatResponse> =
        await this.client.post("/api/chat", backendRequest);

      // Convert backend response to frontend format
      return {
        success: true,
        data: {
          log: response.data.log,
          content: response.data.response,
        },
        message: `Chat completed successfully. Session: ${response.data.session_id}`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to query agent");
    }
  }

  async streamQuery(
    _request: AgentQueryRequest
  ): Promise<ReadableStream<StreamResponse>> {
    try {
      // Streaming is handled via WebSocket connection
      // This method should not be called directly
      throw new Error(
        "Streaming is handled via WebSocket connection. Use WebSocket client instead."
      );
    } catch (error) {
      throw this.handleError(error, "Failed to stream query");
    }
  }

  async getAgentStatus(): Promise<APIResponse<AgentStatus>> {
    try {
      const response: AxiosResponse<BackendHealthResponse> =
        await this.client.get("/health");
      return {
        success: true,
        data: {
          is_initialized: response.data.agent_initialized,
          is_processing: false, // Not provided by backend
          current_task: undefined,
          error: undefined,
        },
        message: `Agent status: ${response.data.status}`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get agent status");
    }
  }

  async getSystemPrompt(): Promise<APIResponse<SystemPrompt>> {
    try {
      // System prompt is not exposed as a separate endpoint in the backend
      // Return a default system prompt
      return {
        success: true,
        data: {
          content:
            "You are MyBioAI, a biomedical AI agent specialized in research and analysis.",
          custom_tools: [],
          custom_data: [],
          custom_software: [],
        },
        message: "System prompt retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get system prompt");
    }
  }

  // Tool Management
  async getToolRegistry(): Promise<APIResponse<ToolRegistry>> {
    try {
      console.log(
        "Fetching tool registry from:",
        `${this.baseURL}/api/system/info`
      );
      const response: AxiosResponse<BackendSystemInfo> = await this.client.get(
        "/api/system/info"
      );
      console.log("Tool registry response:", response.data);

      // Check if response.data exists and has the expected structure
      if (!response.data) {
        throw new Error("No data received from backend");
      }

      if (!response.data.tools || !Array.isArray(response.data.tools)) {
        console.error("Unexpected response structure:", response.data);
        throw new Error("Backend response does not contain tools array");
      }

      // Convert backend tools to frontend format
      const tools: ToolSchema[] = response.data.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        module: tool.module,
        parameters: tool.parameters,
        required_parameters: [],
        optional_parameters: [],
      }));

      return {
        success: true,
        data: {
          tools,
          document_df: null, // Not provided by backend
        },
        message: `Retrieved ${tools.length} tools successfully`,
      };
    } catch (error) {
      console.error("Error fetching tool registry:", error);
      throw this.handleError(error, "Failed to get tool registry");
    }
  }

  async getToolsByCategory(): Promise<
    APIResponse<Record<string, ToolSchema[]>>
  > {
    try {
      const response: AxiosResponse<BackendSystemInfo> = await this.client.get(
        "/api/system/info"
      );

      // Group tools by module (category)
      const toolsByCategory: Record<string, ToolSchema[]> = {};
      response.data.tools.forEach((tool) => {
        const category = tool.module;
        if (!toolsByCategory[category]) {
          toolsByCategory[category] = [];
        }
        toolsByCategory[category].push({
          name: tool.name,
          description: tool.description,
          module: tool.module,
          parameters: tool.parameters,
          required_parameters: [],
          optional_parameters: [],
        });
      });

      return {
        success: true,
        data: toolsByCategory,
        message: `Retrieved tools by category successfully`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get tools by category");
    }
  }

  async addCustomTool(tool: ToolAddRequest): Promise<APIResponse<ToolSchema>> {
    try {
      const response: AxiosResponse<{ message: string; timestamp: string }> =
        await this.client.post("/api/tools/add", tool);
      return {
        success: true,
        data: {
          name: tool.name,
          description: tool.description,
          module: tool.module,
          parameters: {},
          required_parameters: tool.required_parameters,
          optional_parameters: tool.optional_parameters,
        },
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to add custom tool");
    }
  }

  async removeCustomTool(_name: string): Promise<APIResponse<boolean>> {
    try {
      // Custom tool removal is not implemented in the backend yet
      throw new Error("Custom tool removal not yet implemented in backend");
    } catch (error) {
      throw this.handleError(error, "Failed to remove custom tool");
    }
  }

  async getCustomTools(): Promise<APIResponse<CustomTool[]>> {
    try {
      const response: AxiosResponse<{
        custom_tools: any[];
        timestamp: string;
      }> = await this.client.get("/api/tools/custom");
      return {
        success: true,
        data: response.data.custom_tools,
        message: `Retrieved ${response.data.custom_tools.length} custom tools`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get custom tools");
    }
  }

  // Data Lake Management
  async getDataLake(): Promise<APIResponse<DataLakeItem[]>> {
    try {
      console.log(
        "Fetching data lake from:",
        `${this.baseURL}/api/system/info`
      );
      const response: AxiosResponse<BackendSystemInfo> = await this.client.get(
        "/api/system/info"
      );
      console.log("Data lake response:", response.data);

      // Check if response.data exists and has the expected structure
      if (!response.data) {
        throw new Error("No data received from backend");
      }

      if (!response.data.data_lake || !Array.isArray(response.data.data_lake)) {
        console.error("Unexpected response structure:", response.data);
        throw new Error("Backend response does not contain data_lake array");
      }

      // Convert backend data lake items to frontend format
      const dataLakeItems: DataLakeItem[] = response.data.data_lake.map(
        (item) => ({
          name: item.name,
          description: item.description,
          path: item.path,
        })
      );

      return {
        success: true,
        data: dataLakeItems,
        message: `Retrieved ${dataLakeItems.length} data lake items`,
      };
    } catch (error) {
      console.error("Error fetching data lake:", error);
      throw this.handleError(error, "Failed to get data lake");
    }
  }

  async addCustomData(_data: DataAddRequest): Promise<APIResponse<CustomData>> {
    try {
      // This method is now handled by the upload modal directly
      // The upload modal makes the API call to /api/data/upload
      throw new Error("Use the upload modal to add custom data files");
    } catch (error) {
      throw this.handleError(error, "Failed to add custom data");
    }
  }

  async removeCustomData(_name: string): Promise<APIResponse<boolean>> {
    try {
      // Custom data removal is not implemented in the backend yet
      throw new Error("Custom data removal not yet implemented in backend");
    } catch (error) {
      throw this.handleError(error, "Failed to remove custom data");
    }
  }

  async getCustomData(): Promise<APIResponse<CustomData[]>> {
    try {
      // Use the new getUserFiles endpoint instead
      const response = await this.getUserFiles();
      console.log("[getCustomData] getUserFiles response:", response);
      console.log("[getCustomData] response.data:", response.data);
      console.log(
        "[getCustomData] response.data?.files:",
        response.data?.files
      );

      if (response.data && response.data.files) {
        // Debug: Log the raw API response
        console.log(
          "[getCustomData] Raw API response files:",
          JSON.stringify(response.data.files, null, 2)
        );

        // Convert file records to CustomData format for backward compatibility
        const customData: CustomData[] = (response.data.files || []).map(
          (file: any) => {
            // Debug: Log each file to see if tags are present - use JSON.stringify to see all fields
            const fileStr = JSON.stringify(file, null, 2);
            console.log(
              "[getCustomData] File object:",
              file.original_filename || file.filename
            );
            console.log("[getCustomData] Full file data:", fileStr);

            // Handle tags - ensure it's always an array, even if null or undefined
            let tags: string[] = [];
            if (file.tags !== null && file.tags !== undefined) {
              if (Array.isArray(file.tags)) {
                tags = file.tags.filter(
                  (tag: any) => tag !== null && tag !== undefined && tag !== ""
                );
              } else if (typeof file.tags === "string") {
                // Handle case where tags might be a string (shouldn't happen, but just in case)
                tags = [file.tags];
              }
            }

            console.log(
              "[getCustomData] Extracted tags for",
              file.original_filename || file.filename,
              ":",
              tags
            );

            return {
              name: file.original_filename || file.filename,
              description: file.description || "",
              path: file.file_path || file.filename,
              size: file.file_size,
              type: file.mime_type || file.file_type,
              uploaded_at: file.created_at,
              tags: tags,
              id: file.id, // Include file ID for deletion
            };
          }
        );

        console.log(
          "[getCustomData] Mapped customData with tags:",
          customData.map((d) => ({ name: d.name, tags: d.tags }))
        );
        return {
          success: true,
          data: customData,
          message: `Retrieved ${customData.length} files`,
        };
      }
      return {
        success: true,
        data: [],
        message: "No files found",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get custom data");
    }
  }

  // Software Library Management
  async getSoftwareLibrary(): Promise<APIResponse<LibraryItem[]>> {
    try {
      const response: AxiosResponse<BackendSystemInfo> = await this.client.get(
        "/api/system/info"
      );

      // Convert backend software to frontend format
      const softwareItems: LibraryItem[] = response.data.software.map(
        (item) => ({
          name: item.name,
          description: item.description,
        })
      );

      return {
        success: true,
        data: softwareItems,
        message: `Retrieved ${softwareItems.length} software items`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get software library");
    }
  }

  async addCustomSoftware(
    _software: SoftwareAddRequest
  ): Promise<APIResponse<CustomSoftware>> {
    try {
      // Custom software addition is not implemented in the backend yet
      throw new Error(
        "Custom software addition not yet implemented in backend"
      );
    } catch (error) {
      throw this.handleError(error, "Failed to add custom software");
    }
  }

  async removeCustomSoftware(_name: string): Promise<APIResponse<boolean>> {
    try {
      // Custom software removal is not implemented in the backend yet
      throw new Error("Custom software removal not yet implemented in backend");
    } catch (error) {
      throw this.handleError(error, "Failed to remove custom software");
    }
  }

  async getCustomSoftware(): Promise<APIResponse<CustomSoftware[]>> {
    try {
      // Custom software retrieval is not implemented in the backend yet
      throw new Error(
        "Custom software retrieval not yet implemented in backend"
      );
    } catch (error) {
      throw this.handleError(error, "Failed to get custom software");
    }
  }

  // MCP Integration
  async addMCP(_config: MCPAddRequest): Promise<APIResponse<void>> {
    try {
      // MCP integration is not implemented in the backend yet
      throw new Error("MCP integration not yet implemented in backend");
    } catch (error) {
      throw this.handleError(error, "Failed to add MCP server");
    }
  }

  async createMCPServer(_toolModules?: string[]): Promise<APIResponse<string>> {
    try {
      // MCP server creation is not implemented in the backend yet
      throw new Error("MCP server creation not yet implemented in backend");
    } catch (error) {
      throw this.handleError(error, "Failed to create MCP server");
    }
  }

  // Configuration Management
  async getConfiguration(): Promise<APIResponse<BiomniConfig>> {
    try {
      const response: AxiosResponse<BackendSystemInfo> = await this.client.get(
        "/api/system/info"
      );

      // Convert backend configuration to frontend format
      const config: BiomniConfig = {
        path: response.data.configuration.path || "",
        timeout_seconds: response.data.configuration.timeout_seconds || 300,
        llm: response.data.configuration.llm || "Unknown",
        temperature: response.data.configuration.temperature, // Not provided by backend
        use_tool_retriever:
          response.data.configuration.use_tool_retriever || true,
        source: response.data.configuration.source || "Unknown",
      };

      return {
        success: true,
        data: config,
        message: "Configuration retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get configuration");
    }
  }

  async updateConfiguration(
    config: Partial<BiomniConfig>
  ): Promise<APIResponse<BiomniConfig>> {
    try {
      // Convert frontend config to backend format
      const backendConfig = {
        llm: config.llm,
        source: config.source,
        use_tool_retriever: config.use_tool_retriever,
        timeout_seconds: config.timeout_seconds,
        base_url: config.base_url,
        api_key: config.api_key,
      };

      const response: AxiosResponse<{ message: string; timestamp: string }> =
        await this.client.post("/api/configure", backendConfig);

      return {
        success: true,
        data: config as BiomniConfig,
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to update configuration");
    }
  }

  async getAvailableModels(): Promise<
    APIResponse<{
      models: Array<{
        id: string;
        name: string;
        source: string;
        description: string;
        is_default: boolean;
      }>;
      default_model: string;
    }>
  > {
    try {
      const response: AxiosResponse<{
        models: Array<{
          id: string;
          name: string;
          source: string;
          description: string;
          is_default: boolean;
        }>;
        default_model: string;
      }> = await this.client.get("/api/models");
      return {
        success: true,
        data: response.data,
        message: "Available models retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get available models");
    }
  }

  // Resource Retrieval
  async retrieveResources(
    _query: string
  ): Promise<APIResponse<RetrieverResult>> {
    try {
      // Resource retrieval is not implemented in the backend yet
      throw new Error("Resource retrieval not yet implemented in backend");
    } catch (error) {
      throw this.handleError(error, "Failed to retrieve resources");
    }
  }

  // Health Check (silent - doesn't throw errors, just returns success/failure)
  async healthCheck(): Promise<
    APIResponse<{ status: string; timestamp: string }>
  > {
    try {
      // Use a shorter timeout for health checks (5 seconds)
      const response: AxiosResponse<BackendHealthResponse> =
        await this.client.get("/health", {
          timeout: 5000, // 5 seconds timeout for health check
        });
      return {
        success: true,
        data: {
          status: response.data.status,
          timestamp: response.data.timestamp,
        },
        message: `Health check successful. Agent initialized: ${response.data.agent_initialized}`,
      };
    } catch (error: any) {
      // Log the error for debugging but don't spam the console
      console.warn("Health check failed:", error.message || error);
      if (error.code === "ECONNREFUSED") {
        console.warn(
          "Connection refused - backend may not be running on",
          this.baseURL
        );
      } else if (error.code === "ETIMEDOUT") {
        console.warn("Health check timed out - backend may be slow to respond");
      }
      // Silently fail - don't log errors or throw exceptions
      // This prevents error spam when backend is down
      throw new Error("Backend not available");
    }
  }

  // Simple connectivity test
  async testConnectivity(): Promise<boolean> {
    try {
      const result = await this.healthCheck();
      console.log("Connectivity test successful:", result);
      return true;
    } catch (error: any) {
      console.warn("Connectivity test failed:", error.message || error);
      return false;
    }
  }

  // Sessions Management
  async getSessions(): Promise<
    APIResponse<{
      sessions: Record<string, any>;
      total_sessions: number;
      timestamp: string;
    }>
  > {
    try {
      const response: AxiosResponse<{
        sessions: Record<string, any>;
        total_sessions: number;
        timestamp: string;
      }> = await this.client.get("/api/sessions");
      return {
        success: true,
        data: response.data,
        message: `Retrieved ${response.data.total_sessions} active sessions`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get sessions");
    }
  }

  async deleteSession(
    sessionId: string
  ): Promise<APIResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<{ message: string }> =
        await this.client.delete(`/api/sessions/${sessionId}`);
      return {
        success: true,
        data: response.data,
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to delete session");
    }
  }

  // WebSocket Streaming
  createWebSocketConnection(config: WebSocketConfig): WebSocket {
    // Ensure we have a session ID
    if (!config.sessionId) {
      throw new Error("Session ID is required for WebSocket connection");
    }
    // Determine WebSocket URL based on environment
    const isProduction =
      window.location.protocol === "https:" ||
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("mybioai.net") ||
      window.location.hostname !== "localhost";

    const wsBaseURL = isProduction
      ? "wss://api.mybioai.net" // Use secure WebSocket for production API
      : this.baseURL.replace("http://", "ws://").replace("https://", "wss://"); // Use same base URL as API

    // Get authentication token - try multiple methods to ensure we get it
    let authToken: string | null = null;

    // Method 1: Try localStorage (Supabase stores it there)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const projectRef = supabaseUrl.split("//")[1]?.split(".")[0] || "";
      const storageKey = `sb-${projectRef}-auth-token`;
      const storedSession = localStorage.getItem(storageKey);

      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession);
          authToken =
            parsed?.access_token ||
            parsed?.currentSession?.access_token ||
            parsed?.session?.access_token ||
            parsed?.data?.session?.access_token ||
            null;

          if (authToken) {
            console.log(
              "[WebSocket] Authentication token retrieved from localStorage"
            );
          }
        } catch (parseError) {
          console.warn(
            "[WebSocket] Failed to parse stored session:",
            parseError
          );
        }
      }
    } catch (error) {
      console.warn("[WebSocket] Error reading localStorage:", error);
    }

    // Method 2: Try to get from Supabase client synchronously
    // Check if there's a session in the Supabase client's internal state
    if (!authToken) {
      try {
        // Try all possible localStorage keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes("auth-token")) {
            try {
              const value = localStorage.getItem(key);
              if (value) {
                const parsed = JSON.parse(value);
                const token =
                  parsed?.access_token ||
                  parsed?.currentSession?.access_token ||
                  parsed?.session?.access_token ||
                  parsed?.data?.session?.access_token;
                if (token) {
                  authToken = token;
                  console.log(`[WebSocket] Found token in ${key}`);
                  break;
                }
              }
            } catch {
              // Continue searching
            }
          }
        }
      } catch (error) {
        console.warn("[WebSocket] Error searching localStorage:", error);
      }
    }

    if (!authToken) {
      console.warn(
        "[WebSocket] No auth token found. Connection may be rejected by backend."
      );
    }

    // Build WebSocket URL with auth token as query parameter
    let wsURL = `${wsBaseURL}/api/chat/stream/${config.sessionId}`;
    if (authToken) {
      wsURL += `?token=${encodeURIComponent(authToken)}`;
      console.log("[WebSocket] Added auth token to URL");
    }

    // Log WebSocket connection details for debugging
    console.log(
      `[WebSocket] Connecting to: ${wsURL.replace(
        authToken || "",
        "[TOKEN]"
      )} (Production: ${isProduction})`
    );

    const ws = new WebSocket(wsURL);

    const connectionTimeout = setTimeout(() => {
      ws.close();
      if (config.onError) {
        config.onError({
          type: "error",
          data: {
            message: "WebSocket connection timed out after 10 seconds",
            code: "TIMEOUT",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }, 10000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log("[WebSocket] Connection opened successfully");
      // Call config's onOpen if it exists (though it's not in the interface, we'll handle it via onLog)
    };

    ws.onmessage = (event) => {
      try {
        const message: BackendWebSocketMessage = JSON.parse(event.data);

        // Handle backend message format - always log the output
        if (config.onLog) {
          config.onLog({
            type: "log",
            data: {
              message: message.output,
              level: "info",
            },
            timestamp: message.timestamp,
          });
        }

        // Only trigger completion if the backend explicitly says it's complete
        if (message.is_complete === true && config.onComplete) {
          config.onComplete({
            type: "complete",
            data: {
              session_id: message.session_id,
              total_logs: message.step,
              final_output: message.output,
            },
            timestamp: message.timestamp,
          });
        }
      } catch {
        if (config.onError) {
          config.onError({
            type: "error",
            data: {
              message: "Failed to parse WebSocket message",
              code: "PARSE_ERROR",
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    };

    ws.onerror = (error) => {
      clearTimeout(connectionTimeout);
      console.error("[WebSocket] Connection error:", error);
      if (config.onError) {
        config.onError({
          type: "error",
          data: {
            message: "WebSocket connection error",
            code: "CONNECTION_ERROR",
          },
          timestamp: new Date().toISOString(),
        });
      }
    };

    ws.onclose = (event) => {
      clearTimeout(connectionTimeout);
      console.log(
        `[WebSocket] Connection closed: code=${event.code}, reason=${
          event.reason || "none"
        }`
      );
      if (config.onClose) {
        config.onClose();
      }
    };

    return ws;
  }

  // Send message through WebSocket
  sendWebSocketMessage(ws: WebSocket, message: AgentQueryRequest): void {
    if (ws.readyState === WebSocket.OPEN) {
      const payload: any = {
        message: message.prompt,
        self_critic: message.self_critic || false,
        use_tool_retriever: true,
      };
      // Add model and source if provided
      if (message.model) {
        payload.model = message.model;
      }
      if (message.source) {
        payload.source = message.source;
      }
      ws.send(JSON.stringify(payload));
    } else {
      throw new Error("WebSocket is not open");
    }
  }

  // Close WebSocket connection
  closeWebSocketConnection(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "Connection closed by client");
    }
  }

  // ==================== CHAT HISTORY SERVICE ====================

  async getUserSessions(
    params?: PaginationParams & { active_only?: boolean }
  ): Promise<APIResponse<SessionListResponse>> {
    try {
      const response: AxiosResponse<SessionListResponse> =
        await this.client.get("/api/sessions", { params });
      return {
        success: true,
        data: response.data,
        message: `Retrieved ${response.data.total} sessions`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get user sessions");
    }
  }

  async getSessionWithMessages(
    sessionId: string
  ): Promise<APIResponse<SessionWithMessages>> {
    try {
      const response: AxiosResponse<SessionWithMessages> =
        await this.client.get(`/api/sessions/${sessionId}`);
      return {
        success: true,
        data: response.data,
        message: "Session retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get session");
    }
  }

  async getSessionMessages(
    sessionId: string,
    params?: PaginationParams
  ): Promise<
    APIResponse<{ session_id: string; messages: ChatMessage[]; total: number }>
  > {
    try {
      const response: AxiosResponse<{
        session_id: string;
        messages: ChatMessage[];
        total: number;
      }> = await this.client.get(`/api/sessions/${sessionId}/messages`, {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Messages retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get session messages");
    }
  }

  async deleteChatSession(sessionId: string): Promise<APIResponse<boolean>> {
    try {
      await this.client.delete(`/api/sessions/${sessionId}`);
      return {
        success: true,
        data: true,
        message: "Session deleted successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to delete session");
    }
  }

  async endSession(sessionId: string): Promise<APIResponse<boolean>> {
    try {
      await this.client.post(`/api/sessions/${sessionId}/end`);
      return {
        success: true,
        data: true,
        message: "Session ended successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to end session");
    }
  }

  // ==================== FEEDBACK SERVICE ====================

  async getFeedbackSchema(): Promise<APIResponse<FeedbackSchema>> {
    try {
      const response: AxiosResponse<FeedbackSchema> = await this.client.get(
        "/api/feedback/schema"
      );
      return {
        success: true,
        data: response.data,
        message: "Feedback schema retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get feedback schema");
    }
  }

  async submitFeedback(
    feedback: FeedbackSubmission,
    sessionId?: string
  ): Promise<APIResponse<FeedbackResponse>> {
    try {
      const response: AxiosResponse<FeedbackResponse> = await this.client.post(
        "/api/feedback",
        feedback,
        {
          params: { session_id: sessionId },
        }
      );
      return {
        success: true,
        data: response.data,
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to submit feedback");
    }
  }

  async getUserFeedback(
    params?: PaginationParams
  ): Promise<APIResponse<{ feedback: any[]; count: number }>> {
    try {
      const response: AxiosResponse<{ feedback: any[]; count: number }> =
        await this.client.get("/api/feedback", { params });
      return {
        success: true,
        data: response.data,
        message: `Retrieved ${response.data.count} feedback entries`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get user feedback");
    }
  }

  // ==================== PROMPT LIBRARY SERVICE ====================

  async createPrompt(
    prompt: CreatePromptRequest
  ): Promise<APIResponse<PromptTemplate>> {
    try {
      const response: AxiosResponse<PromptTemplate> = await this.client.post(
        "/api/prompts",
        prompt
      );
      return {
        success: true,
        data: response.data,
        message: "Prompt created successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to create prompt");
    }
  }

  async listPrompts(params?: {
    category?: string;
    tags?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<APIResponse<PromptTemplate[]>> {
    try {
      const response: AxiosResponse<PromptTemplate[]> = await this.client.get(
        "/api/prompts",
        { params }
      );
      return {
        success: true,
        data: response.data,
        message: `Retrieved ${response.data.length} prompts`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to list prompts");
    }
  }

  async getPrompt(promptId: string): Promise<APIResponse<PromptTemplate>> {
    try {
      const response: AxiosResponse<PromptTemplate> = await this.client.get(
        `/api/prompts/${promptId}`
      );
      return {
        success: true,
        data: response.data,
        message: "Prompt retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get prompt");
    }
  }

  async updatePrompt(
    promptId: string,
    updates: UpdatePromptRequest
  ): Promise<APIResponse<PromptTemplate>> {
    try {
      const response: AxiosResponse<PromptTemplate> = await this.client.put(
        `/api/prompts/${promptId}`,
        updates
      );
      return {
        success: true,
        data: response.data,
        message: "Prompt updated successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to update prompt");
    }
  }

  async deletePrompt(
    promptId: string,
    hardDelete = false
  ): Promise<APIResponse<boolean>> {
    try {
      await this.client.delete(`/api/prompts/${promptId}`, {
        params: { hard_delete: hardDelete },
      });
      return {
        success: true,
        data: true,
        message: "Prompt deleted successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to delete prompt");
    }
  }

  async executePrompt(
    request: ExecutePromptRequest
  ): Promise<APIResponse<ExecutePromptResponse>> {
    try {
      // Use a longer timeout for prompt execution (20 minutes)
      const response: AxiosResponse<ExecutePromptResponse> =
        await this.client.post("/api/prompts/execute", request, {
          timeout: 1200000, // 20 minutes for prompt execution
        });
      return {
        success: true,
        data: response.data,
        message: "Prompt executed successfully",
      };
    } catch (error: any) {
      // Check if it's a timeout error but response might have been generated
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        throw new Error(
          `Prompt execution timed out. The prompt may be too complex or the model is taking too long to respond. ` +
            `Try simplifying the prompt or check the backend logs to see if the response was generated.`
        );
      }
      throw this.handleError(error, "Failed to execute prompt");
    }
  }

  async getPromptVersions(
    promptId: string
  ): Promise<APIResponse<PromptTemplate[]>> {
    try {
      const response: AxiosResponse<PromptTemplate[]> = await this.client.get(
        `/api/prompts/${promptId}/versions`
      );
      return {
        success: true,
        data: response.data,
        message: `Retrieved ${response.data.length} versions`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get prompt versions");
    }
  }

  async getPromptAnalytics(
    promptId: string
  ): Promise<APIResponse<PromptAnalytics>> {
    try {
      const response: AxiosResponse<PromptAnalytics> = await this.client.get(
        `/api/prompts/${promptId}/analytics`
      );
      return {
        success: true,
        data: response.data,
        message: "Analytics retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get prompt analytics");
    }
  }

  async addPromptFavorite(promptId: string): Promise<APIResponse<boolean>> {
    try {
      await this.client.post(`/api/prompts/${promptId}/favorite`);
      return {
        success: true,
        data: true,
        message: "Added to favorites",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to add favorite");
    }
  }

  async removePromptFavorite(promptId: string): Promise<APIResponse<boolean>> {
    try {
      await this.client.delete(`/api/prompts/${promptId}/favorite`);
      return {
        success: true,
        data: true,
        message: "Removed from favorites",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to remove favorite");
    }
  }

  async getUserFavoritePrompts(): Promise<APIResponse<PromptTemplate[]>> {
    try {
      const response: AxiosResponse<PromptTemplate[]> = await this.client.get(
        "/api/user/prompts/favorites"
      );
      return {
        success: true,
        data: response.data,
        message: `Retrieved ${response.data.length} favorite prompts`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get favorite prompts");
    }
  }

  async getUserPromptStats(): Promise<APIResponse<UserPromptStats>> {
    try {
      const response: AxiosResponse<UserPromptStats> = await this.client.get(
        "/api/user/prompts/stats"
      );
      return {
        success: true,
        data: response.data,
        message: "Stats retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get prompt stats");
    }
  }

  // ==================== QUERY ANALYTICS SERVICE ====================

  async getQueryHistory(
    params?: PaginationParams & DateRangeParams & { session_id?: string }
  ): Promise<APIResponse<QueryListResponse>> {
    try {
      const response: AxiosResponse<QueryListResponse> = await this.client.get(
        "/api/analytics/queries",
        { params }
      );
      return {
        success: true,
        data: response.data,
        message: `Retrieved ${response.data.total} queries`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get query history");
    }
  }

  async getQueryAnalytics(
    params?: DateRangeParams
  ): Promise<APIResponse<QueryAnalytics>> {
    try {
      const response: AxiosResponse<QueryAnalytics> = await this.client.get(
        "/api/analytics/summary",
        { params }
      );
      return {
        success: true,
        data: response.data,
        message: "Analytics retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get query analytics");
    }
  }

  async getQueryById(queryId: string): Promise<APIResponse<QueryRecord>> {
    try {
      const response: AxiosResponse<QueryRecord> = await this.client.get(
        `/api/analytics/query/${queryId}`
      );
      return {
        success: true,
        data: response.data,
        message: "Query retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get query");
    }
  }

  // ==================== FILE STORAGE SERVICE ====================

  async getUserFiles(params?: {
    session_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<APIResponse<{ files: any[]; count: number }>> {
    try {
      const response: AxiosResponse<{ files: any[]; count: number }> =
        await this.client.get("/api/files", { params });
      return {
        success: true,
        data: response.data,
        message: `Retrieved ${response.data.count} files`,
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get user files");
    }
  }

  async deleteFile(fileId: string): Promise<APIResponse<boolean>> {
    try {
      const response: AxiosResponse<{ message: string }> =
        await this.client.delete(`/api/data/${fileId}`);
      return {
        success: true,
        data: true,
        message: response.data.message || "File deleted successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to delete file");
    }
  }

  // ==================== USER SETTINGS SERVICE ====================

  async getUserSettings(): Promise<APIResponse<any>> {
    try {
      const response: AxiosResponse<{ settings: any }> = await this.client.get(
        "/api/settings"
      );
      return {
        success: true,
        data: response.data.settings,
        message: "Settings retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get user settings");
    }
  }

  async updateUserSettings(
    settings: Partial<{
      llm_preferences: any;
      tool_preferences: any;
      ui_preferences: any;
      research_preferences: any;
    }>
  ): Promise<APIResponse<any>> {
    try {
      const response: AxiosResponse<{ settings: any }> = await this.client.put(
        "/api/settings",
        settings
      );
      return {
        success: true,
        data: response.data.settings,
        message: "Settings updated successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to update user settings");
    }
  }

  async getLLMPreferences(): Promise<APIResponse<any>> {
    try {
      const response: AxiosResponse<{ llm_preferences: any }> =
        await this.client.get("/api/settings/llm");
      return {
        success: true,
        data: response.data.llm_preferences,
        message: "LLM preferences retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get LLM preferences");
    }
  }

  async updateLLMPreferences(llmPreferences: any): Promise<APIResponse<any>> {
    try {
      const response: AxiosResponse<{ settings: any }> = await this.client.put(
        "/api/settings/llm",
        llmPreferences
      );
      return {
        success: true,
        data: response.data.settings,
        message: "LLM preferences updated successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to update LLM preferences");
    }
  }

  async getToolPreferences(): Promise<APIResponse<any>> {
    try {
      const response: AxiosResponse<{ tool_preferences: any }> =
        await this.client.get("/api/settings/tools");
      return {
        success: true,
        data: response.data.tool_preferences,
        message: "Tool preferences retrieved successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to get tool preferences");
    }
  }

  async updateToolPreferences(toolPreferences: any): Promise<APIResponse<any>> {
    try {
      const response: AxiosResponse<{ settings: any }> = await this.client.put(
        "/api/settings/tools",
        toolPreferences
      );
      return {
        success: true,
        data: response.data.settings,
        message: "Tool preferences updated successfully",
      };
    } catch (error) {
      throw this.handleError(error, "Failed to update tool preferences");
    }
  }

  // Error handling helper
  private handleError(error: any, defaultMessage: string): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    if (error.response?.data?.detail) {
      return new Error(error.response.data.detail);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error(defaultMessage);
  }

  // Utility method to check if the API is available
  async isAvailable(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

// Export a singleton instance
export const biomniAPI = new BiomniAPI();

// Export the class for testing or custom instances
export { BiomniAPI };
