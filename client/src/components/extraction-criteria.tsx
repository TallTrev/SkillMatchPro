import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, FileText, X, Plus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileWithId } from "../pages/dashboard"; // Import FileWithId

interface ExtractionCriteriaProps {
  uploadedFiles: FileWithId[];
  onExtractionStart: (extractionId: number) => void;
}

interface DocumentCriteria {
  id?: number;
  name: string;
  keywords: string;
  fileName: string;
}

export default function ExtractionCriteria({ uploadedFiles, onExtractionStart }: ExtractionCriteriaProps) {
  const [extractionName, setExtractionName] = useState(`Extraction ${new Date().toLocaleDateString()}`);
  const [documentCriteria, setDocumentCriteria] = useState<DocumentCriteria[]>([]);
  const [extractionScope, setExtractionScope] = useState("per-document");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [includeContext, setIncludeContext] = useState(false);
  const [completeSentences, setCompleteSentences] = useState(true);
  const { toast } = useToast();

  const createExtractionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/extractions', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Extraction started",
        description: "Your documents are being processed. This may take a few minutes.",
      });
      onExtractionStart(data.extraction.id);
    },
    onError: (error) => {
      toast({
        title: "Failed to start extraction",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Clear document criteria if no files are uploaded
  useEffect(() => {
    if (uploadedFiles.length === 0) {
      setDocumentCriteria([]);
    }
  }, [uploadedFiles]);

  const addDocumentCriteria = () => {
    const newCriteria: DocumentCriteria = {
      name: "",
      keywords: "",
      fileName: "",
    };
    setDocumentCriteria([...documentCriteria, newCriteria]);
  };

  const removeDocumentCriteria = (index: number) => {
    setDocumentCriteria(documentCriteria.filter((_, i) => i !== index));
  };

  const updateDocumentCriteria = (index: number, field: keyof DocumentCriteria, value: string) => {
    const updated = [...documentCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setDocumentCriteria(updated);
  };

  const handleStartExtraction = () => {
    if (!extractionName.trim()) {
      toast({
        title: "Extraction name required",
        description: "Please enter a name for this extraction",
        variant: "destructive",
      });
      return;
    }

    if (extractionScope === "per-document" && documentCriteria.length === 0) {
      toast({
        title: "Document criteria required",
        description: "Please specify keywords for at least one document",
        variant: "destructive",
      });
      return;
    }

    if (extractionScope === "per-document") {
      const emptyKeywords = documentCriteria.filter(doc => !doc.keywords.trim());
      if (emptyKeywords.length > 0) {
        toast({
          title: "Keywords required",
          description: "Please enter keywords for all documents",
          variant: "destructive",
        });
        return;
      }
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: "No files uploaded",
        description: "Please upload at least one PDF document",
        variant: "destructive",
      });
      return;
    }

    // Get document IDs from uploaded files
    const documentIds = uploadedFiles
      .map(file => file.id)
      .filter(id => id !== undefined) as number[];

    // Combine all keywords for the extraction
    const allKeywords = extractionScope === "per-document" 
      ? documentCriteria.map(doc => doc.keywords).join(", ")
      : documentCriteria.length > 0 ? documentCriteria[0].keywords : "";

    const extractionData = {
      name: extractionName.trim(),
      keywords: allKeywords.trim(),
      extractionScope,
      caseSensitive,
      includeContext,
      completeSentences,
      documentIds,
    };

    createExtractionMutation.mutate(extractionData);
  };

  const totalPages = uploadedFiles.length * 15; // Estimate
  const ocrRequired = uploadedFiles.filter(f => f.size > 1024 * 1024).length; // Rough heuristic
  const estimatedTime = Math.ceil(uploadedFiles.length * 0.5 + ocrRequired * 1.5);

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900">Extraction Criteria</CardTitle>
          <p className="text-slate-600 text-sm">Specify what text content to extract from your PDFs.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="block text-sm font-medium text-slate-900 mb-2">Extraction Name</Label>
            <Input
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter a name for this extraction"
              value={extractionName}
              onChange={(e) => setExtractionName(e.target.value)}
            />
          </div>

          {extractionScope === "per-document" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="block text-sm font-medium text-slate-900">Document Keywords</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDocumentCriteria}
                  className="text-primary border-primary hover:bg-blue-50"
                  disabled={uploadedFiles.length === 0}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Document
                </Button>
              </div>
              
              <div className="space-y-4">
                {documentCriteria.map((doc, index) => (
                  <Card key={index} className="border border-slate-200 bg-slate-50">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 rounded-lg p-2 mt-1">
                          <FileText className="text-blue-600 w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Select Document</Label>
                            <Select 
                              value={doc.fileName} 
                              onValueChange={(value) => {
                                const selectedFile = uploadedFiles.find(f => f.name === value);
                                updateDocumentCriteria(index, 'fileName', value);
                                updateDocumentCriteria(index, 'id', (selectedFile as FileWithId)?.id?.toString() || '');
                                updateDocumentCriteria(index, 'name', selectedFile?.name.replace('.pdf', '') || '');
                              }}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Choose a document..." />
                              </SelectTrigger>
                              <SelectContent>
                                {uploadedFiles.map((file, fileIndex) => (
                                  <SelectItem key={fileIndex} value={file.name}>
                                    {file.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {doc.fileName && (
                              <p className="text-xs text-slate-500 mt-1">Selected: {doc.fileName}</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Document Alias (Optional)</Label>
                            <Input
                              className="mt-1"
                              placeholder="Enter custom name for this document"
                              value={doc.name}
                              onChange={(e) => updateDocumentCriteria(index, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Keywords</Label>
                            <Textarea
                              className="mt-1"
                              rows={3}
                              placeholder="Enter keywords separated by commas&#10;e.g., revenue, profit, expenses, budget"
                              value={doc.keywords}
                              onChange={(e) => updateDocumentCriteria(index, 'keywords', e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocumentCriteria(index)}
                          className="text-slate-400 hover:text-red-500 mt-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {uploadedFiles.length === 0 && (
                <div className="text-center py-6 text-slate-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Upload PDF files first to configure document-specific keywords</p>
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="block text-sm font-medium text-slate-900 mb-2">Extraction Scope</Label>
            <Select value={extractionScope} onValueChange={setExtractionScope}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All documents</SelectItem>
                <SelectItem value="per-document">Per document basis</SelectItem>
                <SelectItem value="specific-pages">Specific page ranges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-sm font-medium text-slate-900 mb-3">Match Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="case-sensitive"
                  checked={!caseSensitive}
                  onCheckedChange={(checked) => setCaseSensitive(!checked)}
                />
                <Label htmlFor="case-sensitive" className="text-sm text-slate-700">
                  Case insensitive matching
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-context"
                  checked={includeContext}
                  onCheckedChange={(checked) => setIncludeContext(!!checked)}
                />
                <Label htmlFor="include-context" className="text-sm text-slate-700">
                  Include surrounding context
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="complete-sentences"
                  checked={completeSentences}
                  onCheckedChange={(checked) => setCompleteSentences(!!checked)}
                />
                <Label htmlFor="complete-sentences" className="text-sm text-slate-700">
                  Extract complete sentences
                </Label>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <Button 
              className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              onClick={handleStartExtraction}
              disabled={createExtractionMutation.isPending || uploadedFiles.length === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              {createExtractionMutation.isPending ? 'Starting...' : 'Start Extraction'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Processing Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Documents</span>
              <span className="font-medium text-slate-900">{uploadedFiles.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Pages</span>
              <span className="font-medium text-slate-900">{totalPages}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">OCR Required</span>
              <span className="font-medium text-warning">{ocrRequired} document{ocrRequired !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Est. Processing Time</span>
              <span className="font-medium text-slate-900">{estimatedTime}-{estimatedTime + 1} minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
