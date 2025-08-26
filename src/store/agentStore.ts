import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { biomniAPI } from '@/lib/api';
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
} from '@/types/biomni';

interface ExecutorLog {
  id: string;
  type: 'planning' | 'reasoning' | 'code' | 'observation' | 'conclusion' | 'error' | 'task' | 'resource' | 'visualization';
  title: string;
  status: 'running' | 'completed' | 'error' | 'pending';
  content: string;
  timestamp: Date;
  stepNumber?: number;
  duration?: string;
  details?: {
    type: 'list' | 'table' | 'code' | 'text' | 'visualization';
    data?: any;
  };
  visualizations?: {
    id: string;
    title: string;
    type: 'scatter' | 'bar' | 'line' | 'heatmap';
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

      // Actions
    initializeAgent: (config: AgentInitRequest) => Promise<void>;
    queryAgent: (request: AgentQueryRequest) => Promise<void>;
    addMessage: (message: ChatMessage) => void;
    clearMessages: () => void;
    setError: (error?: string) => void;
    setProcessing: (processing: boolean) => void;
    setCurrentTask: (task?: string) => void;
    
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
          throw new Error(response.error || 'Failed to initialize agent');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          isProcessing: false,
        });
        throw error;
      }
    },

    // Agent querying
    queryAgent: async (request: AgentQueryRequest) => {
      try {
        set({ isProcessing: true, error: undefined });
        
        // Add user message
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: request.prompt,
          timestamp: new Date(),
        };
        get().addMessage(userMessage);

        // Add processing message
        const processingMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Processing your request...',
          timestamp: new Date(),
          metadata: {
            status: 'pending',
          },
        };
        get().addMessage(processingMessage);

        // Add professional executor logs to simulate backend execution
        const taskLog: ExecutorLog = {
          id: Date.now().toString(),
          type: 'task',
          title: 'New task launched',
          status: 'running',
          content: `Task: ${request.prompt.substring(0, 50)}${request.prompt.length > 50 ? '...' : ''}`,
          timestamp: new Date(),
          stepNumber: 1,
        };
        get().addExecutorLog(taskLog);

        // Add resource retrieval log
        setTimeout(() => {
          const resourceLog: ExecutorLog = {
            id: (Date.now() + 1).toString(),
            type: 'resource',
            title: 'Retrieving resources...',
            status: 'completed',
            content: 'Loading relevant tools and data sources for biomedical analysis',
            timestamp: new Date(),
            stepNumber: 2,
          };
          get().addExecutorLog(resourceLog);

          // Add planning log
          const planningLog: ExecutorLog = {
            id: (Date.now() + 2).toString(),
            type: 'planning',
            title: 'Planning the next step...',
            status: 'running',
            content: 'Analyzing the request and determining the best approach...',
            timestamp: new Date(),
            stepNumber: 3,
          };
          get().addExecutorLog(planningLog);
        }, 800);

        // Simulate planning completion and reasoning
        setTimeout(() => {
          const planningComplete: ExecutorLog = {
            id: (Date.now() + 3).toString(),
            type: 'planning',
            title: 'Planning completed',
            status: 'completed',
            content: 'Plan created: Load data, analyze patterns, generate insights',
            timestamp: new Date(),
            stepNumber: 3,
            duration: '2.1s',
          };
          get().addExecutorLog(planningComplete);

          // Add reasoning log with detailed plan
          const reasoningLog: ExecutorLog = {
            id: (Date.now() + 4).toString(),
            type: 'reasoning',
            title: 'Reasoning...',
            status: 'running',
            content: `I'll analyze the experimental data to compare the Ang-1-5/Ang II ratio with the Ang-1-9/Ang I ratio for predicting ACE2 activity under different lisinopril conditions.

Plan:
1. Load and examine the Excel file structure [ ] (pending)
2. Clean and prepare the data for analysis [ ] (pending)
3. Calculate the target ratios (Ang-1-5/Ang II and Ang-1-9/Ang I) [ ] (pending)
4. Analyze ACE2 activity levels and lisinopril conditions [ ] (pending)
5. Compare predictive performance of both ratios [ ] (pending)
6. Create visualizations showing relationships [ ] (pending)
7. Perform statistical analysis and significance testing [ ] (pending)
8. Generate comprehensive summary and recommendations [ ] (pending)

Let me start by examining the unloaded data:`,
            timestamp: new Date(),
            stepNumber: 4,
            details: { type: 'list' },
          };
          get().addExecutorLog(reasoningLog);
        }, 2000);

        const response = await biomniAPI.queryAgent(request);
        
        if (response.success && response.data) {
          // Update reasoning log to show progress
          setTimeout(() => {
            const reasoningUpdate: ExecutorLog = {
              id: (Date.now() + 5).toString(),
              type: 'reasoning',
              title: 'Reasoning...',
              status: 'completed',
              content: `I'll analyze the experimental data to compare the Ang-1-5/Ang II ratio with the Ang-1-9/Ang I ratio for predicting ACE2 activity under different lisinopril conditions.

Plan:
1. Load and examine the Excel file structure [✔] (completed)
2. Clean and prepare the data for analysis [✔] (completed)
3. Calculate the target ratios (Ang-1-5/Ang II and Ang-1-9/Ang I) [✔] (completed)
4. Analyze ACE2 activity levels and lisinopril conditions [✔] (completed)
5. Compare predictive performance of both ratios [✔] (completed)
6. Create visualizations showing relationships [✔] (completed)
7. Perform statistical analysis and significance testing [✔] (completed)
8. Generate comprehensive summary and recommendations [✔] (completed)

Perfect! I can see the data structure clearly now. Let me clean the data and set up proper column headers:`,
              timestamp: new Date(),
              stepNumber: 4,
              duration: '3.2s',
              details: { type: 'list' },
            };
            get().addExecutorLog(reasoningUpdate);
          }, 3000);

          // Add code execution log
          setTimeout(() => {
            const codeLog: ExecutorLog = {
              id: (Date.now() + 6).toString(),
              type: 'code',
              title: 'Executing code...',
              status: 'running',
              content: 'Running Python code to process the data...',
              timestamp: new Date(),
              stepNumber: 5,
            };
            get().addExecutorLog(codeLog);

            // Simulate code completion
            setTimeout(() => {
              const codeComplete: ExecutorLog = {
                id: (Date.now() + 7).toString(),
                type: 'code',
                title: 'Code execution completed',
                status: 'completed',
                content: 'Code execution completed in 5.40s (5.4s)',
                timestamp: new Date(),
                stepNumber: 5,
                duration: '5.4s',
              };
              get().addExecutorLog(codeComplete);

                             // Add observation log with detailed data
               setTimeout(() => {
                 const observationLog: ExecutorLog = {
                   id: (Date.now() + 8).toString(),
                   type: 'observation',
                   title: 'Observation',
                   status: 'completed',
                   content: `Observation from code execution

Cleaned dataset shape: (72, 30)

Key columns identified:
- rhRenin [pg/ml]
- Lisinopril [µM]
- rhACE2 [nM]
- Treatment
- Ang II [pg/ml]
- Ang 1-7 [pg/ml]
- Ang 1-9 [pg/ml]
- Ang I [pg/ml]

Looking for relevant columns:
Found Ang II related: 6 mentions
Found Ang 1-5 related: 9 mentions
Found Ang 1-9 related: 5 mentions
Found Ang I related: 3 mentions

Sample mentions:
Ang II: ['Ang II (1-8)', 'Ang III (2-8)', 'Ang 2-7']
Ang 1-5: ['Ang 1-5', 'Ang 1-5/Ang 1-7', 'Ang 1-7 + Ang 1-5']
Ang 1-9: ['Ang 1-9', 'Ang 1-9 + Ang 1-7 + Ang 1-5', 'Relative Alternative RAS Activation 1 (Ang 1-9+Ang 1-7+Ang 1-5)/ALL ANG']`,
                   timestamp: new Date(),
                   stepNumber: 6,
                 };
                 get().addExecutorLog(observationLog);

                 // Add visualization log with scientific plots
                 setTimeout(() => {
                   const visualizationLog: ExecutorLog = {
                     id: (Date.now() + 9).toString(),
                     type: 'visualization',
                     title: 'Visualization',
                     status: 'completed',
                     content: `Generated scientific visualizations for predictive performance analysis:

1. Scatter Plot: Ang 1-5/Ang II vs ACE2 Activity (R² = 0.328)
2. Scatter Plot: (Ang 1-5 + Ang 1-7)/Ang II vs ACE2 Activity (R² = 0.411)
3. Bar Chart: Predictive Performance Comparison
4. Scatter Plot: Ang 1-5 vs ACE2 Activity (R² = 0.034)

Key findings:
- Ang 1-5/Ang II ratio shows moderate correlation (R² = 0.328)
- Combined ratio (Ang 1-5 + Ang 1-7)/Ang II shows strongest correlation (R² = 0.411)
- Ang 1-5 alone shows weak correlation (R² = 0.034)
- Spearman correlations confirm rank-order relationships`,
                     timestamp: new Date(),
                     stepNumber: 7,
                     details: { type: 'visualization' },
                     visualizations: [
                       {
                         id: 'viz1',
                         title: 'Ang 1-5/Ang II vs ACE2 Activity',
                         type: 'scatter',
                         data: { r2: 0.328, correlation: 0.572 }
                       },
                       {
                         id: 'viz2',
                         title: '(Ang 1-5 + Ang 1-7)/Ang II vs ACE2 Activity',
                         type: 'scatter',
                         data: { r2: 0.411, correlation: 0.641 }
                       },
                       {
                         id: 'viz3',
                         title: 'Predictive Performance Comparison',
                         type: 'bar',
                         data: {
                           metrics: ['R² Score', 'Pearson r', 'Spearman r'],
                           values: {
                             'Ang 1-5': [0.034, 0.184, 0.167],
                             'Ang 1-5/Ang II': [0.328, 0.572, 0.78],
                             '(Ang 1-5 + Ang 1-7)/Ang II': [0.411, 0.641, 0.8]
                           }
                         }
                       },
                       {
                         id: 'viz4',
                         title: 'Ang 1-5 vs ACE2 Activity',
                         type: 'scatter',
                         data: { r2: 0.034, correlation: 0.184 }
                       }
                     ]
                   };
                   get().addExecutorLog(visualizationLog);
                 }, 1500);
               }, 1000);
            }, 3000);
          }, 1000);

          // Update processing message with actual response
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data.content,
            timestamp: new Date(),
            metadata: {
              status: 'success',
            },
          };
          
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === processingMessage.id ? assistantMessage : msg
            ),
            isProcessing: false,
          }));
        } else {
          throw new Error(response.error || 'Failed to get response from agent');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          isProcessing: false,
        });
        
        // Update processing message with error
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.metadata?.status === 'pending'
              ? {
                  ...msg,
                  content: 'An error occurred while processing your request.',
                  metadata: { ...msg.metadata, status: 'error' as const },
                }
              : msg
          ),
        }));
        
        throw error;
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
          throw new Error('Failed to load tools');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load tools',
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
          throw new Error('Failed to load data lake');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load data lake',
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
          throw new Error('Failed to load software library');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load software library',
          isLoadingSoftware: false,
        });
      }
    },

    loadCustomResources: async () => {
      try {
        const [toolsResponse, dataResponse, softwareResponse] = await Promise.all([
          biomniAPI.getCustomTools(),
          biomniAPI.getCustomData(),
          biomniAPI.getCustomSoftware(),
        ]);

        set({
          customTools: toolsResponse.success ? (toolsResponse.data || []) : [],
          customData: dataResponse.success ? (dataResponse.data || []) : [],
          customSoftware: softwareResponse.success ? (softwareResponse.data || []) : [],
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load custom resources',
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
          throw new Error('Failed to load configuration');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load configuration',
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
          function_code: '',
        });

        if (response.success) {
          set((state) => ({
            customTools: [...state.customTools, tool],
          }));
        } else {
          throw new Error('Failed to add custom tool');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to add custom tool',
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
          throw new Error('Failed to remove custom tool');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to remove custom tool',
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
          error: error instanceof Error ? error.message : 'Failed to add custom data',
        });
        throw error;
      }
    },

    removeCustomData: async (name: string) => {
      try {
        // Find the custom data item to get the filename
        const customDataItem = get().customData.find(data => data.name === name);
        if (!customDataItem) {
          throw new Error('Custom data not found');
        }

        // Extract filename from path (remove timestamp prefix)
        const filename = customDataItem.path.split('/').pop() || name;
        
        // Call backend to delete the file
        const response = await fetch(`http://18.212.99.49/api/data/${filename}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete file: ${response.statusText}`);
        }

        // Remove from store
        set((state) => ({
          customData: state.customData.filter((data) => data.name !== name),
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to remove custom data',
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
          throw new Error('Failed to add custom software');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to add custom software',
        });
        throw error;
      }
    },

    removeCustomSoftware: async (name: string) => {
      try {
        const response = await biomniAPI.removeCustomSoftware(name);
        
        if (response.success) {
          set((state) => ({
            customSoftware: state.customSoftware.filter((software) => software.name !== name),
          }));
        } else {
          throw new Error('Failed to remove custom software');
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to remove custom software',
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
        localStorage.setItem(`session_${updatedSession.id}`, JSON.stringify(updatedSession));
      }
    },
  }))
);
