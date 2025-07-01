import { OpenAIExtractClient } from '../../shared/src/extract/index.js';
import type { LLMConfig } from '../../shared/src/extract/index.js';

/**
 * Manual test for OpenAI extract client
 *
 * Run with: LLM_API_KEY=your-openai-key npx tsx tests/manual/extract-openai.test.ts
 */

async function testOpenAIExtraction() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    console.error('❌ Please set LLM_API_KEY environment variable');
    process.exit(1);
  }

  console.log('🔧 Testing OpenAI Extract Client\n');

  const config: LLMConfig = {
    provider: 'openai',
    apiKey,
    model: 'gpt-4-turbo', // Best value model
  };

  const client = new OpenAIExtractClient(config);

  // Test HTML content
  const htmlContent = `
    <html>
      <head>
        <title>Tech Conference 2024</title>
      </head>
      <body>
        <h1>Annual Developer Conference 2024</h1>
        <div class="event-details">
          <p class="date">June 15-17, 2024</p>
          <p class="location">San Francisco Convention Center</p>
          <p class="price">Early Bird: $499 | Regular: $799</p>
        </div>
        <div class="speakers">
          <h2>Keynote Speakers</h2>
          <ul>
            <li>Jane Smith - CEO of TechCorp</li>
            <li>John Doe - CTO of StartupX</li>
            <li>Mary Johnson - AI Research Lead at BigTech</li>
          </ul>
        </div>
        <div class="agenda">
          <h2>Day 1 Highlights</h2>
          <ul>
            <li>9:00 AM - Opening Keynote: The Future of Development</li>
            <li>11:00 AM - Workshop: Advanced TypeScript Patterns</li>
            <li>2:00 PM - Panel: AI in Production</li>
          </ul>
        </div>
      </body>
    </html>
  `;

  // Test cases
  const testCases = [
    {
      name: 'Event Information',
      query: 'Extract the conference name, dates, location, and ticket prices',
    },
    {
      name: 'Speaker List',
      query: 'List all the keynote speakers with their titles and companies',
    },
    {
      name: 'Schedule Details',
      query: 'What are the Day 1 events and their times?',
    },
    {
      name: 'Complex Query',
      query:
        'Create a brief summary of this conference including the key details, notable speakers, and main topics',
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

  // Test with different model
  console.log('\n\n📝 Test: GPT-3.5 Turbo Model');
  const budgetConfig: LLMConfig = {
    provider: 'openai',
    apiKey,
    model: 'gpt-3.5-turbo',
  };

  const budgetClient = new OpenAIExtractClient(budgetConfig);
  const simpleQuery = 'What is the conference name and when is it?';

  try {
    const startTime = Date.now();
    const result = await budgetClient.extract(htmlContent, simpleQuery);
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Success with GPT-3.5 Turbo (${duration}ms)`);
      console.log('Response:', result.content);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n✨ OpenAI extraction tests completed!');
}

// Run the test
testOpenAIExtraction().catch(console.error);
