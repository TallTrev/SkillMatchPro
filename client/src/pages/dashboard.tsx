import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Menu, HelpCircle, History } from "lucide-react";
import FileUpload from "@/components/file-upload";
import ExtractionCriteria, { type ExtractionCriteriaData } from "@/components/extraction-criteria";
import ProcessingResults from "@/components/processing-results";
import ProcessSteps from "@/components/process-steps";
import RecentActivity from "@/components/recent-activity";

// Define FileWithId interface
export interface FileWithId extends File {
  id?: number;
}

export default function Dashboard() {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithId[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeExtraction, setActiveExtraction] = useState<number | null>(null);

  // Handle step navigation
  const handleStepClick = (stepId: number) => {
    // Only allow navigating to completed or current steps
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
    }
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
              <a href="#" className="text-slate-600 hover:text-primary transition-colors">Dashboard</a>
              <a href="#" className="text-slate-600 hover:text-primary transition-colors">
                <History className="w-4 h-4 inline mr-1" />
                History
              </a>
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
        {/* Process Steps */}
        <ProcessSteps currentStep={currentStep} onStepClick={handleStepClick} />

        <div className="space-y-8">
          {/* Step 4: Recent Activity (Visible on Step 3 and later)*/}
          {currentStep >= 3 && (
            <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-slate-900">Recent Activity</CardTitle>
                <p className="text-slate-600">Review your past extraction and processing activities.</p>
              </CardHeader>
               <CardContent>
                 <RecentActivity />
               </CardContent>
            </Card>
          )}

          {/* Step 3: Processing Results (Visible on Step 2 and later if active extraction exists)*/}
          {currentStep >= 2 && activeExtraction && (
             <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-slate-900">Processing Results</CardTitle>
                <p className="text-slate-600">View the results of your text extraction and summarization.</p>
              </CardHeader>
              <CardContent>
                <ProcessingResults
                  extractionId={activeExtraction}
                  onComplete={() => setCurrentStep(3)}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Extraction Criteria (Visible on Step 1 and later)*/}
          {currentStep >= 1 && (
            <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-slate-900">Extraction Criteria</CardTitle>
                <p className="text-slate-600">Define the criteria for text extraction from your uploaded documents.</p>
              </CardHeader>
              <CardContent>
                <ExtractionCriteria
                  uploadedFiles={uploadedFiles}
                  onExtractionStart={(extractionId) => {
                    setActiveExtraction(extractionId);
                    setCurrentStep(2);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 1: Upload Section (Visible on Step 0 and later)*/}
          {currentStep >= 0 && (
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
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
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
