import { useState } from 'react';
import { History, Clock, MessageSquare, Trash2, Eye } from 'lucide-react';
import { ResearchSession } from '@/types/biomni';
import { formatDate } from '@/lib/utils';

export function Sessions() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Research Sessions</h1>
          <p className="text-gray-600">View and manage your research history</p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-600">Start a new chat to create your first research session</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{session.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(session.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {session.messages.length} messages
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button className="btn btn-outline btn-sm text-error-600 hover:text-error-700">
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
    </div>
  );
}
