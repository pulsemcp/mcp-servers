export async function scrapeWithFirecrawl(
  apiKey: string,
  url: string,
  options?: Record<string, unknown>
): Promise<{
  success: boolean;
  data?: {
    content: string;
    markdown: string;
    html: string;
    metadata: Record<string, unknown>;
  };
  error?: string;
}> {
  try {
    const baseUrl = process.env.FIRECRAWL_API_BASE_URL || 'https://api.firecrawl.dev';
    const response = await fetch(`${baseUrl}/v1/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        ...options,
      }),
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.error || errorJson.message || '';
      } catch {
        errorDetail = await response.text();
      }
      return {
        success: false,
        error: `Firecrawl API error: ${response.status} ${response.statusText}${errorDetail ? ` - ${errorDetail}` : ''}`,
      };
    }

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Firecrawl scraping failed',
      };
    }

    return {
      success: true,
      data: {
        content: result.data?.content || '',
        markdown: result.data?.markdown || '',
        html: result.data?.html || '',
        metadata: result.data?.metadata || {},
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Firecrawl error',
    };
  }
}
