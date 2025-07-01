import { OpenAICompatibleExtractClient } from '../../shared/src/extract/index.js';
import type { LLMConfig } from '../../shared/src/extract/index.js';

/**
 * Manual test for OpenAI-compatible extract client
 *
 * Examples:
 * - Together.ai: LLM_API_KEY=your-key LLM_API_BASE_URL=https://api.together.xyz/v1 LLM_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo npx tsx tests/manual/extract-openai-compatible.test.ts
 * - Groq: LLM_API_KEY=your-key LLM_API_BASE_URL=https://api.groq.com/openai/v1 LLM_MODEL=llama-3.1-70b-versatile npx tsx tests/manual/extract-openai-compatible.test.ts
 * - Perplexity: LLM_API_KEY=your-key LLM_API_BASE_URL=https://api.perplexity.ai LLM_MODEL=llama-3.1-sonar-large-128k-online npx tsx tests/manual/extract-openai-compatible.test.ts
 */

async function testOpenAICompatibleExtraction() {
  const apiKey = process.env.LLM_API_KEY;
  const apiBaseUrl = process.env.LLM_API_BASE_URL;
  const model = process.env.LLM_MODEL;

  if (!apiKey || !apiBaseUrl || !model) {
    console.error(
      '❌ Please set LLM_API_KEY, LLM_API_BASE_URL, and LLM_MODEL environment variables'
    );
    console.error('\nExample for Together.ai:');
    console.error(
      'LLM_API_KEY=your-key LLM_API_BASE_URL=https://api.together.xyz/v1 LLM_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo npx tsx tests/manual/extract-openai-compatible.test.ts'
    );
    process.exit(1);
  }

  console.log('🔧 Testing OpenAI-Compatible Extract Client');
  console.log(`Provider: ${apiBaseUrl}`);
  console.log(`Model: ${model}\n`);

  const config: LLMConfig = {
    provider: 'openai-compatible',
    apiKey,
    apiBaseUrl,
    model,
  };

  const client = new OpenAICompatibleExtractClient(config);

  // Test JSON-like content
  const jsonContent = `
    {
      "company": {
        "name": "TechStartup Inc.",
        "founded": "2019",
        "headquarters": "Austin, TX",
        "employees": 250,
        "funding": {
          "total": "$45M",
          "rounds": [
            {"type": "Seed", "amount": "$2M", "year": "2019"},
            {"type": "Series A", "amount": "$15M", "year": "2021"},
            {"type": "Series B", "amount": "$28M", "year": "2023"}
          ]
        },
        "products": [
          {"name": "CloudSync Pro", "category": "SaaS", "users": "10,000+"},
          {"name": "DataFlow API", "category": "Developer Tools", "users": "5,000+"}
        ]
      }
    }
  `;

  // Test cases
  const testCases = [
    {
      name: 'Company Overview',
      query: 'Summarize the company information including name, location, and size',
    },
    {
      name: 'Funding History',
      query: 'Extract all funding rounds with amounts and years',
    },
    {
      name: 'Product Information',
      query: 'List all products with their categories and user counts',
    },
    {
      name: 'Specific Data Point',
      query: 'What was the Series A funding amount?',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`Query: ${testCase.query}`);
    console.log('---');

    try {
      const startTime = Date.now();
      const result = await client.extract(jsonContent, testCase.query);
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

  // Test with markdown content
  console.log('\n\n📝 Test: Markdown Content Extraction');
  const markdownContent = `
# Project Documentation

## Overview
This project implements a real-time data processing pipeline using Apache Kafka and PostgreSQL.

## Requirements
- Python 3.8+
- Apache Kafka 2.8
- PostgreSQL 13+
- Docker and Docker Compose

## Installation Steps
1. Clone the repository
2. Run \`docker-compose up -d\`
3. Install Python dependencies: \`pip install -r requirements.txt\`
4. Configure environment variables
5. Run migrations: \`python manage.py migrate\`

## Performance Metrics
- Throughput: 10,000 messages/second
- Latency: < 50ms average
- Uptime: 99.9% SLA

## Contact
Email: support@example.com
Slack: #data-pipeline-support
  `;

  const markdownQuery =
    'Extract the technology stack, performance metrics, and support contact information';

  try {
    const startTime = Date.now();
    const result = await client.extract(markdownContent, markdownQuery);
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

  console.log('\n✨ OpenAI-compatible extraction tests completed!');
}

// Run the test
testOpenAICompatibleExtraction().catch(console.error);
