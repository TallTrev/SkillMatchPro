import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, FolderOpen, FileText, Check, Eye, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FileWithId extends File {
  id?: number;
}

interface FileUploadProps {
  uploadedFiles: FileWithId[];
  setUploadedFiles: (files: FileWithId[]) => void;
  onUploadComplete: () => void;
}

interface UploadedDocument {
  id: number;
  name: string;
  size: number;
  mimeType: string;
}

interface FileWithStatus {
  originalFile: File;
  id?: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress?: number;
  needsOCR?: boolean;
}

export default function FileUpload({ uploadedFiles, setUploadedFiles, onUploadComplete }: FileUploadProps) {
  const [filesWithStatus, setFilesWithStatus] = useState<FileWithStatus[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation<any, Error, File[], any>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('pdfs', file);
      });

      const response = await apiRequest('POST', '/api/documents', formData);
      return response.json();
    },
    onSuccess: (data: { documents: UploadedDocument[] }, variables: File[]) => {
      const documents: UploadedDocument[] = data.documents;
      console.log('Upload successful, documents:', documents);
      console.log('Original files:', variables);

      // Update file status to completed and store document IDs in local state
      setFilesWithStatus((prevFiles: FileWithStatus[]) => prevFiles.map(fileWithStatus => {
        const doc = documents.find(d => d.name === fileWithStatus.originalFile.name);
        return {
          ...fileWithStatus,
          id: doc?.id,
          status: 'completed' as const,
          progress: 100,
        };
      }));

      // Prepare files with essential properties and IDs to pass to the parent component's state
      const uploadedFilesForParent: FileWithId[] = documents.map(doc => {
        const originalFile = variables.find(file => file.name === doc.name);
        
        // Create a FileWithId object using properties from the server response and original file
        return {
          name: doc.name,
          size: doc.size,
          type: originalFile?.type || doc.mimeType, // Prefer original type, fallback to mimeType from server
          lastModified: originalFile?.lastModified || Date.now(), // Include lastModified from original if available
          id: doc.id,
        } as FileWithId; // Explicitly cast to FileWithId
      });

      setUploadedFiles((prevUploadedFiles: FileWithId[]) => [...prevUploadedFiles, ...uploadedFilesForParent]);

      toast({
        title: "Upload successful",
        description: `${documents.length} documents uploaded successfully`,
      });

      onUploadComplete();
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      setFilesWithStatus(prev => prev.map(file => ({
        ...file,
        status: 'error' as const,
      })));

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload documents",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles = Array.from(newFiles).filter(file => {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a PDF file`,
          variant: "destructive",
        });
        return false;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 50MB limit`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    const newFilesWithStatus: FileWithStatus[] = validFiles.map(file => ({
      originalFile: file, // Store the original file
      status: 'pending',
      needsOCR: false, // Will be determined after upload
    }));

    setFilesWithStatus((prevFiles: FileWithStatus[]) => [...prevFiles, ...newFilesWithStatus]);

    // Start upload immediately
    setFilesWithStatus((prevFiles: FileWithStatus[]) => prevFiles.map(file => 
      validFiles.includes(file.originalFile) 
        ? { ...file, status: 'uploading' as const, progress: 0 }
        : file
    ));

    uploadMutation.mutate(validFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    const newFilesWithStatus = filesWithStatus.filter((_, i) => i !== index);
    setFilesWithStatus(newFilesWithStatus);
    
    // Update the parent component's state with the remaining completed files
    const remainingUploadedFiles: FileWithId[] = newFilesWithStatus
      .filter(f => f.status === 'completed' && f.id !== undefined)
      .map(f => ({
        name: f.originalFile.name,
        size: f.originalFile.size,
        type: f.originalFile.type,
        lastModified: f.originalFile.lastModified,
        id: f.id,
      } as FileWithId)); // Explicitly cast to FileWithId
    setUploadedFiles(remainingUploadedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragOver 
            ? 'border-primary bg-blue-50' 
            : 'border-slate-300 hover:border-primary hover:bg-slate-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="mb-4">
          <CloudUpload className="w-12 h-12 text-slate-400 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Drop your PDF files here</h3>
        <p className="text-slate-500 mb-4">or click to browse and select files</p>
        <Button className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          <FolderOpen className="w-4 h-4 mr-2" />
          Select Files
        </Button>
        <p className="text-sm text-slate-400 mt-4">Supports PDF files up to 50MB each. Text-based and scanned PDFs accepted.</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Uploaded Files List */}
      {filesWithStatus.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">
            Uploaded Files ({filesWithStatus.length})
          </h4>
          <div className="space-y-3">
            {filesWithStatus.map((file, index) => (
              <Card key={index} className="p-4 bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-100 rounded-lg p-2">
                      <FileText className="text-red-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{file.originalFile.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatFileSize(file.originalFile.size)} • {file.needsOCR ? 'Scanned PDF (OCR required)' : 'Text-based PDF'}
                      </p>
                      {file.status === 'uploading' && file.progress !== undefined && (
                        <Progress value={file.progress} className="w-32 mt-1" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.status === 'completed' && (
                      <Badge className="bg-success text-white">
                        <Check className="w-3 h-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                    {file.status === 'uploading' && (
                      <Badge className="bg-warning text-white">
                        Uploading...
                      </Badge>
                    )}
                    {file.status === 'error' && (
                      <Badge variant="destructive">
                        Error
                      </Badge>
                    )}
                    {file.needsOCR && (
                      <Badge className="bg-warning text-white">
                        <Eye className="w-3 h-3 mr-1" />
                        OCR
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-error transition-colors"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
