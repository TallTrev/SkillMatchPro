import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Play } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ExtractionCriteriaProps {
  uploadedFiles: File[];
  onExtractionStart: (extractionId: number) => void;
}

interface FileWithId extends File {
  id?: number;
}

export default function ExtractionCriteria({ uploadedFiles, onExtractionStart }: ExtractionCriteriaProps) {
  const [keywords, setKeywords] = useState("revenue, profit margins, quarterly results, financial outlook");
  const [extractionScope, setExtractionScope] = useState("all");
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

  const handleStartExtraction = () => {
    if (!keywords.trim()) {
      toast({
        title: "Keywords required",
        description: "Please enter at least one keyword or phrase",
        variant: "destructive",
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: "No files uploaded",
        description: "Please upload at least one PDF document",
        variant: "destructive",
      });
      return;
    }

    // Get document IDs from uploaded files (assuming they have been uploaded)
    const documentIds = (uploadedFiles as FileWithId[])
      .map(file => file.id)
      .filter(id => id !== undefined);

    if (documentIds.length === 0) {
      toast({
        title: "Files not processed",
        description: "Please wait for files to finish uploading",
        variant: "destructive",
      });
      return;
    }

    const extractionData = {
      name: `Extraction ${new Date().toLocaleString()}`,
      keywords: keywords.trim(),
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
            <Label className="block text-sm font-medium text-slate-900 mb-2">Keywords & Phrases</Label>
            <Textarea 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none" 
              rows={4}
              placeholder="Enter keywords separated by commas&#10;e.g., revenue, profit, expenses, budget"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">Use commas to separate multiple keywords or phrases</p>
          </div>

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
                  onCheckedChange={(checked) => setCaseSensitive(!!checked)}
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
