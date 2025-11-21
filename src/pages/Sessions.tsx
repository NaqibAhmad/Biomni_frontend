import { useState, useEffect } from "react";
import {
  History,
  Clock,
  MessageSquare,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { biomniAPI } from "@/lib/api";
import { ChatSession, SessionWithMessages } from "@/types/services";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export function Sessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] =
    useState<SessionWithMessages | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await biomniAPI.getUserSessions({ limit: 100 });
        if (response.data) {
          setSessions(response.data.sessions || []);
        } else {
          setSessions([]);
        }
      } catch (err: any) {
        console.error("Failed to load sessions:", err);
        const errorMessage = err.response?.data?.detail || err.message || "Failed to load sessions";
        setError(errorMessage);
        // Only show toast if it's not an authentication issue
        if (!errorMessage.includes("401") && !errorMessage.includes("Unauthorized")) {
          toast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, []);

  const handleViewSession = async (sessionId: string) => {
    try {
      const response = await biomniAPI.getSessionWithMessages(sessionId);
      if (response.data) {
        setSelectedSession(response.data);
      }
    } catch (err: any) {
      console.error("Failed to load session:", err);
      toast.error("Failed to load session details");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) {
      return;
    }

    try {
      await biomniAPI.deleteSession(sessionId);
      toast.success("Session deleted successfully");
      // Reload sessions
      const response = await biomniAPI.getUserSessions({ limit: 100 });
      if (response.data) {
        setSessions(response.data.sessions);
      }
    } catch (err: any) {
      console.error("Failed to delete session:", err);
      toast.error("Failed to delete session");
    }
  };

  const handleContinueSession = (sessionId: string) => {
    navigate(`/chat?session=${sessionId}`);
  };

  if (selectedSession) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-sm text-gray-600 hover:text-gray-900 mb-2"
            >
              ← Back to sessions
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Session Details
            </h1>
            <p className="text-gray-600">
              Started:{" "}
              {formatDate(new Date(selectedSession.session.start_time))}
            </p>
          </div>
          <button
            onClick={() => handleContinueSession(selectedSession.session.id)}
            className="btn btn-primary"
          >
            Continue Session
          </button>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="space-y-4">
              {selectedSession.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.message_type === "user"
                      ? "bg-blue-50 ml-8"
                      : "bg-gray-50 mr-8"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.message_type === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      {message.message_type === "user" ? "U" : "A"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">
                        {formatDate(new Date(message.timestamp))}
                      </p>
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {message.content}
                      </p>
                      {message.model_used && (
                        <p className="text-xs text-gray-500 mt-2">
                          Model: {message.model_used}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Research Sessions
          </h1>
          <p className="text-gray-600">View and manage your research history</p>
        </div>
        <button onClick={() => navigate("/chat")} className="btn btn-primary">
          Start New Session
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="card bg-error-50 border-error-200">
          <div className="card-content">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-error-600" />
              <div className="flex-1">
                <p className="font-medium text-error-900">
                  Error loading sessions
                </p>
                <p className="text-sm text-error-700">{error}</p>
                {error.includes("anonymous") || error.includes("401") || error.includes("Unauthorized") ? (
                  <p className="text-xs text-error-600 mt-2">
                    Please make sure you are signed in to view your chat history.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600 mr-3" />
              <span className="text-gray-600">Loading sessions...</span>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="card">
              <div className="card-content">
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No sessions yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Start a new chat to create your first research session
                  </p>
                  <button
                    onClick={() => navigate("/chat")}
                    className="btn btn-primary"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          Session {session.id.slice(0, 8)}...
                        </h3>
                        {session.is_active && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Started: {formatDate(new Date(session.start_time))}
                        </span>
                        {session.last_activity_time && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Last activity:{" "}
                            {formatDate(new Date(session.last_activity_time))}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {session.message_count} messages
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewSession(session.id)}
                        className="btn btn-outline btn-sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleContinueSession(session.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="btn btn-outline btn-sm text-error-600 hover:text-error-700 hover:border-error-300"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
