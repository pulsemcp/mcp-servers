import { ExtractClientFactory } from '../../shared/src/extract/index.js';

/**
 * Simple test for extract functionality
 *
 * Run with: LLM_PROVIDER=anthropic LLM_API_KEY=your-key npx tsx tests/manual/extract-simple.test.ts
 */

async function testExtract() {
  // Check for LLM configuration
  const provider = process.env.LLM_PROVIDER;
  const apiKey = process.env.LLM_API_KEY;

  if (!provider || !apiKey) {
    console.error('❌ Please set LLM_PROVIDER and LLM_API_KEY environment variables');
    process.exit(1);
  }

  console.log('🔧 Testing Extract Functionality');
  console.log(`Provider: ${provider}`);
  console.log(`Extract available: ${ExtractClientFactory.isAvailable()}\n`);

  // Create extract client
  const client = ExtractClientFactory.createFromEnv();
  if (!client) {
    console.error('❌ Failed to create extract client');
    process.exit(1);
  }

  // Test HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Python.org</title>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to Python.org</h1>
      </div>
      <div class="download-section">
        <h2>Downloads</h2>
        <p class="version">Latest Python 3 Release - Python 3.12.7</p>
        <p class="release-date">Release Date: Oct. 1, 2024</p>
        <p class="description">Python 3.12.7 is the newest maintenance release of Python 3.12.</p>
      </div>
      <div class="news">
        <h2>Latest News</h2>
        <ul>
          <li>Python 3.13.0 is now available</li>
          <li>Python Software Foundation Board Election Results</li>
          <li>PyCon US 2025 announced</li>
        </ul>
      </div>
    </body>
    </html>
  `;

  // Test cases
  const testCases = [
    {
      name: 'Python Version Info',
      query: 'What is the latest Python version and when was it released?',
    },
    {
      name: 'News Summary',
      query: 'List the latest news items from the page',
    },
    {
      name: 'Page Title',
      query: 'What is the title of this webpage?',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`Query: ${testCase.query}`);
    console.log('---');

    try {
      const startTime = Date.now();
      const result = await client.extract(htmlContent, testCase.query);
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ Success (${duration}ms)`);
        console.log('Response:', result.content);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n✨ Extract functionality test completed!');
}

// Run the test
testExtract().catch(console.error);
