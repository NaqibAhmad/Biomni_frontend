import { useState, useRef } from 'react';
import { X, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import toast from 'react-hot-toast';

interface UploadDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  description: string;
}

export function UploadDataModal({ isOpen, onClose }: UploadDataModalProps) {
  const { addCustomData } = useAgentStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInfos, setFileInfos] = useState<FileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    
    const newFileInfos = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      description: ''
    }));
    setFileInfos(newFileInfos);
  };

  const updateFileDescription = (index: number, description: string) => {
    const updatedInfos = [...fileInfos];
    updatedInfos[index].description = description;
    setFileInfos(updatedInfos);
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedInfos = fileInfos.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    setFileInfos(updatedInfos);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('csv') || type.includes('excel') || type.includes('spreadsheet')) {
      return '📊';
    } else if (type.includes('json')) {
      return '📄';
    } else if (type.includes('text') || type.includes('txt')) {
      return '📝';
    } else if (type.includes('image')) {
      return '🖼️';
    } else if (type.includes('pdf')) {
      return '📕';
    } else {
      return '📁';
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    // Validate descriptions
    const missingDescriptions = fileInfos.filter(info => !info.description.trim());
    if (missingDescriptions.length > 0) {
      toast.error('Please provide descriptions for all files');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileInfo = fileInfos[i];
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', fileInfo.description);
        formData.append('name', file.name);

        // Upload file
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://18.212.99.49';
        console.log('Upload API Base URL:', apiBaseUrl);
        console.log('Environment VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
        
        const response = await fetch(`${apiBaseUrl}/api/data/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Add to store
        await addCustomData({
          name: file.name,
          description: fileInfo.description,
          path: result.path || file.name,
          size: file.size,
          type: file.type,
          uploaded_at: new Date().toISOString()
        });

        // Update progress
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      toast.success(`Successfully uploaded ${selectedFiles.length} file(s). You can now reference these datasets in your conversation!`);
      onClose();
      resetForm();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setFileInfos([]);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
      resetForm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Custom Data</h2>
            <p className="text-sm text-gray-600">Add your datasets to the data lake</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Files
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".csv,.json,.txt,.xlsx,.xls,.tsv,.fasta,.fastq,.bam,.sam,.vcf,.bed,.gtf,.gff,.fa,.fna,.faa,.dat,.xml,.yaml,.yml"
                disabled={isUploading}
              />
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-gray-400" />
                <p className="text-sm text-gray-600">
                  Click to select files or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  Supported formats: CSV, JSON, TXT, Excel, FASTA, FASTQ, BAM, SAM, VCF, BED, GTF, GFF, etc.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="btn btn-primary btn-sm"
                >
                  Choose Files
                </button>
              </div>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="space-y-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getFileIcon(file.type)}</span>
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        className="p-1 text-gray-400 hover:text-error-600 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        value={fileInfos[index]?.description || ''}
                        onChange={(e) => updateFileDescription(index, e.target.value)}
                        placeholder="Describe what this dataset contains..."
                        className="input w-full h-20 resize-none"
                        disabled={isUploading}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                <span className="text-sm font-medium text-gray-700">
                  Uploading files... {Math.round(uploadProgress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Upload Guidelines:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Maximum file size: 100MB per file</li>
                  <li>• Supported formats: CSV, JSON, TXT, Excel, FASTA, FASTQ, BAM, SAM, VCF, BED, GTF, GFF</li>
                  <li>• Provide clear descriptions for better dataset discovery</li>
                  <li>• Files will be stored securely and indexed for search</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
            className="btn btn-primary"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
