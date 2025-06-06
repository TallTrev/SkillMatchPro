import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertExtractionSchema, insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { processExtraction } from "./pdf-processor";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload PDF documents
  app.post("/api/documents", upload.array("pdfs", 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const documents = [];
      for (const file of req.files) {
        const document = await storage.createDocument({
          name: file.originalname,
          originalPath: file.path,
          size: file.size,
          mimeType: file.mimetype,
        });
        documents.push(document);
      }

      res.json({ documents });
    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ message: "Failed to upload documents" });
    }
  });

  // Create extraction job
  app.post("/api/extractions", async (req, res) => {
    try {
      const data = insertExtractionSchema.parse(req.body);
      const { documentIds, documentCriteria, ...extractionData } = req.body;

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ message: "Document IDs are required" });
      }

      // Create extraction
      const extraction = await storage.createExtraction(extractionData);

      // Link documents to extraction
      for (const documentId of documentIds) {
        await storage.linkDocumentToExtraction(extraction.id, documentId);
      }

      // Start background processing
      processExtraction(extraction.id, documentIds, documentCriteria).catch(console.error);

      res.json({ extraction });
    } catch (error) {
      console.error("Error creating extraction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create extraction" });
    }
  });

  // Get extraction details
  app.get("/api/extractions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid extraction ID" });
      }

      const extraction = await storage.getExtraction(id);
      if (!extraction) {
        return res.status(404).json({ message: "Extraction not found" });
      }

      res.json({ extraction });
    } catch (error) {
      console.error("Error fetching extraction:", error);
      res.status(500).json({ message: "Failed to fetch extraction" });
    }
  });

  // Get all extractions
  app.get("/api/extractions", async (req, res) => {
    try {
      const extractions = await storage.getExtractions();
      res.json({ extractions });
    } catch (error) {
      console.error("Error fetching extractions:", error);
      res.status(500).json({ message: "Failed to fetch extractions" });
    }
  });

  // Download extracted PDF
  app.get("/api/extractions/:id/pdf", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid extraction ID" });
      }

      const extractedPdf = await storage.getExtractedPdf(id);
      if (!extractedPdf) {
        return res.status(404).json({ message: "Extracted PDF not found" });
      }

      if (!fs.existsSync(extractedPdf.filePath)) {
        return res.status(404).json({ message: "PDF file not found on disk" });
      }

      res.download(extractedPdf.filePath, `extracted_content_${id}.pdf`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ message: "Failed to download PDF" });
    }
  });

  // Get summary
  app.get("/api/extractions/:id/summary", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid extraction ID" });
      }

      const summary = await storage.getSummary(id);
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }

      res.json({ summary });
    } catch (error) {
      console.error("Error fetching summary:", error);
      res.status(500).json({ message: "Failed to fetch summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
