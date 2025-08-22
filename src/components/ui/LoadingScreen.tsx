import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
          <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Biomni
        </h3>
        <p className="text-sm text-gray-600">
          {message}
        </p>
      </div>
    </div>
  );
}
