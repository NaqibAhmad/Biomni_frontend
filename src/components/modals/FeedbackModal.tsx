import { X } from "lucide-react";
import { FeedbackForm } from "../feedback/FeedbackForm";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  outputId: string;
  prompt: string; // User's prompt/query
  response: string; // AI response being rated
  sessionId?: string;
}

export function FeedbackModal({
  isOpen,
  onClose,
  outputId,
  prompt,
  response,
  sessionId,
}: FeedbackModalProps) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Content */}
          <div className="p-6">
            <FeedbackForm
              outputId={outputId}
              prompt={prompt}
              response={response}
              sessionId={sessionId}
              onSubmitSuccess={handleSuccess}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
