import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Wrench,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  Code,
  Eye,
  Zap,
  Image,
  ChevronUp,
} from "lucide-react";
import { useAgentStore } from "@/store/agentStore";

interface ExecutionLog {
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
  isCollapsed?: boolean;
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

interface ExecutorPanelProps {
  className?: string;
  streamingLogs?: string[];
  isStreaming?: boolean;
}

// Helper components for structured logs
const PlanSection = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-gray-800">Plan</h3>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
            {lines.length} steps
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-200">
          <ul className="space-y-1.5 mt-3">
            {lines.map((line, index) => {
              const isCompleted = line.includes("[✔]") || line.includes("[x]");
              const isPending = line.includes("[ ]");
              let text = line;
              if (isCompleted) {
                text = text.replace(/\[[✔x]\]\s*/, "");
              } else if (isPending) {
                text = text.replace(/\[ \]\s*/, "");
              }

              if (isCompleted || isPending) {
                return (
                  <li
                    key={index}
                    className={`flex items-start gap-3 p-2 rounded-md transition-all ${
                      isCompleted
                        ? "bg-green-50 border border-green-200 text-green-800 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-400 rounded-sm mt-1 flex-shrink-0" />
                    )}
                    <span className={`${isCompleted ? "font-medium" : ""}`}>
                      {text.trim().replace(/^\d+\.\s*/, "")}
                    </span>
                  </li>
                );
              }
              // handle nested list items
              if (line.trim().startsWith("-")) {
                return (
                  <li
                    key={index}
                    className="ml-10 text-sm text-gray-500 list-disc"
                  >
                    {line.trim().substring(1).trim()}
                  </li>
                );
              }
              if (line.match(/^\d+\./)) {
                return (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-gray-600"
                  >
                    <span>{text.trim()}</span>
                  </li>
                );
              }
              return (
                <li key={index} className="text-sm text-gray-800">
                  {line}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

const CodeSection = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = content.trim().split("\n");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-green-400" />
          <h3 className="font-semibold text-gray-300">Execute</h3>
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
            {lines.length} lines
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(content);
            }}
            className="p-1 text-gray-400 hover:text-white bg-gray-700 rounded-md transition-colors"
            title="Copy code"
          >
            <Copy className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-700">
          <pre className="text-sm text-white whitespace-pre-wrap font-mono overflow-x-auto p-3">
            <code>{content.trim()}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

const ObservationSection = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");

  return (
    <div className="bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-blue-800">Observation</h3>
          <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">
            {lines.length} items
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-blue-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-blue-200">
          <div className="text-sm text-blue-900 whitespace-pre-wrap font-mono mt-3">
            {content.trim()}
          </div>
        </div>
      )}
    </div>
  );
};

const ResearchQuerySection = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Research queries default to expanded
  const paragraphs = content.split("\n\n").filter((p) => p.trim() !== "");

  return (
    <div className="bg-purple-50 rounded-lg border border-purple-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-800">Research Query</h3>
          <span className="text-xs text-purple-600 bg-purple-200 px-2 py-1 rounded">
            {paragraphs.length} sections
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-purple-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-purple-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-purple-200">
          <div className="text-purple-900 space-y-2 mt-3">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-sm leading-relaxed">
                {paragraph.trim()}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StreamingLoader = () => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <div className="absolute inset-0 w-5 h-5 border-2 border-blue-200 rounded-full animate-ping"></div>
        </div>
        <h3 className="font-medium text-blue-800">Processing Request</h3>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-700">
            Analyzing data patterns...
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full animate-pulse"
            style={{ width: "60%" }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const ProcessingCompleteIndicator = () => {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="relative">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div className="absolute inset-0 w-6 h-6 border-2 border-green-300 rounded-full animate-ping opacity-30"></div>
        </div>
        <div>
          <h3 className="font-bold text-green-800">Processing Completed</h3>
          <p className="text-sm text-green-700">
            Analysis finished successfully
          </p>
        </div>
        <div className="ml-auto">
          <div className="bg-green-100 px-3 py-1 rounded-full">
            <span className="text-sm font-semibold text-green-700">
              ✓ Complete
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskSummarySection = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Task summaries default to expanded
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");

  // Count completed and total tasks
  const completedTasks = lines.filter(
    (line) => line.includes("[✓]") || line.includes("[✔]")
  ).length;
  const failedTasks = lines.filter(
    (line) => line.includes("[✗]") || line.includes("[×]")
  ).length;
  const totalTasks = lines.filter((line) => line.match(/^\d+\.\s*\[/)).length;
  const successRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-green-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h3 className="font-bold text-green-800 text-lg">
            Task Completion Summary
          </h3>
          <div className="bg-green-100 px-3 py-1 rounded-full">
            <span className="text-sm font-semibold text-green-700">
              {successRate}% Complete
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-green-600">
            {completedTasks}/{totalTasks} Tasks
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-green-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-green-600" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-green-200">
          <div className="mt-4">
            {/* Progress Bar */}
            <div className="w-full bg-green-200 rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${successRate}%` }}
              ></div>
            </div>

            {/* Task List */}
            <div className="space-y-2">
              {lines
                .map((line, index) => {
                  const isCompleted =
                    line.includes("[✓]") || line.includes("[✔]");
                  const isFailed = line.includes("[✗]") || line.includes("[×]");
                  let text = line;

                  if (isCompleted) {
                    text = text.replace(/\[[✓✔]\]\s*/, "");
                  } else if (isFailed) {
                    text = text.replace(/\[[✗×]\]\s*/, "");
                  }

                  if (isCompleted || isFailed) {
                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                          isCompleted
                            ? "bg-green-100 border border-green-300"
                            : "bg-red-50 border border-red-200"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            isCompleted ? "text-green-800" : "text-red-700"
                          }`}
                        >
                          {text.trim()}
                        </span>
                      </div>
                    );
                  }

                  // Handle regular numbered items that might not have status
                  if (line.match(/^\d+\./)) {
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-2 text-gray-700"
                      >
                        <span className="text-sm">{line.trim()}</span>
                      </div>
                    );
                  }

                  return null;
                })
                .filter(Boolean)}
            </div>

            {/* Summary Stats */}
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-green-700 font-medium">
                    ✅ {completedTasks} Completed
                  </span>
                  {failedTasks > 0 && (
                    <span className="text-red-600 font-medium">
                      ❌ {failedTasks} Failed
                    </span>
                  )}
                </div>
                <span className="text-green-600 font-semibold">
                  Research Analysis Complete
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StructuredLogViewer = ({ content }: { content: string }) => {
  const parts = [];
  const regex =
    /(?:## Plan|<plan>)([\s\S]*?)(?=<execute>|<observation>|<solution>|<\/plan>|$)|<execute>([\s\S]*?)<\/execute>|<observation>([\s\S]*?)<\/observation>|<solution>([\s\S]*?)<\/solution>/gi;
  let lastIndex = 0;

  // Remove human/ai message delimiters and solution blocks, clean up formatting
  const cleanedContent = content
    .replace(/={30,}\s*(Human|Ai)\s*Message\s*={30,}/g, "") // Remove message delimiters
    .replace(/={30,}/g, "") // Remove any other long equals lines
    .replace(/<solution>[\s\S]*?<\/solution>/gi, "")
    .replace(/^=+$/gm, "") // Remove standalone equals lines
    .replace(/\n={2,}\n/g, "\n\n") // Replace multiple equals with double newline
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Normalize multiple newlines
    .replace(/^\s*\n/, "") // Remove leading newlines
    .trim();

  const matches = Array.from(cleanedContent.matchAll(regex));

  if (matches.length > 0) {
    for (const match of matches) {
      const [fullMatch, plan, execute, observation] = match;
      const matchIndex = match.index!;

      // Add any text before this match
      if (matchIndex > lastIndex) {
        parts.push(
          <p
            key={`preamble-${lastIndex}`}
            className="text-sm text-gray-700 whitespace-pre-wrap"
          >
            {cleanedContent.substring(lastIndex, matchIndex)}
          </p>
        );
      }

      if (plan) {
        parts.push(
          <PlanSection key={`plan-${matchIndex}`} content={plan.trim()} />
        );
      } else if (execute) {
        parts.push(
          <CodeSection key={`execute-${matchIndex}`} content={execute.trim()} />
        );
      } else if (observation) {
        parts.push(
          <ObservationSection
            key={`observation-${matchIndex}`}
            content={observation.trim()}
          />
        );
      }
      // Skip solution blocks - they're already filtered out in cleanedContent

      lastIndex = matchIndex + fullMatch.length;
    }

    // Add any remaining text after the last match
    if (lastIndex < cleanedContent.length) {
      parts.push(
        <p
          key={`postamble-${lastIndex}`}
          className="text-sm text-gray-700 whitespace-pre-wrap"
        >
          {cleanedContent.substring(lastIndex)}
        </p>
      );
    }
  }

  if (parts.length === 0 && cleanedContent) {
    // Check if this is a task summary with multiple numbered items and completion status
    const isTaskSummary =
      cleanedContent.match(/^\d+\.\s*\[[✓✔✗×]\]/m) &&
      cleanedContent
        .split("\n")
        .filter((line) => line.match(/^\d+\.\s*\[[✓✔✗×]\]/)).length >= 3;

    if (isTaskSummary) {
      return <TaskSummarySection content={cleanedContent} />;
    }

    // Check if this looks like a research query or user message
    const isResearchQuery =
      cleanedContent.includes("Compare") ||
      cleanedContent.includes("analyze") ||
      cleanedContent.includes("predictive capacity") ||
      cleanedContent.includes("I need to") ||
      cleanedContent.match(
        /^[A-Z][^.]*?(analysis|compare|predictive|capacity|ratio)/i
      );

    if (isResearchQuery) {
      return <ResearchQuerySection content={cleanedContent} />;
    }

    // Fallback for non-structured logs
    return (
      <div className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
        {cleanedContent}
      </div>
    );
  }

  return <div className="space-y-3">{parts}</div>;
};

export function ExecutorPanel({
  className = "",
  streamingLogs = [],
  isStreaming = false,
}: ExecutorPanelProps) {
  const { isProcessing, executorLogs } = useAgentStore();
  const [currentStatus, setCurrentStatus] = useState<string>("Ready");
  const [collapsedLogs, setCollapsedLogs] = useState<Set<string>>(new Set());
  const [processingComplete, setProcessingComplete] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [executorLogs, streamingLogs]);

  // Check for solution tags to detect completion
  useEffect(() => {
    const allContent = [
      ...streamingLogs,
      ...executorLogs.map((log) => log.content),
    ].join("\n");
    const hasSolution = allContent.includes("<solution>");

    if (hasSolution && !processingComplete) {
      setProcessingComplete(true);
      setCurrentStatus("Complete");
    } else if (!hasSolution && processingComplete) {
      setProcessingComplete(false);
    }
  }, [streamingLogs, executorLogs, processingComplete]);

  // Update status based on processing state
  useEffect(() => {
    if (isProcessing && !processingComplete) {
      setCurrentStatus("Processing...");
      setCollapsedLogs(new Set());
    } else if (processingComplete) {
      setCurrentStatus("Complete");
    } else {
      setCurrentStatus("Ready");
    }
  }, [isProcessing, processingComplete]);

  const toggleLog = (logId: string) => {
    setCollapsedLogs((prev) => {
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
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getLogIcon = (type: ExecutionLog["type"]) => {
    switch (type) {
      case "task":
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case "planning":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "reasoning":
        return <Brain className="w-4 h-4 text-purple-500" />;
      case "code":
        return <Code className="w-4 h-4 text-green-500" />;
      case "observation":
        return <Eye className="w-4 h-4 text-indigo-500" />;
      case "resource":
        return <BarChart3 className="w-4 h-4 text-orange-500" />;
      case "visualization":
        return <Image className="w-4 h-4 text-pink-500" />;
      case "conclusion":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogStatusIcon = (status: ExecutionLog["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending":
        return <div className="w-4 h-4 border-2 border-gray-400 rounded" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const parseAndRenderStructuredLog = (content: string) => {
    // Remove solution blocks and clean formatting before processing
    const filteredContent = content
      .replace(/<solution>[\s\S]*?<\/solution>/gi, "")
      .replace(/={30,}\s*(Human|Ai)\s*Message\s*={30,}/g, "") // Remove message delimiters
      .replace(/={30,}/g, "") // Remove any other long equals lines
      .replace(/^=+$/gm, "")
      .replace(/\n={2,}\n/g, "\n\n")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .replace(/^\s*\n/, "") // Remove leading newlines
      .trim();

    // Check if this is a task summary first
    const isTaskSummary =
      filteredContent.match(/^\d+\.\s*\[[✓✔✗×]\]/m) &&
      filteredContent
        .split("\n")
        .filter((line) => line.match(/^\d+\.\s*\[[✓✔✗×]\]/)).length >= 3;

    if (
      isTaskSummary &&
      !filteredContent.includes("<plan>") &&
      !filteredContent.includes("<execute>")
    ) {
      return <TaskSummarySection content={filteredContent} />;
    }

    // Check if this is a research query
    const isResearchQuery =
      filteredContent.includes("Compare") ||
      filteredContent.includes("analyze") ||
      filteredContent.includes("predictive capacity") ||
      filteredContent.includes("I need to") ||
      filteredContent.match(
        /^[A-Z][^.]*?(analysis|compare|predictive|capacity|ratio)/i
      );

    if (
      isResearchQuery &&
      !filteredContent.includes("<plan>") &&
      !filteredContent.includes("<execute>")
    ) {
      return <ResearchQuerySection content={filteredContent} />;
    }

    const sections = {
      preamble: "",
      plan: "",
      execute: "",
      observation: "",
    };

    const planMatch = filteredContent.match(
      /(?:## Plan|<plan>)([\s\S]*?)(?:<execute>|<observation>|<\/plan>|$)/i
    );
    const executeMatch = filteredContent.match(
      /<execute>([\s\S]*?)<\/execute>/i
    );
    const observationMatch = filteredContent.match(
      /<observation>([\s\S]*?)<\/observation>/i
    );

    if (planMatch || executeMatch || observationMatch) {
      let preambleEnd = filteredContent.length;

      if (planMatch) {
        sections.plan = planMatch[1].trim();
        preambleEnd = Math.min(preambleEnd, planMatch.index || 0);
      }

      if (executeMatch) {
        sections.execute = executeMatch[1].trim();
        preambleEnd = Math.min(preambleEnd, executeMatch.index || 0);
      }

      if (observationMatch) {
        sections.observation = observationMatch[1].trim();
        preambleEnd = Math.min(preambleEnd, observationMatch.index || 0);
      }

      sections.preamble = filteredContent.substring(0, preambleEnd).trim();

      return (
        <div className="space-y-3">
          {sections.preamble && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {sections.preamble}
            </p>
          )}
          {sections.plan && <PlanSection content={sections.plan} />}
          {sections.execute && <CodeSection content={sections.execute} />}
          {sections.observation && (
            <ObservationSection content={sections.observation} />
          )}
        </div>
      );
    }

    return null; // Not a structured log
  };

  const renderLogContent = (log: ExecutionLog) => {
    const structuredContent = parseAndRenderStructuredLog(log.content);
    if (structuredContent) {
      return structuredContent;
    }

    // Fallback to original rendering logic
    if (log.details?.type === "list") {
      return (
        <div className="space-y-2">
          {log.content.split("\n").map((line, index) => {
            if (line.includes("[✔]")) {
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-md bg-green-50 border border-green-200 text-green-800 shadow-sm"
                >
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    {line.replace("[✔]", "").trim()}
                  </span>
                </div>
              );
            } else if (line.includes("[ ]")) {
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-md text-gray-600 hover:bg-gray-50 transition-all"
                >
                  <div className="w-4 h-4 border-2 border-gray-400 rounded" />
                  <span>{line.replace("[ ]", "").trim()}</span>
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

    if (log.details?.type === "visualization" && log.visualizations) {
      return (
        <div className="space-y-4">
          <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {log.content}
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

  return (
    <div
      className={`bg-white text-gray-900 h-full flex flex-col border-l border-gray-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">MyBioAI Executor</h2>
          {processingComplete ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium">
                {currentStatus}
              </span>
            </>
          ) : isProcessing || isStreaming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">{currentStatus}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              copyToClipboard(
                executorLogs
                  .map((log) => `${log.title}: ${log.content}`)
                  .join("\n\n")
              )
            }
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Copy all logs"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Streaming Logs */}
        {streamingLogs && streamingLogs.length > 0 && (
          <div className="space-y-3">
            <StructuredLogViewer content={streamingLogs.join("\n")} />
            {isStreaming && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">
                    Processing continues...
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show loader when streaming but no logs yet */}
        {isStreaming &&
          (!streamingLogs || streamingLogs.length === 0) &&
          !processingComplete && <StreamingLoader />}

        {/* Show completion indicator when processing is done */}
        {processingComplete && !isStreaming && <ProcessingCompleteIndicator />}

        {/* Executor Logs */}
        {executorLogs.length > 0 && (
          <div className="space-y-3">
            {executorLogs.map((log: any) => (
              <div
                key={log.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                {/* Log Header */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleLog(log.id)}
                >
                  <div className="flex items-center gap-3">
                    {getLogIcon(log.type)}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {log.title}
                      </span>
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
                    <div className="pt-3">{renderLogContent(log)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state - only show if both streaming logs and executor logs are empty */}
        {executorLogs.length === 0 &&
          (!streamingLogs || streamingLogs.length === 0) &&
          !isStreaming &&
          !processingComplete && (
            <div className="text-center text-gray-500 mt-8">
              <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium">No execution logs yet</p>
              <p className="text-sm">
                Start a conversation to see live backend logs
              </p>
            </div>
          )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span
            className={`${
              processingComplete
                ? "text-green-600 font-medium"
                : "text-gray-600"
            }`}
          >
            {processingComplete
              ? "Analysis Complete ✓"
              : isProcessing || isStreaming
              ? "Processing..."
              : "Ready"}
          </span>
          <span className="text-gray-500">
            {(() => {
              // Count structured blocks in streaming logs
              let streamingSteps = 0;
              if (streamingLogs && streamingLogs.length > 0) {
                const content = streamingLogs.join("\n");
                const planMatches = content.match(/(?:## Plan|<plan>)/gi);
                const executeMatches = content.match(/<execute>/gi);
                const observationMatches = content.match(/<observation>/gi);
                const taskSummaryMatches =
                  content.match(/^\d+\.\s*\[[✓✔✗×]\]/gm);
                const researchMatches = content.match(
                  /Compare|analyze|predictive capacity|I need to/gi
                );

                streamingSteps =
                  (planMatches?.length || 0) +
                  (executeMatches?.length || 0) +
                  (observationMatches?.length || 0) +
                  ((taskSummaryMatches?.length || 0) > 3 ? 1 : 0) +
                  ((researchMatches?.length || 0) > 0 &&
                  !planMatches &&
                  !executeMatches
                    ? 1
                    : 0);

                // Fallback: if no structured content but has logs, count as 1
                if (streamingSteps === 0 && content.trim().length > 0) {
                  streamingSteps = 1;
                }
              }

              const totalSteps = executorLogs.length + streamingSteps;
              return totalSteps === 0
                ? "No logs yet"
                : `${totalSteps} execution step${totalSteps === 1 ? "" : "s"}`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
