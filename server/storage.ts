import { 
  documents, 
  extractions, 
  extractionDocuments, 
  extractedPdfs, 
  summaries,
  extractedTexts,
  type Document, 
  type InsertDocument,
  type Extraction,
  type InsertExtraction,
  type ExtractedPdf,
  type InsertExtractedPdf,
  type Summary,
  type InsertSummary,
  type ExtractionWithDetails,
  type ExtractedText,
  type InsertExtractedText
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  
  // Extractions
  createExtraction(extraction: InsertExtraction): Promise<Extraction>;
  getExtraction(id: number): Promise<ExtractionWithDetails | undefined>;
  getExtractions(): Promise<ExtractionWithDetails[]>;
  updateExtractionStatus(id: number, status: string, errorMessage?: string): Promise<void>;
  completeExtraction(id: number): Promise<void>;
  
  // Extraction Documents (linking)
  linkDocumentToExtraction(extractionId: number, documentId: number): Promise<void>;
  
  // Extracted PDFs
  createExtractedPdf(extractedPdf: InsertExtractedPdf): Promise<ExtractedPdf>;
  getExtractedPdf(extractionId: number): Promise<ExtractedPdf | undefined>;
  
  // Summaries
  createSummary(summary: InsertSummary): Promise<Summary>;
  getSummary(extractionId: number): Promise<Summary | undefined>;
  
  // Extracted Texts
  saveExtractedTexts(texts: InsertExtractedText[]): Promise<ExtractedText[]>;
  getExtractedTexts(extractionId: number): Promise<ExtractedText[]>;
  getExtractedTextsByDocument(extractionId: number, documentId: number): Promise<ExtractedText[]>;
}

export class DatabaseStorage implements IStorage {
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createExtraction(insertExtraction: InsertExtraction): Promise<Extraction> {
    const [extraction] = await db
      .insert(extractions)
      .values(insertExtraction)
      .returning();
    return extraction;
  }

  async getExtraction(id: number): Promise<ExtractionWithDetails | undefined> {
    const result = await db.query.extractions.findFirst({
      where: eq(extractions.id, id),
      with: {
        extractionDocuments: {
          with: {
            document: true,
          },
        },
        extractedPdf: true,
        summary: true,
        extractedTexts: true,
      },
    });
    return result ? {
      ...result,
      extractedPdf: result.extractedPdf || undefined,
      summary: result.summary || undefined,
    } : undefined;
  }

  async getExtractions(): Promise<ExtractionWithDetails[]> {
    const result = await db.query.extractions.findMany({
      orderBy: desc(extractions.createdAt),
      with: {
        extractionDocuments: {
          with: {
            document: true,
          },
        },
        extractedPdf: true,
        summary: true,
      },
    });
    return result.map(item => ({
      ...item,
      extractedPdf: item.extractedPdf || undefined,
      summary: item.summary || undefined,
    }));
  }

  async updateExtractionStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(extractions)
      .set({ status, errorMessage })
      .where(eq(extractions.id, id));
  }

  async completeExtraction(id: number): Promise<void> {
    await db
      .update(extractions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(extractions.id, id));
  }

  async linkDocumentToExtraction(extractionId: number, documentId: number): Promise<void> {
    await db
      .insert(extractionDocuments)
      .values({ extractionId, documentId });
  }

  async createExtractedPdf(insertExtractedPdf: InsertExtractedPdf): Promise<ExtractedPdf> {
    const [extractedPdf] = await db
      .insert(extractedPdfs)
      .values(insertExtractedPdf)
      .returning();
    return extractedPdf;
  }

  async getExtractedPdf(extractionId: number): Promise<ExtractedPdf | undefined> {
    const [extractedPdf] = await db
      .select()
      .from(extractedPdfs)
      .where(eq(extractedPdfs.extractionId, extractionId));
    return extractedPdf || undefined;
  }

  async createSummary(insertSummary: InsertSummary): Promise<Summary> {
    const [summary] = await db
      .insert(summaries)
      .values(insertSummary)
      .returning();
    return summary;
  }

  async getSummary(extractionId: number): Promise<Summary | undefined> {
    const [summary] = await db
      .select()
      .from(summaries)
      .where(eq(summaries.extractionId, extractionId));
    return summary || undefined;
  }

  async saveExtractedTexts(texts: InsertExtractedText[]): Promise<ExtractedText[]> {
    return await db
      .insert(extractedTexts)
      .values(texts)
      .returning();
  }

  async getExtractedTexts(extractionId: number): Promise<ExtractedText[]> {
    return await db
      .select()
      .from(extractedTexts)
      .where(eq(extractedTexts.extractionId, extractionId))
      .orderBy(extractedTexts.sectionNumber, extractedTexts.page);
  }

  async getExtractedTextsByDocument(extractionId: number, documentId: number): Promise<ExtractedText[]> {
    return await db
      .select()
      .from(extractedTexts)
      .where(
        and(
          eq(extractedTexts.extractionId, extractionId),
          eq(extractedTexts.documentId, documentId)
        )
      )
      .orderBy(extractedTexts.sectionNumber, extractedTexts.page);
  }
}

export const storage = new DatabaseStorage();
