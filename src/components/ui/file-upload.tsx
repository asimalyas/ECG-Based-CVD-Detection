import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { MedicalButton } from './medical-button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  helperText?: string;
  error?: string;
  currentFile?: File | null;
  showPreview?: boolean;
}

export function FileUpload({ 
  onFileSelect, 
  onFileRemove,
  accept = '.csv,.edf',
  maxSizeMB = 10,
  label,
  helperText = 'Accepted formats: CSV, EDF',
  error,
  currentFile,
  showPreview = false
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Generate preview for image files
  useEffect(() => {
    if (currentFile && showPreview) {
      const isImage = currentFile.type.startsWith('image/');
      if (isImage) {
        const objectUrl = URL.createObjectURL(currentFile);
        setPreviewUrl(objectUrl);
        
        // Cleanup
        return () => URL.revokeObjectURL(objectUrl);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [currentFile, showPreview]);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const validateFile = (file: File): string | null => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }
    
    // Check if we're accepting images
    const acceptsImages = accept.includes('.png') || accept.includes('.jpg') || accept.includes('.jpeg');
    
    if (acceptsImages && file.type.startsWith('image/')) {
      const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validImageTypes.includes(file.type)) {
        return 'Invalid image format. Please upload PNG or JPG files only.';
      }
      return null; // Valid image
    }
    
    // For non-image files, check extension
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!acceptedTypes.includes(fileExtension)) {
      return `Invalid file format. Accepted formats: ${accept}`;
    }
    
    return null;
  };
  
  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    
    setUploadError(null);
    onFileSelect(file);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };
  
  const handleRemove = () => {
    setUploadError(null);
    onFileRemove?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const displayError = error || uploadError;
  const isImageFile = currentFile && currentFile.type.startsWith('image/');
  
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-2 text-[var(--text-color)]">
          {label}
        </label>
      )}
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8
          transition-all duration-200
          text-[var(--text-color)]
          ${isDragging 
            ? 'border-[var(--primary-color)] bg-[var(--primary-color)] bg-opacity-5' 
            : displayError
              ? 'border-[var(--error-color)] bg-[var(--error-color)] bg-opacity-5'
              : currentFile
                ? 'border-[var(--success-color)] bg-[var(--success-color)] bg-opacity-5'
                : 'border-[var(--border-color)] bg-[var(--bg-light)]'
          }
        `}
      >
        {currentFile ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[var(--success-color)] bg-opacity-10 rounded-lg">
                  {isImageFile ? (
                    <ImageIcon className="w-6 h-6 text-[var(--success-color)]" />
                  ) : (
                    <FileText className="w-6 h-6 text-[var(--success-color)]" />
                  )}
                </div>
                <div>
                  <p className="text-[var(--text-color)]">{currentFile.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemove}
                className="p-2 rounded-full hover:bg-[var(--error-color)] hover:bg-opacity-10 transition-colors"
              >
                <X className="w-5 h-5 text-[var(--error-color)]" />
              </button>
            </div>
            
            {/* Image Preview */}
            {previewUrl && isImageFile && (
              <div className="mt-4 p-2 bg-white dark:bg-gray-900 rounded-lg border border-[var(--border-color)] dark:border-gray-700">
                <p className="text-sm text-[var(--text-secondary)] mb-2">Preview:</p>
                <img 
                  src={previewUrl} 
                  alt="ECG Preview" 
                  className="w-full h-auto max-h-64 object-contain rounded"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`
                p-4 rounded-full
                ${displayError 
                  ? 'bg-[var(--error-color)] bg-opacity-10' 
                  : 'bg-[var(--primary-color)] bg-opacity-10'
                }
              `}>
                <Upload className={`
                  w-8 h-8
                  ${displayError ? 'text-[var(--error-color)]' : 'text-[var(--primary-color)]'}
                `} />
              </div>
            </div>
            
            <p className="mb-2 text-[var(--text-color)]">
              Drag and drop your file here
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-4">or</p>
            
            <MedicalButton
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Browse Files
            </MedicalButton>
            
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        )}
      </div>
      
      {displayError && (
        <div className="flex items-center gap-2 mt-2 text-[var(--error-color)]">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{displayError}</span>
        </div>
      )}
      
      {helperText && !displayError && (
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          {helperText}
        </p>
      )}
    </div>
  );
}

interface ProgressBarProps {
  progress: number;
  label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--text-color)]">{label}</span>
          <span className="text-sm text-[var(--text-secondary)]">{progress}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-[var(--bg-gray)] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[var(--primary-color)] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
