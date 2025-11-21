/**
 * Login Page
 * 
 * Combines login and signup forms with tab switching.
 */

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated, loading } = useAuth();

  // Redirect to chat if already authenticated
  if (isAuthenticated && !loading) {
    return <Navigate to="/chat" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            MyBioAI
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Biomedical AI Research Assistant
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              isLogin
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              !isLogin
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {isLogin ? (
            <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
          ) : (
            <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>

        {/* Additional Info */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;

