import { useState, useEffect } from 'react';
import { Search, Filter, Wrench, Code, BookOpen, Eye, Copy } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { ToolSchema } from '@/types/biomni';
import { copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

export function Tools() {
  const {
    tools,
    toolsByCategory,
    isLoadingTools,
    loadTools,
  } = useAgentStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<ToolSchema | null>(null);

  useEffect(() => {
    if (tools.length === 0) {
      loadTools();
    }
  }, [tools.length, loadTools]);

  const categories = Object.keys(toolsByCategory);
  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.module.includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const handleCopyToolInfo = async (tool: ToolSchema) => {
    const toolInfo = `Tool: ${tool.name}\nDescription: ${tool.description}\nModule: ${tool.module}\nRequired Parameters: ${tool.required_parameters.map(p => p.name).join(', ')}\nOptional Parameters: ${tool.optional_parameters.map(p => p.name).join(', ')}`;
    
    try {
      await copyToClipboard(toolInfo);
      toast.success('Tool information copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy tool information');
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'database': Database,
      'genomics': Code,
      'molecular_biology': Wrench,
      'biochemistry': FlaskConical,
      'cell_biology': Microscope,
      'default': BookOpen,
    };
    
    for (const [key, icon] of Object.entries(icons)) {
      if (category.toLowerCase().includes(key)) {
        return icon;
      }
    }
    return icons.default;
  };

  return (
    <div className="h-full flex">
      {/* Tools List */}
      <div className="w-1/2 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Biomedical Tools</h1>
            <span className="text-sm text-gray-500">{filteredTools.length} tools</span>
          </div>
          
          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input flex-1"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tools List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingTools ? (
            <div className="p-4 text-center text-gray-500">
              Loading tools...
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No tools found matching your criteria
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedTool?.id === tool.id ? 'bg-primary-50 border-r-2 border-primary-500' : ''
                  }`}
                  onClick={() => setSelectedTool(tool)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{tool.name}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {tool.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {tool.module.split('.').pop()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {tool.required_parameters.length} required, {tool.optional_parameters.length} optional
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyToolInfo(tool);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tool Details */}
      <div className="w-1/2 flex flex-col">
        {selectedTool ? (
          <>
            {/* Tool Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedTool.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedTool.module}</p>
                </div>
                <button
                  onClick={() => handleCopyToolInfo(selectedTool)}
                  className="btn btn-outline btn-sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Info
                </button>
              </div>
            </div>

            {/* Tool Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-sm text-gray-700">{selectedTool.description}</p>
              </div>

              {/* Required Parameters */}
              {selectedTool.required_parameters.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Required Parameters</h3>
                  <div className="space-y-2">
                    {selectedTool.required_parameters.map((param) => (
                      <div key={param.name} className="p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">{param.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({param.type})</span>
                          </div>
                        </div>
                        {param.description && (
                          <p className="text-sm text-gray-600 mt-1">{param.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Parameters */}
              {selectedTool.optional_parameters.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Optional Parameters</h3>
                  <div className="space-y-2">
                    {selectedTool.optional_parameters.map((param) => (
                      <div key={param.name} className="p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">{param.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({param.type})</span>
                          </div>
                          {param.default && (
                            <span className="text-xs text-gray-500">Default: {param.default}</span>
                          )}
                        </div>
                        {param.description && (
                          <p className="text-sm text-gray-600 mt-1">{param.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage Example */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Usage Example</h3>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-sm">
                  <div className="text-gray-400"># Import the tool</div>
                  <div>from {selectedTool.module} import {selectedTool.name}</div>
                  <br />
                  <div className="text-gray-400"># Use the tool</div>
                  <div>
                    result = {selectedTool.name}(
                    {selectedTool.required_parameters.map((param, index) => (
                      <span key={param.name}>
                        {index > 0 ? ', ' : ''}{param.name}=value
                      </span>
                    ))}
                    )
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a tool to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Import missing icons
import { Database, FlaskConical, Microscope } from 'lucide-react';
