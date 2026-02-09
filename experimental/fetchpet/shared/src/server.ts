import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type {
  FetchPetConfig,
  Claim,
  ClaimDetails,
  ClaimSubmissionData,
  ClaimSubmissionResult,
} from './types.js';
import { randomBytes } from 'crypto';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://my.fetchpet.com';

/**
 * Fetch Pet client interface
 * Defines all methods for interacting with the Fetch Pet insurance portal
 */
export interface IFetchPetClient {
  /**
   * Initialize the browser and log in to Fetch Pet
   * Must be called before using other methods
   */
  initialize(): Promise<void>;

  /**
   * Prepare a claim for submission by filling out the form
   * Does NOT submit - just validates and returns what would be submitted
   */
  prepareClaimToSubmit(
    petName: string,
    invoiceDate: string,
    invoiceAmount: string,
    providerName: string,
    claimDescription: string,
    invoiceFilePath?: string,
    medicalRecordsPath?: string
  ): Promise<ClaimSubmissionData>;

  /**
   * Actually submit a prepared claim
   * Requires user confirmation via token from prepareClaimToSubmit
   */
  submitClaim(confirmationToken: string): Promise<ClaimSubmissionResult>;

  /**
   * Get list of active/pending claims
   */
  getActiveClaims(): Promise<Claim[]>;

  /**
   * Get list of historical/completed claims
   */
  getHistoricalClaims(): Promise<Claim[]>;

  /**
   * Get detailed information about a specific claim
   * Including EOB, invoice summaries, and downloads
   */
  getClaimDetails(claimId: string): Promise<ClaimDetails>;

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
  getConfig(): FetchPetConfig;
}

/**
 * Fetch Pet client implementation using Playwright
 */
export class FetchPetClient implements IFetchPetClient {
  private browser: import('playwright').Browser | null = null;
  private context: import('playwright').BrowserContext | null = null;
  private page: import('playwright').Page | null = null;
  private config: FetchPetConfig;
  private isInitialized = false;

  // Store pending claim data for submission confirmation
  private pendingClaimData: ClaimSubmissionData | null = null;
  private pendingConfirmationToken: string | null = null;

  constructor(config: FetchPetConfig) {
    this.config = config;
    // Ensure download directory exists
    if (!existsSync(config.downloadDir)) {
      mkdirSync(config.downloadDir, { recursive: true });
    }
  }

