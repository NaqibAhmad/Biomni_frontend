// Core Biomni types that mirror the backend structure

export interface BiomniConfig {
  path: string;
  timeout_seconds: number;
  llm: string;
  temperature: number;
  use_tool_retriever: boolean;
  base_url?: string;
  api_key?: string;
  source?: string;
}

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  default?: any;
}

export interface ToolSchema {
  id?: number;
  name: string;
  description: string;
  required_parameters: ToolParameter[];
  optional_parameters: ToolParameter[];
  module: string;
  parameters?: Record<string, any>;
  fn?: any;
}

export interface DataLakeItem {
  name: string;
  description: string;
  path?: string;
}

export interface LibraryItem {
  name: string;
  description: string;
}

export interface CustomTool {
  name: string;
  description: string;
  module: string;
}

export interface CustomData {
  name: string;
  description: string;
  path: string;
  size?: number;
  type?: string;
  uploaded_at?: string;
}

export interface CustomSoftware {
  name: string;
  description: string;
}

export interface AgentState {
  messages: Message[];
  next_step: string | null;
}

export interface Message {
  type: 'human' | 'ai';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'tool_use';
  text?: string;
  name?: string;
  input?: Record<string, any>;
}

export interface ToolRegistry {
  tools: ToolSchema[];
  document_df: any;
}

export interface RetrieverResult {
  tools: ToolSchema[];
  data_lake: DataLakeItem[];
  libraries: LibraryItem[];
}

export interface AgentResponse {
  log: string[];
  content: string;
}

export interface StreamResponse {
  output: string;
}

export interface MCPConfig {
  mcp_servers: Record<string, MCPServerConfig>;
}

export interface MCPServerConfig {
  enabled: boolean;
  command: string[];
  env?: Record<string, string>;
  tools?: MCPToolConfig[];
}

export interface MCPToolConfig {
  biomni_name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface AgentStatus {
  is_initialized: boolean;
  is_processing: boolean;
  current_task?: string;
  error?: string;
}

export interface SystemPrompt {
  content: string;
  custom_tools?: CustomTool[];
  custom_data?: CustomData[];
  custom_software?: CustomSoftware[];
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AgentInitRequest {
  path?: string;
  llm?: string;
  source?: string;
  use_tool_retriever?: boolean;
  timeout_seconds?: number;
  base_url?: string;
  api_key?: string;
}

export interface AgentQueryRequest {
  prompt: string;
  self_critic?: boolean;
  test_time_scale_round?: number;
}

export interface ToolAddRequest {
  name: string;
  description: string;
  required_parameters: ToolParameter[];
  optional_parameters: ToolParameter[];
  module: string;
  function_code: string;
}

export interface DataAddRequest {
  file_path: string;
  description: string;
}

export interface SoftwareAddRequest {
  software_name: string;
  description: string;
}

export interface MCPAddRequest {
  config_path: string;
}

// UI State types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    title?: string;
    log?: string;
    status?: 'pending' | 'success' | 'error';
  };
}

export interface ToolCategory {
  name: string;
  tools: ToolSchema[];
  description: string;
}

export interface ResearchSession {
  id: string;
  title: string;
  description: string;
  created_at: Date;
  updated_at: Date;
  messages: ChatMessage[];
  tools_used: string[];
  data_accessed: string[];
}

export interface DashboardStats {
  total_sessions: number;
  total_queries: number;
  tools_used: number;
  data_accessed: number;
  average_response_time: number;
}

// Form validation schemas
export interface QueryFormData {
  prompt: string;
  self_critic: boolean;
  test_time_scale_round: number;
}

export interface ConfigFormData {
  path: string;
  llm: string;
  temperature: number;
  timeout_seconds: number;
  use_tool_retriever: boolean;
  base_url?: string;
  api_key?: string;
  source?: string;
}
