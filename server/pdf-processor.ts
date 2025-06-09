import { Extraction, ExtractedText } from './schema';
import { storage } from './storage';
import { generateSummary } from './gemini';
import { extractTextFromPDF as extractPDFText, performOCR as performDocumentOCR } from './pdf-utils';
import { PDFDocument, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

function extractRelevantText(text: string, keywords: string[], extraction: Extraction): ExtractedText[] {
  const extractedTexts: ExtractedText[] = [];
  const sections = text.split(/(?=Section \d+:)/);
  
  sections.forEach(section => {
    const sectionMatch = section.match(/Section (\d+):\s*([^\n]+)/);
    if (!sectionMatch) return;
    
    const sectionNumber = sectionMatch[1];
    const sectionTitle = sectionMatch[2].trim();
    const sectionText = section.split('\n').slice(1).join('\n').trim();
    
    // Check if the section number matches any of the keywords (after removing "Section ")
    const matchedKeywords = keywords.filter(keyword => {
      const keywordSectionNumber = keyword.replace(/^Section\s+/i, '');
      return sectionNumber === keywordSectionNumber;
    });
    
    if (matchedKeywords.length > 0) {
      // If the section number matches the keyword, add the entire section text
      extractedTexts.push({
        extractionId: extraction.id,
        documentId: extraction.extractionDocuments[0].documentId, // We'll update this when processing each document
        text: sectionText,
        page: parseInt(sectionNumber), // Assuming page number is the same as section number if split this way
        sectionNumber: parseInt(sectionNumber),
        sectionTitle,
        matchedKeywords: matchedKeywords.join(", ")
      });
    }
  });
  
  return extractedTexts;
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

    // Split keywords globally for now (assuming order matches documents)
    const globalKeywords = extraction.keywords
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    console.log('Processing with global keywords:', globalKeywords);
    
    const allExtractedTexts: ExtractedText[] = [];

    // Process each document
    for (let i = 0; i < extraction.extractionDocuments.length; i++) {
      const extDoc = extraction.extractionDocuments[i];
      const document = extDoc.document;
      console.log(`Processing document: ${document.name}`);

      // Get the specific keyword for this document based on order
      const documentKeywords = globalKeywords[i] ? [globalKeywords[i]] : []; // Keep "Section " prefix for now
      console.log(`Using keyword(s) for ${document.name}:`, documentKeywords);

      try {
        // First try to extract text directly
        let text = await extractPDFText(document.originalPath);
        console.log(`Extracted ${text.length} characters from ${document.name}`);
        
        // If no text found, try OCR
        if (!text || text.trim().length < 100) {
          console.log(`Document ${document.name} appears to be scanned, running OCR...`);
          text = await performDocumentOCR(document.originalPath);
          console.log(`OCR extracted ${text.length} characters`);
        }

        // Extract relevant text based on keywords for THIS document
        const relevantTexts = extractRelevantText(text, documentKeywords, extraction);
        console.log(`Found ${relevantTexts.length} relevant text segments for ${document.name}`);

        // Convert extracted texts to database format
        const extractedTexts = relevantTexts.map(et => ({
          extractionId,
          documentId: document.id,
          text: et.text,
          page: et.page,
          sectionNumber: et.sectionNumber,
          sectionTitle: et.sectionTitle,
          matchedKeywords: et.matchedKeywords,
        }));

        // Save extracted texts to database
        if (extractedTexts.length > 0) {
          const savedTexts = await storage.saveExtractedTexts(extractedTexts);
          allExtractedTexts.push(...savedTexts);
        }

      } catch (error) {
        console.error(`Error processing document ${document.name}:`, error);
        // Continue with other documents
      }
    }

    if (allExtractedTexts.length === 0) {
      throw new Error(
        "No relevant text found matching the specified keywords. " +
        "Please check if the keywords are present in the documents. " +
        "Note: Keywords are matched case-insensitively and variations (with/without punctuation) are considered."
      );
    }

    // Generate summary from all extracted texts
    const combinedText = allExtractedTexts.map(et => et.text).join("\n\n");
    const summary = await generateSummary(combinedText);
    
    await storage.createSummary({
      extractionId,
      content: summary.content,
      wordCount: summary.wordCount,
      model: "gemini-1.5-flash",
    });

    // Create a new PDF with the extracted content
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    const fontSize = 12;
    const margin = 50;
    let currentPage = page;
    let y = height - margin;

    // Add main title
    currentPage.drawText(`Extracted Content - ${extraction.name}`, {
      x: margin,
      y,
      size: fontSize + 4,
      color: rgb(0, 0, 0),
    });

    // Add extracted texts with their section titles
    y -= fontSize + 20; // Move down after main title
    for (const extractedText of allExtractedTexts) {
      // Add section title
      if (y < margin) {
        currentPage = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
      }
      currentPage.drawText(`${extractedText.sectionTitle}:`, {
        x: margin,
        y,
        size: fontSize + 2, // Slightly larger font for title
        color: rgb(0, 0, 0),
      });
      y -= fontSize + 2; // Move down after section title

      // Add section text
      const lines = extractedText.text.split('\n');
      for (const line of lines) {
        if (y < margin) {
          currentPage = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
        currentPage.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        y -= fontSize + 4;
      }
      y -= 20; // Add space between extracted segments
    }

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join(process.cwd(), 'uploads', `extracted_${extractionId}.pdf`);
    await fs.promises.writeFile(outputPath, pdfBytes);

    // Save the PDF path to the database
    await storage.createExtractedPdf({
      extractionId,
      filePath: outputPath,
      size: pdfBytes.length,
      pageCount: pdfDoc.getPageCount(),
      matchCount: allExtractedTexts.length
    });

    // Mark as completed
    await storage.completeExtraction(extractionId);
    
    console.log(`Extraction ${extractionId} completed successfully with ${allExtractedTexts.length} text segments`);

  } catch (error) {
    console.error(`Error processing extraction ${extractionId}:`, error);
    await storage.updateExtractionStatus(
      extractionId, 
      "failed", 
      error instanceof Error ? error.message : "Unknown error"
    );
  }
} 