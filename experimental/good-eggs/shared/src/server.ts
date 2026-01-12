import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type {
  GoodEggsConfig,
  GroceryItem,
  GroceryDetails,
  PastOrder,
  CartResult,
} from './types.js';

const BASE_URL = 'https://www.goodeggs.com';

/**
 * Good Eggs client interface
 * Defines all methods for interacting with the Good Eggs grocery store
 */
export interface IGoodEggsClient {
  /**
   * Initialize the browser and log in to Good Eggs
   * Must be called before using other methods
   */
  initialize(): Promise<void>;

  /**
   * Search for groceries
   */
  searchGroceries(query: string): Promise<GroceryItem[]>;

  /**
   * Get user's favorite items
   */
  getFavorites(): Promise<GroceryItem[]>;

  /**
   * Get detailed information about a specific grocery item
   */
  getGroceryDetails(groceryUrl: string): Promise<GroceryDetails>;

  /**
   * Add an item to the shopping cart
   */
  addToCart(groceryUrl: string, quantity: number): Promise<CartResult>;

  /**
   * Search for freebie/deal groceries
   */
  searchFreebieGroceries(): Promise<GroceryItem[]>;

  /**
   * Get list of past order dates
   */
  getPastOrderDates(): Promise<PastOrder[]>;

  /**
   * Get groceries from a specific past order
   */
  getPastOrderGroceries(orderDate: string): Promise<GroceryItem[]>;

  /**
   * Add an item to favorites
   */
  addFavorite(groceryUrl: string): Promise<CartResult>;

  /**
   * Remove an item from favorites
   */
  removeFavorite(groceryUrl: string): Promise<CartResult>;

  /**
   * Remove an item from the cart
   */
  removeFromCart(groceryUrl: string): Promise<CartResult>;

  /**
   * Get the current page URL
   */
  getCurrentUrl(): Promise<string>;

  /**
   * Close the browser
   */
  close(): Promise<void>;

  /**
   * Get the configuration
   */
  getConfig(): GoodEggsConfig;
}

/**
 * Good Eggs client implementation using Playwright
 */
export class GoodEggsClient implements IGoodEggsClient {
  private browser: import('playwright').Browser | null = null;
  private context: import('playwright').BrowserContext | null = null;
  private page: import('playwright').Page | null = null;
  private config: GoodEggsConfig;
  private isInitialized = false;

  constructor(config: GoodEggsConfig) {
    this.config = config;
  }

  private async ensureBrowser(): Promise<import('playwright').Page> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    return this.page;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Use playwright-extra with stealth plugin for better bot detection avoidance
    const { chromium } = await import('playwright-extra');
    const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;

    chromium.use(StealthPlugin());

    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    this.page = await this.context.newPage();

    // Navigate to login page
    // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections that prevent networkidle
    await this.page.goto(`${BASE_URL}/signin`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    // Fill in login credentials
    await this.page.fill('input[name="email"], input[type="email"]', this.config.username);
    await this.page.fill('input[name="password"], input[type="password"]', this.config.password);

    // Click sign in button
    await this.page.click('button:has-text("Sign In")');

    // Wait for navigation to complete (should redirect to home or previous page)
    await this.page.waitForURL((url) => !url.pathname.includes('/signin'), {
      timeout: this.config.timeout,
    });

    // Verify login was successful by checking if we're no longer on signin page
    const currentUrl = this.page.url();
    if (currentUrl.includes('/signin')) {
      throw new Error('Login failed - still on signin page. Check your credentials.');
    }

    this.isInitialized = true;
  }

