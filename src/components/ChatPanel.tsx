import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Copy,
  Download,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Wifi,
  WifiOff,
  CheckCircle,
  Award,
  Lightbulb,
  FileText,
  X,
  Upload,
} from "lucide-react";
import { useAgentStore } from "@/store/agentStore";
import { ChatMessage } from "@/types/biomni";
import {
  formatRelativeTime,
  copyToClipboard,
  downloadFile,
  downloadChatAsDocx,
} from "@/lib/utils";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { UploadDataModal } from "@/components/modals/UploadDataModal";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { FeedbackModal } from "@/components/modals/FeedbackModal";
import { SavePromptModal } from "@/components/modals/SavePromptModal";
import { biomniAPI } from "@/lib/api";
import { useLocation, useNavigate } from "react-router-dom";
import { BookmarkPlus } from "lucide-react";

interface AvailableModel {
  id: string;
  name: string;
  source: string;
  description: string;
  is_default: boolean;
}

export function ChatPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    messages,
    isProcessing,
    error,
    queryAgent,
    clearMessages,
    isInitialized,
    initializeAgent,
    addMessage,
    // WebSocket state from store
    isConnected,
    isStreaming,
    streamingLogs,
    connect,
    disconnect,
    sendWebSocketMessage,
    clearStreamingLogs,
  } = useAgentStore();

  const [input, setInput] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(
    null
  );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isUsingStreaming, setIsUsingStreaming] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const [isSavePromptModalOpen, setIsSavePromptModalOpen] = useState(false);
  const [selectedPromptText, setSelectedPromptText] = useState<string>("");
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingMessagesRef = useRef(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingLogs.length]);

  // Auto-focus input when not processing
  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  // Initialize agent if not already initialized
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      handleInitialize();
    }
  }, [isInitialized, isInitializing]);

  // Auto-send initial message from location state (e.g., from prompt library)
  useEffect(() => {
    const state = location.state as {
      initialMessage?: string;
      promptTitle?: string;
    } | null;
    if (
      state?.initialMessage &&
      isInitialized &&
      !hasAutoSent &&
      !isProcessing &&
      !isStreaming
    ) {
      const initialMessage = state.initialMessage;
      setHasAutoSent(true);

      // Show toast if there's a prompt title
      if (state.promptTitle) {
        toast.success(`Executing prompt: ${state.promptTitle}`);
      }

      // Clear location state to prevent re-sending on re-renders
      navigate(location.pathname, { replace: true, state: {} });

      // Set input and trigger submit
      setInput(initialMessage);

      // Use a small delay to ensure state is set
      setTimeout(async () => {
        // Manually trigger the send logic
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "user",
          content: initialMessage,
          timestamp: new Date(),
        };
        addMessage(userMessage);

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Processing your request...",
          timestamp: new Date(),
          metadata: { status: "pending" as const },
        };
        addMessage(assistantMessage);

        // Get the actual model to use (selectedModel or defaultModel)
        const modelToUse = selectedModel || defaultModel;
        const selectedModelData = availableModels.find((m) => m.id === modelToUse);
        
        console.log(`[ChatPanel] Auto-sending message with model: ${modelToUse}, source: ${selectedModelData?.source || 'default'}`);

        if (isUsingStreaming) {
          // Always ensure WebSocket is connected before sending
          if (!isConnected && currentSessionId) {
            toast.loading("Connecting to WebSocket...");
            try {
              await connect(currentSessionId); // Wait for connection
              toast.success("WebSocket connected");
            } catch (error) {
              console.error("WebSocket connection failed:", error);
              toast.error(`WebSocket connection failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
              setInput(initialMessage); // Restore input so user can retry
              return; // Don't proceed if connection fails
            }
          }
          
          // Double-check connection state after waiting
          if (!isConnected) {
            toast.error("WebSocket is not connected. Please wait and try again.");
            setInput(initialMessage); // Restore input
            return;
          }

          clearStreamingLogs();
          sendWebSocketMessage({
            prompt: initialMessage,
            self_critic: false,
            test_time_scale_round: 0,
            model: modelToUse,
            source: selectedModelData?.source,
          });
        } else {
          queryAgent({
            prompt: initialMessage,
            self_critic: false,
            test_time_scale_round: 0,
            model: modelToUse,
            source: selectedModelData?.source,
          });
        }

        setInput("");
      }, 100);
    }
  }, [
    location.state,
    isInitialized,
    hasAutoSent,
    isProcessing,
    isStreaming,
    isConnected,
    isUsingStreaming,
    currentSessionId,
    selectedModel,
    defaultModel,
    availableModels,
    navigate,
    location.pathname,
    addMessage,
    clearStreamingLogs,
    sendWebSocketMessage,
    queryAgent,
    connect,
  ]);

  // Initialize session on component mount - generate a new UUID
  useEffect(() => {
    if (isInitialized && !currentSessionId) {
      // Generate a new UUID for the session
      const newSessionId = crypto.randomUUID();
      setCurrentSessionId(newSessionId);
      console.log(`Generated new session ID: ${newSessionId}`);
    }
  }, [isInitialized, currentSessionId]);

  // Load uploaded files for current session
  useEffect(() => {
    if (currentSessionId) {
      loadUploadedFiles();
    }
  }, [currentSessionId]);

  const loadUploadedFiles = async () => {
    setIsLoadingFiles(true);
    try {
      // Try with session_id first, then without if it fails
      let response;
      try {
        response = await biomniAPI.getUserFiles({
          session_id: currentSessionId || undefined,
          limit: 50,
        });
      } catch (sessionError: any) {
        // If session-based query fails, try without session filter
        console.warn(
          "Failed to load files with session, trying without session filter:",
          sessionError
        );
        response = await biomniAPI.getUserFiles({
          limit: 50,
        });
      }

      if (response.data) {
        const files = response.data.files || [];
        console.log(`Loaded ${files.length} files:`, files);
        setUploadedFiles(files);
      } else {
        console.warn("No data in response:", response);
        setUploadedFiles([]);
      }
    } catch (error: any) {
      console.error("Failed to load uploaded files:", error);
      console.error("Error details:", error.message, error.response?.data);
      toast.error(`Failed to load files: ${error.message || "Unknown error"}`);
      setUploadedFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDeleteFile = async (fileId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await biomniAPI.deleteFile(fileId);
      toast.success("File deleted successfully");
      // Reload files list
      await loadUploadedFiles();
    } catch (error: any) {
      console.error("Failed to delete file:", error);
      toast.error(error.message || "Failed to delete file");
    }
  };

  const handleDownloadFile = async (file: any) => {
    try {
      const fileId = file.id || file.filename;
      // Use relative path - the API client will handle the base URL
      const downloadUrl = `/api/data/download/${fileId}`;
      // For production with proxy, use the proxy path
      const isProduction = window.location.hostname.includes("vercel.app");
      const finalUrl = isProduction
        ? `/api/proxy/api/data/download/${fileId}`
        : downloadUrl;
      // Open in new tab to trigger download
      window.open(finalUrl, "_blank");
      toast.success("Download started");
    } catch (error: any) {
      console.error("Failed to download file:", error);
      toast.error(error.message || "Failed to download file");
    }
  };

  // Load available models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await biomniAPI.getAvailableModels();
        if (response.data) {
          setAvailableModels(response.data.models);
          setDefaultModel(response.data.default_model);
          // Set selected model to default, ensuring it's never empty
          if (response.data.default_model) {
            setSelectedModel(response.data.default_model);
          }
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    };
    loadModels();
  }, []);

  // Ensure selectedModel is always set to a valid value
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel && defaultModel) {
      setSelectedModel(defaultModel);
    }
  }, [availableModels, defaultModel, selectedModel]);

  // Initialize WebSocket connection when session is available
  useEffect(() => {
    if (isInitialized && currentSessionId && isUsingStreaming && !isConnected) {
      console.log("[ChatPanel] Auto-connecting WebSocket...");
      connect(currentSessionId).catch((error) => {
        console.error("[ChatPanel] Auto-connect failed:", error);
        // Don't show toast here - let user actions trigger connection attempts
      });
    }
  }, [isInitialized, currentSessionId, isUsingStreaming, isConnected, connect]);

  // Show streaming status in assistant message
  useEffect(() => {
    if (isStreaming && !isUpdatingMessagesRef.current) {
      const currentMessages = useAgentStore.getState().messages;
      if (currentMessages.length > 0) {
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (
          lastMessage.role === "assistant" &&
          lastMessage.metadata?.status === "pending"
        ) {
          isUpdatingMessagesRef.current = true;
          const logCount = streamingLogs.length;
          const updatedMessages = currentMessages.map((msg, index) =>
            index === currentMessages.length - 1
              ? {
                  ...msg,
                  content: `Processing your request... (${logCount} logs received)`,
                  metadata: { ...msg.metadata, status: "pending" as const },
                }
              : msg
          );
          useAgentStore.setState({ messages: updatedMessages });
          setTimeout(() => {
            isUpdatingMessagesRef.current = false;
          }, 50);
        }
      }
    }
  }, [isStreaming, streamingLogs.length]);

  // Handle streaming completion
  useEffect(() => {
    if (!isStreaming && streamingLogs.length > 0 && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.role === "assistant" &&
        lastMessage.metadata?.status === "pending"
      ) {
        const allLogs = streamingLogs.join("\n");
        const solutionMatch = allLogs.match(/<solution>([\s\S]*?)<\/solution>/);

        let finalOutput = "";
        let isSolution = false;

        if (solutionMatch && solutionMatch[1]) {
          // Clean up the solution content
          finalOutput = solutionMatch[1]
            .trim()
            .replace(/^#+\s*/gm, "## ") // Normalize headers
            .replace(/\*\*(.*?)\*\*/g, "**$1**") // Ensure bold formatting
            .replace(/^\s*-\s+/gm, "- ") // Normalize bullet points
            .replace(/\n\s*\n\s*\n/g, "\n\n"); // Clean up multiple newlines
          isSolution = true;
        } else {
          // Fallback if <solution> tag is not found
          const solutionLog = streamingLogs.find(
            (log: string) =>
              log.toLowerCase().includes("solution") ||
              log.toLowerCase().includes("answer") ||
              log.toLowerCase().includes("conclusion") ||
              log.toLowerCase().includes("final")
          );
          finalOutput = solutionLog || streamingLogs[streamingLogs.length - 1];
        }

        const updatedMessages = messages.map((msg) =>
          msg.id === lastMessage.id
            ? {
                ...msg,
                content: finalOutput,
                metadata: {
                  ...msg.metadata,
                  status: "success" as const,
                  isSolution, // Add a flag to identify the solution message
                },
              }
            : msg
        );
        useAgentStore.setState({ messages: updatedMessages });
      }
    }
  }, [isStreaming, streamingLogs, messages]);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await initializeAgent({
        path: "./data",
        llm: "claude-sonnet-4-20250514",
        use_tool_retriever: true,
        timeout_seconds: 600,
      });
      toast.success("Agent initialized successfully!");
    } catch (error) {
      toast.error("Failed to initialize agent");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isInitialized) return;

    if (isUsingStreaming && isStreaming) return;
    if (!isUsingStreaming && isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    addMessage(userMessage);

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Processing your request...",
      timestamp: new Date(),
      metadata: { status: "pending" as const },
    };
    addMessage(assistantMessage);

    // Get the actual model to use (selectedModel or defaultModel)
    const modelToUse = selectedModel || defaultModel;
    const selectedModelData = availableModels.find((m) => m.id === modelToUse);
    
    console.log(`[ChatPanel] Sending message with model: ${modelToUse}, source: ${selectedModelData?.source || 'default'}`);

    if (isUsingStreaming) {
      // Always ensure WebSocket is connected before sending
      if (!isConnected && currentSessionId) {
        toast.loading("Connecting to WebSocket...");
        try {
          await connect(currentSessionId); // Wait for connection
        } catch (error) {
          console.error("WebSocket connection failed:", error);
          toast.error(`WebSocket connection failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
          return; // Don't proceed if connection fails
        }
      }
      
      // Double-check connection state after waiting
      if (!isConnected) {
        toast.error("WebSocket is not connected. Please wait and try again.");
        return;
      }

      clearStreamingLogs();
      sendWebSocketMessage({
        prompt: input.trim(),
        self_critic: false,
        test_time_scale_round: 0,
        model: modelToUse,
        source: selectedModelData?.source,
      });
    } else {
      await queryAgent({
        prompt: input.trim(),
        self_critic: false,
        test_time_scale_round: 0,
        model: modelToUse,
        source: selectedModelData?.source,
      });
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleStreaming = () => {
    setIsUsingStreaming((prev) => {
      const newStreamingState = !prev;
      if (newStreamingState && currentSessionId) {
        connect(currentSessionId);
      } else {
        disconnect();
      }
      return newStreamingState;
    });
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await copyToClipboard(content);
      toast.success("Message copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy message");
    }
  };

  const handleDownloadChat = (format: "txt" | "docx") => {
    if (format === "txt") {
    const chatContent = messages
      .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n\n");

    downloadFile(chatContent, `mybioai-chat-${Date.now()}.txt`);
      toast.success("Chat downloaded as TXT");
    } else {
      downloadChatAsDocx(messages, `mybioai-chat-${Date.now()}.docx`)
        .then(() => {
          toast.success("Chat downloaded as DOCX");
        })
        .catch((error) => {
          console.error("Error downloading DOCX:", error);
          toast.error("Failed to download as DOCX");
        });
    }
    setIsDownloadMenuOpen(false);
  };

  const handleDownloadResponse = async (message: ChatMessage) => {
    try {
      // Create a single message array for the download function
      await downloadChatAsDocx(
        [message],
        `mybioai-response-${Date.now()}.docx`
      );
      toast.success("Response downloaded as DOCX");
    } catch (error: any) {
      console.error("Failed to download response:", error);
      toast.error(error.message || "Failed to download response");
    }
  };

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(event.target as Node)
      ) {
        setIsDownloadMenuOpen(false);
      }
    };

    if (isDownloadMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDownloadMenuOpen]);

  const handleClearChat = () => {
    clearMessages();
    clearStreamingLogs();
    toast.success("Chat cleared");
  };

  const handleFeedbackClick = (messageId: string) => {
    setFeedbackMessageId(messageId);
    setIsFeedbackModalOpen(true);
  };

  // Find the user prompt that corresponds to an assistant response
  const findUserPromptForResponse = (responseMessageId: string): string => {
    const responseIndex = messages.findIndex(
      (msg) => msg.id === responseMessageId
    );
    if (responseIndex === -1) return "No prompt available";

    // Look backwards to find the most recent user message before this response
    for (let i = responseIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        return messages[i].content;
      }
    }
    return "No prompt available";
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === "user";
    const isPending = message.metadata?.status === "pending";
    const isError = message.metadata?.status === "error";
    const isSolution = message.metadata?.isSolution;

    if (isSolution) {
      return (
        <div
          key={message.id}
          className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 border-b border-green-200"
        >
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">
                    MyBioAI Research Assistant
                  </span>
                  <div className="bg-green-100 px-2 py-1 rounded-full">
                    <span className="text-xs font-medium text-green-700">
                      Solution Ready
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {formatRelativeTime(message.timestamp)}
                  </span>
                  <button
                    onClick={() => handleCopyMessage(message.content)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy solution"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadResponse(message)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download response as DOCX"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-white border border-green-200 rounded-xl shadow-lg overflow-hidden">
                {/* Solution Header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Research Solution
                      </h3>
                      <p className="text-green-100 text-sm">
                        Analysis complete with key findings
                      </p>
                    </div>
                  </div>
                </div>

                {/* Solution Content */}
                <div className="p-6">
                  <div className="prose prose-lg max-w-none text-gray-800">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600" />
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">
                            {children}
                          </h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="space-y-2 my-4">{children}</ul>
                        ),
                        li: ({ children }) => (
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{children}</span>
                          </li>
                        ),
                        p: ({ children }) => (
                          <p className="mb-4 leading-relaxed text-gray-700">
                            {children}
                          </p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">
                            {children}
                          </strong>
                        ),
                        code: ({ children }) => (
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Solution Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Research analysis completed successfully</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <FeedbackButton
                        onClick={() => handleFeedbackClick(message.id)}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Helpful solution"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`flex gap-4 p-4 ${
          isUser ? "bg-white" : "bg-gray-50"
        } border-b border-gray-200`}
      >
        <div className="flex-shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser
                ? "bg-primary-100 text-primary-600"
                : "bg-secondary-100 text-secondary-600"
            }`}
          >
            {isUser ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {isUser ? "You" : "MyBioAI Assistant"}
              </span>
              <span className="text-sm text-gray-500">
                {formatRelativeTime(message.timestamp)}
              </span>
            </div>

            {isUser && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setSelectedPromptText(message.content);
                    setIsSavePromptModalOpen(true);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Save to Prompt Library"
                >
                  <BookmarkPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCopyMessage(message.content)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy message"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
            {!isUser && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopyMessage(message.content)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy message"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Thumbs down"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Thumbs up"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="prose prose-sm max-w-none">
            {isPending ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing your request...</span>
              </div>
            ) : isError ? (
              <div className="text-error-600 bg-error-50 p-3 rounded-md">
                {message.content}
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={tomorrow as any}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {message.metadata?.title && (
            <div className="mt-2 text-xs text-gray-500">
              {message.metadata.title}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isInitializing) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Initializing MyBioAI Agent
          </h3>
          <p className="text-sm text-gray-600">
            Setting up the AI research assistant...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            MyBioAI Co-pilot
          </h1>
          <p className="text-sm text-gray-600">
            Ask me anything about biomedical research
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Selector */}
          {availableModels.length > 0 && (
            <select
              value={selectedModel || defaultModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              title="Select AI model"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          )}

          {/* WebSocket Connection Status */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs">
            {isConnected ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="w-3 h-3" />
                <span>Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <WifiOff className="w-3 h-3" />
                <span>Disconnected</span>
              </div>
            )}
          </div>

          {/* Streaming Toggle */}
          <button
            onClick={toggleStreaming}
            className={`btn btn-sm ${
              isUsingStreaming ? "btn-primary" : "btn-outline"
            }`}
            title={isUsingStreaming ? "Disable streaming" : "Enable streaming"}
          >
            {isUsingStreaming ? "Streaming ON" : "Streaming OFF"}
          </button>

          <div className="relative" ref={downloadMenuRef}>
          <button
              onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
            disabled={messages.length === 0}
            className="btn btn-outline btn-sm"
            title="Download chat"
          >
            <Download className="w-4 h-4" />
          </button>
            {isDownloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                <button
                  onClick={() => handleDownloadChat("txt")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Download as TXT
                </button>
                <button
                  onClick={() => handleDownloadChat("docx")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Download as DOCX
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="btn btn-outline btn-sm"
            title="Clear chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to MyBioAI
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                I'm your AI research assistant. I can help you with:
              </p>
              <div className="text-left space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span>Biomedical data analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span>Literature research and summarization</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span>Experimental design and planning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span>Code generation and analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span>Dataset upload and management</span>
                </div>
              </div>
              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Use the upload button in the header
                  to add your own datasets during the conversation!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {messages.map(renderMessage)}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask something or upload a file"
              className="textarea w-full resize-none"
              rows={1}
              disabled={isProcessing || !isInitialized}
            />
          </div>
          <div className="flex gap-2 self-end">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              disabled={!isInitialized}
              className="btn btn-outline"
              title="Upload file"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isProcessing || !isInitialized}
              className="btn btn-primary"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        {error &&
          !error.includes("Custom software retrieval") &&
          !error.includes("Custom data not found") && (
          <div className="mt-2 text-sm text-error-600 bg-error-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Uploaded Files Section - Always visible */}
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Uploaded Files{" "}
            {uploadedFiles.length > 0 && `(${uploadedFiles.length})`}
          </h3>
          <button
            onClick={loadUploadedFiles}
            disabled={isLoadingFiles}
            className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50 flex items-center gap-1"
          >
            {isLoadingFiles ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Refresh
              </>
            )}
          </button>
        </div>
        {isLoadingFiles ? (
          <div className="text-center py-4 text-sm text-gray-500">
            Loading files...
          </div>
        ) : uploadedFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id || file.filename}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm hover:shadow-sm transition-shadow"
              >
                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-gray-900 truncate max-w-[200px]"
                    title={file.original_filename || file.filename}
                  >
                    {file.original_filename || file.filename}
                  </p>
                  {file.description && (
                    <p
                      className="text-xs text-gray-500 truncate max-w-[200px]"
                      title={file.description}
                    >
                      {file.description}
                    </p>
                  )}
                  {/* Display Tags */}
                  {file.tags &&
                    Array.isArray(file.tags) &&
                    file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {file.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-xs px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                  )}
                  {file.file_size && (
                    <p className="text-xs text-gray-400">
                      {(file.file_size / 1024).toFixed(2)} KB
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Download Button */}
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                <button
                  onClick={() =>
                    handleDeleteFile(
                      file.id || file.filename,
                      file.original_filename || file.filename
                    )
                  }
                    className="p-1 text-gray-400 hover:text-error-600 transition-colors"
                  title="Delete file"
                >
                  <X className="w-4 h-4" />
                </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500">
            No files uploaded yet. Use the upload button above to add files.
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          // Reload files after upload
          if (currentSessionId) {
            loadUploadedFiles();
          }
        }}
        sessionId={currentSessionId}
      />

      {/* Feedback Modal */}
      {feedbackMessageId && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => {
            setIsFeedbackModalOpen(false);
            setFeedbackMessageId(null);
          }}
          outputId={feedbackMessageId || ""}
          prompt={findUserPromptForResponse(feedbackMessageId || "")}
          response={
            messages.find((msg) => msg.id === feedbackMessageId)?.content ||
            "No response available"
          }
          sessionId={currentSessionId || undefined}
        />
      )}

      {/* Save Prompt Modal */}
      <SavePromptModal
        isOpen={isSavePromptModalOpen}
        onClose={() => {
          setIsSavePromptModalOpen(false);
          setSelectedPromptText("");
        }}
        onSuccess={() => {
          toast.success("Prompt saved successfully!");
        }}
        promptText={selectedPromptText}
      />
    </div>
  );
}
