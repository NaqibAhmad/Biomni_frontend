import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { biomniAPI } from "@/lib/api";
import { CreatePromptRequest } from "@/types/services";
import toast from "react-hot-toast";

interface SavePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promptText: string;
}

export function SavePromptModal({
  isOpen,
  onClose,
  onSuccess,
  promptText,
}: SavePromptModalProps) {
  const [formData, setFormData] = useState<CreatePromptRequest>({
    title: "",
    prompt_template: promptText,
    category: "general",
    description: "",
    tags: [],
    variables: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form but keep the prompt text
      setFormData({
        title: "",
        prompt_template: promptText,
        category: "general",
        description: "",
        tags: [],
        variables: [],
      });
      setTagInput("");
    }
  }, [isOpen, promptText]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please provide a title for the prompt");
      return;
    }
    setIsSubmitting(true);

    try {
      await biomniAPI.createPrompt(formData);
      toast.success("Prompt saved to library successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save prompt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Save to Prompt Library
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Save this prompt for future use
              </p>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Gene Expression Analysis"
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  (Select from list or type a custom category)
                </span>
              </label>
              <input
                type="text"
                list="category-options-save"
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="Select or type a category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="category-options-save">
                <option value="genomics">Genomics</option>
                <option value="protein_analysis">Protein Analysis</option>
                <option value="drug_discovery">Drug Discovery</option>
                <option value="literature_review">Literature Review</option>
                <option value="data_analysis">Data Analysis</option>
                <option value="experimental_design">Experimental Design</option>
                <option value="pathway_analysis">Pathway Analysis</option>
                <option value="clinical_research">Clinical Research</option>
                <option value="general">General</option>
              </datalist>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Brief description of what this prompt does"
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Add a tag and press Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="btn btn-outline"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Prompt Preview */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt Template
              </label>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-48 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {formData.prompt_template}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? "Saving..." : "Save Prompt"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
