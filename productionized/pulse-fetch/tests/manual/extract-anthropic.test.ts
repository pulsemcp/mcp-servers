import { AnthropicExtractClient } from '../../shared/src/extract/index.js';
import type { LLMConfig } from '../../shared/src/extract/index.js';

/**
 * Manual test for Anthropic extract client
 *
 * Run with: LLM_API_KEY=your-anthropic-key npx tsx tests/manual/extract-anthropic.test.ts
 */

async function testAnthropicExtraction() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    console.error('❌ Please set LLM_API_KEY environment variable');
    process.exit(1);
  }

  console.log('🔧 Testing Anthropic Extract Client\n');

  const config: LLMConfig = {
    provider: 'anthropic',
    apiKey,
    model: 'claude-3-5-sonnet-20241022',
  };

  const client = new AnthropicExtractClient(config);

  // Test HTML content
  const htmlContent = `
    <html>
      <head>
        <title>Example Product Page</title>
      </head>
      <body>
        <h1>Premium Wireless Headphones</h1>
        <div class="price">$299.99</div>
        <div class="description">
          <p>Experience crystal-clear audio with our premium wireless headphones.</p>
          <ul>
            <li>Active Noise Cancellation</li>
            <li>40-hour battery life</li>
            <li>Bluetooth 5.3</li>
          </ul>
        </div>
        <div class="availability">In Stock - Ships within 24 hours</div>
        <div class="reviews">
          <span class="rating">4.8/5</span>
          <span class="count">(2,341 reviews)</span>
        </div>
      </body>
    </html>
  `;

  // Test cases
  const testCases = [
    {
      name: 'Product Information',
      query: 'Extract the product name, price, and availability status',
    },
    {
      name: 'Technical Specifications',
      query: 'List all the technical features and specifications mentioned',
    },
    {
      name: 'Customer Reviews',
      query: 'What is the rating and how many reviews does this product have?',
    },
    {
      name: 'Non-existent Information',
      query: 'Extract the warranty information and return policy',
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

  // Test with real webpage content (if available)
  console.log('\n\n📝 Test: Real Article Extraction');
  const articleContent = `
    <article>
      <h1>The Future of AI in Healthcare</h1>
      <div class="meta">
        <span class="author">By Dr. Sarah Johnson</span>
        <span class="date">Published: March 15, 2024</span>
        <span class="category">Technology</span>
      </div>
      <div class="content">
        <p>Artificial intelligence is revolutionizing healthcare, from diagnostic imaging to drug discovery.</p>
        <p>Recent studies show that AI can detect certain cancers with 95% accuracy, surpassing human radiologists in some cases.</p>
        <p>Key areas of impact include:</p>
        <ul>
          <li>Early disease detection</li>
          <li>Personalized treatment plans</li>
          <li>Drug discovery acceleration</li>
          <li>Administrative efficiency</li>
        </ul>
      </div>
    </article>
  `;

  const articleQuery =
    'Extract the article title, author, publication date, and main topics discussed';

  try {
    const startTime = Date.now();
    const result = await client.extract(articleContent, articleQuery);
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

  console.log('\n✨ Anthropic extraction tests completed!');
}

// Run the test
testAnthropicExtraction().catch(console.error);
