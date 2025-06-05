import { apiRequest } from "./queryClient";

export interface Document {
  id: number;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface Extraction {
  id: number;
  name: string;
  keywords: string;
  extractionScope: string;
  caseSensitive: boolean;
  includeContext: boolean;
  completeSentences: boolean;
  status: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ExtractedPdf {
  id: number;
  extractionId: number;
  filePath: string;
  size: number;
  pageCount: number;
  matchCount: number;
  createdAt: string;
}

export interface Summary {
  id: number;
  extractionId: number;
  content: string;
  wordCount: number;
  model: string;
  createdAt: string;
}

export interface ExtractionWithDetails extends Extraction {
  extractionDocuments: Array<{
    id: number;
    extractionId: number;
    documentId: number;
    document: Document;
  }>;
  extractedPdf?: ExtractedPdf;
  summary?: Summary;
}

export const api = {
  // Documents
  async uploadDocuments(files: File[]): Promise<{ documents: Document[] }> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('pdfs', file);
    });

    const response = await apiRequest('POST', '/api/documents', formData);
    return response.json();
  },

  // Extractions
  async createExtraction(data: {
    name: string;
    keywords: string;
    extractionScope: string;
    caseSensitive: boolean;
    includeContext: boolean;
    completeSentences: boolean;
    documentIds: number[];
  }): Promise<{ extraction: Extraction }> {
    const response = await apiRequest('POST', '/api/extractions', data);
    return response.json();
  },

  async getExtraction(id: number): Promise<{ extraction: ExtractionWithDetails }> {
    const response = await apiRequest('GET', `/api/extractions/${id}`);
    return response.json();
  },

  async getExtractions(): Promise<{ extractions: ExtractionWithDetails[] }> {
    const response = await apiRequest('GET', '/api/extractions');
    return response.json();
  },

  async downloadExtractedPdf(extractionId: number): Promise<Blob> {
    const response = await apiRequest('GET', `/api/extractions/${extractionId}/pdf`);
    return response.blob();
  },

  async getSummary(extractionId: number): Promise<{ summary: Summary }> {
    const response = await apiRequest('GET', `/api/extractions/${extractionId}/summary`);
    return response.json();
  },
};
