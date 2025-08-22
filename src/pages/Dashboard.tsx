import { useEffect, useState } from 'react';
import { 
  Activity, 
  Database, 
  Wrench, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  FlaskConical,
  Dna
} from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { biomniAPI } from '@/lib/api';

const quickActions = [
  {
    title: 'Start New Chat',
    description: 'Begin a new research session',
    icon: MessageSquare,
    href: '/chat',
    color: 'bg-blue-500',
  },
  {
    title: 'Browse Tools',
    description: 'Explore available analysis tools',
    icon: Wrench,
    href: '/tools',
    color: 'bg-green-500',
  },
  {
    title: 'Data Lake',
    description: 'Access biological datasets',
    icon: Database,
    href: '/data',
    color: 'bg-purple-500',
  },
  {
    title: 'Configuration',
    description: 'Manage system settings',
    icon: Activity,
    href: '/configuration',
    color: 'bg-orange-500',
  },
];

const exampleQueries = [
  {
    title: 'CRISPR Screen Analysis',
    description: 'Plan a CRISPR screen to identify genes that regulate T cell exhaustion',
    category: 'Molecular Biology',
    icon: Dna,
  },
  {
    title: 'scRNA-seq Annotation',
    description: 'Perform single-cell RNA-seq annotation and generate meaningful hypotheses',
    category: 'Genomics',
    icon: BookOpen,
  },
  {
    title: 'ADMET Prediction',
    description: 'Predict ADMET properties for drug compounds',
    category: 'Pharmacology',
    icon: FlaskConical,
  },
  {
    title: 'Pathway Analysis',
    description: 'Analyze gene expression data for pathway enrichment',
    category: 'Systems Biology',
    icon: TrendingUp,
  },
];

export function Dashboard() {
  const {
    isInitialized,
    isProcessing,
    error,
    config,
    tools,
    dataLake,
    softwareLibrary,
    customTools,
    customData,
    customSoftware,
    loadTools,
    loadDataLake,
    loadSoftwareLibrary,
    loadCustomResources,
  } = useAgentStore();

  const [connectivityStatus, setConnectivityStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connectivityError, setConnectivityError] = useState<string>('');

  useEffect(() => {
    // Test connectivity first
    const testConnectivity = async () => {
      try {
        setConnectivityStatus('checking');
        const isConnected = await biomniAPI.testConnectivity();
        if (isConnected) {
          setConnectivityStatus('connected');
          setConnectivityError('');
        } else {
          setConnectivityStatus('disconnected');
          setConnectivityError('Backend is not reachable');
        }
      } catch (error) {
        setConnectivityStatus('disconnected');
        setConnectivityError(error instanceof Error ? error.message : 'Connection failed');
      }
    };

    testConnectivity();
  }, []);

  useEffect(() => {
    // Load resources if connected and initialized
    if (connectivityStatus === 'connected' && isInitialized) {
      const loadResources = async () => {
        try {
          console.log('Loading dashboard resources...');
          await Promise.all([
            loadTools(),
            loadDataLake(),
            loadSoftwareLibrary(),
            loadCustomResources(),
          ]);
          console.log('Dashboard resources loaded successfully');
        } catch (error) {
          console.error('Failed to load dashboard resources:', error);
        }
      };
      loadResources();
    }
  }, [connectivityStatus, isInitialized, loadTools, loadDataLake, loadSoftwareLibrary, loadCustomResources]);

  const stats = [
    {
      name: 'Available Tools',
      value: tools.length,
      icon: Wrench,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Data Lake Items',
      value: dataLake.length,
      icon: Database,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Software Libraries',
      value: softwareLibrary.length,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      name: 'Custom Resources',
      value: customTools.length + customData.length + customSoftware.length,
      icon: CheckCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  const systemStatus = {
    agent: isInitialized ? 'Online' : 'Offline',
    processing: isProcessing ? 'Active' : 'Idle',
    lastUpdate: new Date().toLocaleTimeString(),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to your Biomni research workspace</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-success-500' : 'bg-error-500'}`}></div>
            <span className="text-sm text-gray-600">
              Agent: {systemStatus.agent}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-warning-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              Status: {systemStatus.processing}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              connectivityStatus === 'connected' ? 'bg-success-500' : 
              connectivityStatus === 'checking' ? 'bg-warning-500' : 'bg-error-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              Backend: {connectivityStatus === 'connected' ? 'Connected' : 
                       connectivityStatus === 'checking' ? 'Checking...' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
            <p className="card-description">Get started with common tasks</p>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <a
                  key={action.title}
                  href={action.href}
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} mr-3`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{action.title}</h4>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Status</h3>
            <p className="card-description">Current system information</p>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Agent Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-success-500' : 'bg-error-500'}`}></div>
                  <span className="text-sm font-medium">{systemStatus.agent}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Processing Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-warning-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm font-medium">{systemStatus.processing}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Update</span>
                <span className="text-sm font-medium">{systemStatus.lastUpdate}</span>
              </div>
              
              {config && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">LLM Model</span>
                  <span className="text-sm font-medium">{config.llm}</span>
                </div>
              )}
              
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 rounded-md">
                  <AlertCircle className="w-4 h-4 text-error-600" />
                  <span className="text-sm text-error-700">{error}</span>
                </div>
              )}
              
              {connectivityError && (
                <div className="flex items-center gap-2 p-3 bg-error-50 rounded-md">
                  <AlertCircle className="w-4 h-4 text-error-600" />
                  <span className="text-sm text-error-700">Backend Error: {connectivityError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Example Queries */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Example Research Queries</h3>
          <p className="card-description">Try these example queries to get started</p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exampleQueries.map((query) => (
              <div
                key={query.title}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => {
                  // Navigate to chat with pre-filled query
                  window.location.href = `/chat?query=${encodeURIComponent(query.description)}`;
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <query.icon className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">{query.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{query.description}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {query.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <p className="card-description">Your latest research sessions</p>
        </div>
        <div className="card-content">
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
            <p className="text-sm">Start a new chat to see your research history here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
