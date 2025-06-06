import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, ExternalLink, Copy, Save, Plus, Share, FileText as FileExport } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExtractionWithDetails } from "@shared/schema";

interface ProcessingResultsProps {
  extractionId: number | null;
  onComplete: () => void;
}

interface ExtractionResponse {
  extraction: ExtractionWithDetails;
}

export default function ProcessingResults({ extractionId, onComplete }: ProcessingResultsProps) {
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const { toast } = useToast();

  const { data: extractionResponse, isLoading } = useQuery<ExtractionResponse, Error>({
    queryKey: [`/api/extractions/${extractionId}`],
    refetchInterval: pollingEnabled ? 2000 : false,
    enabled: extractionId !== null,
  });

  const extraction = extractionResponse?.extraction;

  useEffect(() => {
    if (extraction?.status === 'completed') {
      setPollingEnabled(false);
      onComplete();
      toast({
        title: "Extraction completed",
        description: "Your PDF has been processed and summary generated successfully",
      });
    } else if (extraction?.status === 'failed') {
      setPollingEnabled(false);
      toast({
        title: "Extraction failed",
        description: extraction.errorMessage || "An error occurred during processing",
        variant: "destructive",
      });
    }
  }, [extraction?.status, onComplete, toast]);

  if (isLoading || !extraction) {
    return (
      <Card className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ext = extractionResponse?.extraction;
  const isCompleted = ext?.status === 'completed';
  const isFailed = ext?.status === 'failed';
  const isProcessing = ext?.status === 'processing';

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/extractions/${extractionId}/pdf`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `extracted_content_${extractionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the extracted PDF",
        variant: "destructive",
      });
    }
  };

  const handleCopySummary = async () => {
    if (ext?.summary?.content) {
      try {
        await navigator.clipboard.writeText(ext.summary.content);
        toast({
          title: "Copied to clipboard",
          description: "Summary has been copied to your clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Failed to copy summary to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <Badge className="bg-success text-white px-3 py-1 rounded-full text-sm">
          <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
          Completed
        </Badge>
      );
    } else if (isFailed) {
      return (
        <Badge variant="destructive" className="px-3 py-1 rounded-full text-sm">
          Failed
        </Badge>
      );
    } else if (isProcessing) {
      return (
        <Badge className="bg-warning text-white px-3 py-1 rounded-full text-sm">
          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
          Processing
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-sm">
          Pending
        </Badge>
      );
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold text-slate-900">Processing Results</CardTitle>
            <p className="text-slate-600">
              {isCompleted ? 'Extraction completed successfully' : 
               isFailed ? 'Extraction failed' :
               'Processing your documents...'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            <span className="text-sm text-slate-500">
              {ext.completedAt ? new Date(ext.completedAt).toLocaleString() : 'In progress...'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isFailed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Processing Error</p>
            <p className="text-red-600 text-sm mt-1">{ext.errorMessage}</p>
          </div>
        )}

        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium">Processing in progress...</p>
            <p className="text-blue-600 text-sm mt-1">
              This may take several minutes depending on document size and complexity.
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extracted PDF */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900">Extracted PDF</h4>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleDownloadPDF}
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => window.open(`/api/extractions/${extractionId}/pdf`, '_blank')}
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 mb-4 min-h-[200px] flex items-center justify-center border-2 border-dashed border-slate-300">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <FileExport className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="font-medium text-slate-900">extracted_content_{extractionId}.pdf</p>
                    <p className="text-sm text-slate-500">
                      {ext.extractedPdf?.size ? `${Math.round(ext.extractedPdf.size / 1024)} KB` : '—'} • 
                      {ext.extractedPdf?.pageCount || '—'} pages
                    </p>
                  </div>
                </div>

                <div className="text-sm text-slate-600">
                  <p><strong>Extraction Summary:</strong></p>
                  <ul className="mt-2 space-y-1">
                    <li>• {ext.extractedPdf?.matchCount || 0} keyword matches found</li>
                    <li>• Content extracted from {ext.extractionDocuments?.length || 0} documents</li>
                    <li>• Generated PDF contains {ext.extractedPdf?.pageCount || 0} pages of extracted text</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* AI Summary */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900">AI-Generated Summary</h4>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCopySummary}
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Download as text">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 mb-4 max-h-[200px] overflow-y-auto">
                  <div className="prose prose-sm">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {ext.summary?.content || 'Summary will be generated after extraction completes...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Generated by {ext.summary?.model || 'OpenAI GPT-4'}</span>
                  <span>{ext.summary?.wordCount || 0} words</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        {isCompleted && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center space-x-4">
              <Button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Save className="w-4 h-4 mr-2" />
                Save to Database
              </Button>
              <Button 
                variant="outline" 
                className="bg-slate-100 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Extraction
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" className="text-slate-500 hover:text-slate-700 transition-colors">
                <Share className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button variant="ghost" className="text-slate-500 hover:text-slate-700 transition-colors">
                <FileExport className="w-4 h-4 mr-1" />
                Export All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
