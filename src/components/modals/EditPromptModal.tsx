import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { biomniAPI } from "@/lib/api";
import { UpdatePromptRequest, PromptTemplate } from "@/types/services";
import toast from "react-hot-toast";

interface EditPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prompt: PromptTemplate;
}

export function EditPromptModal({
  isOpen,
  onClose,
  onSuccess,
  prompt,
}: EditPromptModalProps) {
  const [formData, setFormData] = useState<UpdatePromptRequest>({
    title: prompt.title,
    prompt_template: prompt.prompt_template,
    category: prompt.category,
    description: prompt.description || "",
    tags: prompt.tags || [],
    variables: prompt.variables || [],
  });
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when prompt changes
  useEffect(() => {
    if (prompt) {
      setFormData({
        title: prompt.title,
        prompt_template: prompt.prompt_template,
        category: prompt.category,
        description: prompt.description || "",
        tags: prompt.tags || [],
        variables: prompt.variables || [],
      });
      setTagInput("");
    }
  }, [prompt]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await biomniAPI.updatePrompt(prompt.id, formData);
      toast.success("Prompt updated successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update prompt");
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

  const addVariable = () => {
    setFormData({
      ...formData,
      variables: [
        ...(formData.variables || []),
        { name: "", type: "string", description: "", required: true },
      ],
    });
  };

  const updateVariable = (index: number, field: string, value: any) => {
    const newVariables = [...(formData.variables || [])];
    newVariables[index] = { ...newVariables[index], [field]: value };
    setFormData({ ...formData, variables: newVariables });
  };

  const removeVariable = (index: number) => {
    setFormData({
      ...formData,
      variables: formData.variables?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit Prompt Template
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    (Select from list or type a custom category)
                  </span>
                </label>
                <input
                  type="text"
                  list="category-options-edit"
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="Select or type a category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="category-options-edit">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Brief description of what this prompt does"
                />
              </div>

              {/* Prompt Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prompt Template <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.prompt_template}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      prompt_template: e.target.value,
                    })
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder="Enter your prompt template. Use {variable_name} for variables."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use curly braces for variables, e.g., &quot;Analyze {'{'}gene_name{'}'} in {'{'}organism{'}'}&quot;
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Add a tag..."
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="btn btn-outline"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-primary-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Variables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Variables
                  </label>
                  <button
                    type="button"
                    onClick={addVariable}
                    className="btn btn-sm btn-outline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Variable
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.variables?.map((variable, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-start bg-gray-50 p-3 rounded-md"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Name"
                          value={variable.name}
                          onChange={(e) =>
                            updateVariable(index, "name", e.target.value)
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <select
                          value={variable.type}
                          onChange={(e) =>
                            updateVariable(index, "type", e.target.value)
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Description"
                          value={variable.description}
                          onChange={(e) =>
                            updateVariable(index, "description", e.target.value)
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariable(index)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? "Updating..." : "Update Prompt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