  private async ensureBrowser(): Promise<import('playwright').Page> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    return this.page;
  }

  /**
   * Extract claim data from claim cards on the current page.
   * Shared between getActiveClaims and getHistoricalClaims.
   */
  private async extractClaimsFromPage(
    page: import('playwright').Page,
    defaultStatus: string
  ): Promise<Claim[]> {
    const claims: Claim[] = [];
    const claimCards = await page.$$('.claim-card-data-list');

    for (let i = 0; i < claimCards.length; i++) {
      const card = claimCards[i];

      // Get pet name from .pet-name or .claims-title
      const petEl = await card.$('.pet-name, .claims-title');
      const petName = petEl ? (await petEl.textContent())?.trim() || 'Unknown Pet' : 'Unknown Pet';

      // Get status from .status-text.status
      const statusEl = await card.$('.status-text.status');
      const status = statusEl
        ? (await statusEl.textContent())?.trim().toLowerCase() || defaultStatus
        : defaultStatus;

      // Get payout/amount from .claim-invoice-details.fw-700
      const amountEl = await card.$('.claim-invoice-details.fw-700');
      const claimAmount = amountEl ? (await amountEl.textContent())?.trim() || '' : '';

      // Get reason for visit from .treated-for, .disease
      const reasonEl = await card.$('.treated-for, .disease, .claim-id.treated-for');
      const description = reasonEl ? (await reasonEl.textContent())?.trim() : undefined;

      // Include index to ensure uniqueness when pet+description are the same
      const claimId = `claim-${i}-${petName}-${description || 'unknown'}`
        .replace(/\s+/g, '-')
        .toLowerCase();

      claims.push({
        claimId,
        petName,
        claimDate: '', // Date not visible on card, only in modal
        claimAmount,
        status,
        description,
      });
    }

    return claims;
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
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      acceptDownloads: true,
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout);

    // Navigate to login page
    await this.page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle');

    // Fill in login credentials - Fetch Pet uses a React app
    // Try to find email input
    const emailInput = await this.page.$('input[type="email"], input[name="email"], #email');
    if (emailInput) {
      await emailInput.fill(this.config.username);
    } else {
      // Try alternative selectors
      await this.page.fill(
        'input[placeholder*="email" i], input[autocomplete="email"]',
        this.config.username
      );
    }

    // Fill password
    const passwordInput = await this.page.$(
      'input[type="password"], input[name="password"], #password'
    );
    if (passwordInput) {
      await passwordInput.fill(this.config.password);
    } else {
      await this.page.fill('input[placeholder*="password" i]', this.config.password);
    }

    // Click sign in button
    const signInButton = await this.page.$(
      'button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")'
    );
    if (signInButton) {
      await signInButton.click();
    } else {
      await this.page.click('button:has-text("Sign"), button:has-text("Log")');
    }

    // Wait for navigation to complete (should redirect away from login)
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Verify login was successful by checking URL or presence of dashboard elements
    const currentUrl = this.page.url();
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      // Check for error messages
      const errorMsg = await this.page.$('.error, [class*="error"], [role="alert"]');
      if (errorMsg) {
        const errorText = await errorMsg.textContent();
        throw new Error(`Login failed: ${errorText || 'Invalid credentials'}`);
      }
      throw new Error('Login failed - still on login page. Check your credentials.');
    }

    this.isInitialized = true;
  }

  async prepareClaimToSubmit(
    petName: string,
    invoiceDate: string,
    invoiceAmount: string,
    providerName: string,
    claimDescription: string,
    invoiceFilePath?: string,
    medicalRecordsPath?: string
  ): Promise<ClaimSubmissionData> {
    const page = await this.ensureBrowser();
    const validationErrors: string[] = [];

    // Navigate to claims page and click "Submit a claim" button
    await page.goto(`${BASE_URL}/claims/active`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Look for "Submit a claim" button to open the modal (it's a teal/filled button)
    const submitClaimButton = await page.$(
      'button.filled-btn:has-text("Submit a claim"), button:has-text("Submit a claim")'
    );
    if (submitClaimButton) {
      await submitClaimButton.click();
      await page.waitForTimeout(2000);
    } else {
      validationErrors.push('Could not find "Submit a claim" button');
      // Return early - no point filling out a form that doesn't exist
      return this.buildClaimResult(
        petName,
        invoiceDate,
        invoiceAmount,
        providerName,
        claimDescription,
        invoiceFilePath,
        medicalRecordsPath,
        validationErrors
      );
    }

    // Note: petName is used for claim identification but pet selection in the form
    // is typically pre-populated based on the user's account. If the account has
    // multiple pets, the form may default to the first pet regardless of petName.

    // 1. Select primary vet - uses a typeahead input with class rbt-input-main
    const vetInput = await page.$('.rbt-input-main, input[placeholder="Search vets"]');
    if (vetInput) {
      await vetInput.click({ clickCount: 3 }); // Select all
      await vetInput.fill(providerName);
      await page.waitForTimeout(1000);

      // Look for autocomplete dropdown option and click it
      const vetOption = await page.$('[role="listbox"] [role="option"], .rbt-menu [role="option"]');
      if (vetOption) {
        await vetOption.click();
        await page.waitForTimeout(500);
      }
    } else {
      const existingVet = await page.$('.rbt-input-main');
      if (!existingVet) {
        validationErrors.push('Could not find vet selection field');
      }
    }

    // 2. Select diagnosis/reason for visit - uses MuiAutocomplete with "Search diagnoses" placeholder
    const diagnosisInput = await page.$(
      '.MuiAutocomplete-input, input[placeholder="Search diagnoses"]'
    );
    if (diagnosisInput) {
      await diagnosisInput.click();
      await diagnosisInput.fill(claimDescription);
      await page.waitForTimeout(1000);

      const diagOption = await page.$(
        '.MuiAutocomplete-listbox [role="option"], [role="listbox"] [role="option"]'
      );
      if (diagOption) {
        await diagOption.click();
        await page.waitForTimeout(500);
      }
    }

    // 3. Fill in additional details (optional textarea)
    const detailsTextarea = await page.$('textarea[placeholder="Describe the visit"], textarea');
    if (detailsTextarea) {
      await detailsTextarea.fill(
        `Date: ${invoiceDate}, Amount: ${invoiceAmount}. ${claimDescription}`
      );
    }

    // 4. Handle invoice file upload
    if (invoiceFilePath) {
      const invoiceUpload = await page.$('input[type="file"]');
      if (invoiceUpload) {
        await invoiceUpload.setInputFiles(invoiceFilePath);
        await page.waitForTimeout(1000);
      } else {
        validationErrors.push('Could not find invoice file upload field');
      }
    } else {
      validationErrors.push('Invoice file is required for claim submission');
    }

    // 5. Handle medical records upload (optional)
    if (medicalRecordsPath) {
      const uploadInputs = await page.$$('input[type="file"]');
      if (uploadInputs.length > 1) {
        await uploadInputs[1].setInputFiles(medicalRecordsPath);
        await page.waitForTimeout(1000);
      }
    }

    // Check for form validation errors (scope to form elements only)
    await page.waitForTimeout(1000);
    const formErrors = await page.$$('.invalid-feedback, .form-error, [class*="field-error"]');
    for (const errorEl of formErrors) {
      const errorText = await errorEl.textContent();
      if (errorText && errorText.trim() && !validationErrors.includes(errorText.trim())) {
        validationErrors.push(errorText.trim());
      }
    }

    return this.buildClaimResult(
      petName,
      invoiceDate,
      invoiceAmount,
      providerName,
      claimDescription,
      invoiceFilePath,
      medicalRecordsPath,
      validationErrors
    );
  }

  private buildClaimResult(
    petName: string,
    invoiceDate: string,
    invoiceAmount: string,
    providerName: string,
    claimDescription: string,
    invoiceFilePath: string | undefined,
    medicalRecordsPath: string | undefined,
    validationErrors: string[]
  ): ClaimSubmissionData {
    // Generate confirmation token
    const confirmationToken = randomBytes(16).toString('hex');

    const claimData: ClaimSubmissionData = {
      petName,
      invoiceDate,
      invoiceAmount,
      providerName,
      claimDescription,
      invoiceFile: invoiceFilePath,
      medicalRecordsFile: medicalRecordsPath,
      isReadyToSubmit: validationErrors.length === 0,
      validationErrors,
      confirmationMessage:
        validationErrors.length === 0
          ? `IMPORTANT: This claim has been prepared but NOT submitted yet.

To submit this claim, call submit_claim with confirmation_token: "${confirmationToken}"

Claim Details:
- Pet: ${petName}
- Invoice Date: ${invoiceDate}
- Amount: ${invoiceAmount}
- Provider: ${providerName}
- Description: ${claimDescription}
${invoiceFilePath ? `- Invoice File: ${invoiceFilePath}` : ''}
${medicalRecordsPath ? `- Medical Records: ${medicalRecordsPath}` : ''}

The user MUST explicitly confirm they want to submit this claim before calling submit_claim.`
          : `Cannot submit claim due to validation errors:\n${validationErrors.join('\n')}`,
    };

    // Store pending claim data for later submission
    if (validationErrors.length === 0) {
      this.pendingClaimData = claimData;
      this.pendingConfirmationToken = confirmationToken;
    }

    return claimData;
  }

  async submitClaim(confirmationToken: string): Promise<ClaimSubmissionResult> {
    const page = await this.ensureBrowser();

    // Verify confirmation token matches
    if (!this.pendingConfirmationToken || this.pendingConfirmationToken !== confirmationToken) {
      return {
        success: false,
        message:
          'Invalid or expired confirmation token. Please call prepare_claim_to_submit first to get a new token.',
      };
    }

    if (!this.pendingClaimData || !this.pendingClaimData.isReadyToSubmit) {
      return {
        success: false,
        message:
          'No valid claim prepared for submission. Please call prepare_claim_to_submit first.',
      };
    }

    // Find and click the submit button
    const submitButton = await page.$(
      'button[type="submit"], button:has-text("Submit"), button:has-text("File Claim"), button:has-text("Submit Claim")'
    );

    if (!submitButton) {
      return {
        success: false,
        message: 'Could not find submit button on the page',
      };
    }

    await submitButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for success confirmation
    const successMessage = await page.$(
      '.success, [class*="success"], [class*="confirmation"], [role="alert"]:has-text("success")'
    );

    if (successMessage) {
      const successText = await successMessage.textContent();

      // Try to extract claim ID or confirmation number
      let claimId: string | undefined;
      const claimIdMatch = successText?.match(/claim[:\s#]*([A-Z0-9-]+)/i);
      if (claimIdMatch) {
        claimId = claimIdMatch[1];
      }

      // Clear pending data
      this.pendingClaimData = null;
      this.pendingConfirmationToken = null;

      return {
        success: true,
        message: successText || 'Claim submitted successfully',
        claimId,
        confirmationNumber: claimId,
      };
    }

    // Check for error
    const errorMessage = await page.$(
      '.error, [class*="error"], [role="alert"]:not(:has-text("success"))'
    );
    if (errorMessage) {
      const errorText = await errorMessage.textContent();
      return {
        success: false,
        message: `Submission failed: ${errorText}`,
      };
    }

    // Check URL for indication of success (redirected to claims list, etc.)
    const currentUrl = page.url();
    if (
      currentUrl.includes('claims') &&
      !currentUrl.includes('new') &&
      !currentUrl.includes('submit')
    ) {
      // Clear pending data
      this.pendingClaimData = null;
      this.pendingConfirmationToken = null;

      return {
        success: true,
        message: 'Claim appears to have been submitted successfully (redirected to claims page)',
      };
    }

    return {
      success: false,
      message: 'Could not confirm claim submission. Please check your claims list.',
    };
  }

  async getActiveClaims(): Promise<Claim[]> {
    const page = await this.ensureBrowser();

    await page.goto(`${BASE_URL}/claims/active`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Make sure we're on the Active tab
    const activeTab = await page.$('a[href="/claims/active"], a:has-text("Active")');
    if (activeTab) {
      const isActive = await activeTab.evaluate(
        (el) => el.classList.contains('active') || el.getAttribute('aria-current') === 'page'
      );
      if (!isActive) {
        await activeTab.click();
        await page.waitForLoadState('networkidle');
      }
    }

    return this.extractClaimsFromPage(page, 'pending');
  }

  async getHistoricalClaims(): Promise<Claim[]> {
    const page = await this.ensureBrowser();

    // Navigate directly to the closed/history claims page
    await page.goto(`${BASE_URL}/claims/closed`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    return this.extractClaimsFromPage(page, 'approved');
  }

  async getClaimDetails(claimId: string): Promise<ClaimDetails> {
    const page = await this.ensureBrowser();

    await page.goto(`${BASE_URL}/claims/active`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    let foundModal = false;

    // Try to match claim cards by content derived from the generated claimId
    // Generated IDs look like: "claim-0-nova-dental cleaning"
    // Strip the "claim-N-" prefix to get the meaningful search terms
    const searchTerms = claimId
      .replace(/^claim-\d+-/, '')
      .replace(/-/g, ' ')
      .trim();

    const claimCards = await page.$$('.claim-card-data-list');

    if (searchTerms && searchTerms !== 'unknown') {
      for (const card of claimCards) {
        const cardText = ((await card.textContent()) || '').toLowerCase();
        const terms = searchTerms.toLowerCase();

        if (cardText.includes(terms)) {
          const seeSummaryLink = await card.$('.details-link');
          if (seeSummaryLink) {
            await seeSummaryLink.click();
            await page.waitForTimeout(2000);
            foundModal = true;
            break;
          }
        }
      }
    }

    // If no specific match, open the first claim's summary
    if (!foundModal) {
      const firstSeeSummary = await page.$('.details-link');
      if (firstSeeSummary) {
        await firstSeeSummary.click();
        await page.waitForTimeout(2000);
        foundModal = true;
      }
    }

    // If still not found, try History tab
    if (!foundModal) {
      const historyTab = await page.$('a[href="/claims/closed"], a:has-text("History")');
      if (historyTab) {
        await historyTab.click();
        await page.waitForLoadState('networkidle');

        const firstSeeSummary = await page.$('.details-link');
        if (firstSeeSummary) {
          await firstSeeSummary.click();
          await page.waitForTimeout(2000);
          foundModal = true;
        }
      }
    }

    // Extract claim details from the modal
    const details = await page.evaluate(() => {
      const modal = document.querySelector(
        '.claim-details-popup-container, .claim-details-popup, [role="dialog"]'
      );
      const container = modal || document.body;
      const text = container.textContent || '';

      const claimIdMatch = text.match(/#(\d+)/);
      const petMatch = text.match(/(\w+)'s claim/i);
      const dateMatch =
        text.match(/Date of visit\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
        text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      const payoutMatch = text.match(/Payout\s*\$?([\d,.]+)/i);
      const statusMatch = text.match(/Status:\s*(\w+)/i);
      const reasonMatch = text.match(/Reason for visit\s*([^\n]+)/i);

      return {
        claimId: claimIdMatch?.[1] || 'unknown',
        petName: petMatch?.[1] || 'Unknown Pet',
        claimDate: dateMatch?.[1] || '',
        claimAmount: payoutMatch ? `$${payoutMatch[1]}` : '',
        status: statusMatch?.[1]?.toLowerCase() || 'unknown',
        description: reasonMatch?.[1]?.trim(),
        providerName: undefined,
        reimbursementAmount: payoutMatch ? `$${payoutMatch[1]}` : undefined,
        deductible: undefined,
        copay: undefined,
      };
    });

    // Look for and download EOB if available
    const eobLink = await page.$('.claim-details-popup div:has-text("Explanation of Benefits")');
    let localEobPath: string | undefined;
    let eobSummary: string | undefined;

    if (eobLink) {
      try {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        await eobLink.click();
        const download = await downloadPromise;

        const safeClaimId = details.claimId.replace(/[^a-zA-Z0-9]/g, '');
        localEobPath = join(this.config.downloadDir, `eob_${safeClaimId}_${Date.now()}.pdf`);
        await download.saveAs(localEobPath);

        eobSummary = `EOB downloaded to: ${localEobPath}`;
      } catch {
        eobSummary = 'EOB link found but download failed';
      }
    }

    // Look for and download invoice if available
    const invoiceLink = await page.$(
      '.claim-details-popup div:has-text("Invoice"):not(:has-text("Explanation"))'
    );
    let localInvoicePath: string | undefined;
    let invoiceSummary: string | undefined;

    if (invoiceLink) {
      try {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        await invoiceLink.click();
        const download = await downloadPromise;

        const safeClaimId = details.claimId.replace(/[^a-zA-Z0-9]/g, '');
        localInvoicePath = join(
          this.config.downloadDir,
          `invoice_${safeClaimId}_${Date.now()}.pdf`
        );
        await download.saveAs(localInvoicePath);

        invoiceSummary = `Invoice downloaded to: ${localInvoicePath}`;
      } catch {
        invoiceSummary = 'Invoice link found but download failed';
      }
    }

    // Close the modal
    const closeButton = await page.$(
      '.claim-details-popup img[alt="img"], .claim-details-popup [class*="close"]'
    );
    if (closeButton) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    return {
      ...details,
      eobSummary,
      invoiceSummary,
      localEobPath,
      localInvoicePath,
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

  getConfig(): FetchPetConfig {
    return this.config;
  }
}

export type ClientFactory = () => IFetchPetClient;

/**
 * Callback invoked when background login fails
 * @param error The error that caused login to fail
 */
export type LoginFailedCallback = (error: Error) => void;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'fetchpet-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Track active client for cleanup
  let activeClient: IFetchPetClient | null = null;

  // Track background login state
  let loginPromise: Promise<void> | null = null;
  let loginFailed = false;
  let loginError: Error | null = null;
  let onLoginFailed: LoginFailedCallback | null = null;

  /**
   * Create the client instance (but don't initialize/login yet)
   */
  const createClient = (): IFetchPetClient => {
    const username = process.env.FETCHPET_USERNAME;
    const password = process.env.FETCHPET_PASSWORD;
    const headless = process.env.HEADLESS !== 'false';
    const timeout = parseInt(process.env.TIMEOUT || '30000', 10);
    const downloadDir = process.env.FETCHPET_DOWNLOAD_DIR || '/tmp/fetchpet-downloads';

    if (!username || !password) {
      throw new Error(
        'FETCHPET_USERNAME and FETCHPET_PASSWORD environment variables must be configured'
      );
    }

    activeClient = new FetchPetClient({
      username,
      password,
      headless,
      timeout,
      downloadDir,
    });
    return activeClient;
  };

  /**
   * Start background login process
   * This should be called after the server is connected to start authentication
   * without blocking the stdio connection.
   *
   * @param onFailed Callback invoked if login fails - use this to close the server
   */
  const startBackgroundLogin = (onFailed?: LoginFailedCallback): void => {
    if (loginPromise) {
      // Already started
      return;
    }

    onLoginFailed = onFailed || null;

    // Create client if not already created
    if (!activeClient) {
      createClient();
    }

    // Start login in background
    loginPromise = activeClient!.initialize().catch((error) => {
      loginFailed = true;
      loginError = error instanceof Error ? error : new Error(String(error));

      // Invoke callback to notify about login failure
      if (onLoginFailed) {
        onLoginFailed(loginError);
      }

      // Re-throw to make the promise rejected
      throw loginError;
    });
  };

  /**
   * Get a client that is ready to use (login completed)
   * If background login was started, this waits for it to complete.
   * If not started, this will initialize synchronously (blocking).
   */
  const getReadyClient = async (): Promise<IFetchPetClient> => {
    // If login already failed, throw immediately
    if (loginFailed && loginError) {
      throw new Error(`Login failed: ${loginError.message}`);
    }

    // If background login is in progress, wait for it
    if (loginPromise) {
      await loginPromise;
      return activeClient!;
    }

    // No background login started - create and initialize client now (legacy behavior)
    if (!activeClient) {
      createClient();
    }
    await activeClient!.initialize();
    return activeClient!;
  };

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create our managed client getter
    const factory = clientFactory || (() => activeClient || createClient());

    // Create tools with a special async getter that waits for background login
    const registerTools = createRegisterTools(factory, getReadyClient);
    registerTools(server);
  };

  const cleanup = async () => {
    if (activeClient) {
      await activeClient.close();
      activeClient = null;
    }
    // Reset login state
    loginPromise = null;
    loginFailed = false;
    loginError = null;
  };

  return { server, registerHandlers, cleanup, startBackgroundLogin };
}
