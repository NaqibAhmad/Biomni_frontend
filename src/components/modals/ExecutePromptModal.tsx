import { useState, useMemo, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import { PromptTemplate } from "@/types/services";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface ExecutePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: PromptTemplate;
}

export function ExecutePromptModal({
  isOpen,
  onClose,
  prompt,
}: ExecutePromptModalProps) {
  const [variables, setVariables] = useState<Record<string, any>>({});
  const navigate = useNavigate();

  // Extract all variables from template (for detection and validation)
  const templateVariables = useMemo(() => {
    if (!prompt.prompt_template) return new Set<string>();
    const variablePattern = /\{([^}]+)\}/g;
    const matches = prompt.prompt_template.matchAll(variablePattern);
    const detected = new Set<string>();
    for (const match of matches) {
      const varName = match[1].trim();
      // Only include valid variable names (no spaces, newlines, or special chars)
      if (
        varName &&
        !varName.includes(" ") &&
        !varName.includes("\n") &&
        !varName.includes("{") &&
        !varName.includes("}")
      ) {
        detected.add(varName);
      }
    }
    return detected;
  }, [prompt.prompt_template]);

  // Create a map of defined variables by name for quick lookup
  const definedVarsMap = useMemo(() => {
    const map = new Map<string, any>();
    (prompt.variables || []).forEach((v: any) => {
      map.set(v.name, v);
    });
    return map;
  }, [prompt.variables]);

  // Build final variables list: defined variables first, then auto-detected for missing ones
  // This ensures no duplicates and prioritizes user-defined variable metadata
  const allVariables = useMemo(() => {
    const result: any[] = [];
    const processed = new Set<string>();

    // First, add all defined variables (these have user-provided metadata)
    (prompt.variables || []).forEach((v: any) => {
      result.push(v);
      processed.add(v.name);
    });

    // Then, add auto-detected variables that aren't already defined
    templateVariables.forEach((varName) => {
      if (!processed.has(varName)) {
        result.push({
          name: varName,
          type: "string",
          description: `Auto-detected from template`,
          required: false,
        });
        processed.add(varName);
      }
    });

    return result;
  }, [prompt.variables, templateVariables]);

  // Count how many are auto-detected (for display)
  const autoDetectedCount = useMemo(() => {
    return allVariables.filter((v) => !definedVarsMap.has(v.name)).length;
  }, [allVariables, definedVarsMap]);

  // Reset variables when modal opens/closes or prompt changes
  useEffect(() => {
    if (isOpen) {
      // Reset variables when modal opens
      setVariables({});
    }
  }, [isOpen, prompt.id]);

  if (!isOpen) return null;

  const handleSendToChat = () => {
    // Render the prompt with variables (client-side)
    let renderedPrompt = prompt.prompt_template;

    // Replace all occurrences of each variable
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        // Escape special regex characters in variable name for safe replacement
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Replace ALL occurrences of {variable_name} with the value
        const regex = new RegExp(`\\{${escapedKey}\\}`, "g");
        renderedPrompt = renderedPrompt.replace(regex, String(value));
      }
    });

    // Check if any placeholders remain
    const remainingPlaceholders = renderedPrompt.match(/\{([^}]+)\}/g);
    if (remainingPlaceholders && remainingPlaceholders.length > 0) {
      toast.error(
        `Please fill in all variables: ${remainingPlaceholders.join(", ")}`
      );
      return;
    }

    // Navigate to chat with the rendered prompt
    navigate("/chat", {
      state: {
        initialMessage: renderedPrompt,
        promptTitle: prompt.title,
      },
    });

    // Close the modal
    onClose();
    toast.success("Redirecting to chat...");
  };

  const renderInput = (variable: any) => {
    switch (variable.type) {
      case "number":
        return (
          <input
            type="number"
            value={variables[variable.name] || ""}
            onChange={(e) =>
              setVariables({ ...variables, [variable.name]: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder={variable.description}
            required={variable.required}
          />
        );
      case "boolean":
        return (
          <select
            value={variables[variable.name] || ""}
            onChange={(e) =>
              setVariables({
                ...variables,
                [variable.name]: e.target.value === "true",
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={variable.required}
          >
            <option value="">Select...</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={variables[variable.name] || ""}
            onChange={(e) =>
              setVariables({ ...variables, [variable.name]: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder={variable.description}
            required={variable.required}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Execute Prompt
              </h2>
              <p className="text-sm text-gray-600 mt-1">{prompt.title}</p>
            </div>

            <div>
              {/* Variables Form */}
              {allVariables && allVariables.length > 0 ? (
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Variables
                    {autoDetectedCount > 0 && (
                      <span className="text-xs text-gray-500 ml-2 font-normal">
                        ({autoDetectedCount} auto-detected)
                      </span>
                    )}
                  </h3>
                  {allVariables.map((variable: any) => {
                    const isAutoDetected = !definedVarsMap.has(variable.name);
                    // Create a friendly label from variable name (convert snake_case to Title Case)
                    const friendlyLabel = variable.name
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l: string) => l.toUpperCase());

                    return (
                      <div key={variable.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {/* Show variable name or friendly label */}
                          {friendlyLabel}
                          {variable.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                          {isAutoDetected && (
                            <span className="text-xs text-blue-600 ml-2 font-normal">
                              (auto-detected)
                            </span>
                          )}
                        </label>
                        {renderInput(variable)}
                        {variable.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {variable.description}
                          </p>
                        )}
                        {/* Show variable name in template format for reference */}
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">
                          Template: {"{"}
                          {variable.name}
                          {"}"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    This prompt has no variables. Click execute to run it.
                  </p>
                </div>
              )}

              {/* Preview */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Prompt Preview{" "}
                  {Object.keys(variables).length > 0 && "(with variables)"}
                </h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {(() => {
                      // Render the prompt template with variable substitution
                      let rendered = prompt.prompt_template;
                      Object.entries(variables).forEach(([key, value]) => {
                        if (
                          value !== null &&
                          value !== undefined &&
                          value !== ""
                        ) {
                          // Escape special regex characters in variable name for safe replacement
                          const escapedKey = key.replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                          );
                          // Replace ALL occurrences of {variable_name} with the value
                          const regex = new RegExp(`\\{${escapedKey}\\}`, "g");
                          rendered = rendered.replace(regex, String(value));
                        }
                      });
                      return rendered;
                    })()}
                  </pre>
                </div>
                {Object.keys(variables).length === 0 &&
                  allVariables &&
                  allVariables.length > 0 && (
                    <p className="text-xs text-yellow-600 mt-2">
                      ⚠️ Fill in the variables above to see the rendered prompt
                    </p>
                  )}
                {Object.keys(variables).length > 0 &&
                  (() => {
                    // Check for unsubstituted variables
                    const template = prompt.prompt_template;
                    const variablePattern = /\{([^}]+)\}/g;
                    const matches = Array.from(
                      template.matchAll(variablePattern)
                    );
                    const unsubstituted = matches
                      .map((m) => m[1].trim())
                      .filter(
                        (name) => !variables[name] || variables[name] === ""
                      );

                    if (unsubstituted.length > 0) {
                      return (
                        <p className="text-xs text-red-600 mt-2">
                          ⚠️ Warning: Variables not filled:{" "}
                          {unsubstituted.join(", ")}
                        </p>
                      );
                    }
                    return null;
                  })()}
              </div>

              {/* Info message */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  💬 Fill in the variables below, then click "Send to Chat" to
                  execute this prompt in the chat window where you can see the
                  full execution with tools and streaming.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="btn btn-outline">
                  Cancel
                </button>
                <button
                  onClick={handleSendToChat}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Send to Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
