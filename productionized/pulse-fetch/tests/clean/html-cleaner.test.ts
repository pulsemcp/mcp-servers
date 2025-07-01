import { describe, it, expect } from 'vitest';
import { HtmlCleaner } from '../../shared/src/clean/html-cleaner.js';

describe('HtmlCleaner', () => {
  const cleaner = new HtmlCleaner();

  it('should identify as HTML cleaner', () => {
    expect(cleaner.canHandle('text/html')).toBe(true);
    expect(cleaner.canHandle('application/json')).toBe(false);
  });

  it('should convert simple HTML to markdown', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Hello World</h1>
          <p>This is a test paragraph.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </body>
      </html>
    `;

    const result = await cleaner.clean(html, 'https://example.com');
    expect(result).toContain('# Hello World');
    expect(result).toContain('This is a test paragraph.');
    expect(result).toContain('- Item 1');
    expect(result).toContain('- Item 2');
  });

  it('should extract main content and remove navigation', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
          <main>
            <article>
              <h1>Main Article</h1>
              <p>This is the main content we want to extract.</p>
            </article>
          </main>
          <footer>
            <p>Copyright 2024</p>
          </footer>
        </body>
      </html>
    `;

    const result = await cleaner.clean(html, 'https://example.com');
    expect(result).toContain('Main Article');
    expect(result).toContain('This is the main content we want to extract.');
    // Navigation and footer should be removed by extractMainContent
    expect(result).not.toContain('Home');
    expect(result).not.toContain('About');
    expect(result).not.toContain('Copyright 2024');
  });

  it('should handle complex HTML structures', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <article>
            <h1>Complex Article</h1>
            <h2>Section 1</h2>
            <p>First paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
            <blockquote>
              <p>This is a quote.</p>
            </blockquote>
            <h3>Subsection</h3>
            <p>Another paragraph with a <a href="https://example.com">link</a>.</p>
            <pre><code>const code = "example";</code></pre>
          </article>
        </body>
      </html>
    `;

    const result = await cleaner.clean(html, 'https://example.com');
    expect(result).toContain('# Complex Article');
    expect(result).toContain('## Section 1');
    expect(result).toContain('### Subsection');
    expect(result).toContain('**bold**');
    expect(result).toContain('*italic*');
    expect(result).toContain('> This is a quote.');
    expect(result).toContain('[link](https://example.com/)');
    expect(result).toContain('```\nconst code = "example";\n```');
  });

  it('should handle malformed HTML gracefully', async () => {
    const malformedHtml = '<p>Unclosed paragraph <div>Nested without closing';

    const result = await cleaner.clean(malformedHtml, 'https://example.com');
    // Should not throw and should return something
    expect(result).toBeTruthy();
  });

  it('should respect maxLength option', async () => {
    const cleanerWithLimit = new HtmlCleaner({ maxLength: 50 });
    const html =
      '<p>This is a very long paragraph that will definitely exceed our character limit when converted to markdown.</p>';

    const result = await cleanerWithLimit.clean(html, 'https://example.com');
    expect(result).toContain('[Content truncated]');
    // The truncated content should be around 50 chars plus the truncation message
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('should return original content on clean failure', async () => {
    // Pass null to trigger an error
    const result = await cleaner.clean(null as unknown as string, 'https://example.com');
    expect(result).toBe('null'); // null gets converted to string 'null'
  });
});
