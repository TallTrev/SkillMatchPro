import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import pdfParse from "pdf-parse";
import tesseract from "node-tesseract-ocr";
import { storage } from "./storage";
import { generateSummary } from "./openai";

interface ExtractedText {
  text: string;
  page: number;
  context: string;
}

export async function processExtraction(extractionId: number): Promise<void> {
  try {
    console.log(`Starting extraction process for ID: ${extractionId}`);
    
    // Update status to processing
    await storage.updateExtractionStatus(extractionId, "processing");

    // Get extraction details
    const extraction = await storage.getExtraction(extractionId);
    if (!extraction) {
      throw new Error("Extraction not found");
    }

    const keywords = extraction.keywords.split(",").map(k => k.trim().toLowerCase());
    const extractedTexts: ExtractedText[] = [];

    // Process each document
    for (const extDoc of extraction.extractionDocuments) {
      const document = extDoc.document;
      console.log(`Processing document: ${document.name}`);

      try {
        // First try to extract text directly
        let text = await extractTextFromPDF(document.originalPath);
        
        // If no text found, try OCR
        if (!text || text.trim().length < 100) {
          console.log(`Document ${document.name} appears to be scanned, running OCR...`);
          text = await performOCR(document.originalPath);
        }

        // Extract relevant text based on keywords
        const relevantTexts = extractRelevantText(text, keywords, extraction);
        extractedTexts.push(...relevantTexts);

      } catch (error) {
        console.error(`Error processing document ${document.name}:`, error);
        // Continue with other documents
      }
    }

    if (extractedTexts.length === 0) {
      throw new Error("No relevant text found matching the specified keywords");
    }

    // Generate new PDF with extracted content
    const pdfPath = await generateExtractedPDF(extractedTexts, extractionId);
    
    // Calculate statistics
    const totalMatches = extractedTexts.length;
    const pdfStats = fs.statSync(pdfPath);
    
    // Save extracted PDF info
    await storage.createExtractedPdf({
      extractionId,
      filePath: pdfPath,
      size: pdfStats.size,
      pageCount: Math.ceil(extractedTexts.length / 10), // Estimate based on content
      matchCount: totalMatches,
    });

    // Generate summary
    const combinedText = extractedTexts.map(et => et.text).join("\n\n");
    const summary = await generateSummary(combinedText);
    
    await storage.createSummary({
      extractionId,
      content: summary.content,
      wordCount: summary.wordCount,
      model: "gpt-4o",
    });

    // Mark as completed
    await storage.completeExtraction(extractionId);
    
    console.log(`Extraction ${extractionId} completed successfully`);

  } catch (error) {
    console.error(`Error processing extraction ${extractionId}:`, error);
    await storage.updateExtractionStatus(
      extractionId, 
      "failed", 
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function performOCR(filePath: string): Promise<string> {
  try {
    const config = {
      lang: "eng",
      oem: 1,
      psm: 3,
    };
    
    const text = await tesseract.recognize(filePath, config);
    return text;
  } catch (error) {
    console.error("OCR failed:", error);
    return "";
  }
}

function extractRelevantText(
  text: string, 
  keywords: string[], 
  extraction: any
): ExtractedText[] {
  const extractedTexts: ExtractedText[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    const matchedKeywords = keywords.filter(keyword => 
      extraction.caseSensitive 
        ? sentence.includes(keyword)
        : lowerSentence.includes(keyword)
    );

    if (matchedKeywords.length > 0) {
      let extractedText = sentence.trim();
      
      // Include context if requested
      if (extraction.includeContext) {
        const contextStart = Math.max(0, index - 1);
        const contextEnd = Math.min(sentences.length - 1, index + 1);
        const contextSentences = sentences.slice(contextStart, contextEnd + 1);
        extractedText = contextSentences.join(". ").trim();
      }

      // Ensure complete sentences if requested
      if (extraction.completeSentences && !extractedText.match(/[.!?]$/)) {
        extractedText += ".";
      }

      extractedTexts.push({
        text: extractedText,
        page: Math.floor(index / 50) + 1, // Estimate page number
        context: `Keywords matched: ${matchedKeywords.join(", ")}`,
      });
    }
  });

  return extractedTexts;
}

async function generateExtractedPDF(
  extractedTexts: ExtractedText[], 
  extractionId: number
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let currentPage = pdfDoc.addPage();
  let yPosition = 750;
  const pageWidth = 550;
  const lineHeight = 20;
  const margin = 50;

  // Add title
  currentPage.drawText("Extracted Content", {
    x: margin,
    y: yPosition,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 40;

  // Add extraction metadata
  currentPage.drawText(`Extraction ID: ${extractionId}`, {
    x: margin,
    y: yPosition,
    size: 12,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  yPosition -= 20;

  currentPage.drawText(`Generated: ${new Date().toLocaleString()}`, {
    x: margin,
    y: yPosition,
    size: 12,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  yPosition -= 40;

  // Add extracted content
  for (const extractedText of extractedTexts) {
    // Check if we need a new page
    if (yPosition < 100) {
      currentPage = pdfDoc.addPage();
      yPosition = 750;
    }

    // Add context header
    currentPage.drawText(`Match: ${extractedText.context}`, {
      x: margin,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.7),
    });
    yPosition -= 15;

    // Wrap and add main text
    const words = extractedText.text.split(" ");
    let currentLine = "";
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const textWidth = font.widthOfTextAtSize(testLine, 12);
      
      if (textWidth > pageWidth - 2 * margin && currentLine) {
        currentPage.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
        currentLine = word;

        // Check for new page
        if (yPosition < 100) {
          currentPage = pdfDoc.addPage();
          yPosition = 750;
        }
      } else {
        currentLine = testLine;
      }
    }

    // Add remaining text
    if (currentLine) {
      currentPage.drawText(currentLine, {
        x: margin,
        y: yPosition,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
    }

    yPosition -= 20; // Add space between extracts
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  const outputDir = path.join(process.cwd(), "outputs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pdfPath = path.join(outputDir, `extracted_${extractionId}.pdf`);
  fs.writeFileSync(pdfPath, pdfBytes);
  
  return pdfPath;
}
