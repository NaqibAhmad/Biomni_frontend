import { useState, useEffect } from "react";
import { biomniAPI } from "@/lib/api";
import { FeedbackSchema, FeedbackSubmission } from "@/types/services";
import toast from "react-hot-toast";

interface FeedbackFormProps {
  outputId: string;
  prompt: string; // User's prompt/query
  response: string; // AI response being rated
  sessionId?: string;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

export function FeedbackForm({
  outputId,
  prompt,
  response,
  sessionId,
  onSubmitSuccess,
  onCancel,
}: FeedbackFormProps) {
  const [schema, setSchema] = useState<FeedbackSchema | null>(null);
  const [formData, setFormData] = useState<Partial<FeedbackSubmission>>({
    output_id: outputId,
    prompt: prompt, // User's prompt/query
    response: response, // AI response being rated
    date: new Date().toISOString().split("T")[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchema();
  }, []);

  const loadSchema = async () => {
    try {
      const response = await biomniAPI.getFeedbackSchema();
      if (response.data) {
        setSchema(response.data);
      }
    } catch (error) {
      console.error("Failed to load feedback schema:", error);
      toast.error("Failed to load feedback form");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await biomniAPI.submitFeedback(
        formData as FeedbackSubmission,
        sessionId
      );
      toast.success(response.message || "Feedback submitted successfully");
      onSubmitSuccess?.();
    } catch (error: any) {
      console.error("Failed to submit feedback:", error);
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxGroupChange = (name: string, value: string) => {
    const currentValues = (formData[name as keyof FeedbackSubmission] ||
      []) as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    handleFieldChange(name, newValues);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="text-center text-gray-600 py-8">
        Failed to load feedback form
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{schema.title}</h2>
        <p className="text-sm text-gray-600 mt-2">
          Help us improve MyBioAI by providing feedback on this response
        </p>
      </div>

      {/* Sections */}
      {schema.sections.map((section) => (
        <div key={section.id} className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {section.title}
          </h3>

          <div className="space-y-4">
            {section.fields.map((field) => {
              switch (field.type) {
                case "text":
                case "date":
                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <input
                        type={field.type}
                        name={field.name}
                        value={
                          (formData[field.name as keyof FeedbackSubmission] as
                            | string
                            | undefined) || ""
                        }
                        onChange={(e) =>
                          handleFieldChange(field.name, e.target.value)
                        }
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  );

                case "textarea":
                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <textarea
                        name={field.name}
                        value={
                          (formData[field.name as keyof FeedbackSubmission] as
                            | string
                            | undefined) || ""
                        }
                        onChange={(e) =>
                          handleFieldChange(field.name, e.target.value)
                        }
                        required={field.required}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  );

                case "radio":
                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <div className="space-y-2">
                        {field.options?.map((option) => (
                          <label
                            key={option}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={field.name}
                              value={option}
                              checked={
                                formData[
                                  field.name as keyof FeedbackSubmission
                                ] === option
                              }
                              onChange={(e) =>
                                handleFieldChange(field.name, e.target.value)
                              }
                              required={field.required}
                              className="text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );

                case "checkbox_group":
                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <div className="space-y-2">
                        {field.options?.map((option) => (
                          <label
                            key={option}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              value={option}
                              checked={(
                                (formData[
                                  field.name as keyof FeedbackSubmission
                                ] || []) as string[]
                              ).includes(option)}
                              onChange={() =>
                                handleCheckboxGroupChange(field.name, option)
                              }
                              className="text-primary-600 focus:ring-primary-500 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                      {field.allow_other &&
                        field.other_field &&
                        (
                          (formData[field.name as keyof FeedbackSubmission] ||
                            []) as string[]
                        ).includes("Other") && (
                          <input
                            type="text"
                            placeholder="Please specify..."
                            value={
                              (formData[
                                field.other_field as keyof FeedbackSubmission
                              ] as string | undefined) || ""
                            }
                            onChange={(e) =>
                              handleFieldChange(
                                field.other_field!,
                                e.target.value
                              )
                            }
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          />
                        )}
                    </div>
                  );

                default:
                  return null;
              }
            })}
          </div>
        </div>
      ))}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            "Submit Feedback"
          )}
        </button>
      </div>
    </form>
  );
}
