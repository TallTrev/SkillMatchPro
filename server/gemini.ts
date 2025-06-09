import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface SummaryResult {
  content: string;
  wordCount: number;
}

export async function generateSummary(extractedText: string): Promise<SummaryResult> {
  try {
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text provided for summarization");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Please analyze and summarize the following extracted text content from PDF documents. 

Key requirements:
- Provide a comprehensive yet concise summary that captures the main points and key information
- Focus on the most important findings, data, and insights
- Maintain the context and meaning of the original content
- Structure the summary in clear, readable paragraphs
- Aim for approximately 150-300 words depending on content complexity

Text to summarize:
${extractedText}

Please provide only the summary text without additional commentary.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summaryContent = response.text();
    
    if (!summaryContent) {
      throw new Error("No summary content generated");
    }

    // Count words in the summary
    const wordCount = summaryContent.trim().split(/\s+/).length;

    return {
      content: summaryContent.trim(),
      wordCount: wordCount
    };

  } catch (error) {
    console.error("Error generating summary:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error("Gemini API key not configured. Please set GEMINI_API_KEY environment variable.");
      } else if (error.message.includes('quota') || error.message.includes('billing')) {
        throw new Error("Gemini API quota exceeded. Please check your billing and usage limits.");
      } else if (error.message.includes('rate limit')) {
        throw new Error("Gemini API rate limit exceeded. Please try again later.");
      }
    }
    
    throw new Error("Failed to generate summary: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function generateBatchSummary(textSegments: string[]): Promise<SummaryResult> {
  try {
    if (!textSegments || textSegments.length === 0) {
      throw new Error("No text segments provided for summarization");
    }

    // Combine all segments with clear separation
    const combinedText = textSegments
      .filter(segment => segment && segment.trim().length > 0)
      .map((segment, index) => `Section ${index + 1}:\n${segment}`)
      .join("\n\n---\n\n");

    return await generateSummary(combinedText);

  } catch (error) {
    console.error("Error generating batch summary:", error);
    throw new Error("Failed to generate batch summary: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function analyzeExtractionQuality(
  originalTextLength: number, 
  extractedTextLength: number, 
  keywordCount: number, 
  matchCount: number
): Promise<string> {
  try {
    const extractionRatio = (extractedTextLength / originalTextLength) * 100;
    const matchDensity = matchCount / keywordCount;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze the quality of a PDF text extraction process and provide insights in JSON format:

Extraction Statistics:
- Original text length: ${originalTextLength} characters
- Extracted text length: ${extractedTextLength} characters  
- Extraction ratio: ${extractionRatio.toFixed(2)}%
- Keywords searched: ${keywordCount}
- Matches found: ${matchCount}
- Match density: ${matchDensity.toFixed(2)} matches per keyword

Please provide analysis in this JSON format:
{
  "quality_assessment": "excellent|good|fair|poor",
  "extraction_efficiency": "high|medium|low", 
  "recommendations": ["recommendation1", "recommendation2"],
  "insights": "Brief insight about the extraction effectiveness"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisResult = response.text();
    
    return analysisResult || "{}";

  } catch (error) {
    console.error("Error analyzing extraction quality:", error);
    return JSON.stringify({
      quality_assessment: "unknown",
      extraction_efficiency: "unknown", 
      recommendations: ["Unable to analyze extraction quality"],
      insights: "Analysis failed due to processing error"
    });
  }
} 