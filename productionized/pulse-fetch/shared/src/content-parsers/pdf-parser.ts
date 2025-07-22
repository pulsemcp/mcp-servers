/**
 * PDF content parser using pdf-parse
 */

import { BaseContentParser, ParsedContent } from './base-parser.js';

export class PDFParser extends BaseContentParser {
  constructor() {
    super(['application/pdf']);
  }

  async parse(data: ArrayBuffer | string, contentType: string): Promise<ParsedContent> {
    if (typeof data === 'string') {
      throw new Error('PDF parser requires ArrayBuffer, not string data');
    }

    try {
      // Import the actual parser module to avoid test code execution
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;

      // Convert ArrayBuffer to Buffer for pdf-parse
      const buffer = Buffer.from(data);

      // Parse the PDF with basic options
      const pdfData = await pdfParse(buffer);

      // Process the extracted text to markdown format
      const markdown = this.convertToMarkdown(pdfData.text, pdfData.numpages);

      return {
        content: markdown,
        metadata: {
          originalType: contentType,
          pageCount: pdfData.numpages,
          info: pdfData.info,
          metadata: pdfData.metadata,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private convertToMarkdown(text: string, pageCount: number): string {
    // Split text into pages if page breaks are detected
    const pageBreakPattern = /\f/g; // Form feed character often used for page breaks
    const pages = text.split(pageBreakPattern);

    // If we have clear page breaks, format with page headers
    if (pages.length > 1 && pages.length <= pageCount) {
      return pages
        .map((pageText, index) => {
          const processed = this.processText(pageText.trim());
          return processed ? `## Page ${index + 1}\n\n${processed}` : '';
        })
        .filter((page) => page)
        .join('\n\n---\n\n');
    }

    // Otherwise, just process the entire text
    return this.processText(text);
  }

  private processText(text: string): string {
    // Split into lines for processing
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);
    const processed: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];

      // Detect potential headers (short lines followed by longer content or blank lines)
      if (
        line.length < 60 &&
        !line.endsWith('.') &&
        !line.endsWith(',') &&
        !line.endsWith(':') &&
        /^[A-Z]/.test(line) && // Starts with capital letter
        (!nextLine || nextLine.length === 0 || nextLine.length > line.length * 1.5)
      ) {
        processed.push(`\n### ${line}\n`);
      }
      // Detect bullet points
      else if (line.match(/^[•·▪▫◦‣⁃]\s+/)) {
        processed.push(`- ${line.substring(2)}`);
      }
      // Detect numbered lists
      else if (line.match(/^(\d+\.|\d+\))\s+/)) {
        processed.push(line);
      }
      // Regular paragraph
      else {
        // Check if this line should be joined with the previous one
        const lastProcessed = processed[processed.length - 1];
        if (
          lastProcessed &&
          !lastProcessed.startsWith('#') &&
          !lastProcessed.startsWith('-') &&
          !lastProcessed.match(/^\d+[.)]\s+/) &&
          !lastProcessed.endsWith('\n') &&
          line.length > 20 && // Not a short standalone line
          !line.match(/^[A-Z].*[.!?]$/)
        ) {
          // Not a complete sentence
          // Join with previous line
          processed[processed.length - 1] = lastProcessed + ' ' + line;
        } else {
          processed.push(line);
        }
      }

      // Add paragraph breaks after sentences that end with period
      if (line.endsWith('.') && nextLine && !nextLine.match(/^[a-z]/)) {
        processed.push('');
      }
    }

    return processed.join('\n').trim();
  }
}
