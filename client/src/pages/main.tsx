import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Menu, HelpCircle } from "lucide-react";
import FileUpload from "@/components/file-upload";
import ExtractionCriteria from "@/components/extraction-criteria";
import ProcessingResults from "@/components/processing-results";
import ProcessSteps from "@/components/process-steps";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ExtractionWithDetails } from "@shared/schema";

// Define FileWithId interface
export interface FileWithId extends File {
  id?: number;
}

interface ExtractionResponse {
  extraction: ExtractionWithDetails;
}

export default function MainPage() {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithId[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeExtractionId, setActiveExtractionId] = useState<number | null>(null);

  const [location] = useLocation();

  // Effect to check for extractionId in the URL on mount or location change
  useEffect(() => {
    console.log('Current location object from useLocation:', location);
    console.log('Current window.location.search string:', window.location.search);

    const params = new URLSearchParams(window.location.search);
    const extractionId = params.get('extractionId');
    console.log('Extraction ID from URL params:', extractionId);

    if (extractionId) {
      console.log('extractionId found in URL:', extractionId);
      // If extractionId is present, set the active extraction ID
      const id = parseInt(extractionId, 10);
      console.log('Parsed extractionId (number):', id);
      setActiveExtractionId(id);
      console.log('activeExtractionId state set to:', id);
      // Do NOT set currentStep here, rendering is based on activeExtractionId
    } else {
      // If no extractionId, reset to the initial state (Step 0)
      console.log('No extractionId found in URL, resetting state.');
      setActiveExtractionId(null);
      setCurrentStep(0);
    }
    // The effect should re-run if the search part of the URL changes
  }, [location.search]); // Depend on location.search to react to URL changes

  // Fetch extraction data when activeExtractionId is set and not null
  const { data: historicalExtractionData, isLoading: isLoadingHistoricalExtraction, isError: isErrorHistoricalExtraction } = useQuery<ExtractionResponse, Error>({
    queryKey: activeExtractionId !== null ? [`/api/extractions/${activeExtractionId}`] : [], // Only create query key if ID exists
    enabled: activeExtractionId !== null, // Only fetch if activeExtractionId is not null
  });

  console.log('Historical Extraction Query Status:', {
    activeExtractionId,
    isLoading: isLoadingHistoricalExtraction,
    isError: isErrorHistoricalExtraction,
    data: historicalExtractionData,
  });

  const historicalExtraction = historicalExtractionData?.extraction;

  // Conditional rendering based on whether viewing a historical extraction
  const renderContent = () => {
    console.log('Rendering content. Current activeExtractionId:', activeExtractionId);

    if (activeExtractionId !== null) {
      // Display historical extraction details or loading/error state
      if (isLoadingHistoricalExtraction) {
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
      } else if (isErrorHistoricalExtraction) {
         return (
           <Card className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200">
             <CardContent className="p-6">
               <p className="text-red-600">Failed to load historical extraction data.</p>
             </CardContent>
           </Card>
         );
      } else if (historicalExtraction) {
        return (
          // Display the fetched historical data
          <div className="space-y-8">
            {/* Display historical Uploaded Documents */}
            <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-slate-900">Uploaded PDF Documents</CardTitle>
              </CardHeader>
              <CardContent>
                 {historicalExtraction.extractionDocuments && historicalExtraction.extractionDocuments.length > 0 ? (
                  <ul>
                    {historicalExtraction.extractionDocuments.map(doc => (
                      <li key={doc.document.id} className="text-slate-700">{doc.document.name}</li>
                    ))}
                  </ul>
                 ) : (
                   <p className="text-slate-500">No documents found for this extraction.</p>
                 )}
              </CardContent>
            </Card>

            {/* Display historical Extraction Criteria */}
             <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-slate-900">Extraction Criteria</CardTitle>
              </CardHeader>
              <CardContent>
                 {historicalExtraction.keywords ? (
                   <p className="text-slate-700">Keywords: {historicalExtraction.keywords}</p>
                 ) : (
                   <p className="text-slate-500">No keywords specified for this extraction.</p>
                 )}
                 {historicalExtraction.extractionScope ? (
                    <p className="text-slate-700">Scope: {historicalExtraction.extractionScope}</p>
                 ) : null}
              </CardContent>
            </Card>

            {/* Display historical Processing Results */}
             <ProcessingResults 
               extractionId={activeExtractionId} 
               onComplete={() => {}} // No action needed on complete for historical view
             />
          </div>
        );
      }
    } else {
      // Display current process steps if no historical extraction is active
      return (
        <>
           {/* Process Steps */}
          <ProcessSteps currentStep={currentStep} />
          
          <div className="space-y-8">
            {/* Step 1: Upload Section */}
            {currentStep === 0 && (
              <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold text-slate-900">Upload PDF Documents</CardTitle>
                  <p className="text-slate-600">Upload one or more PDF files to extract specific text content and generate summaries.</p>
                </CardHeader>
                <CardContent>
                  <FileUpload 
                    uploadedFiles={uploadedFiles}
                    setUploadedFiles={setUploadedFiles}
                    onUploadComplete={() => setCurrentStep(1)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Processing Results */}
            {currentStep >= 2 && (
              <ProcessingResults 
                extractionId={activeExtractionId} // Pass activeExtractionId for new extractions as well
                onComplete={() => setCurrentStep(3)}
              />
            )}

            {/* Step 2: Extraction Criteria */}
            {currentStep === 1 && (
              <ExtractionCriteria 
                uploadedFiles={uploadedFiles}
                onExtractionStart={(extractionId) => {
                  setActiveExtractionId(extractionId);
                  setCurrentStep(2);
                }}
              />
            )}
          </div>
        </>
      );
    }
    return null; // Default return if none of the conditions are met (shouldn't happen with the current logic)
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary rounded-lg p-2">
                <FileText className="text-white text-xl w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">DocExtract</h1>
                <p className="text-sm text-slate-500">PDF Text Extraction & Summarization</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/dashboard" className="text-slate-600 hover:text-primary transition-colors">Dashboard</a>
              <a href="/" className="text-slate-600 hover:text-primary transition-colors">Main</a>
              <a href="#" className="text-slate-600 hover:text-primary transition-colors">
                <HelpCircle className="w-4 h-4 inline mr-1" />
                Help
              </a>
              <Button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <User className="w-4 h-4 mr-2" />
                Account
              </Button>
            </nav>
            <Button variant="ghost" className="md:hidden text-slate-600">
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Render content based on whether viewing historical extraction or new workflow */}
        {renderContent()}
      </main>

      {/* Footer - Keep for consistency */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md::flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="bg-primary rounded-lg p-2">
                <FileText className="text-white w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">DocExtract</p>
                <p className="text-sm text-slate-500">Powered by AI • Secure Processing</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-500">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">API Documentation</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 