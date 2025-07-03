import { describe, it, expect } from 'vitest';
import { createCleaner } from '../../../shared/src/clean/index.js';

describe('Manual filtering test', () => {
  it('should filter HTML content effectively', async () => {
    // Simulate a complex HTML page with navigation, ads, etc.
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Article</title>
          <meta name="description" content="Test description">
        </head>
        <body>
          <nav class="navigation">
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
          
          <div class="sidebar">
            <div class="ad">Advertisement</div>
            <div class="related">Related articles...</div>
          </div>
          
          <main>
            <article>
              <h1>Important Article Title</h1>
              <p class="byline">By John Doe | January 1, 2024</p>
              
              <p>This is the main content that we want to extract. It contains 
              important information that should be preserved.</p>
              
              <h2>Key Points</h2>
              <ul>
                <li>First important point</li>
                <li>Second important point</li>
                <li>Third important point</li>
              </ul>
              
              <p>More content here with <strong>emphasis</strong> and 
              <a href="https://example.com">links</a>.</p>
              
              <blockquote>
                <p>This is a quote from someone important.</p>
              </blockquote>
            </article>
          </main>
          
          <footer>
            <p>Copyright 2024 | Privacy Policy | Terms of Service</p>
          </footer>
          
          <script>
            // Some JavaScript that should be removed
            console.log("This should not appear in filtered content");
          </script>
        </body>
      </html>
    `;

    const cleaner = createCleaner(htmlContent, 'https://example.com/article');
    const filtered = await cleaner.clean(htmlContent, 'https://example.com/article');

    console.log('Original length:', htmlContent.length);
    console.log('Filtered length:', filtered.length);
    console.log('Reduction:', Math.round((1 - filtered.length / htmlContent.length) * 100) + '%');
    console.log('\nFiltered content:');
    console.log(filtered);

    // Verify main content is preserved
    expect(filtered).toContain('Important Article Title');
    expect(filtered).toContain('This is the main content');
    expect(filtered).toContain('Key Points');
    expect(filtered).toContain('First important point');

    // Verify navigation and footer are removed
    expect(filtered).not.toContain('Home');
    expect(filtered).not.toContain('About');
    expect(filtered).not.toContain('Copyright 2024');
    expect(filtered).not.toContain('console.log');

    // Verify it's much smaller than original
    expect(filtered.length).toBeLessThan(htmlContent.length / 2);
  });
});
