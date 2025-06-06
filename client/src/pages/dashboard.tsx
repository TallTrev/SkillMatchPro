import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Menu, HelpCircle } from "lucide-react";
import RecentActivity from "@/components/recent-activity";

export default function Dashboard() {
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
              <a href="/" className="text-slate-600 hover:text-primary transition-colors">Main Page</a>
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

      {/* Main Content - Only show Recent Activity */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Recent Activity - Always show on Dashboard */}
          <RecentActivity />
        </div>
      </main>

      {/* Footer - Keep for consistency */}
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
