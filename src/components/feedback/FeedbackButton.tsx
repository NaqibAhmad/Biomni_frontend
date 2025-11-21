import { MessageSquarePlus } from "lucide-react";

interface FeedbackButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function FeedbackButton({ onClick, disabled }: FeedbackButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Provide feedback on this response"
    >
      <MessageSquarePlus className="w-4 h-4 mr-2" />
      Give Feedback
    </button>
  );
}

