import fs from 'fs';
import { logger } from '../logger.js';

interface ExtractedSegment {
  text: string;
  pageNumber: number;
  positionData?: string;
  styleData?: string;
}

/**
 * Extract text content from a PDF file
 * Segments are extracted with position and style data for layout preservation
 */
export async function extractPdfContent(filePath: string): Promise<ExtractedSegment[]> {
  try {
    // Dynamic import for pdf2json (CommonJS module)
    const PDFParser = (await import('pdf2json')).default;

    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, true);

      pdfParser.on('pdfParser_dataError', (errData: { parserError: Error }) => {
        logger.error('PDF parsing error:', errData.parserError);
        reject(errData.parserError);
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
        try {
          const segments = extractSegmentsFromPdfData(pdfData);
          resolve(segments);
        } catch (error) {
          reject(error);
        }
      });

      pdfParser.loadPDF(filePath);
    });
  } catch (error) {
    logger.error('Failed to extract PDF content:', error);
    // Fallback: try to read as text
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content
        .split(/\n\n+/)
        .filter((text) => text.trim())
        .map((text) => ({ text: text.trim(), pageNumber: 1 }));
    } catch {
      return [];
    }
  }
}

// PDF2JSON data types
interface PDFData {
  Pages: PDFPage[];
}

interface PDFPage {
  Texts: PDFText[];
  Width: number;
  Height: number;
}

interface PDFText {
  x: number;
  y: number;
  w: number;
  R: Array<{
    T: string;
    S: number;
    TS: [number, number, number, number]; // [fontFaceId, fontSize, bold, italic]
  }>;
}

function extractSegmentsFromPdfData(pdfData: PDFData): ExtractedSegment[] {
  const segments: ExtractedSegment[] = [];
  const pageTexts: Map<number, TextBlock[]> = new Map();

  // First pass: collect all text elements with positions
  pdfData.Pages.forEach((page, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const texts: TextBlock[] = [];

    page.Texts.forEach((textItem) => {
      if (textItem.R && textItem.R.length > 0) {
        const text = decodeURIComponent(textItem.R[0].T);
        if (text.trim()) {
          const [fontFaceId, fontSize, bold, italic] = textItem.R[0].TS;
          texts.push({
            text,
            x: textItem.x,
            y: textItem.y,
            width: textItem.w || 0,
            fontSize: fontSize || 12,
            fontWeight: bold ? 'bold' : 'normal',
            fontStyle: italic ? 'italic' : 'normal',
          });
        }
      }
    });

    pageTexts.set(pageNumber, texts);
  });

  // Second pass: group text blocks into paragraphs/segments
  pageTexts.forEach((texts, pageNumber) => {
    // Sort by Y position (top to bottom), then X (left to right)
    texts.sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) < 0.5) {
        return a.x - b.x;
      }
      return yDiff;
    });

    // Group into lines and paragraphs
    const lines: TextBlock[][] = [];
    let currentLine: TextBlock[] = [];
    let lastY = -1;

    texts.forEach((block) => {
      if (lastY >= 0 && Math.abs(block.y - lastY) > 1) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
        }
      }
      currentLine.push(block);
      lastY = block.y;
    });

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Group lines into paragraphs
    let currentParagraph: string[] = [];
    let paragraphY = 0;
    let paragraphStyle: TextBlock | null = null;

    lines.forEach((line, lineIndex) => {
      const lineText = line.map((b) => b.text).join(' ');
      const lineY = line[0]?.y || 0;

      // Check for paragraph break (large Y gap or empty line)
      const prevLineY = lineIndex > 0 ? lines[lineIndex - 1][0]?.y || 0 : lineY;
      const yGap = lineY - prevLineY;

      if (currentParagraph.length > 0 && yGap > 2) {
        // Save current paragraph
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          segments.push({
            text: paragraphText,
            pageNumber,
            positionData: paragraphStyle ? JSON.stringify({
              x: paragraphStyle.x,
              y: paragraphY,
              width: Math.max(...line.map((b) => b.x + (b.width || 0))) - paragraphStyle.x,
              height: lineY - paragraphY,
            }) : undefined,
            styleData: paragraphStyle ? JSON.stringify({
              fontSize: paragraphStyle.fontSize,
              fontWeight: paragraphStyle.fontWeight,
              fontStyle: paragraphStyle.fontStyle,
              fontFamily: 'Helvetica',
              color: '#000000',
              textAlign: 'left',
              lineHeight: 1.2,
            }) : undefined,
          });
        }
        currentParagraph = [];
        paragraphStyle = null;
      }

      if (currentParagraph.length === 0) {
        paragraphY = lineY;
        paragraphStyle = line[0] || null;
      }

      currentParagraph.push(lineText);
    });

    // Don't forget the last paragraph
    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join(' ').trim();
      if (paragraphText) {
        segments.push({
          text: paragraphText,
          pageNumber,
          positionData: paragraphStyle ? JSON.stringify({
            x: paragraphStyle.x,
            y: paragraphY,
            width: 500,
            height: 20,
          }) : undefined,
          styleData: paragraphStyle ? JSON.stringify({
            fontSize: paragraphStyle.fontSize,
            fontWeight: paragraphStyle.fontWeight,
            fontStyle: paragraphStyle.fontStyle,
            fontFamily: 'Helvetica',
            color: '#000000',
            textAlign: 'left',
            lineHeight: 1.2,
          }) : undefined,
        });
      }
    }
  });

  // If no segments extracted, try simpler approach
  if (segments.length === 0) {
    pdfData.Pages.forEach((page, pageIndex) => {
      const pageTexts: string[] = [];
      page.Texts.forEach((textItem) => {
        if (textItem.R && textItem.R.length > 0) {
          const text = decodeURIComponent(textItem.R[0].T);
          if (text.trim()) {
            pageTexts.push(text);
          }
        }
      });

      if (pageTexts.length > 0) {
        segments.push({
          text: pageTexts.join(' '),
          pageNumber: pageIndex + 1,
        });
      }
    });
  }

  return segments;
}

interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
}

/**
 * Generate a PDF with translated content while preserving layout
 * TODO: Implement full layout preservation with pdf-lib
 */
export async function generateTranslatedPdf(
  originalPath: string,
  segments: Array<{ sourceText: string; targetText: string; positionData?: string; styleData?: string }>,
  outputPath: string
): Promise<void> {
  // This is a placeholder - full implementation would use pdf-lib
  // to recreate the PDF with translated text in original positions
  logger.info(`Generating translated PDF: ${outputPath}`);

  // For now, just copy the original
  fs.copyFileSync(originalPath, outputPath);

  // TODO: Implement proper PDF generation with:
  // 1. Load original PDF with pdf-lib
  // 2. For each page, draw translated text at original positions
  // 3. Adjust font sizes if translated text is longer
  // 4. Preserve images and other elements
  // 5. Save the modified PDF
}
