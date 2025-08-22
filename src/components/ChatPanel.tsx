import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Copy, Download, RefreshCw, Upload, Database, ThumbsUp, ThumbsDown } from 'lucide-react';
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
  } = useAgentStore();

  const [input, setInput] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      console.error('Initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || !isInitialized) return;

    try {
      await queryAgent({
        prompt: input.trim(),
        self_critic: false,
        test_time_scale_round: 0,
      });
      setInput('');
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Query error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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
