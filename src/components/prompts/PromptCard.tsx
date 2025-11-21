import { PromptTemplate } from "@/types/services";
import {
  Play,
  Star,
  Trash2,
  Calendar,
  Tag,
  TrendingUp,
  Edit,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface PromptCardProps {
  prompt: PromptTemplate;
  isFavorite: boolean;
  onExecute: (prompt: PromptTemplate) => void;
  onToggleFavorite: (promptId: string, isFavorite: boolean) => void;
  onDelete: (promptId: string) => void;
  onEdit: (prompt: PromptTemplate) => void;
  viewMode: "grid" | "list";
}

export function PromptCard({
  prompt,
  isFavorite,
  onExecute,
  onToggleFavorite,
  onDelete,
  onEdit,
  viewMode,
}: PromptCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this prompt?")) {
      onDelete(prompt.id);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(prompt.id, isFavorite);
  };

  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {prompt.title}
              </h3>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                {prompt.category.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {prompt.description || "No description"}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatRelativeTime(new Date(prompt.created_at))}
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {prompt.usage_count} uses
              </div>
              {prompt.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {prompt.tags.slice(0, 2).join(", ")}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onExecute(prompt)}
              className="btn btn-sm btn-primary flex items-center gap-1"
            >
              <Play className="w-4 h-4" />
              Execute
            </button>
            <button
              onClick={() => onEdit(prompt)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Edit prompt"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={handleFavorite}
              className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={`w-4 h-4 ${
                  isFavorite ? "fill-yellow-500 text-yellow-500" : ""
                }`}
              />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete prompt"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
              {prompt.title}
            </h3>
            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
              {prompt.category.replace(/_/g, " ")}
            </span>
          </div>
          <button
            onClick={handleFavorite}
            className="p-1 text-gray-400 hover:text-yellow-500 transition-colors flex-shrink-0"
          >
            <Star
              className={`w-5 h-5 ${
                isFavorite ? "fill-yellow-500 text-yellow-500" : ""
              }`}
            />
          </button>
        </div>

        <p className="text-sm text-gray-600 line-clamp-3 mb-4 min-h-[60px]">
          {prompt.description || "No description provided"}
        </p>

        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {prompt.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {prompt.usage_count} uses
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatRelativeTime(new Date(prompt.created_at))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onExecute(prompt)}
            className="flex-1 btn btn-sm btn-primary flex items-center justify-center gap-1"
          >
            <Play className="w-4 h-4" />
            Execute
          </button>
          <button
            onClick={() => onEdit(prompt)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit prompt"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete prompt"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

