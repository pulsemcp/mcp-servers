import { describe, it, expect } from 'vitest';
import {
  AnthropicExtractClient,
  OpenAIExtractClient,
  OpenAICompatibleExtractClient,
} from '../../../shared/src/extract/index.js';
import type { LLMConfig } from '../../../shared/src/extract/index.js';

describe('Extract Functionality', () => {
  const sampleContent = `
    <div class="product">
      <h1>Premium Wireless Headphones</h1>
      <div class="price">$299.99</div>
      <div class="availability">In Stock - Ships within 24 hours</div>
      <div class="features">
        <ul>
          <li>Active Noise Cancellation</li>
          <li>40-hour battery life</li>
          <li>Premium leather ear cushions</li>
        </ul>
      </div>
    </div>
  `;

  describe('Anthropic Extract', () => {
    it('should extract product information', async () => {
      const apiKey = process.env.LLM_API_KEY;
      const provider = process.env.LLM_PROVIDER;

      if (!apiKey || provider !== 'anthropic') {
        console.log(
          '⚠️  Skipping Anthropic test - LLM_API_KEY not set or LLM_PROVIDER not anthropic'
        );
        return;
      }

      console.log('🔧 Testing Anthropic Extract Client\n');

      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey,
      };

      const client = new AnthropicExtractClient(config);
      const query = 'Extract the product name, price, and availability status';

      const result = await client.extract(sampleContent, query);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content).toContain('Premium Wireless Headphones');
      expect(result.content).toContain('$299.99');
      expect(result.content).toContain('In Stock');

      console.log('✅ Anthropic extraction successful');
      console.log('Response:', result.content);
    });
  });

  describe('OpenAI Extract', () => {
    it('should extract product information', async () => {
      const apiKey = process.env.LLM_API_KEY;
      const provider = process.env.LLM_PROVIDER;

      if (!apiKey || provider !== 'openai') {
        console.log('⚠️  Skipping OpenAI test - LLM_API_KEY not set or LLM_PROVIDER not openai');
        return;
      }

      console.log('🔧 Testing OpenAI Extract Client\n');

      const config: LLMConfig = {
        provider: 'openai',
        apiKey,
      };

      const client = new OpenAIExtractClient(config);
      const query = 'Extract the product name, price, and availability status';

      const result = await client.extract(sampleContent, query);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content).toContain('Premium Wireless Headphones');
      expect(result.content).toContain('$299.99');
      expect(result.content).toContain('In Stock');

      console.log('✅ OpenAI extraction successful');
      console.log('Response:', result.content);
    });
  });

  describe('OpenAI-Compatible Extract', () => {
    it('should extract product information', async () => {
      const apiKey = process.env.LLM_API_KEY;
      const apiBaseUrl = process.env.LLM_API_BASE_URL;
      const model = process.env.LLM_MODEL;
      const provider = process.env.LLM_PROVIDER;

      if (!apiKey || !apiBaseUrl || !model || provider !== 'openai-compatible') {
        console.log('⚠️  Skipping OpenAI-compatible test - required env vars not set');
        return;
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
      const query = 'Extract the product name, price, and availability status';

      const result = await client.extract(sampleContent, query);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();

      console.log('✅ OpenAI-compatible extraction successful');
      console.log('Response:', result.content);
    });
  });
});
