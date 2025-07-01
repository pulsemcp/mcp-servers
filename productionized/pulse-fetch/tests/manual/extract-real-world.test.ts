import { ExtractClientFactory } from '../../shared/src/extract/index.js';

/**
 * Real-world test for extract functionality with actual web content
 *
 * Run with: LLM_PROVIDER=anthropic LLM_API_KEY=your-key npx tsx tests/manual/extract-real-world.test.ts
 */

async function testRealWorldExtraction() {
  // Check for LLM configuration
  const provider = process.env.LLM_PROVIDER;
  const apiKey = process.env.LLM_API_KEY;

  if (!provider || !apiKey) {
    console.error('❌ Please set LLM_PROVIDER and LLM_API_KEY environment variables');
    process.exit(1);
  }

  console.log('🔧 Testing Real-World Extract Scenarios');
  console.log(`Provider: ${provider}\n`);

  // Create extract client
  const client = ExtractClientFactory.createFromEnv();
  if (!client) {
    console.error('❌ Failed to create extract client');
    process.exit(1);
  }

  // Scenario 1: E-commerce Product Page
  console.log('📦 Scenario 1: E-commerce Product Page');
  const ecommerceHTML = `
    <html>
      <head><title>MacBook Pro 16-inch - Apple</title></head>
      <body>
        <div class="product-page">
          <h1>MacBook Pro 16-inch</h1>
          <div class="price">
            <span class="current-price">$2,499</span>
            <span class="original-price">$2,699</span>
            <span class="discount">Save $200</span>
          </div>
          <div class="specs">
            <h2>Technical Specifications</h2>
            <ul>
              <li>Apple M3 Pro chip with 12‑core CPU, 18‑core GPU</li>
              <li>18GB unified memory</li>
              <li>512GB SSD storage</li>
              <li>16.2-inch Liquid Retina XDR display</li>
              <li>Battery life: Up to 22 hours</li>
            </ul>
          </div>
          <div class="availability">
            <p>In Stock</p>
            <p>Free delivery: Dec 28 - Jan 2</p>
          </div>
          <div class="reviews">
            <div class="rating">4.8 out of 5 stars</div>
            <div class="review-count">3,421 reviews</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const ecommerceQuery =
    'Extract a structured summary including: product name, current price, discount amount, key specifications (processor, memory, storage), availability, and review rating';

  try {
    const startTime = Date.now();
    const result = await client.extract(ecommerceHTML, ecommerceQuery);
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Success (${duration}ms)`);
      console.log(result.content);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Scenario 2: News Article
  console.log('\n\n📰 Scenario 2: News Article');
  const newsHTML = `
    <html>
      <head><title>Breaking: Major Scientific Discovery Announced</title></head>
      <body>
        <article>
          <header>
            <h1>Scientists Discover New Method for Carbon Capture</h1>
            <div class="meta">
              <span class="author">By Dr. Sarah Martinez</span>
              <span class="date">Published: December 27, 2024</span>
              <span class="category">Climate Science</span>
            </div>
          </header>
          <div class="content">
            <p class="lead">Researchers at MIT have developed a revolutionary new technique for capturing carbon dioxide directly from the atmosphere, potentially offering a game-changing solution to climate change.</p>
            <p>The breakthrough method, which uses a novel metal-organic framework (MOF), can capture CO2 at unprecedented efficiency levels while consuming 70% less energy than current technologies.</p>
            <p>"This could be the breakthrough we've been waiting for," said lead researcher Dr. Emily Chen. "Our system can operate at ambient temperatures and pressures, making it far more practical for large-scale deployment."</p>
            <h2>Key Findings</h2>
            <ul>
              <li>Captures 95% of CO2 from air streams</li>
              <li>Energy consumption: 1.2 GJ per ton of CO2</li>
              <li>Estimated cost: $100 per ton of CO2 captured</li>
              <li>Scalable to industrial levels within 5 years</li>
            </ul>
            <p>The research, published in Nature Climate Change, has already attracted interest from major corporations and governments worldwide.</p>
          </div>
          <footer>
            <p>Related Topics: Climate Change, Carbon Capture, MIT Research, Sustainability</p>
          </footer>
        </article>
      </body>
    </html>
  `;

  const newsQuery =
    'Provide a news brief including: headline, author, date, main discovery, key statistics, potential impact, and who is interested in this research';

  try {
    const startTime = Date.now();
    const result = await client.extract(newsHTML, newsQuery);
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Success (${duration}ms)`);
      console.log(result.content);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Scenario 3: Complex Table Data
  console.log('\n\n📊 Scenario 3: Financial Data Table');
  const tableHTML = `
    <html>
      <head><title>Q4 2024 Earnings Report</title></head>
      <body>
        <h1>TechCorp Q4 2024 Financial Results</h1>
        <table class="financial-data">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Q4 2024</th>
              <th>Q4 2023</th>
              <th>YoY Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Revenue</td>
              <td>$4.2B</td>
              <td>$3.8B</td>
              <td>+10.5%</td>
            </tr>
            <tr>
              <td>Operating Income</td>
              <td>$1.1B</td>
              <td>$950M</td>
              <td>+15.8%</td>
            </tr>
            <tr>
              <td>Net Income</td>
              <td>$890M</td>
              <td>$780M</td>
              <td>+14.1%</td>
            </tr>
            <tr>
              <td>EPS</td>
              <td>$2.45</td>
              <td>$2.10</td>
              <td>+16.7%</td>
            </tr>
          </tbody>
        </table>
        <div class="highlights">
          <h2>Key Highlights</h2>
          <ul>
            <li>Record quarterly revenue driven by cloud services growth</li>
            <li>Operating margin expanded to 26.2%</li>
            <li>Returned $2.3B to shareholders through dividends and buybacks</li>
            <li>Guidance for Q1 2025: Revenue $4.3-4.5B</li>
          </ul>
        </div>
      </body>
    </html>
  `;

  const tableQuery =
    'Extract the financial performance summary including all metrics with their values and year-over-year changes, plus the key highlights and future guidance';

  try {
    const startTime = Date.now();
    const result = await client.extract(tableHTML, tableQuery);
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Success (${duration}ms)`);
      console.log(result.content);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n✨ Real-world extraction tests completed!');
}

// Run the test
testRealWorldExtraction().catch(console.error);
