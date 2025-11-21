import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Loader2,
} from "lucide-react";
import { biomniAPI } from "@/lib/api";
import toast from "react-hot-toast";

export function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // LLM preferences
  const [llmModel, setLlmModel] = useState("claude-sonnet-4-20250514");
  const [llmSource, setLlmSource] = useState("Anthropic");
  const [useToolRetriever, setUseToolRetriever] = useState(true);

  // UI preferences
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState("medium");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await biomniAPI.getUserSettings();
      if (response.data) {
        // Update form fields
        if (response.data.llm_preferences) {
          setLlmModel(
            response.data.llm_preferences.model || "claude-sonnet-4-20250514"
          );
          setLlmSource(response.data.llm_preferences.source || "Anthropic");
        }
        if (response.data.tool_preferences) {
          setUseToolRetriever(
            response.data.tool_preferences.use_tool_retriever ?? true
          );
        }
        if (response.data.ui_preferences) {
          setTheme(response.data.ui_preferences.theme || "light");
          setFontSize(response.data.ui_preferences.font_size || "medium");
        }
      }
    } catch (error: any) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await biomniAPI.updateUserSettings({
        llm_preferences: {
          model: llmModel,
          source: llmSource,
        },
        tool_preferences: {
          use_tool_retriever: useToolRetriever,
        },
        ui_preferences: {
          theme,
          font_size: fontSize,
        },
      });
      toast.success("Settings saved successfully");
      await loadSettings(); // Reload to get updated settings
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "general", name: "General", icon: SettingsIcon },
    { id: "profile", name: "Profile", icon: User },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "security", name: "Security", icon: Shield },
    { id: "appearance", name: "Appearance", icon: Palette },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your application preferences</p>
      </div>

      {/* Settings Content */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary-50 text-primary-700 border-r-2 border-primary-500"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <tab.icon className="w-5 h-5 mr-3" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card">
            <div className="card-content">
              {activeTab === "general" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      General Settings
                    </h3>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || isLoading}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Settings
                        </>
                      )}
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* LLM Preferences */}
                      <div className="border-b pb-4">
                        <h4 className="text-md font-medium text-gray-900 mb-4">
                          LLM Preferences
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Model
                            </label>
                            <select
                              className="input"
                              value={llmModel}
                              onChange={(e) => setLlmModel(e.target.value)}
                            >
                              <option value="claude-sonnet-4-20250514">
                                Claude Sonnet 4
                              </option>
                              <option value="gpt-5">GPT-5</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Source
                            </label>
                            <select
                              className="input"
                              value={llmSource}
                              onChange={(e) => setLlmSource(e.target.value)}
                            >
                              <option value="Anthropic">Anthropic</option>
                              <option value="OpenAI">OpenAI</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Tool Preferences */}
                      <div className="border-b pb-4">
                        <h4 className="text-md font-medium text-gray-900 mb-4">
                          Tool Preferences
                        </h4>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Use Tool Retriever
                            </p>
                            <p className="text-sm text-gray-500">
                              Enable automatic tool selection
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={useToolRetriever}
                            onChange={(e) =>
                              setUseToolRetriever(e.target.checked)
                            }
                            className="rounded border-gray-300 text-primary-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "profile" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Profile Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="input"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Notification Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Email notifications
                        </p>
                        <p className="text-sm text-gray-500">
                          Receive email updates about your research
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Browser notifications
                        </p>
                        <p className="text-sm text-gray-500">
                          Show notifications in your browser
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Security Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <input type="password" className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input type="password" className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input type="password" className="input" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Appearance Settings
                    </h3>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || isLoading}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Settings
                        </>
                      )}
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Theme
                        </label>
                        <select
                          className="input"
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="system">System</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Font Size
                        </label>
                        <select
                          className="input"
                          value={fontSize}
                          onChange={(e) => setFontSize(e.target.value)}
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
