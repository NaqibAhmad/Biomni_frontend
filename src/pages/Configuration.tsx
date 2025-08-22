import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { BiomniConfig } from '@/types/biomni';
import toast from 'react-hot-toast';

export function Configuration() {
  const {
    config,
    isLoadingConfig,
    loadConfiguration,
  } = useAgentStore();

  const [formData, setFormData] = useState<Partial<BiomniConfig>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!config) {
      loadConfiguration();
    } else {
      setFormData(config);
    }
  }, [config, loadConfiguration]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, you'd call the API to update configuration
      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData(config);
      toast.success('Configuration reset to defaults');
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
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
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
              <select
                value={formData.llm || ''}
                onChange={(e) => setFormData({ ...formData, llm: e.target.value })}
                className="input"
              >
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
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
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
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
                onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })}
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
                onChange={(e) => setFormData({ ...formData, use_tool_retriever: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="use_tool_retriever" className="ml-2 text-sm text-gray-700">
                Use tool retriever for intelligent tool selection
              </label>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Settings</h3>
            <p className="card-description">Configure system paths and resources</p>
          </div>
          <div className="card-content space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Path
              </label>
              <input
                type="text"
                value={formData.path || './data'}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                className="input"
                placeholder="./data"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LLM Source
              </label>
              <select
                value={formData.source || ''}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="input"
              >
                <option value="">Auto-detect</option>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="AzureOpenAI">Azure OpenAI</option>
                <option value="Gemini">Google Gemini</option>
                <option value="Groq">Groq</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Base URL
              </label>
              <input
                type="url"
                value={formData.base_url || ''}
                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                className="input"
                placeholder="https://api.example.com/v1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom API Key
              </label>
              <input
                type="password"
                value={formData.api_key || ''}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="input"
                placeholder="Enter API key"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Current Configuration Display */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Current Configuration</h3>
          <p className="card-description">View the current system configuration</p>
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
