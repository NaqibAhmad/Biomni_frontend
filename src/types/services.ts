/**
 * TypeScript interfaces for backend services
 * Matches the Pydantic models defined in the backend API
 */

// ==================== CHAT HISTORY TYPES ====================

export interface ChatMessage {
  id: string;
  session_id: string;
  message_type: "user" | "assistant";
  content: string;
  model_used?: string;
  timestamp: string;
  tokens_used?: number;
  processing_time_ms?: number;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  user_id: string;
  start_time: string;
  last_activity_time: string;
  end_time?: string;
  message_count: number;
  is_active: boolean;
  metadata?: Record<string, any>;
}

export interface SessionWithMessages {
  session: ChatSession;
  messages: ChatMessage[];
}

export interface SessionListResponse {
  sessions: ChatSession[];
  total: number;
}

// ==================== FEEDBACK TYPES ====================

export interface FeedbackField {
  name: string;
  label: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "checkbox_group" | "date";
  options?: string[];
  required?: boolean;
  allow_other?: boolean;
  other_field?: string;
}

export interface FeedbackSection {
  id: string;
  title: string;
  fields: FeedbackField[];
}

export interface FeedbackSchema {
  title: string;
  sections: FeedbackSection[];
}

export interface FeedbackSubmission {
  // Metadata
  date?: string;
  output_id: string;
  prompt: string; // The user's prompt/query that generated the response
  response: string; // The AI response/result being rated

  // Task Type
  task_types?: string[];
  task_type_other?: string;

  // Task Understanding
  query_interpreted_correctly?: string;
  followed_instructions?: string;
  task_understanding_notes?: string;
  save_to_library?: string;

  // Scientific Quality
  accuracy?: string;
  completeness?: string;
  scientific_quality_notes?: string;

  // Technical Performance
  tools_invoked_correctly?: string;
  outputs_usable?: string;
  latency_acceptable?: string;
  technical_performance_notes?: string;

  // Output Clarity & Usability
  readable_structured?: string;
  formatting_issues?: string;
  output_clarity_notes?: string;

  // Prompt Handling & Logic
  prompt_followed_instructions?: string;
  prompt_handling_notes?: string;
  logical_consistency?: string;
  logical_consistency_notes?: string;

  // Overall Rating
  overall_rating?: string;
  overall_notes?: string;
}

export interface FeedbackResponse {
  success: boolean;
  feedback_id?: string;
  message: string;
  submitted_at?: string;
  error?: string;
}

// ==================== PROMPT LIBRARY TYPES ====================

export interface PromptVariable {
  name: string;
  type: string;
  description: string;
  default?: any;
  required?: boolean;
}

export interface ModelConfig {
  model: string;
  temperature?: number;
  max_tokens?: number;
  source?: string;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ToolBindings {
  enabled_modules?: string[];
  specific_tools?: string[];
  use_tool_retriever?: boolean;
}

export interface OutputTemplate {
  format?: string;
  output_schema?: Record<string, any>;
  field_mapping?: Record<string, string>;
}

export interface PromptTemplate {
  id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  prompt_template: string;
  system_prompt?: string;
  variables: PromptVariable[];
  model_config?: ModelConfig;
  tool_bindings?: ToolBindings;
  output_template?: OutputTemplate;
  version: number;
  is_predefined: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePromptRequest {
  title: string;
  prompt_template: string;
  category: string;
  description?: string;
  tags?: string[];
  system_prompt?: string;
  variables?: PromptVariable[];
  model_config?: ModelConfig;
  tool_bindings?: ToolBindings;
  output_template?: OutputTemplate;
}

export interface UpdatePromptRequest {
  title?: string;
  prompt_template?: string;
  category?: string;
  description?: string;
  tags?: string[];
  system_prompt?: string;
  variables?: PromptVariable[];
  model_config?: ModelConfig;
  tool_bindings?: ToolBindings;
  output_template?: OutputTemplate;
  is_active?: boolean;
  create_version?: boolean;
}

export interface ExecutePromptRequest {
  prompt_id: string;
  variables?: Record<string, any>;
  session_id?: string;
  override_model_config?: ModelConfig;
}

export interface ExecutePromptResponse {
  execution_id?: string;
  prompt_id: string;
  rendered_prompt: string;
  response: string | object;
  log: string[] | string;
  tools_used: string[];
  processing_time_ms: number;
  timestamp: string;
}

export interface PromptAnalytics {
  prompt_id: string;
  title: string;
  usage_count: number;
  total_executions: number;
  favorites_count: number;
  avg_processing_time_ms: number;
  avg_quality_rating: number;
  total_tokens_used: number;
  last_used_at?: string;
}

export interface UserPromptStats {
  user_id: string;
  total_prompts: number;
  total_executions: number;
  total_favorites: number;
}

// ==================== QUERY ANALYTICS TYPES ====================

export interface QueryRecord {
  id: string;
  user_id: string;
  session_id?: string;
  query_text: string;
  model_used?: string;
  model_source?: string;
  query_timestamp: string;
  response_timestamp?: string;
  status: string;
  tokens_used?: number;
  processing_time_ms?: number;
  error_message?: string;
}

export interface QueryListResponse {
  queries: QueryRecord[];
  total: number;
}

export interface QueryAnalytics {
  total_queries: number;
  total_tokens: number;
  avg_processing_time_ms: number;
  queries_by_model: Record<
    string,
    {
      count: number;
      tokens: number;
    }
  >;
  queries_by_status: Record<string, number>;
}

// ==================== COMMON TYPES ====================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

export interface SearchParams {
  search?: string;
  category?: string;
  tags?: string[];
}
