import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { createWorker, type WorkerOptions } from 'tesseract.js';

export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const pdfBytes = await fs.promises.readFile(filePath);
    const data = await pdfParse(pdfBytes);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

export async function performOCR(filePath: string): Promise<string> {
  try {
    const worker = await createWorker({
      logger: m => console.log(m),
      langPath: path.join(process.cwd(), 'tessdata')
    });
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    return text;
  } catch (error) {
    console.error('Error performing OCR:', error);
    return '';
  }
} 