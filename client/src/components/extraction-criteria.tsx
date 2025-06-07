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

// Define interface for extraction criteria data
export interface ExtractionCriteriaData {
  name: string;
  keywords: string;
  extractionScope: "all" | "per-document" | "specific-pages"; // Corrected literal types
  caseSensitive: boolean;
  includeContext: boolean;
  completeSentences: boolean;
  documentIds: number[];
  documentCriteria?: { id?: number; fileName?: string; keywords: string }[];
}

interface ExtractionCriteriaProps {
  uploadedFiles: FileWithId[];
  onExtractionStart: (extractionId: number, criteriaData: ExtractionCriteriaData) => void;
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
  const [extractionScope, setExtractionScope] = useState<"all" | "per-document" | "specific-pages">("per-document"); // Added type to state
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [includeContext, setIncludeContext] = useState(false);
  const [completeSentences, setCompleteSentences] = useState(true);
  const { toast } = useToast();

  const createExtractionMutation = useMutation({
    mutationFn: async (data: ExtractionCriteriaData) => { // Added type for data
      const response = await apiRequest('POST', '/api/extractions', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Extraction started",
        description: "Processing of your documents has begun.",
      });
      // Pass both extractionId and criteriaData
      if (data && data.extraction && data.extraction.id !== undefined) {
        // The criteriaData object is already correctly structured before the mutate call,
        // we just need to pass the same object along with the returned extraction ID.
        // Assuming the mutation function receives and uses `extractionData` correctly.
        // We need to ensure `onSuccess` has access to the `extractionData` used.
        // A common pattern is to pass it as a variable available in the closure.
        // Since extractionData is defined just before mutate, it's available here.
        // However, to be more robust, especially with retries or complex flows,
        // it might be better to structure the mutationFn or onSuccess differently.
        // For this fix, assuming `extractionData` in the outer scope is the correct one.
        // Let's refactor slightly to ensure extractionData is clearly available.

        // Re-evaluate how to access the criteriaData here correctly.
        // The mutate function takes `data`, which is `extractionData` in this case.
        // Let's ensure `onSuccess` can access the input data easily.
        // By default, onSuccess doesn't get the input data unless passed explicitly or inferred.

        // Let's assume the API response `data.extraction` includes the key criteria used for simplicity for now.
        // If not, a more complex state management or passing mechanism would be needed.
        // Given the previous edit attempt, let's stick to passing the defined extractionData.

        // Re-implementing the call with both parameters
         const currentExtractionData: ExtractionCriteriaData = {
           name: extractionName.trim(),
           keywords: extractionScope === "per-document" 
             ? documentCriteria.map(doc => doc.keywords).join(", ")
             : documentCriteria.length > 0 ? documentCriteria[0].keywords : "",
           extractionScope,
           caseSensitive,
           includeContext,
           completeSentences,
           documentIds: data.extraction.documentIds || [], 
           documentCriteria: extractionScope === "per-document" ? documentCriteria : undefined,
         };

        onExtractionStart(data.extraction.id, currentExtractionData);

      } else {
         console.error("Extraction ID not returned in response or response structure unexpected.", data);
         toast({
            title: "Extraction start failed",
            description: "Could not retrieve extraction ID.",
            variant: "destructive",
         });
         // Optionally update status to failed in storage
      }
    },
    onError: (error) => {
      console.error("Error starting extraction:", error);
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

  const updateDocumentCriteria = (index: number, field: keyof DocumentCriteria, value: any) => {
    setDocumentCriteria(prevCriteria => {
      const updated = [...prevCriteria];
      // Create a new object for the updated item to ensure immutability
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      // console.log(`Updated document criteria at index ${index} for field ${String(field)} with value:`, value);
      // console.log('New document criteria state after update:', updated);
      return updated;
    });
  };

  const handleStartExtraction = () => {
    // console.log('Start Extraction button clicked');
    // console.log('Current extraction scope:', extractionScope);
    // console.log('Current document criteria state:', documentCriteria);

    if (!extractionName.trim()) {
      toast({
        title: "Extraction name required",
        description: "Please enter a name for this extraction",
        variant: "destructive",
      });
      return;
    }

    if (extractionScope === "per-document") {
      if (documentCriteria.length === 0) {
        toast({
          title: "Document criteria required",
          description: "Please specify keywords for at least one document",
          variant: "destructive",
        });
        return;
      }
      const emptyKeywords = documentCriteria.filter(doc => !doc.keywords.trim());
      if (emptyKeywords.length > 0) {
        toast({
          title: "Keywords required",
          description: "Please enter keywords for all specified documents",
          variant: "destructive",
        });
        return;
      }
       const missingFiles = documentCriteria.filter(doc => !doc.fileName);
       // console.log('Missing files check result:', missingFiles);
       if (missingFiles.length > 0) {
         toast({
           title: "Missing document selection",
           description: "Please select a file for all document criteria entries",
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

    // Get document IDs based on extraction scope
    const documentIds = extractionScope === "per-document"
      ? documentCriteria
          .map(doc => doc.id)
          .filter(id => id !== undefined) as number[]
      : uploadedFiles
          .map(file => file.id)
          .filter(id => id !== undefined) as number[];

    // console.log('Calculated documentIds to send:', documentIds);

    // Combine all keywords for the extraction
    const allKeywords = extractionScope === "per-document" 
      ? documentCriteria.map(doc => doc.keywords).join(", ")
      : documentCriteria.length > 0 ? documentCriteria[0].keywords : "";

    const extractionData: ExtractionCriteriaData = {
      name: extractionName.trim(),
      keywords: allKeywords.trim(),
      extractionScope,
      caseSensitive,
      includeContext,
      completeSentences,
      documentIds, // Use the correctly filtered/mapped documentIds
      documentCriteria: extractionScope === "per-document" ? documentCriteria : undefined,
    };

    createExtractionMutation.mutate(extractionData);
  };

  const totalPages = uploadedFiles.length * 15; // Estimate
  // Filter uploadedFiles for actual File objects before checking size
  const ocrRequired = uploadedFiles.filter(f => f instanceof File && f.size > 1024 * 1024).length; // Rough heuristic
  const estimatedTime = Math.ceil(uploadedFiles.length * 0.5 + ocrRequired * 1.5);

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-900">Extraction Criteria</CardTitle>
          <p className="text-slate-600">Specify what text content to extract from your PDFs.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium text-slate-900 mb-2">Extraction Name</Label>
              <Input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter a name for this extraction"
                value={extractionName}
                onChange={(e) => setExtractionName(e.target.value)}
              />
            </div>

            <div>
              <Label className="block text-sm font-medium text-slate-900 mb-2">Extraction Scope</Label>
              <Select value={extractionScope} onValueChange={(value: "all" | "per-document" | "specific-pages") => setExtractionScope(value)}>
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
          </div>

          {extractionScope === "per-document" && (
            <div>
              <div className="flex items-center justify-start mb-3">
                
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
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                                // console.log('Document selected:', value);
                                const selectedFile = uploadedFiles.find(f => f.name === value);
                                // console.log('Selected file object:', selectedFile);
                                updateDocumentCriteria(index, 'fileName', value);
                                // Ensure the id is stored as a number
                                updateDocumentCriteria(index, 'id', selectedFile?.id as number);
                                updateDocumentCriteria(index, 'name', selectedFile?.name.replace('.pdf', '') || '');
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a document" />
                              </SelectTrigger>
                              <SelectContent>
                                {uploadedFiles.map(file => (
                                  <SelectItem key={file.id} value={file.name}>
                                    {file.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Keywords (comma-separated)</Label>
                            <Input
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="e.g., skill, experience, qualification"
                              value={doc.keywords}
                              onChange={(e) => updateDocumentCriteria(index, 'keywords', e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-error transition-colors"
                          onClick={() => removeDocumentCriteria(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {extractionScope !== "per-document" && (
            <div>
               <Label className="block text-sm font-medium text-slate-900 mb-2">Keywords (comma-separated)</Label>
                <Input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., skill, experience, qualification"
                  value={documentCriteria.length > 0 ? documentCriteria[0].keywords : ""}
                  onChange={(e) => {
                    // For non-per-document scope, store keywords in the first (and only) document criteria entry
                    if (documentCriteria.length === 0) {
                      setDocumentCriteria([{ name: "All Documents", keywords: e.target.value, fileName: "All", id: uploadedFiles[0]?.id }]); // Capture ID for 'all' scope too
                    } else {
                      updateDocumentCriteria(0, 'keywords', e.target.value);
                    }
                  }}
                />
            </div>
          )}

          {extractionScope === "specific-pages" && (
            <div>
              <Label className="block text-sm font-medium text-slate-900 mb-2">Page Ranges (comma-separated)</Label>
               <Input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., 1-3, 5, 7-10"
                // You would need to add state and logic to handle specific page ranges
                disabled // Functionality not yet implemented
              />
              <p className="text-sm text-slate-500 mt-1">Feature coming soon.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Match Options</h4>
                 <div className="space-y-2">
                   <div className="flex items-center space-x-2">
                      <Checkbox
                         id="caseSensitive"
                         checked={caseSensitive}
                         onCheckedChange={(checked) => setCaseSensitive(!!checked)}
                      />
                      <Label htmlFor="caseSensitive" className="text-sm font-normal text-slate-700">Case insensitive matching</Label>
                   </div>
                    <div className="flex items-center space-x-2">
                       <Checkbox
                         id="includeContext"
                         checked={includeContext}
                         onCheckedChange={(checked) => setIncludeContext(!!checked)}
                       />
                       <Label htmlFor="includeContext" className="text-sm font-normal text-slate-700">Include surrounding context (experimental)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                       <Checkbox
                          id="completeSentences"
                          checked={completeSentences}
                          onCheckedChange={(checked) => setCompleteSentences(!!checked)}
                       />
                       <Label htmlFor="completeSentences" className="text-sm font-normal text-slate-700">Extract complete sentences</Label>
                    </div>
                 </div>
             </div>

            <div className="lg:col-span-2">
              <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-900">Processing Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
