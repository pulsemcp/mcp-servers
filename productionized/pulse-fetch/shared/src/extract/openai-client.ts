import OpenAI from 'openai';
import type { IExtractClient, ExtractOptions, ExtractResult, LLMConfig } from './types.js';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_TOKENS = 4096; // OpenAI models support max 4096 completion tokens

export class OpenAIExtractClient implements IExtractClient {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
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
          error: 'No content extracted from OpenAI response',
        };
      }

      return {
        success: true,
        content: extractedContent,
      };
    } catch (error) {
      return {
        success: false,
        error: `OpenAI extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
