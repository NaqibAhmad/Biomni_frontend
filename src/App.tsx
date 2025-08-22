import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAgentStore } from '@/store/agentStore';
import { biomniAPI } from '@/lib/api';
import toast from 'react-hot-toast';

// Layout components
import { Layout } from '@/components/layout/Layout';
import { Sidebar } from '@/components/layout/Sidebar';

// Page components
import { Dashboard } from '@/pages/Dashboard';
import { Chat } from '@/pages/Chat';
import { Tools } from '@/pages/Tools';
import { DataLake } from '@/pages/DataLake';
import { Configuration } from '@/pages/Configuration';
import { Sessions } from '@/pages/Sessions';
import { Settings } from '@/pages/Settings';

// Components
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function App() {
  const { 
    isInitialized, 
    error, 
    loadConfiguration, 
    setError 
  } = useAgentStore();

  useEffect(() => {
    // Check API availability on app start
    const checkAPI = async () => {
      try {
        const isAvailable = await biomniAPI.isAvailable();
        if (!isAvailable) {
          toast.error('Backend API is not available. Please ensure the Biomni backend is running.');
          setError('Backend API is not available');
        } else {
          // Load configuration if API is available
          await loadConfiguration();
        }
      } catch (error) {
        console.error('Failed to check API availability:', error);
        toast.error('Failed to connect to backend API');
        setError('Failed to connect to backend API');
      }
    };

    checkAPI();
  }, [loadConfiguration, setError]);

  // Show loading screen while checking API
  if (!isInitialized && !error) {
    return <LoadingScreen message="Connecting to Biomni backend..." />;
  }

  // Show error screen if API is not available
  if (error && error.includes('API')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100 mb-4">
              <svg
                className="h-6 w-6 text-error-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Connection Error
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/data" element={<DataLake />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
