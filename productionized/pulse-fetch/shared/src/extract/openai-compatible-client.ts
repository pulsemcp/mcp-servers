import OpenAI from 'openai';
import type { IExtractClient, ExtractOptions, ExtractResult, LLMConfig } from './types.js';

const MAX_TOKENS = 8192; // Maximum we'll use

export class OpenAICompatibleExtractClient implements IExtractClient {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required for OpenAI-compatible provider');
    }

    if (!config.apiBaseUrl) {
      throw new Error('API base URL is required for OpenAI-compatible provider');
    }

    if (!config.model) {
      throw new Error('Model name is required for OpenAI-compatible provider');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiBaseUrl,
    });

    this.model = config.model;
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

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const extractedContent = response.choices[0]?.message?.content;

      if (!extractedContent) {
        return {
          success: false,
          error: 'No content extracted from OpenAI-compatible provider response',
        };
      }

      return {
        success: true,
        content: extractedContent,
      };
    } catch (error) {
      return {
        success: false,
        error: `OpenAI-compatible extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
