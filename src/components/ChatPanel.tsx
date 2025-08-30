import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Copy, Download, RefreshCw, Upload, Database, ThumbsUp, ThumbsDown, Wifi, WifiOff, CheckCircle, Award, Lightbulb, FileText } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { ChatMessage } from '@/types/biomni';
import { formatRelativeTime, copyToClipboard, downloadFile } from '@/lib/utils';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { UploadDataModal } from '@/components/modals/UploadDataModal';

export function ChatPanel() {
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

  const [input, setInput] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isUsingStreaming, setIsUsingStreaming] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingMessagesRef = useRef(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // Initialize session on component mount
  useEffect(() => {
    if (isInitialized && !currentSessionId) {
      setCurrentSessionId('329cb31d-3533-4772-b869-bc100a49bcb9');
    }
  }, [isInitialized, currentSessionId]);

  // Initialize WebSocket connection when session is available
  useEffect(() => {
    if (isInitialized && currentSessionId && isUsingStreaming && !isConnected) {
      connect(currentSessionId);
    }
  }, [isInitialized, currentSessionId, isUsingStreaming, isConnected, connect]);

  // Show streaming status in assistant message
  useEffect(() => {
    if (isStreaming && !isUpdatingMessagesRef.current) {
      const currentMessages = useAgentStore.getState().messages;
      if (currentMessages.length > 0) {
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (lastMessage.role === 'assistant' && lastMessage.metadata?.status === 'pending') {
          isUpdatingMessagesRef.current = true;
          const logCount = streamingLogs.length;
          const updatedMessages = currentMessages.map((msg, index) =>
            index === currentMessages.length - 1
              ? { ...msg, content: `Processing your request... (${logCount} logs received)`, metadata: { ...msg.metadata, status: 'pending' as const } }
              : msg
          );
          useAgentStore.setState({ messages: updatedMessages });
          setTimeout(() => { isUpdatingMessagesRef.current = false; }, 50);
        }
      }
    }
  }, [isStreaming, streamingLogs.length]);

  // Handle streaming completion
  useEffect(() => {
    if (!isStreaming && streamingLogs.length > 0 && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.metadata?.status === 'pending') {
        
        const allLogs = streamingLogs.join('\n');
        const solutionMatch = allLogs.match(/<solution>([\s\S]*?)<\/solution>/);
        
        let finalOutput = '';
        let isSolution = false;

        if (solutionMatch && solutionMatch[1]) {
          // Clean up the solution content
          finalOutput = solutionMatch[1]
            .trim()
            .replace(/^#+\s*/gm, '## ') // Normalize headers
            .replace(/\*\*(.*?)\*\*/g, '**$1**') // Ensure bold formatting
            .replace(/^\s*-\s+/gm, '- ') // Normalize bullet points
            .replace(/\n\s*\n\s*\n/g, '\n\n'); // Clean up multiple newlines
          isSolution = true;
        } else {
          // Fallback if <solution> tag is not found
          const solutionLog = streamingLogs.find((log: string) =>
            log.toLowerCase().includes('solution') ||
            log.toLowerCase().includes('answer') ||
            log.toLowerCase().includes('conclusion') ||
            log.toLowerCase().includes('final')
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
                  status: 'success' as const,
                  isSolution, // Add a flag to identify the solution message
                } 
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
        path: './data',
        llm: 'claude-sonnet-4-20250514',
        use_tool_retriever: true,
        timeout_seconds: 600,
      });
      toast.success('Agent initialized successfully!');
    } catch (error) {
      toast.error('Failed to initialize agent');
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
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    addMessage(userMessage);

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Processing your request...',
      timestamp: new Date(),
      metadata: { status: 'pending' as const },
    };
    addMessage(assistantMessage);

    if (isUsingStreaming && isConnected) {
      clearStreamingLogs();
      sendWebSocketMessage({
        prompt: input.trim(),
        self_critic: false,
        test_time_scale_round: 0,
      });
    } else if (isUsingStreaming && !isConnected) {
        toast.error('WebSocket not connected. Please check connection or disable streaming.');
    } else {
      await queryAgent({
        prompt: input.trim(),
        self_critic: false,
        test_time_scale_round: 0,
      });
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const toggleStreaming = () => {
    setIsUsingStreaming(prev => {
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
      toast.success('Message copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleDownloadChat = () => {
    const chatContent = messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    downloadFile(chatContent, `biomni-chat-${Date.now()}.txt`);
    toast.success('Chat downloaded');
  };

  const handleClearChat = () => {
    clearMessages();
    toast.success('Chat cleared');
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const isPending = message.metadata?.status === 'pending';
    const isError = message.metadata?.status === 'error';
    const isSolution = message.metadata?.isSolution;

    if (isSolution) {
      return (
        <div key={message.id} className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 border-b border-green-200">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">Biomni Research Assistant</span>
                  <div className="bg-green-100 px-2 py-1 rounded-full">
                    <span className="text-xs font-medium text-green-700">Solution Ready</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{formatRelativeTime(message.timestamp)}</span>
                  <button
                    onClick={() => handleCopyMessage(message.content)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy solution"
                  >
                    <Copy className="w-4 h-4" />
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
                      <h3 className="text-xl font-bold text-white">Research Solution</h3>
                      <p className="text-green-100 text-sm">Analysis complete with key findings</p>
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
                          <ul className="space-y-2 my-4">
                            {children}
                          </ul>
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
      );
    }

    return (
      <div
        key={message.id}
        className={`flex gap-4 p-4 ${
          isUser ? 'bg-white' : 'bg-gray-50'
        } border-b border-gray-200`}
      >
        <div className="flex-shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser
                ? 'bg-primary-100 text-primary-600'
                : 'bg-secondary-100 text-secondary-600'
            }`}
          >
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {isUser ? 'You' : 'Biomni Assistant'}
              </span>
              <span className="text-sm text-gray-500">
                {formatRelativeTime(message.timestamp)}
              </span>
            </div>
            
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
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={tomorrow as any}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
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
            Initializing Biomni Agent
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
          <h1 className="text-xl font-semibold text-gray-900">Biomni Co-pilot</h1>
          <p className="text-sm text-gray-600">
            Ask me anything about biomedical research
          </p>
        </div>
        
        <div className="flex items-center gap-2">
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
            className={`btn btn-sm ${isUsingStreaming ? 'btn-primary' : 'btn-outline'}`}
            title={isUsingStreaming ? 'Disable streaming' : 'Enable streaming'}
          >
            {isUsingStreaming ? 'Streaming ON' : 'Streaming OFF'}
          </button>
          
          <button
            onClick={() => setIsUploadModalOpen(true)}
            disabled={!isInitialized}
            className="btn btn-outline btn-sm"
            title="Upload dataset"
          >
            <Upload className="w-4 h-4 mr-1" />
            <Database className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownloadChat}
            disabled={messages.length === 0}
            className="btn btn-outline btn-sm"
            title="Download chat"
          >
            <Download className="w-4 h-4" />
          </button>
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
                Welcome to Biomni
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
                  💡 <strong>Tip:</strong> Use the upload button in the header to add your own datasets during the conversation!
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
              className="btn btn-outline btn-sm"
              title="Upload dataset"
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
        
        {error && (
          <div className="mt-2 text-sm text-error-600 bg-error-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
