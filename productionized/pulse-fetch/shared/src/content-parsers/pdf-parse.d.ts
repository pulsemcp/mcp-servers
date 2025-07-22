declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PDFInfo {
    PDFFormatVersion?: string;
    Title?: string;
    Author?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    [key: string]: unknown;
  }

  interface PDFMeta {
    info?: PDFInfo;
    metadata?: unknown;
    [key: string]: unknown;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: PDFMeta;
    text: string;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>;
  
  export default pdfParse;
}