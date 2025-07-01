import Anthropic from '@anthropic-ai/sdk';
import type { IExtractClient, ExtractOptions, ExtractResult, LLMConfig } from './types.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8192; // Maximum we'll use

export class AnthropicExtractClient implements IExtractClient {
  private client: Anthropic;
  private model: string;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    this.model = config.model || DEFAULT_MODEL;
  }

  async extract(content: string, query: string, _options?: ExtractOptions): Promise<ExtractResult> {
    try {
      const systemPrompt = `You are an expert at extracting specific information from web content. 
When given HTML or text content and a query, extract only the requested information.
Be concise and accurate. If the requested information is not found, say so clearly.
Format your response in a clear, readable way.`;

      const userPrompt = `Content to analyze:
${content}

Extract the following information:
${query}`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Extract text content from the response
      const extractedContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return {
        success: true,
        content: extractedContent,
      };
    } catch (error) {
      return {
        success: false,
        error: `Anthropic extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
