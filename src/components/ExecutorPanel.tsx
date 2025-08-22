import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Copy, Wrench, BarChart3, Clock, CheckCircle, AlertCircle, Loader2, Brain, Code, Eye, Zap, Download, Image } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';

interface ExecutionLog {
  id: string;
  type: 'planning' | 'reasoning' | 'code' | 'observation' | 'conclusion' | 'error' | 'task' | 'resource' | 'visualization';
  title: string;
  status: 'running' | 'completed' | 'error' | 'pending';
  content: string;
  timestamp: Date;
  isCollapsed?: boolean;
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

interface ExecutorPanelProps {
  className?: string;
}

export function ExecutorPanel({ className = '' }: ExecutorPanelProps) {
  const { isProcessing, executorLogs, clearExecutorLogs } = useAgentStore();
  const [currentStatus, setCurrentStatus] = useState<string>('Ready');
  const [collapsedLogs, setCollapsedLogs] = useState<Set<string>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executorLogs]);

  // Clear logs when processing starts
  useEffect(() => {
    if (isProcessing) {
      clearExecutorLogs();
      setCurrentStatus('Processing...');
      setCollapsedLogs(new Set());
    } else {
      setCurrentStatus('Ready');
    }
  }, [isProcessing, clearExecutorLogs]);

  const toggleLog = (logId: string) => {
    setCollapsedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getLogIcon = (type: ExecutionLog['type']) => {
    switch (type) {
      case 'task':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'planning':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'reasoning':
        return <Brain className="w-4 h-4 text-purple-500" />;
      case 'code':
        return <Code className="w-4 h-4 text-green-500" />;
      case 'observation':
        return <Eye className="w-4 h-4 text-indigo-500" />;
      case 'resource':
        return <BarChart3 className="w-4 h-4 text-orange-500" />;
      case 'visualization':
        return <Image className="w-4 h-4 text-pink-500" />;
      case 'conclusion':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogStatusIcon = (status: ExecutionLog['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <div className="w-4 h-4 border-2 border-gray-400 rounded" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const renderLogContent = (log: ExecutionLog) => {
    if (log.details?.type === 'list') {
      return (
        <div className="space-y-2">
          {log.content.split('\n').map((line, index) => {
            if (line.includes('[✔]')) {
              return (
                <div key={index} className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>{line.replace('[✔]', '').trim()}</span>
                </div>
              );
            } else if (line.includes('[ ]')) {
              return (
                <div key={index} className="flex items-center gap-2 text-gray-600">
                  <div className="w-4 h-4 border-2 border-gray-400 rounded" />
                  <span>{line.replace('[ ]', '').trim()}</span>
                </div>
              );
            } else if (line.match(/^\d+\./)) {
              return (
                <div key={index} className="ml-4 text-gray-700">
                  {line}
                </div>
              );
            } else {
              return (
                <div key={index} className="text-gray-700">
                  {line}
                </div>
              );
            }
          })}
        </div>
      );
    }

    if (log.details?.type === 'visualization' && log.visualizations) {
      return (
        <div className="space-y-4">
          <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {log.content}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {log.visualizations.map((viz) => (
              <div key={viz.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 text-sm">{viz.title}</h4>
                  <button
                    onClick={() => downloadVisualization(viz)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download visualization"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-white rounded border border-gray-200 p-3 h-48 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs">Visualization: {viz.type}</p>
                    <p className="text-xs text-gray-400">Click download to save</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
        {log.content}
      </div>
    );
  };

  const downloadVisualization = (viz: any) => {
    // Create a canvas element to draw the visualization
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    if (ctx) {
      // Set background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw title
      ctx.fillStyle = 'black';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(viz.title, canvas.width / 2, 30);

      // Draw placeholder for visualization
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Visualization: ${viz.type}`, canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillText('Generated by Biomni Executor', canvas.width / 2, canvas.height / 2 + 10);
    }

    // Download the canvas as PNG
    const link = document.createElement('a');
    link.download = `${viz.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className={`bg-white text-gray-900 h-full flex flex-col border-l border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Biomni Executor</h2>
          {isProcessing && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">{currentStatus}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(executorLogs.map(log => `${log.title}: ${log.content}`).join('\n\n'))}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Copy all logs"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {executorLogs.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="font-medium">No execution logs yet</p>
            <p className="text-sm">Start a conversation to see live backend logs</p>
          </div>
        ) : (
          executorLogs.map((log: any) => (
            <div key={log.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Log Header */}
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleLog(log.id)}
              >
                <div className="flex items-center gap-3">
                  {getLogIcon(log.type)}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{log.title}</span>
                    {getLogStatusIcon(log.status)}
                  </div>
                  {log.stepNumber && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Step {log.stepNumber}
                    </span>
                  )}
                  {log.duration && (
                    <span className="text-xs text-gray-500">
                      ({log.duration})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(log.content);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy content"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {collapsedLogs.has(log.id) ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Log Content */}
              {!collapsedLogs.has(log.id) && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="pt-3">
                    {renderLogContent(log)}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {isProcessing ? 'Processing...' : 'Ready'}
          </span>
          <span className="text-gray-500">
            {executorLogs.length} execution steps
          </span>
        </div>
      </div>
    </div>
  );
}
