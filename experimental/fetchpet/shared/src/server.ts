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
import { mkdirSync, existsSync, writeFileSync } from 'fs';
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
   * Get all claims (both active and historical)
   */
  getClaims(): Promise<Claim[]>;

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
  private pendingTokenCreatedAt: number | null = null;
  // Token expires after 2 minutes (browser modal may close after this)
  private static readonly TOKEN_EXPIRY_MS = 120_000;

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
   * Extract claim data from active claim cards on the current page.
   * The history tab uses extractHistoricalClaimsFromPage instead,
   * due to a completely different DOM structure.
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
    const playwrightExtra = await import('playwright-extra');
    const chromium = playwrightExtra.chromium;
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

    // Click sign in button, then wait for post-login indicators.
    // We avoid Promise.all([waitForURL, click]) because waitForURL with the default
    // 'load' waitUntil can hang when third-party resources (analytics, ads) fail to load.
    // Instead, click the button and poll for URL change or dashboard elements.
    // Note: Splitting click() and waitForFunction() is safe here because Playwright's
    // waitForFunction() survives page navigations by re-evaluating in new execution contexts,
    // unlike waitForURL('load') which depends on the load event firing.
    const signInButton = await this.page.$(
      'button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")'
    );
    if (signInButton) {
      await signInButton.click();
    } else {
      await this.page.click('button:has-text("Sign"), button:has-text("Log")');
    }

    // Wait for either: URL changes away from login, or dashboard nav appears.
    // On timeout, fall through to the login verification below which provides
    // a more specific error message.
    await this.page
      .waitForFunction(
        () => {
          const url = window.location.href;
          // Check URL no longer contains 'login'
          if (!url.includes('login')) return true;
          // Also check for dashboard elements (sidebar nav links)
          if (document.querySelector('a[href="/claims"], a[href="/home"]')) return true;
          return false;
        },
        { timeout: this.config.timeout }
      )
      .catch((error) => {
        // Only swallow timeouts; re-throw unexpected errors
        if (error instanceof Error && error.message.includes('Timeout')) {
          return; // Fall through to login verification below
        }
        throw error;
      });

    // Wait for SPA to settle after redirect
    await this.page.waitForTimeout(3000);

    // Verify login was successful by checking URL or presence of dashboard elements
    const currentUrl = this.page.url();
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      // Save debug screenshot for troubleshooting
      await this.page
        .screenshot({ path: join(this.config.downloadDir, `login-debug-${Date.now()}.png`) })
        .catch(() => {});

      // Check for specific login error messages (not generic error classes which may have false positives)
      const errorMsg = await this.page.$('.error-text, [role="alert"]');
      if (errorMsg) {
        const errorText = (await errorMsg.textContent())?.trim();
        if (errorText) {
          throw new Error(`Login failed: ${errorText}`);
        }
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

    // 3. Fill in additional details (optional - may be textarea or input)
    const detailsField = await page.$(
      'textarea[placeholder="Describe the visit"], textarea, input[aria-label*="details" i], input[placeholder="Describe the visit"]'
    );
    if (detailsField) {
      await detailsField.fill(
        `Date: ${invoiceDate}, Amount: ${invoiceAmount}. ${claimDescription}`
      );
    }

    // 4. Handle invoice file upload
    if (invoiceFilePath) {
      const invoiceUpload = await page.$('input[type="file"]');
      if (invoiceUpload) {
        await invoiceUpload.setInputFiles(invoiceFilePath);

        // After uploading, an "Upload an invoice" dialog may appear asking for
        // invoice date and amount. Wait for the dialog to appear rather than
        // using a fixed timeout, which could miss slow-loading dialogs.
        const invoiceDateInput = await page
          .waitForSelector('input[placeholder="MM/DD/YYYY"]', { timeout: 5000 })
          .catch(() => null);
        if (invoiceDateInput) {
          // Parse the invoice date to extract month, day, and year.
          // Supports both YYYY-MM-DD (ISO) and MM/DD/YYYY (US) input formats.
          let targetMonth = 0;
          let targetDay = 0;
          let targetYear = 0;
          const isoMatch = invoiceDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          const usMatch = invoiceDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (isoMatch) {
            [, targetYear, targetMonth, targetDay] = isoMatch.map(Number);
          } else if (usMatch) {
            [, targetMonth, targetDay, targetYear] = usMatch.map(Number);
          }

          if (targetMonth && targetDay && targetYear) {
            // Use the calendar picker to select the date. keyboard.type() does not
            // work with react-datepicker because clicking the input opens the calendar
            // which intercepts keystrokes. Instead, navigate months and click the day.
            await invoiceDateInput.click();
            await page.waitForTimeout(500);

            // Navigate to the correct month/year by clicking back/forward arrows
            const monthNames = [
              '',
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December',
            ];
            const targetLabel = `${monthNames[targetMonth]} ${targetYear}`;

            for (let i = 0; i < 24; i++) {
              const currentLabel = await page
                .$eval('.react-datepicker__current-month', (el) => el.textContent)
                .catch(() => null);
              if (currentLabel === targetLabel) break;

              // Determine direction: parse current month/year to compare
              const currentMatch = currentLabel?.match(/^(\w+)\s+(\d{4})$/);
              if (!currentMatch) {
                validationErrors.push(
                  `Could not parse calendar header "${currentLabel}" while navigating to ${targetLabel}`
                );
                break;
              }
              const currentMonthIdx = monthNames.indexOf(currentMatch[1]);
              const currentYearNum = parseInt(currentMatch[2], 10);
              const currentTotal = currentYearNum * 12 + currentMonthIdx;
              const targetTotal = targetYear * 12 + targetMonth;

              if (targetTotal < currentTotal) {
                const prevBtn = await page.$('.react-datepicker__navigation--previous');
                if (prevBtn) {
                  await prevBtn.click();
                  await page.waitForTimeout(300);
                } else {
                  validationErrors.push('Calendar does not allow navigating further back');
                  break;
                }
              } else {
                const nextBtn = await page.$('.react-datepicker__navigation--next');
                if (nextBtn) {
                  await nextBtn.click();
                  await page.waitForTimeout(300);
                } else {
                  validationErrors.push('Calendar does not allow navigating further forward');
                  break;
                }
              }
            }

            // Click the target day. react-datepicker uses 3-digit zero-padded
            // day classes (e.g., --006 for the 6th, --015 for the 15th).
            const dayPadded = String(targetDay).padStart(3, '0');
            const dayEl = await page.$(
              `.react-datepicker__day--${dayPadded}:not(.react-datepicker__day--outside-month)`
            );
            if (dayEl) {
              await dayEl.click();
              await page.waitForTimeout(500);
            } else {
              validationErrors.push(`Could not find day ${targetDay} in the calendar picker`);
            }
          } else {
            validationErrors.push(
              `Could not parse invoice date "${invoiceDate}". Expected YYYY-MM-DD or MM/DD/YYYY format.`
            );
          }

          // Fill invoice amount
          const amountInput = await page.$('input.invoice-amount');
          if (amountInput) {
            // Strip $ and any whitespace from the amount
            const cleanAmount = invoiceAmount.replace(/[$\s,]/g, '');
            await amountInput.click();
            await amountInput.fill(cleanAmount);
            await page.waitForTimeout(500);
          } else {
            validationErrors.push('Could not find invoice amount field in upload dialog');
          }

          // Click Continue to close the invoice upload dialog
          const continueBtn = await page.$('button:has-text("Continue")');
          if (continueBtn) {
            await continueBtn.click();
            await page.waitForTimeout(2000);
          } else {
            validationErrors.push('Could not find Continue button in invoice upload dialog');
          }
        }
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
      this.pendingTokenCreatedAt = Date.now();
    }

    return claimData;
  }

  async submitClaim(confirmationToken: string): Promise<ClaimSubmissionResult> {
    // NOTE: This method assumes the claim form is still open from prepareClaimToSubmit.
    // The browser state (open modal with filled form) must be preserved between calls.
    // If too much time passes, the SPA may close the modal or navigate away, causing
    // the submit button to not be found. The AI agent should call this promptly after
    // receiving user confirmation.
    const page = await this.ensureBrowser();

    // Verify confirmation token matches and hasn't expired
    if (!this.pendingConfirmationToken || this.pendingConfirmationToken !== confirmationToken) {
      return {
        success: false,
        message:
          'Invalid or expired confirmation token. Please call prepare_claim_to_submit first to get a new token.',
      };
    }

    if (
      this.pendingTokenCreatedAt &&
      Date.now() - this.pendingTokenCreatedAt > FetchPetClient.TOKEN_EXPIRY_MS
    ) {
      this.pendingClaimData = null;
      this.pendingConfirmationToken = null;
      this.pendingTokenCreatedAt = null;
      return {
        success: false,
        message:
          'Confirmation token has expired. The claim form may no longer be open. Please call prepare_claim_to_submit again.',
      };
    }

    if (!this.pendingClaimData || !this.pendingClaimData.isReadyToSubmit) {
      return {
        success: false,
        message:
          'No valid claim prepared for submission. Please call prepare_claim_to_submit first.',
      };
    }

    // Find and click the submit button on the claim form
    const submitButton = await page.$(
      'button.filled-btn:has-text("Submit"), button[type="submit"]:has-text("Submit"), button:has-text("File Claim"), button:has-text("Submit Claim")'
    );

    if (!submitButton) {
      return {
        success: false,
        message: 'Could not find submit button on the page',
      };
    }

    await submitButton.click();

    // After clicking Submit, a confirmation dialog may appear (e.g., "Medical records
    // required to process your claim") with "Go Back" and "Submit anyway" buttons.
    // This is a second MuiDialog that overlays the claim form and intercepts pointer events.
    // Use waitForSelector to reliably detect it rather than a fixed timeout.
    const submitAnywayButton = await page
      .waitForSelector('button:has-text("Submit anyway")', { timeout: 5000 })
      .catch(() => null);
    if (submitAnywayButton) {
      await submitAnywayButton.click();
    }

    await page.waitForTimeout(3000);

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
      this.pendingTokenCreatedAt = null;

      return {
        success: true,
        message: successText || 'Claim submitted successfully',
        claimId,
        confirmationNumber: claimId,
      };
    }

    // Check for error (use specific selectors to avoid false positives from layout classes)
    const errorMessage = await page.$('.error-text, [role="alert"]:not(:has-text("success"))');
    if (errorMessage) {
      const errorText = (await errorMessage.textContent())?.trim();
      if (errorText) {
        return {
          success: false,
          message: `Submission failed: ${errorText}`,
        };
      }
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
      this.pendingTokenCreatedAt = null;

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

  async getClaims(): Promise<Claim[]> {
    const page = await this.ensureBrowser();
    const allClaims: Claim[] = [];

    // 1. Get active claims from the Active tab
    await page.goto(`${BASE_URL}/claims/active`, { waitUntil: 'domcontentloaded' });
    await page
      .waitForSelector('.claim-card-data-list, .no-claims, .claims-empty', { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);

    const activeClaims = await this.extractClaimsFromPage(page, 'pending');
    allClaims.push(...activeClaims);

    // 2. Get historical claims from the History tab
    await page.goto(`${BASE_URL}/claims/closed`, { waitUntil: 'domcontentloaded' });
    await page
      .waitForSelector('.claims-coverage-container, .claim-number-closed, .no-claims', {
        timeout: 10000,
      })
      .catch(() => {});
    await page.waitForTimeout(2000);

    // Click "View all" to expand beyond the default 3 most recent claims per pet
    const viewAllLinks = await page.$$('.view-all-label .cursor-pointer, .view-all-label span');
    for (const link of viewAllLinks) {
      await link.click();
      await page.waitForTimeout(1000);
    }

    const historicalClaims = await this.extractHistoricalClaimsFromPage(page);
    allClaims.push(...historicalClaims);

    return allClaims;
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

  /**
   * Download a document by clicking its link, which opens a popup with a blob: iframe.
   * Fetches the blob data from the popup and saves it to disk.
   */
  private async downloadDocumentFromPopup(
    page: import('playwright').Page,
    selector: string,
    filePrefix: string
  ): Promise<{ localPath?: string; summary?: string }> {
    try {
      const descEl = await page.$(selector);
      if (!descEl) {
        return { summary: `Document link not found` };
      }

      // Click the parent .cursor-pointer container to trigger the popup
      const parent = await descEl.evaluateHandle((el) => el.closest('.cursor-pointer'));
      if (!parent) {
        return { summary: `Document container not found` };
      }

      // Listen for new popup page before clicking
      const popupPromise = page.context().waitForEvent('page', { timeout: 15000 });
      await (parent as import('playwright').ElementHandle<Element>).click();
      const popup = await popupPromise;

      // Wait for the popup to load its content
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      await popup.waitForTimeout(3000);

      // The popup contains an <iframe> with a blob: URL pointing to the PDF
      const blobData = await popup.evaluate(async () => {
        const iframe = document.querySelector('iframe');
        if (!iframe?.src) return null;

        const response = await fetch(iframe.src);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        // Convert to base64 for transfer back to Node.js
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return { base64: btoa(binary), type: blob.type, size: blob.size };
      });

      // Close the popup
      await popup.close();

      if (!blobData) {
        return { summary: 'Document popup opened but no PDF content found' };
      }

      // Save the blob to disk
      const ext = blobData.type.includes('pdf') ? 'pdf' : 'bin';
      const filePath = join(this.config.downloadDir, `${filePrefix}_${Date.now()}.${ext}`);
      const buffer = Buffer.from(blobData.base64, 'base64');
      writeFileSync(filePath, buffer);

      return {
        localPath: filePath,
        summary: `Downloaded (${Math.round(blobData.size / 1024)}KB) to: ${filePath}`,
      };
    } catch (error) {
      return {
        summary: `Document download failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
        return false;
      }, claimNumber);

      if (!clicked) {
        return {
          claimId,
          petName: '',
          claimDate: '',
          claimAmount: '',
          status: '',
          error: `Could not find historical claim ${claimId} on the claims page`,
        };
      }

      await page.waitForSelector('.MuiDialog-root.generic-dialog', { timeout: 5000 });
      await page.waitForTimeout(1000);
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

      if (!foundModal) {
        return {
          claimId,
          petName: '',
          claimDate: '',
          claimAmount: '',
          status: '',
          error: `Could not find active claim matching "${claimId}" on the claims page`,
        };
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
        // Active popup: "Nova's claim" or "Mr Whiskers's claim" pattern
        const petMatch = text.match(/(.+?)'s claim/i);
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

    // Download documents from the popup.
    // Fetch Pet opens documents in a new popup tab with a blob: URL inside an iframe.
    // We click the document link, wait for the popup, fetch the blob, and save to disk.
    let localEobPath: string | undefined;
    let eobSummary: string | undefined;
    let localInvoicePath: string | undefined;
    let invoiceSummary: string | undefined;

    const dialogSelector = '.MuiDialog-root.generic-dialog .MuiDialog-paper';

    // Download EOB if listed in documents
    if (details.documents.includes('Explanation of Benefits')) {
      const result = await this.downloadDocumentFromPopup(
        page,
        `${dialogSelector} .claims-record-description:text("Explanation of Benefits")`,
        `eob_${details.claimId.replace(/[^a-zA-Z0-9]/g, '')}`
      );
      localEobPath = result.localPath;
      eobSummary = result.summary;
    }

    // Download first Invoice if listed in documents
    if (details.documents.includes('Invoice')) {
      const result = await this.downloadDocumentFromPopup(
        page,
        `${dialogSelector} .claims-record-description:text-is("Invoice")`,
        `invoice_${details.claimId.replace(/[^a-zA-Z0-9]/g, '')}`
      );
      localInvoicePath = result.localPath;
      invoiceSummary = result.summary;
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
      policyNumber: details.policyNumber,
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
      if (!activeClient) {
        throw new Error('Client was not created during login');
      }
      return activeClient;
    }

    // No background login started - create and initialize client now (fallback)
    if (!activeClient) {
      createClient();
    }
    if (!activeClient) {
      throw new Error('Failed to create client');
    }
    await activeClient.initialize();
    return activeClient;
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
