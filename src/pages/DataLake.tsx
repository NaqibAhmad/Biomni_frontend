import { useState, useEffect } from 'react';
import { Database, Search, Plus, FileText, Download, Trash2 } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { DataLakeItem } from '@/types/biomni';
import { UploadDataModal } from '@/components/modals/UploadDataModal';

export function DataLake() {
  const {
    dataLake,
    customData,
    isLoadingData,
    loadDataLake,
    removeCustomData,
  } = useAgentStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    if (dataLake.length === 0) {
      loadDataLake();
    }
  }, [dataLake.length, loadDataLake]);

  const allData = [...dataLake, ...customData];
  const filteredData = allData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Lake</h1>
          <p className="text-gray-600">Access biological datasets and resources</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Data
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search datasets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10 w-full max-w-md"
        />
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingData ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Loading datasets...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No datasets found</p>
          </div>
        ) : (
          filteredData.map((item) => (
            <div key={item.name} className="card">
              <div className="card-content">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Download className="w-4 h-4" />
                    </button>
                    {customData.some(d => d.name === item.name) && (
                      <button 
                        onClick={() => removeCustomData(item.name)}
                        className="p-1 text-gray-400 hover:text-error-600"
                        title="Delete custom data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="font-medium text-gray-900 mb-2">{item.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {customData.some(d => d.name === item.name) ? 'Custom' : 'Built-in'}
                  </span>
                  {item.path && (
                    <span className="text-xs text-gray-500 truncate">{item.path}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
