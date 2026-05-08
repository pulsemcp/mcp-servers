import type { GoogleDoc, StructuralElement } from '../types.js';

/**
 * Walks the Docs `body.content` tree and emits the plain text of the document
 * by concatenating every `textRun.content` it finds. Drops formatting and
 * structural metadata. Tables are flattened cell-by-cell in row-major order.
 */
export function extractPlainText(doc: GoogleDoc): string {
  const elements = doc.body?.content ?? [];
  return walkStructuralElements(elements).trimEnd();
}

function walkStructuralElements(elements: StructuralElement[]): string {
  let out = '';
  for (const element of elements) {
    if (element.paragraph) {
      const paraElems = element.paragraph.elements ?? [];
      for (const pe of paraElems) {
        if (pe.textRun?.content) {
          out += pe.textRun.content;
        }
      }
    } else if (element.table) {
      const table = element.table as {
        tableRows?: Array<{
          tableCells?: Array<{ content?: StructuralElement[] }>;
        }>;
      };
      for (const row of table.tableRows ?? []) {
        for (const cell of row.tableCells ?? []) {
          out += walkStructuralElements(cell.content ?? []);
        }
      }
    } else if (element.tableOfContents) {
      const toc = element.tableOfContents as { content?: StructuralElement[] };
      out += walkStructuralElements(toc.content ?? []);
    }
  }
  return out;
}

/**
 * Builds a flat list of headings (H1-H6 + TITLE) with their text and level.
 * Useful for quick navigation / outline summaries without dumping the full doc.
 */
export interface HeadingEntry {
  level: number; // 0 for TITLE/SUBTITLE, 1-6 for HEADING_*
  styleType: string;
  text: string;
}

const HEADING_LEVELS: Record<string, number> = {
  TITLE: 0,
  SUBTITLE: 0,
  HEADING_1: 1,
  HEADING_2: 2,
  HEADING_3: 3,
  HEADING_4: 4,
  HEADING_5: 5,
  HEADING_6: 6,
};

export function extractHeadings(doc: GoogleDoc): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  for (const element of doc.body?.content ?? []) {
    const para = element.paragraph;
    if (!para) continue;
    const styleType = para.paragraphStyle?.namedStyleType;
    if (!styleType || !(styleType in HEADING_LEVELS)) continue;

    let text = '';
    for (const pe of para.elements ?? []) {
      if (pe.textRun?.content) text += pe.textRun.content;
    }
    text = text.replace(/\n+$/, '').trim();
    if (text.length === 0) continue;

    headings.push({
      level: HEADING_LEVELS[styleType],
      styleType,
      text,
    });
  }
  return headings;
}

/**
 * Returns the index of the position immediately after the last character of
 * the document body — the canonical insertion point for "append to end".
 *
 * Docs API quirk: the body always ends with a trailing newline element whose
 * endIndex is one past the visible content. Inserting AT endIndex - 1 puts
 * text before that final newline (which is the user-visible end of the doc).
 */
export function getEndOfBodyIndex(doc: GoogleDoc): number {
  const elements = doc.body?.content ?? [];
  let max = 1;
  for (const element of elements) {
    if (typeof element.endIndex === 'number' && element.endIndex > max) {
      max = element.endIndex;
    }
  }
  // The Docs API will reject inserts at the absolute end (the implicit
  // section-break sentinel); subtract 1 to land just before it.
  return Math.max(1, max - 1);
}
