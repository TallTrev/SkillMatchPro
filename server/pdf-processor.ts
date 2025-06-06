import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
// Dynamic import to avoid initialization issues
let pdfParse: any;
import tesseract from "node-tesseract-ocr";
import { storage } from "./storage";
import { generateSummary } from "./openai";

interface ExtractedText {
  text: string;
  page: number;
  context: string;
}

// Define interface for DocumentCriteria received by processExtraction
interface ProcessDocumentCriteria {
  id?: number; // Document ID
  name: string; // Document alias (though we removed the field, the structure might still exist if not fully cleaned)
  keywords: string; // Keywords for this document
  fileName: string; // Original file name
}

export async function processExtraction(extractionId: number, documentIds?: number[], documentCriteria?: ProcessDocumentCriteria[]): Promise<void> {
  try {
    console.log(`Starting extraction process for ID: ${extractionId}`);
    console.log('Document IDs received in processExtraction:', documentIds);
    console.log('Document Criteria received in processExtraction:', documentCriteria); // Log document criteria
    
    // Update status to processing
    await storage.updateExtractionStatus(extractionId, "processing");

    // Get extraction details
    const extraction = await storage.getExtraction(extractionId);
    if (!extraction) {
      throw new Error("Extraction not found");
    }

    const extractedTexts: ExtractedText[] = [];

    // Determine which documents to process based on documentIds
    const documentsToProcess = extraction.extractionDocuments.filter(extDoc => 
        documentIds && documentIds.length > 0 
            ? documentIds.map(id => Number(id)).includes(extDoc.document.id)
            : true // If no specific documentIds are provided (e.g., scope is 'all'), process all linked documents
    );

    console.log(`Processing ${documentsToProcess.length} selected documents for extraction ID: ${extractionId}`);
    console.log('Document IDs provided for filtering (after conversion):', documentIds?.map(id => Number(id)));

    for (const extDoc of documentsToProcess) {
      const document = extDoc.document;
      console.log(`Processing document: ${document.name} (ID: ${document.id})`);

      // Find the specific keywords for this document from the provided documentCriteria
      const specificCriteria = documentCriteria?.find(crit => Number(crit.id) === document.id);
      console.log(`Specific criteria found for document ${document.id}:`, specificCriteria); // Log specific criteria
      const documentKeywords = specificCriteria?.keywords.split(",").map(k => k.trim().toLowerCase()).filter(k => k !== '') || [];
      console.log(`Keywords parsed from specific criteria for document ${document.id}:`, documentKeywords); // Log parsed keywords

      if (documentKeywords.length === 0 && extraction.extractionScope === 'per-document') {
          console.log(`Skipping document ${document.name}: No keywords specified for per-document extraction.`);
          continue; // Skip this document if in per-document mode and no keywords are found for it
      }
       // Use global keywords if extraction scope is not per-document or if no specific criteria found (fallback)
      const keywordsForExtraction = extraction.extractionScope === 'per-document' && documentKeywords.length > 0
        ? documentKeywords
        : extraction.keywords.split(",").map(k => k.trim().toLowerCase()).filter(k => k !== '');

      console.log(`Keywords being used for extraction for document ${document.id}:`, keywordsForExtraction); // Log final keywords

      if (keywordsForExtraction.length === 0) {
           console.log(`Skipping document ${document.name}: No keywords available for extraction.`);
          continue; // Skip if no keywords at all (global or specific)
      }

      try {
        // First try to extract text directly
        let text = await extractTextFromPDF(document.originalPath);
        
        // If no text found, try OCR
        if (!text || text.trim().length < 100) {
          console.log(`Document ${document.name} appears to be scanned, running OCR...`);
          text = await performOCR(document.originalPath);
        }

        // Extract relevant text based on keywords specific to this document (or global if not per-document)
        // Pass the determined keywordsForExtraction to extractRelevantText
        const relevantTexts = extractRelevantText(text, keywordsForExtraction, extraction);
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
  if (!pdfParse) {
    pdfParse = (await import("pdf-parse")).default;
  }
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

  // Split the text by lines
  const lines = text.split('\n');
  let sections: string[] = [];
  let currentSectionLines: string[] = [];

  // Function to determine if a line is the start of a new major section
  const isMajorSectionStart = (line: string): boolean => {
    const trimmedLine = line.trim();
    // Prioritize lines that look like "Section X:"
    if (trimmedLine.match(/^Section \d+:/i)) {
        return true;
    }
     // Also consider lines that are all uppercase with at least 3 words as potential major headings
    if (trimmedLine.length > 0 && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.split(' ').length >= 3) {
        return true;
    }
    return false;
  };

  // First pass: Split the text into potential sections based on major section starts and significant breaks
  for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const prevLine = lines[i - 1];
      const lineBeforePrev = lines[i - 2];

      // Check for major section start or a strong paragraph break (two empty lines)
      const isStrongSeparator = isMajorSectionStart(line) || 
                               (trimmedLine === '' && prevLine?.trim() === '' && lineBeforePrev?.trim() !== '');

      if (i > 0 && isStrongSeparator) {
          // If a strong separator is detected, push the accumulated lines as a section
          if (currentSectionLines.length > 0) {
              sections.push(currentSectionLines.join('\n').trim());
              currentSectionLines = []; // Start a new section
          }
      }
      
      // Always add the current line to the section being accumulated unless it's an empty line right after a strong separator
      if (!(trimmedLine === '' && i > 0 && isStrongSeparator)){
         currentSectionLines.push(line);
      }
  }

  // Add the last accumulated section
   if (currentSectionLines.length > 0) {
       sections.push(currentSectionLines.join('\n').trim());
   }

  // Second pass: Filter sections based on keywords
  for (const sectionText of sections) {
    if (sectionText) { // Ensure section is not just empty lines
        const lowerSectionText = sectionText.toLowerCase();
        
        // Check if any keyword exists in the entire section text
        const matchedKeywords = keywords.filter(keyword => 
           extraction.caseSensitive 
              ? sectionText.includes(keyword)
              : lowerSectionText.includes(keyword)
        );

        if (matchedKeywords.length > 0) {
           extractedTexts.push({
            text: sectionText,
            page: 0, // Cannot accurately determine page per section this way
            context: `Keywords matched in section: ${matchedKeywords.join(", ")}`, // More specific context
          });
        }
    }
  }

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
  // currentPage.drawText("Extracted Content", {
  //   x: margin,
  //   y: yPosition,
  //   size: 18,
  //   font: boldFont,
  //   color: rgb(0, 0, 0),
  // });
  // yPosition -= 40;

  // Add extraction metadata
  // currentPage.drawText(`Extraction ID: ${extractionId}`, {
  //   x: margin,
  //   y: yPosition,
  //   size: 12,
  //   font,
  //   color: rgb(0.5, 0.5, 0.5),
  // });
  // yPosition -= 20;

  // currentPage.drawText(`Generated: ${new Date().toLocaleString()}`, {
  //   x: margin,
  //   y: yPosition,
  //   size: 12,
  //   font,
  //   color: rgb(0.5, 0.5, 0.5),
  // });
  // yPosition -= 40;

  // Add extracted content
  for (const extractedText of extractedTexts) {
    // Check if we need a new page for the extracted text (adjusting for no header space)
    // A single line of text at size 12 with line height 20 needs about 20 units of vertical space.
    // If yPosition is less than the margin + minimum text height (e.g., 50 + 20 = 70), add a new page.
    if (yPosition < margin + lineHeight) {
      currentPage = pdfDoc.addPage();
      yPosition = 750;
    }

    // Remove context header
    // currentPage.drawText(`Match: ${extractedText.context}`, {
    //   x: margin,
    //   y: yPosition,
    //   size: 10,
    //   font: boldFont,
    //   color: rgb(0.3, 0.3, 0.7),
    // });
    // yPosition -= 15; // Space after context header

    // Split text by newlines and process each line
    const textLines = extractedText.text.split('\n');

    for (const textLine of textLines) {
      // Apply word wrapping to the current line segment
      const words = textLine.split(" ");
      let currentWrappedLine = "";

      for (const word of words) {
        const testLine = currentWrappedLine + (currentWrappedLine ? " " : "") + word;
        const textWidth = font.widthOfTextAtSize(testLine, 12);

        // Check for word wrapping
        if (textWidth > pageWidth - 2 * margin && currentWrappedLine) {
          // Check if we need a new page before drawing a wrapped line
          if (yPosition < 100) {
            currentPage = pdfDoc.addPage();
            yPosition = 750;
             // Redraw context header on new page if desired (optional, for simplicity skipping for now)
            currentPage.drawText(`Match (cont.): ${extractedText.context}`, {
                x: margin,
                y: yPosition - 15, // Adjust position
                size: 10,
                font: boldFont,
                color: rgb(0.3, 0.3, 0.7),
            });
             yPosition -= 30; // Space after continued header
          }

          currentPage.drawText(currentWrappedLine, {
            x: margin,
            y: yPosition,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
          yPosition -= lineHeight;
          currentWrappedLine = word;

           // Check for new page after drawing a wrapped line
            if (yPosition < 100) {
                currentPage = pdfDoc.addPage();
                yPosition = 750;
                // Redraw context header on new page if desired
                currentPage.drawText(`Match (cont.): ${extractedText.context}`, {
                    x: margin,
                    y: yPosition - 15, // Adjust position
                    size: 10,
                    font: boldFont,
                    color: rgb(0.3, 0.3, 0.7),
                });
                 yPosition -= 30; // Space after continued header
            }

        } else {
          currentWrappedLine = testLine;
        }
      }

      // Add remaining text for the current line segment
      if (currentWrappedLine) {
         // Check if we need a new page before drawing the last part of a line segment
         if (yPosition < 100) {
            currentPage = pdfDoc.addPage();
            yPosition = 750;
             // Redraw context header on new page if desired
            currentPage.drawText(`Match (cont.): ${extractedText.context}`, {
                x: margin,
                y: yPosition - 15, // Adjust position
                size: 10,
                font: boldFont,
                color: rgb(0.3, 0.3, 0.7),
            });
             yPosition -= 30; // Space after continued header
         }
        currentPage.drawText(currentWrappedLine, {
          x: margin,
          y: yPosition,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight; // Move down after drawing a line segment

         // Check for new page after drawing the last part of a line segment
        if (yPosition < 100) {
          currentPage = pdfDoc.addPage();
          yPosition = 750;
            // Redraw context header on new page if desired
            currentPage.drawText(`Match (cont.): ${extractedText.context}`, {
                x: margin,
                y: yPosition - 15, // Adjust position
                size: 10,
                font: boldFont,
                color: rgb(0.3, 0.3, 0.7),
            });
             yPosition -= 30; // Space after continued header
        }
      }
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
