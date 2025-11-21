import { useState, useEffect } from "react";
import { Save, RefreshCw, Loader2 } from "lucide-react";
import { useAgentStore } from "@/store/agentStore";
import { biomniAPI } from "@/lib/api";
import { BiomniConfig } from "@/types/biomni";
import toast from "react-hot-toast";

interface AvailableModel {
  id: string;
  name: string;
  source: string;
  description: string;
  is_default: boolean;
}

export function Configuration() {
  const { config, isLoadingConfig, loadConfiguration } = useAgentStore();

  const [formData, setFormData] = useState<Partial<BiomniConfig>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [defaultModel, setDefaultModel] = useState<string>("");

  useEffect(() => {
    if (!config) {
      loadConfiguration();
    } else {
      setFormData(config);
    }
    loadAvailableModels();
  }, [config, loadConfiguration]);

  // Update source when model or available models change
  useEffect(() => {
    if (availableModels.length > 0 && formData.llm) {
      const selectedModel = availableModels.find((m) => m.id === formData.llm);
      if (
        selectedModel &&
        (!formData.source || formData.source === "Unknown")
      ) {
        setFormData((prev) => ({ ...prev, source: selectedModel.source }));
      }
    }
  }, [availableModels, formData.llm]);

  const loadAvailableModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await biomniAPI.getAvailableModels();
      if (response.data) {
        setAvailableModels(response.data.models);
        setDefaultModel(response.data.default_model);
      }
    } catch (error: any) {
      console.error("Failed to load available models:", error);
      toast.error("Failed to load available models");
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Ensure source is set based on selected model
      const selectedModel = availableModels.find(
        (m) => m.id === (formData.llm || defaultModel)
      );
      const configToSave = {
        ...formData,
        source: selectedModel?.source || formData.source || "Anthropic", // Default to Anthropic if not set
      };

      // Validate that source is set
      if (!configToSave.source || configToSave.source === "Unknown") {
        if (selectedModel) {
          configToSave.source = selectedModel.source;
        } else {
          toast.error("Please select a valid model");
          setIsSaving(false);
          return;
        }
      }

      await biomniAPI.updateConfiguration(configToSave);
      // Reload configuration to get updated values
      await loadConfiguration();
      toast.success("Configuration saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData(config);
      toast.success("Configuration reset to defaults");
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="p-6 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
          <p className="text-gray-600">Manage agent and system settings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn btn-outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Agent Settings</h3>
            <p className="card-description">Configure the AI agent behavior</p>
          </div>
          <div className="card-content space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LLM Model
              </label>
              {isLoadingModels ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading models...
                </div>
              ) : (
                <select
                  value={formData.llm || defaultModel || ""}
                  onChange={(e) => {
                    const selectedModelId = e.target.value;
                    const selectedModel = availableModels.find(
                      (m) => m.id === selectedModelId
                    );
                    setFormData({
                      ...formData,
                      llm: selectedModelId,
                      // Automatically set source based on selected model
                      source: selectedModel?.source || formData.source,
                    });
                  }}
                  className="input"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.is_default && "(Default)"} -{" "}
                      {model.source}
                    </option>
                  ))}
                </select>
              )}
              {availableModels.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {availableModels.find(
                    (m) => m.id === (formData.llm || defaultModel)
                  )?.description || ""}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature || 0.7}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    temperature: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.0 (Deterministic)</span>
                <span>{formData.temperature || 0.7}</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                value={formData.timeout_seconds || 600}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    timeout_seconds: parseInt(e.target.value),
                  })
                }
                className="input"
                min="60"
                max="3600"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="use_tool_retriever"
                checked={formData.use_tool_retriever || false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    use_tool_retriever: e.target.checked,
                  })
                }
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label
                htmlFor="use_tool_retriever"
                className="ml-2 text-sm text-gray-700"
              >
                Use tool retriever for intelligent tool selection
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Current Configuration Display */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Current Configuration</h3>
          <p className="card-description">
            View the current system configuration
          </p>
        </div>
        <div className="card-content">
          <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
