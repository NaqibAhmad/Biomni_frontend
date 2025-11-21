import { useState, useEffect } from "react";
import { biomniAPI } from "@/lib/api";
import { PromptTemplate } from "@/types/services";
import { PromptCard } from "@/components/prompts/PromptCard";
import { CreatePromptModal } from "@/components/modals/CreatePromptModal";
import { EditPromptModal } from "@/components/modals/EditPromptModal";
import { ExecutePromptModal } from "@/components/modals/ExecutePromptModal";
import {
  Plus,
  Search,
  Filter,
  Star,
  Grid,
  List,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

export function PromptLibrary() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<PromptTemplate[]>([]);
  const [favorites, setFavorites] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(
    null
  );

  useEffect(() => {
    loadPrompts();
    loadFavorites();
  }, []);

  useEffect(() => {
    filterPrompts();
  }, [prompts, searchQuery, selectedCategory, showFavoritesOnly, favorites]);

  const loadPrompts = async () => {
    try {
      const response = await biomniAPI.listPrompts();
      if (response.data) {
        setPrompts(response.data);
      }
    } catch (error: any) {
      console.error("Failed to load prompts:", error);
      toast.error(error.message || "Failed to load prompts");
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await biomniAPI.getUserFavoritePrompts();
      if (response.data) {
        setFavorites(response.data);
      }
    } catch (error: any) {
      console.error("Failed to load favorites:", error);
    }
  };

  const filterPrompts = () => {
    let filtered = prompts;

    // Filter by favorites
    if (showFavoritesOnly) {
      const favoriteIds = favorites.map((fav) => fav.id);
      filtered = filtered.filter((prompt) => favoriteIds.includes(prompt.id));
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (prompt) => prompt.category === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (prompt) =>
          prompt.title.toLowerCase().includes(query) ||
          prompt.description?.toLowerCase().includes(query) ||
          prompt.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredPrompts(filtered);
  };

  const handleCreatePrompt = async () => {
    await loadPrompts();
    setIsCreateModalOpen(false);
  };

  const handleExecutePrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setIsExecuteModalOpen(true);
  };

  const handleEditPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    await loadPrompts();
    setIsEditModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleToggleFavorite = async (promptId: string, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await biomniAPI.removePromptFavorite(promptId);
        toast.success("Removed from favorites");
      } else {
        await biomniAPI.addPromptFavorite(promptId);
        toast.success("Added to favorites");
      }
      await loadFavorites();
    } catch (error: any) {
      toast.error(error.message || "Failed to update favorite");
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    try {
      await biomniAPI.deletePrompt(promptId);
      toast.success("Prompt deleted successfully");
      await loadPrompts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete prompt");
    }
  };

  const categories = ["all", ...new Set(prompts.map((p) => p.category))];
  const favoriteIds = favorites.map((fav) => fav.id);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading prompt library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Prompt Library
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Create, manage, and execute custom prompt templates
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Prompt
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search prompts by title, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all"
                      ? "All Categories"
                      : category.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Favorites Toggle */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                showFavoritesOnly
                  ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              } border`}
            >
              <Star
                className={`w-4 h-4 ${
                  showFavoritesOnly ? "fill-yellow-500" : ""
                }`}
              />
              Favorites
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${
                  viewMode === "grid"
                    ? "bg-primary-100 text-primary-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${
                  viewMode === "list"
                    ? "bg-primary-100 text-primary-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prompts Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No prompts found
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {searchQuery || showFavoritesOnly
                  ? "Try adjusting your search or filters"
                  : "Create your first prompt template to get started"}
              </p>
              {!searchQuery && !showFavoritesOnly && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Prompt
                </button>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {filteredPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  isFavorite={favoriteIds.includes(prompt.id)}
                  onExecute={handleExecutePrompt}
                  onEdit={handleEditPrompt}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDeletePrompt}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreatePromptModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreatePrompt}
      />

      {selectedPrompt && (
        <>
          <EditPromptModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedPrompt(null);
            }}
            onSuccess={handleEditSuccess}
            prompt={selectedPrompt}
          />
          <ExecutePromptModal
            isOpen={isExecuteModalOpen}
            onClose={() => {
              setIsExecuteModalOpen(false);
              setSelectedPrompt(null);
            }}
            prompt={selectedPrompt}
          />
        </>
      )}
    </div>
  );
}

