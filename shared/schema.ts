import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalPath: text("original_path").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const extractions = pgTable("extractions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keywords: text("keywords").notNull(),
  extractionScope: text("extraction_scope").notNull().default("all"),
  caseSensitive: boolean("case_sensitive").notNull().default(false),
  includeContext: boolean("include_context").notNull().default(false),
  completeSentences: boolean("complete_sentences").notNull().default(true),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

export const extractionDocuments = pgTable("extraction_documents", {
  id: serial("id").primaryKey(),
  extractionId: integer("extraction_id").notNull().references(() => extractions.id),
  documentId: integer("document_id").notNull().references(() => documents.id),
});

export const extractedPdfs = pgTable("extracted_pdfs", {
  id: serial("id").primaryKey(),
  extractionId: integer("extraction_id").notNull().references(() => extractions.id),
  filePath: text("file_path").notNull(),
  size: integer("size").notNull(),
  pageCount: integer("page_count").notNull(),
  matchCount: integer("match_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  extractionId: integer("extraction_id").notNull().references(() => extractions.id),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const extractionsRelations = relations(extractions, ({ many, one }) => ({
  extractionDocuments: many(extractionDocuments),
  extractedPdf: one(extractedPdfs),
  summary: one(summaries),
}));

export const documentsRelations = relations(documents, ({ many }) => ({
  extractionDocuments: many(extractionDocuments),
}));

export const extractionDocumentsRelations = relations(extractionDocuments, ({ one }) => ({
  extraction: one(extractions, {
    fields: [extractionDocuments.extractionId],
    references: [extractions.id],
  }),
  document: one(documents, {
    fields: [extractionDocuments.documentId],
    references: [documents.id],
  }),
}));

export const extractedPdfsRelations = relations(extractedPdfs, ({ one }) => ({
  extraction: one(extractions, {
    fields: [extractedPdfs.extractionId],
    references: [extractions.id],
  }),
}));

export const summariesRelations = relations(summaries, ({ one }) => ({
  extraction: one(extractions, {
    fields: [summaries.extractionId],
    references: [extractions.id],
  }),
}));

// Insert schemas
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertExtractionSchema = createInsertSchema(extractions).omit({
  id: true,
  status: true,
  createdAt: true,
  completedAt: true,
  errorMessage: true,
});

export const insertExtractedPdfSchema = createInsertSchema(extractedPdfs).omit({
  id: true,
  createdAt: true,
});

export const insertSummarySchema = createInsertSchema(summaries).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertExtraction = z.infer<typeof insertExtractionSchema>;
export type Extraction = typeof extractions.$inferSelect;

export type InsertExtractedPdf = z.infer<typeof insertExtractedPdfSchema>;
export type ExtractedPdf = typeof extractedPdfs.$inferSelect;

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

export type ExtractionWithDetails = Extraction & {
  extractionDocuments: (typeof extractionDocuments.$inferSelect & {
    document: Document;
  })[];
  extractedPdf?: ExtractedPdf;
  summary?: Summary;
};
