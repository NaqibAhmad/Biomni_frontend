import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAgentStore } from "@/store/agentStore";
import { biomniAPI } from "@/lib/api";

// Layout components
import { Layout } from "@/components/layout/Layout";
import { Sidebar } from "@/components/layout/Sidebar";

// Page components
import { Dashboard } from "@/pages/Dashboard";
import { Chat } from "@/pages/Chat";
import { Tools } from "@/pages/Tools";
import { DataLake } from "@/pages/DataLake";
import { Configuration } from "@/pages/Configuration";
import { Settings } from "@/pages/Settings";
import { PromptLibrary } from "@/pages/PromptLibrary";
import Login from "@/pages/Login";

// Components
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function App() {
  const { isInitialized, loadConfiguration } = useAgentStore();

  useEffect(() => {
    // Check API availability on app start (non-blocking, silent)
    const checkAPI = async () => {
      try {
        console.log("Checking backend availability...");
        const isAvailable = await biomniAPI.isAvailable();
        console.log("Backend available:", isAvailable);
        if (isAvailable) {
          // Load configuration if API is available
          console.log("Loading configuration...");
          try {
          await loadConfiguration();
            console.log("Configuration loaded successfully");
          } catch (configError: any) {
            console.warn(
              "Failed to load configuration, but continuing anyway:",
              configError
            );
            // Don't show toast - just log it
          }
        } else {
          // Backend not available - just log it, don't show error
          console.warn(
            "Backend API is not available. Some features may not work."
          );
        }
      } catch (error: any) {
        // Silently handle errors - don't show toasts
        console.warn("Failed to check API availability:", error);
      } finally {
        // Always mark as initialized so the app can load
        // Even if backend is down, user can still see the UI
        useAgentStore.setState({ isInitialized: true });
      }
    };

    checkAPI();
  }, [loadConfiguration]);

  // Show loading screen only briefly while checking API
  if (!isInitialized) {
    return <LoadingScreen message="Loading MyBioAI..." />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Sidebar />
                <main className="flex-1 overflow-hidden">
                  <Dashboard />
                </main>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Layout>
                <Sidebar />
                <main className="flex-1 overflow-hidden">
                  <Chat />
                </main>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tools"
          element={
            <ProtectedRoute>
              <Layout>
                <Sidebar />
                <main className="flex-1 overflow-hidden">
                  <Tools />
                </main>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data"
          element={
            <ProtectedRoute>
              <Layout>
                <Sidebar />
                <main className="flex-1 overflow-hidden">
                  <DataLake />
                </main>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuration"
          element={
            <ProtectedRoute>
              <Layout>
                <Sidebar />
                <main className="flex-1 overflow-hidden">
                  <Configuration />
                </main>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/prompts"
          element={
            <ProtectedRoute>
              <Layout>
                <Sidebar />
                <main className="flex-1 overflow-hidden">
                  <PromptLibrary />
                </main>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Sidebar />
                <main className="flex-1 overflow-hidden">
                  <Settings />
                </main>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
