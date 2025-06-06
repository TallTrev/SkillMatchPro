export interface Extraction {
  id: number;
  name: string;
  status: string; // Allow any string for database compatibility
  keywords: string;
  caseSensitive: boolean;
  extractionDocuments: {
    documentId: number;
    document: {
      id: number;
      name: string;
      originalPath: string;
    };
  }[];
}

export interface ExtractedText {
  id?: number;
  createdAt?: Date;
  extractionId: number;
  documentId: number;
  text: string;
  page: number;
  sectionNumber: number;
  sectionTitle: string;
  matchedKeywords: string;
} 