  async searchGroceries(query: string): Promise<GroceryItem[]> {
    const page = await this.ensureBrowser();

    // Navigate to search page
    // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
    await page.goto(`${BASE_URL}/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
    });

    // Wait for React to render the product list
    await page.waitForTimeout(3000);

    // Extract product information from the page
    const items = await page.evaluate(() => {
      const products: GroceryItem[] = [];
      const seen = new Set<string>();

      // Good Eggs uses 'js-product-link' class for product links
      // URL format: /producer-slug/product-slug/product-id (e.g., /cloversfbay/organic-whole-milk/53fe295358ed090200000f2d)
      const productElements = document.querySelectorAll('a.js-product-link');

      productElements.forEach((el) => {
        const link = el as HTMLAnchorElement;
        const href = link.href;

        // Skip if already seen or not a valid product URL
        if (!href || seen.has(href)) {
          return;
        }

        // Validate URL structure: should have at least 3 path segments after domain
        const urlPath = new URL(href).pathname;
        const segments = urlPath.split('/').filter((s) => s.length > 0);
        if (segments.length < 3) {
          return;
        }

        // Skip navigation pages
        if (
          href.includes('/search') ||
          href.includes('/signin') ||
          href.includes('/home') ||
          href.includes('/basket') ||
          href.includes('/account') ||
          href.includes('/favorites') ||
          href.includes('/reorder')
        ) {
          return;
        }

        // Try to find product info within or near this element
        const container = link.closest('div[class*="product"], article, [class*="card"]') || link;

        const nameEl =
          container.querySelector('h2, h3, [class*="title"], [class*="name"]') ||
          link.querySelector('h2, h3');
        const brandEl = container.querySelector('[class*="brand"], [class*="producer"]');
        const priceEl = container.querySelector('[class*="price"]');
        const discountEl = container.querySelector('[class*="off"], [class*="discount"]');
        const imgEl = container.querySelector('img');

        // Get name from element or from the link text itself
        let name = nameEl?.textContent?.trim();
        if (!name || name.length < 3) {
          name = link.textContent?.trim();
        }
        if (!name || name.length < 3) return;

        seen.add(href);
        products.push({
          url: href,
          name: name,
          brand: brandEl?.textContent?.trim() || '',
          price: priceEl?.textContent?.trim() || '',
          discount: discountEl?.textContent?.trim() || undefined,
          imageUrl: imgEl?.src || undefined,
        });
      });

      return products;
    });

    return items;
  }

  async getFavorites(): Promise<GroceryItem[]> {
    const page = await this.ensureBrowser();

    // Navigate to favorites page
    // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
    await page.goto(`${BASE_URL}/favorites`, { waitUntil: 'domcontentloaded' });

    // Wait for React to render
    await page.waitForTimeout(3000);

    // Check if we're redirected to signin
    if (page.url().includes('/signin')) {
      throw new Error('Not logged in. Cannot access favorites.');
    }

    // Extract favorite items
    const items = await page.evaluate(() => {
      const products: GroceryItem[] = [];
      const seen = new Set<string>();

      // Good Eggs uses 'js-product-link' class for product links
      const productElements = document.querySelectorAll('a.js-product-link');

      productElements.forEach((el) => {
        const link = el as HTMLAnchorElement;
        const href = link.href;

        if (!href || seen.has(href) || href.includes('/favorites') || href.includes('/signin')) {
          return;
        }

        // Validate URL structure
        const urlPath = new URL(href).pathname;
        const segments = urlPath.split('/').filter((s) => s.length > 0);
        if (segments.length < 3) {
          return;
        }

        const container = link.closest('div[class*="product"], article, [class*="card"]') || link;

        const nameEl = container.querySelector('h2, h3, [class*="title"], [class*="name"]');
        const brandEl = container.querySelector('[class*="brand"], [class*="producer"]');
        const priceEl = container.querySelector('[class*="price"]');
        const imgEl = container.querySelector('img');

        let name = nameEl?.textContent?.trim();
        if (!name || name.length < 3) {
          name = link.textContent?.trim();
        }
        if (!name || name.length < 3) return;

        seen.add(href);
        products.push({
          url: href,
          name: name,
          brand: brandEl?.textContent?.trim() || '',
          price: priceEl?.textContent?.trim() || '',
          imageUrl: imgEl?.src || undefined,
        });
      });

      return products;
    });

    return items;
  }

  async getGroceryDetails(groceryUrl: string): Promise<GroceryDetails> {
    const page = await this.ensureBrowser();

    // Check if we're already on the product page
    const currentUrl = page.url();
    if (!currentUrl.includes(groceryUrl) && !groceryUrl.includes(currentUrl)) {
      // Navigate to the product page
      // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
      const fullUrl = groceryUrl.startsWith('http') ? groceryUrl : `${BASE_URL}${groceryUrl}`;
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
    }

    // Wait for React to render
    await page.waitForTimeout(3000);

    // Extract product details
    const details = await page.evaluate((url) => {
      // Find the main product info
      const nameEl = document.querySelector('h1, [class*="product-name"], [class*="title"]');
      const brandEl = document.querySelector('[class*="brand"], [class*="producer"]');
      const priceEl = document.querySelector('[class*="sale-price"], [class*="current-price"]');
      const originalPriceEl = document.querySelector(
        '[class*="original-price"], [class*="regular-price"], s'
      );
      const discountEl = document.querySelector('[class*="off"], [class*="discount"]');
      const descriptionEl = document.querySelector(
        '[class*="description"], [class*="details"] p, .product-description'
      );
      const productDetailsEl = document.querySelector('[class*="product-details"]');
      const imgEl = document.querySelector('[class*="product"] img, main img');

      // Get availability dates
      const availabilityEls = document.querySelectorAll(
        '[class*="availability"] span, [class*="delivery"] span'
      );
      const availability: string[] = [];
      availabilityEls.forEach((el) => {
        const text = el.textContent?.trim();
        if (text) availability.push(text);
      });

      return {
        url: url,
        name: nameEl?.textContent?.trim() || 'Unknown',
        brand: brandEl?.textContent?.trim() || '',
        price: priceEl?.textContent?.trim() || '',
        originalPrice: originalPriceEl?.textContent?.trim() || undefined,
        discount: discountEl?.textContent?.trim() || undefined,
        description: descriptionEl?.textContent?.trim() || undefined,
        productDetails: productDetailsEl?.textContent?.trim() || undefined,
        availability: availability.length > 0 ? availability : undefined,
        imageUrl: (imgEl as HTMLImageElement)?.src || undefined,
      };
    }, groceryUrl);

    return details;
  }

  async addToCart(groceryUrl: string, quantity: number): Promise<CartResult> {
    const page = await this.ensureBrowser();

    // Check if we're already on the product page
    const currentUrl = page.url();
    const normalizedGroceryUrl = groceryUrl.replace(BASE_URL, '');
    const normalizedCurrentUrl = currentUrl.replace(BASE_URL, '');

    if (!normalizedCurrentUrl.includes(normalizedGroceryUrl.split('/').pop() || '')) {
      // Navigate to the product page
      // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
      const fullUrl = groceryUrl.startsWith('http') ? groceryUrl : `${BASE_URL}${groceryUrl}`;
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }

    // Get the product name for the result
    const itemName = await page.evaluate(() => {
      const nameEl = document.querySelector('h1, [class*="product-name"], [class*="title"]');
      return nameEl?.textContent?.trim() || 'Unknown item';
    });

    // Set quantity if different from 1
    let quantitySet = false;
    if (quantity > 1) {
      // Try to find and use quantity selector
      const quantitySelector = await page.$(
        'select[class*="quantity"], [class*="quantity"] select'
      );
      if (quantitySelector) {
        await quantitySelector.selectOption(String(quantity));
        quantitySet = true;
      } else {
        // Try clicking + button multiple times
        const plusButton = await page.$('button[aria-label*="increase"], button:has-text("+")');
        if (plusButton) {
          for (let i = 1; i < quantity; i++) {
            await plusButton.click();
            await page.waitForTimeout(200);
          }
          quantitySet = true;
        }
      }

      if (!quantitySet) {
        return {
          success: false,
          message: `Could not set quantity to ${quantity} - quantity controls not found. Item may only support single-item adds.`,
          itemName,
          quantity: 1,
        };
      }
    }

    // Click the add to cart/basket button
    const addButton = await page.$(
      'button:has-text("ADD TO BASKET"), button:has-text("Add to Cart"), button:has-text("Add to Basket")'
    );

    if (!addButton) {
      return {
        success: false,
        message: 'Could not find add to cart button',
        itemName,
        quantity,
      };
    }

    await addButton.click();

    // Wait for cart update
    await page.waitForTimeout(1000);

    return {
      success: true,
      message: `Successfully added ${quantity} x ${itemName} to cart`,
      itemName,
      quantity,
    };
  }

  async searchFreebieGroceries(): Promise<GroceryItem[]> {
    const page = await this.ensureBrowser();
    const allFreeItems: GroceryItem[] = [];
    const seen = new Set<string>();

    // Helper function to extract free items ($0.00) from current page
    const extractFreeItems = async (): Promise<GroceryItem[]> => {
      return await page.evaluate(() => {
        const products: GroceryItem[] = [];
        const seenUrls = new Set<string>();

        // Good Eggs uses 'js-product-link' class for product links
        const productElements = document.querySelectorAll('a.js-product-link');

        productElements.forEach((el) => {
          const link = el as HTMLAnchorElement;
          const href = link.href;

          if (
            !href ||
            seenUrls.has(href) ||
            href.includes('/fresh-picks') ||
            href.includes('/signin')
          ) {
            return;
          }

          // Validate URL structure
          const urlPath = new URL(href).pathname;
          const segments = urlPath.split('/').filter((s) => s.length > 0);
          if (segments.length < 3) {
            return;
          }

          const container = link.closest('div[class*="product"], article, [class*="card"]') || link;

          // Look for price element and check if it's $0.00
          const priceEl = container.querySelector('[class*="price"]');
          const priceText = priceEl?.textContent?.trim() || '';

          // Only include items that are truly free ($0.00 or $0)
          // Must use exact matching to avoid false positives like $10.00, $20.50
          const isFree =
            /^\$0(\.00)?$/.test(priceText) || priceText === '$0.00' || priceText === '$0';
          if (!isFree) {
            return;
          }

          const nameEl = container.querySelector('h2, h3, [class*="title"], [class*="name"]');
          const brandEl = container.querySelector('[class*="brand"], [class*="producer"]');
          const imgEl = container.querySelector('img');

          let name = nameEl?.textContent?.trim();
          if (!name || name.length < 3) {
            name = link.textContent?.trim();
          }
          if (!name || name.length < 3) return;

          seenUrls.add(href);
          products.push({
            url: href,
            name: name,
            brand: brandEl?.textContent?.trim() || '',
            price: priceText,
            discount: 'FREE',
            imageUrl: imgEl?.src || undefined,
          });
        });

        return products;
      });
    };

    // Check homepage for free items
    // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const homePageItems = await extractFreeItems();
    for (const item of homePageItems) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        allFreeItems.push(item);
      }
    }

    // Check /fresh-picks page for free items
    await page.goto(`${BASE_URL}/fresh-picks`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const freshPicksItems = await extractFreeItems();
    for (const item of freshPicksItems) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        allFreeItems.push(item);
      }
    }

    return allFreeItems;
  }

  async getPastOrderDates(): Promise<PastOrder[]> {
    const page = await this.ensureBrowser();

    // Navigate to reorder/past orders page
    // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
    await page.goto(`${BASE_URL}/reorder`, { waitUntil: 'domcontentloaded' });

    // Wait for React to render
    await page.waitForTimeout(3000);

    // Check if we're redirected to signin
    if (page.url().includes('/signin')) {
      throw new Error('Not logged in. Cannot access past orders.');
    }

    // Extract past order information
    const orders = await page.evaluate(() => {
      const orderList: PastOrder[] = [];

      // Look for order date elements
      const orderElements = document.querySelectorAll(
        '[class*="order"], [class*="history"] > div, [class*="past-order"]'
      );

      orderElements.forEach((el) => {
        const dateEl = el.querySelector('[class*="date"], time');
        const totalEl = el.querySelector('[class*="total"], [class*="price"]');
        const countEl = el.querySelector('[class*="count"], [class*="items"]');

        const dateText = dateEl?.textContent?.trim();
        if (!dateText) return;

        orderList.push({
          date: dateText,
          total: totalEl?.textContent?.trim() || undefined,
          itemCount: countEl?.textContent ? parseInt(countEl.textContent) : undefined,
        });
      });

      return orderList;
    });

    return orders;
  }

  async getPastOrderGroceries(orderDate: string): Promise<GroceryItem[]> {
    const page = await this.ensureBrowser();

    // First, go to reorder page
    if (!page.url().includes('/reorder')) {
      // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
      await page.goto(`${BASE_URL}/reorder`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }

    // Check if we're redirected to signin
    if (page.url().includes('/signin')) {
      throw new Error('Not logged in. Cannot access past orders.');
    }

    // Try to click on the specific order date
    const orderLink = await page.$(`text=${orderDate}`);
    if (orderLink) {
      await orderLink.click();
      await page.waitForTimeout(2000);
    }

    // Extract items from the order
    const items = await page.evaluate(() => {
      const products: GroceryItem[] = [];
      const seen = new Set<string>();

      // Good Eggs uses 'js-product-link' class for product links
      const productElements = document.querySelectorAll('a.js-product-link');

      productElements.forEach((el) => {
        const link = el as HTMLAnchorElement;
        const href = link.href;

        if (!href || seen.has(href) || href.includes('/reorder') || href.includes('/signin')) {
          return;
        }

        // Validate URL structure
        const urlPath = new URL(href).pathname;
        const segments = urlPath.split('/').filter((s) => s.length > 0);
        if (segments.length < 3) {
          return;
        }

        const container = link.closest('div[class*="product"], article, [class*="card"]') || link;

        const nameEl = container.querySelector('h2, h3, [class*="title"], [class*="name"]');
        const brandEl = container.querySelector('[class*="brand"], [class*="producer"]');
        const priceEl = container.querySelector('[class*="price"]');
        const imgEl = container.querySelector('img');

        let name = nameEl?.textContent?.trim();
        if (!name || name.length < 3) {
          name = link.textContent?.trim();
        }
        if (!name || name.length < 3) return;

        seen.add(href);
        products.push({
          url: href,
          name: name,
          brand: brandEl?.textContent?.trim() || '',
          price: priceEl?.textContent?.trim() || '',
          imageUrl: imgEl?.src || undefined,
        });
      });

      return products;
    });

    return items;
  }

  async addFavorite(groceryUrl: string): Promise<CartResult> {
    const page = await this.ensureBrowser();

    // Navigate to the product page if not already there
    const currentUrl = page.url();
    const normalizedGroceryUrl = groceryUrl.replace(BASE_URL, '');
    const normalizedCurrentUrl = currentUrl.replace(BASE_URL, '');

    if (!normalizedCurrentUrl.includes(normalizedGroceryUrl.split('/').pop() || '')) {
      // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
      const fullUrl = groceryUrl.startsWith('http') ? groceryUrl : `${BASE_URL}${groceryUrl}`;
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }

    // Get the product name for the result
    const itemName = await page.evaluate(() => {
      const nameEl = document.querySelector('h1, [class*="product-name"], [class*="title"]');
      return nameEl?.textContent?.trim() || 'Unknown item';
    });

    // Look for the favorite/heart button
    const favoriteButton = await page.$(
      'button[aria-label*="favorite"], button[aria-label*="heart"], button:has([class*="heart"]), [class*="favorite"] button, button[class*="favorite"]'
    );

    if (!favoriteButton) {
      return {
        success: false,
        message: 'Could not find favorite button',
        itemName,
      };
    }

    // Check if already favorited (button might have "filled" or "active" state)
    const isAlreadyFavorited = await page.evaluate((btn) => {
      const classList = btn.className || '';
      const ariaPressed = btn.getAttribute('aria-pressed');
      return (
        classList.includes('active') ||
        classList.includes('filled') ||
        classList.includes('favorited') ||
        ariaPressed === 'true'
      );
    }, favoriteButton);

    if (isAlreadyFavorited) {
      return {
        success: true,
        message: `${itemName} is already in favorites`,
        itemName,
      };
    }

    await favoriteButton.click();
    await page.waitForTimeout(500);

    return {
      success: true,
      message: `Successfully added ${itemName} to favorites`,
      itemName,
    };
  }

  async removeFavorite(groceryUrl: string): Promise<CartResult> {
    const page = await this.ensureBrowser();

    // Navigate to the product page if not already there
    const currentUrl = page.url();
    const normalizedGroceryUrl = groceryUrl.replace(BASE_URL, '');
    const normalizedCurrentUrl = currentUrl.replace(BASE_URL, '');

    if (!normalizedCurrentUrl.includes(normalizedGroceryUrl.split('/').pop() || '')) {
      // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
      const fullUrl = groceryUrl.startsWith('http') ? groceryUrl : `${BASE_URL}${groceryUrl}`;
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }

    // Get the product name for the result
    const itemName = await page.evaluate(() => {
      const nameEl = document.querySelector('h1, [class*="product-name"], [class*="title"]');
      return nameEl?.textContent?.trim() || 'Unknown item';
    });

    // Look for the favorite/heart button
    const favoriteButton = await page.$(
      'button[aria-label*="favorite"], button[aria-label*="heart"], button:has([class*="heart"]), [class*="favorite"] button, button[class*="favorite"]'
    );

    if (!favoriteButton) {
      return {
        success: false,
        message: 'Could not find favorite button',
        itemName,
      };
    }

    // Check if already favorited (button might have "filled" or "active" state)
    const isFavorited = await page.evaluate((btn) => {
      const classList = btn.className || '';
      const ariaPressed = btn.getAttribute('aria-pressed');
      return (
        classList.includes('active') ||
        classList.includes('filled') ||
        classList.includes('favorited') ||
        ariaPressed === 'true'
      );
    }, favoriteButton);

    if (!isFavorited) {
      return {
        success: true,
        message: `${itemName} is not in favorites`,
        itemName,
      };
    }

    await favoriteButton.click();
    await page.waitForTimeout(500);

    return {
      success: true,
      message: `Successfully removed ${itemName} from favorites`,
      itemName,
    };
  }

  async removeFromCart(groceryUrl: string): Promise<CartResult> {
    const page = await this.ensureBrowser();

    // Navigate to cart page
    // Use domcontentloaded instead of networkidle - Good Eggs has persistent connections
    await page.goto(`${BASE_URL}/basket`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Try to find the item in the cart by its URL or name
    // First, let's get the product name from the URL if possible
    const productSlug = groceryUrl.split('/').pop() || '';

    // Validate that we have a valid product slug to search for
    if (!productSlug || productSlug.length < 3) {
      return {
        success: false,
        message: 'Invalid grocery URL - could not extract product identifier',
        itemName: groceryUrl,
      };
    }

    // Look for the item in the cart
    const cartItems = await page.$$(
      '[class*="cart-item"], [class*="basket-item"], [class*="line-item"]'
    );

    let itemFound = false;
    let itemName = 'Unknown item';

    for (const cartItem of cartItems) {
      // Check if this cart item contains a link to our product
      const itemLink = await cartItem.$(`a[href*="${productSlug}"]`);
      if (itemLink) {
        itemFound = true;

        // Get the item name
        const nameEl = await cartItem.$('[class*="name"], [class*="title"], h3, h4');
        if (nameEl) {
          itemName = (await nameEl.textContent()) || 'Unknown item';
        }

        // Find and click the remove button
        const removeButton = await cartItem.$(
          'button[aria-label*="remove"], button:has-text("Remove"), button:has-text("×"), [class*="remove"] button'
        );

        if (removeButton) {
          await removeButton.click();
          await page.waitForTimeout(500);

          return {
            success: true,
            message: `Successfully removed ${itemName.trim()} from cart`,
            itemName: itemName.trim(),
          };
        }
      }
    }

    if (!itemFound) {
      return {
        success: false,
        message: 'Item not found in cart',
        itemName: productSlug,
      };
    }

    return {
      success: false,
      message: 'Could not find remove button for item in cart',
      itemName,
    };
  }

  async getCurrentUrl(): Promise<string> {
    const page = await this.ensureBrowser();
    return page.url();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isInitialized = false;
    }
  }

  getConfig(): GoodEggsConfig {
    return this.config;
  }
}

export type ClientFactory = () => IGoodEggsClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'good-eggs-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Track active client for cleanup
  let activeClient: IGoodEggsClient | null = null;

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        const username = process.env.GOOD_EGGS_USERNAME;
        const password = process.env.GOOD_EGGS_PASSWORD;
        const headless = process.env.HEADLESS !== 'false';
        const timeout = parseInt(process.env.TIMEOUT || '30000', 10);

        if (!username || !password) {
          throw new Error(
            'GOOD_EGGS_USERNAME and GOOD_EGGS_PASSWORD environment variables must be configured'
          );
        }

        activeClient = new GoodEggsClient({
          username,
          password,
          headless,
          timeout,
        });
        return activeClient;
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  const cleanup = async () => {
    if (activeClient) {
      await activeClient.close();
      activeClient = null;
    }
  };

  return { server, registerHandlers, cleanup };
}
