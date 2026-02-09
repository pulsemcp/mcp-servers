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
    await this.page.waitForTimeout(3000);

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

    // Click sign in button and wait for navigation simultaneously
    // The login click triggers a full page navigation that destroys the execution context,
    // so we must use Promise.all to avoid "Execution context was destroyed" errors.
    const signInButton = await this.page.$(
      'button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")'
    );
    if (signInButton) {
      await Promise.all([
        this.page.waitForURL((url) => !url.toString().includes('login'), {
          timeout: this.config.timeout,
        }),
        signInButton.click(),
      ]);
    } else {
      await Promise.all([
        this.page.waitForURL((url) => !url.toString().includes('login'), {
          timeout: this.config.timeout,
        }),
        this.page.click('button:has-text("Sign"), button:has-text("Log")'),
      ]);
    }

    // Wait for SPA to settle after redirect
    await this.page.waitForTimeout(3000);

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
    // Wait for the page to render (claim cards or the submit button)
    await page
      .waitForSelector('.claim-card-data-list, button:has-text("Submit a claim"), .filled-btn', {
        timeout: 10000,
      })
      .catch(() => {});
    await page.waitForTimeout(2000);

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
    await page.waitForTimeout(3000);
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
    // Wait for claim cards or a "no claims" indicator to appear
    await page
      .waitForSelector('.claim-card-data-list, .no-claims, .claims-empty', { timeout: 10000 })
      .catch(() => {
        // If neither appears, the page may still be loading or truly has no claims
      });
    await page.waitForTimeout(2000);

    // Make sure we're on the Active tab
    const activeTab = await page.$('a[href="/claims/active"], a:has-text("Active")');
    if (activeTab) {
      const isActive = await activeTab.evaluate(
        (el) => el.classList.contains('active') || el.getAttribute('aria-current') === 'page'
      );
      if (!isActive) {
        await activeTab.click();
        await page
          .waitForSelector('.claim-card-data-list, .no-claims, .claims-empty', { timeout: 10000 })
          .catch(() => {});
        await page.waitForTimeout(2000);
      }
    }

    return this.extractClaimsFromPage(page, 'pending');
  }

  async getHistoricalClaims(): Promise<Claim[]> {
    const page = await this.ensureBrowser();

    // Navigate directly to the closed/history claims page
    await page.goto(`${BASE_URL}/claims/closed`, { waitUntil: 'domcontentloaded' });
    // Wait for history claim elements or empty state
    await page
      .waitForSelector('.claims-coverage-container, .claim-number-closed, .no-claims', {
        timeout: 10000,
      })
      .catch(() => {});
    await page.waitForTimeout(2000);

    // The history page initially shows only the most recent 3 claims per pet.
    // Click "View all" to expand and show the complete history.
    const viewAllLinks = await page.$$('.view-all-label .cursor-pointer, .view-all-label span');
    for (const link of viewAllLinks) {
      await link.click();
      await page.waitForTimeout(1000);
    }

    // History tab uses a different table-like layout with different CSS classes
    // than the Active tab's card layout. Extract using history-specific selectors.
    return this.extractHistoricalClaimsFromPage(page);
  }

  /**
   * Extract claims from the History tab's table layout.
   * History uses .claim-number-closed, .closed-claim-price, .claims-history-title
   * which is completely different from the Active tab's .claim-card-data-list structure.
   */
  private async extractHistoricalClaimsFromPage(page: import('playwright').Page): Promise<Claim[]> {
    return page.evaluate(() => {
      const claims: Array<{
        claimId: string;
        petName: string;
        claimDate: string;
        claimAmount: string;
        status: string;
        description?: string;
      }> = [];

      // Each pet has a container with .claims-history-title for the pet name
      // followed by rows of claims with .claim-number-closed and .closed-claim-price
      const containers = Array.from(document.querySelectorAll('.claims-coverage-container'));

      for (const container of containers) {
        const petNameEl = container.querySelector('.claims-history-title');
        const petName = petNameEl?.textContent?.trim() || 'Unknown Pet';

        // Each claim row has .claim-number-closed elements (claim ID and date)
        // and .closed-claim-price for the amount
        const claimNumbers = container.querySelectorAll('.claim-number-closed');
        const claimPrices = container.querySelectorAll('.closed-claim-price');

        // Claim numbers come in pairs: [claimId, date, claimId, date, ...]
        for (let i = 0; i < claimNumbers.length; i += 2) {
          const claimIdText = claimNumbers[i]?.textContent?.trim() || '';
          const dateText = claimNumbers[i + 1]?.textContent?.trim() || '';
          const priceIndex = Math.floor(i / 2);
          const amount = claimPrices[priceIndex]?.textContent?.trim() || '';

          // Clean claim ID (remove # prefix)
          const cleanClaimId = claimIdText.replace('#', '');

          claims.push({
            claimId: cleanClaimId || `history-${priceIndex}`,
            petName,
            claimDate: dateText,
            claimAmount: amount,
            status: 'closed',
          });
        }
      }

      return claims;
    });
  }

  async getClaimDetails(claimId: string): Promise<ClaimDetails> {
    const page = await this.ensureBrowser();

    // Determine if this is a history claim (numeric ID like "006207086") or active claim
    const isHistoryClaim = /^\d+$/.test(claimId);

    if (isHistoryClaim) {
      // For history claims, navigate to history tab and click the matching "Details" button
      await page.goto(`${BASE_URL}/claims/closed`, { waitUntil: 'domcontentloaded' });
      await page
        .waitForSelector('.claims-coverage-container, .claim-number-closed', { timeout: 10000 })
        .catch(() => {});
      await page.waitForTimeout(2000);

      // Find the claim row matching this ID and click its Details button
      const claimNumber = `#${claimId}`;
      const clicked = await page.evaluate((targetId) => {
        const claimNums = document.querySelectorAll('.claim-number-closed');
        for (let i = 0; i < claimNums.length; i++) {
          if (claimNums[i].textContent?.trim() === targetId) {
            // The Details button is in the sibling .right-box of the parent flex container
            const row = claimNums[i].closest('.d-flex.align-items-center');
            const detailsBtn = row?.querySelector('.closed-claim-details-popup');
            if (detailsBtn instanceof HTMLElement) {
              detailsBtn.click();
              return true;
            }
          }
        }
        // Fallback: click the first Details button
        const first = document.querySelector('.closed-claim-details-popup');
        if (first instanceof HTMLElement) {
          first.click();
          return true;
        }
        return false;
      }, claimNumber);

      if (clicked) {
        await page.waitForSelector('.MuiDialog-root.generic-dialog', { timeout: 5000 });
        await page.waitForTimeout(1000);
      }
    } else {
      // For active claims, navigate to active tab and click "See summary"
      await page.goto(`${BASE_URL}/claims/active`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.claim-card-data-list', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);

      let foundModal = false;

      // Try to match by content from generated claimId (e.g. "claim-0-nova-lameness")
      const searchTerms = claimId
        .replace(/^claim-\d+-/, '')
        .replace(/-/g, ' ')
        .trim();

      const claimCards = await page.$$('.claim-card-data-list');

      if (searchTerms && searchTerms !== 'unknown') {
        for (const card of claimCards) {
          const cardText = ((await card.textContent()) || '').toLowerCase();
          if (cardText.includes(searchTerms.toLowerCase())) {
            const seeSummaryLink = await card.$('.details-link');
            if (seeSummaryLink) {
              await seeSummaryLink.click();
              await page.waitForSelector('.MuiDialog-root.generic-dialog', { timeout: 5000 });
              await page.waitForTimeout(1000);
              foundModal = true;
              break;
            }
          }
        }
      }

      // Fallback: click the first "See summary" link
      if (!foundModal) {
        const firstSeeSummary = await page.$('.details-link');
        if (firstSeeSummary) {
          await firstSeeSummary.click();
          await page.waitForSelector('.MuiDialog-root.generic-dialog', { timeout: 5000 });
          await page.waitForTimeout(1000);
        }
      }
    }

    // Extract claim details from the MuiDialog popup
    // Both active and history popups use MuiDialog-root.generic-dialog
    const details = await page.evaluate(() => {
      const dialog = document.querySelector('.MuiDialog-root.generic-dialog .MuiDialog-paper');
      if (!dialog) return null;

      const text = dialog.textContent || '';

      // Claim ID: either "CLAIM #006207086" (history) or "#006271662" (active)
      const claimIdMatch = text.match(/#(\d+)/);

      // Pet name: use DOM selectors for reliable extraction
      // Active popup: "Nova's claim" in .fw-700 title
      // History popup: <span class="claim-id-number" title="Nova">Nova</span> under Pet label
      let petName: string | undefined;
      const petIdEl = dialog.querySelector('.claim-part');
      if (petIdEl?.textContent?.trim() === 'Pet') {
        // History popup: pet name is in the next sibling's .claim-id-number
        const petValueEl = petIdEl.parentElement?.querySelector('.claim-id-number');
        petName = petValueEl?.textContent?.trim() || petValueEl?.getAttribute('title') || undefined;
      }
      if (!petName) {
        // Active popup: "Nova's claim" pattern
        const petMatch = text.match(/(\w+)'s claim/i);
        petName = petMatch?.[1];
      }

      // Status: "Status: Approved" (active) or "approved" in message (history)
      const statusEl = dialog.querySelector('.status-text.status');
      let status = statusEl?.textContent?.trim().toLowerCase();
      if (!status) {
        if (text.includes('approved')) status = 'approved';
        else if (text.includes('denied')) status = 'denied';
        else status = 'unknown';
      }

      // Reason for visit (active popup only)
      const reasonMatch = text.match(/Reason for visit\s*([^\n]+)/i);

      // Date: "Date of visit 01/19/2026" (active) or "Invoice date 12/31/2025" (history)
      const dateMatch =
        text.match(/Date of visit\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
        text.match(/Invoice date\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
        text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

      // Amount: "Payout $94.88" (active) or "Invoice amount $876.71" (history)
      const payoutEl = dialog.querySelector('.claim-invoice-details.fw-700');
      let claimAmount = payoutEl?.textContent?.trim();
      if (!claimAmount) {
        const amountEl = dialog.querySelector('.claim-value');
        claimAmount = amountEl?.textContent?.trim();
      }
      if (!claimAmount) {
        const amountMatch = text.match(/\$[\d,.]+/);
        claimAmount = amountMatch?.[0];
      }

      // Policy number (history popup)
      const policyMatch = text.match(/#(WAG\w+-\d+)/);

      // List all document types available
      const docElements = Array.from(dialog.querySelectorAll('.claims-record-description'));
      const documents: string[] = [];
      for (const doc of docElements) {
        const docName = doc.textContent?.trim();
        if (docName) documents.push(docName);
      }

      return {
        claimId: claimIdMatch?.[1] || 'unknown',
        petName: petName || 'Unknown Pet',
        claimDate: dateMatch?.[1] || '',
        claimAmount: claimAmount || '',
        status,
        description: reasonMatch?.[1]?.trim(),
        policyNumber: policyMatch ? `#${policyMatch[1]}` : undefined,
        documents,
      };
    });

    if (!details) {
      return {
        claimId,
        petName: 'Unknown Pet',
        claimDate: '',
        claimAmount: '',
        status: 'unknown',
      };
    }

    // Try to download EOB and Invoice documents from the popup
    // Documents are listed with .claims-record-description text inside clickable containers
    let localEobPath: string | undefined;
    let eobSummary: string | undefined;
    let localInvoicePath: string | undefined;
    let invoiceSummary: string | undefined;

    const dialogSelector = '.MuiDialog-root.generic-dialog .MuiDialog-paper';

    // Download EOB if listed in documents
    if (details.documents.includes('Explanation of Benefits')) {
      try {
        const eobClickable = await page.$(
          `${dialogSelector} .claims-record-description:text("Explanation of Benefits")`
        );
        if (eobClickable) {
          // Click the parent container which is the clickable element
          const parent = await eobClickable.evaluateHandle((el) => el.closest('.cursor-pointer'));
          if (parent) {
            const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
            await (parent as import('playwright').ElementHandle<Element>).click();
            const download = await downloadPromise;

            const safeClaimId = details.claimId.replace(/[^a-zA-Z0-9]/g, '');
            localEobPath = join(this.config.downloadDir, `eob_${safeClaimId}_${Date.now()}.pdf`);
            await download.saveAs(localEobPath);
            eobSummary = `EOB downloaded to: ${localEobPath}`;
          }
        }
      } catch {
        eobSummary = 'EOB link found but download failed';
      }
    }

    // Download first Invoice if listed in documents
    if (details.documents.includes('Invoice')) {
      try {
        const invoiceElements = await page.$$(
          `${dialogSelector} .claims-record-description:text("Invoice")`
        );
        // Take the first Invoice element (skip "Explanation of Benefits" which also has a similar structure)
        const invoiceEl = invoiceElements[0];
        if (invoiceEl) {
          const parent = await invoiceEl.evaluateHandle((el) => el.closest('.cursor-pointer'));
          if (parent) {
            const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
            await (parent as import('playwright').ElementHandle<Element>).click();
            const download = await downloadPromise;

            const safeClaimId = details.claimId.replace(/[^a-zA-Z0-9]/g, '');
            localInvoicePath = join(
              this.config.downloadDir,
              `invoice_${safeClaimId}_${Date.now()}.pdf`
            );
            await download.saveAs(localInvoicePath);
            invoiceSummary = `Invoice downloaded to: ${localInvoicePath}`;
          }
        }
      } catch {
        invoiceSummary = 'Invoice link found but download failed';
      }
    }

    // Close the dialog
    const closeButton = await page.$(
      `${dialogSelector} .simple-dialog-close-icon, ${dialogSelector} img[alt="img"], ${dialogSelector} img[alt="Close"]`
    );
    if (closeButton) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    return {
      claimId: details.claimId,
      petName: details.petName,
      claimDate: details.claimDate,
      claimAmount: details.claimAmount,
      status: details.status,
      description: details.description,
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
