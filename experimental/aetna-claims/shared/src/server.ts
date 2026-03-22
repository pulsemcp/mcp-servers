import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type {
  AetnaClaimsConfig,
  Claim,
  ClaimDetails,
  ClaimSubmissionData,
  ClaimSubmissionResult,
} from './types.js';
import { logDebug, logWarning } from './logging.js';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://health.aetna.com';

/**
 * Aetna Claims client interface
 * Defines all methods for interacting with the Aetna health insurance portal
 */
export interface IAetnaClaimsClient {
  /**
   * Initialize the browser and log in to Aetna (including email 2FA)
   * Must be called before using other methods
   */
  initialize(): Promise<void>;

  /**
   * Prepare a claim for submission by filling out the form
   * Does NOT submit - just validates and returns what would be submitted
   */
  prepareClaimToSubmit(
    memberName: string,
    claimType: string,
    dateOfService: string,
    amountPaid: string,
    reimburseProvider: boolean,
    invoiceFilePath?: string,
    endDate?: string,
    isAccidentRelated?: boolean,
    isEmploymentRelated?: boolean,
    isOutsideUS?: boolean,
    hasOtherCoverage?: boolean
  ): Promise<ClaimSubmissionData>;

  /**
   * Actually submit a prepared claim (form must already be filled via prepareClaimToSubmit)
   */
  submitClaim(): Promise<ClaimSubmissionResult>;

  /**
   * Get all claims from the claims page
   */
  getClaims(): Promise<Claim[]>;

  /**
   * Get detailed information about a specific claim
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
  getConfig(): AetnaClaimsConfig;
}

/**
 * Aetna Claims client implementation using Playwright
 */
export class AetnaClaimsClient implements IAetnaClaimsClient {
  private browser: import('playwright').Browser | null = null;
  private context: import('playwright').BrowserContext | null = null;
  private page: import('playwright').Page | null = null;
  private config: AetnaClaimsConfig;
  private isInitialized = false;

  constructor(config: AetnaClaimsConfig) {
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
   * Fetch the most recent 2FA verification code from email via IMAP.
   * Polls the inbox for a message from Aetna containing a verification code.
   */
  private async fetchEmailVerificationCode(
    maxAttempts: number = 12,
    pollIntervalMs: number = 5000
  ): Promise<string> {
    const { ImapFlow } = await import('imapflow');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      logDebug('2fa', `Checking email for verification code (attempt ${attempt}/${maxAttempts})`);

      const client = new ImapFlow({
        host: this.config.emailImapHost,
        port: this.config.emailImapPort,
        secure: true,
        auth: {
          user: this.config.emailImapUser,
          pass: this.config.emailImapPassword,
        },
        logger: false,
      });

      let foundCode: string | null = null;

      try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');

        try {
          // Search for recent Aetna verification emails
          const messages = await client.search(
            {
              from: 'aetna',
              since: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
            },
            { uid: true }
          );

          if (messages && messages.length > 0) {
            // Get the most recent message
            const lastUid = messages[messages.length - 1];
            const message = await client.fetchOne(String(lastUid), {
              source: true,
            });

            if (message && message.source) {
              const body = message.source.toString();
              // Look for common verification code patterns (4-8 digit codes)
              const codeMatch = body.match(
                /(?:verification|security|one[- ]time|OTP|code)[^0-9]*(\d{4,8})/i
              );
              if (codeMatch) {
                foundCode = codeMatch[1];
              }

              // Also try pattern where code appears prominently
              if (!foundCode) {
                const prominentCode = body.match(/\b(\d{6})\b/);
                if (prominentCode) {
                  foundCode = prominentCode[1];
                }
              }
            }
          }
        } finally {
          lock.release();
        }

        await client.logout();
      } catch (error) {
        logWarning(
          '2fa',
          `Email check failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      if (foundCode) {
        logDebug('2fa', 'Found verification code in email');
        return foundCode;
      }

      if (attempt < maxAttempts) {
        logDebug('2fa', `No code found yet, waiting ${pollIntervalMs}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }

    throw new Error(
      `Failed to retrieve 2FA verification code from email after ${maxAttempts} attempts`
    );
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

    // Navigate to Aetna login page
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);

    // Fill in login credentials
    const usernameInput = await this.page.$(
      'input[type="text"][name="username"], input[id="username"], input[name="user"], input[autocomplete="username"]'
    );
    if (usernameInput) {
      await usernameInput.fill(this.config.username);
    } else {
      // Try alternative selectors
      await this.page.fill(
        'input[placeholder*="username" i], input[placeholder*="user" i]',
        this.config.username
      );
    }

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

    // Wait for either: 2FA page appears, or we get redirected to dashboard
    await this.page.waitForTimeout(5000);

    // Check if we're on a 2FA verification page
    const is2FAPage = await this.page.evaluate(() => {
      const pageText = document.body?.innerText?.toLowerCase() || '';
      return (
        pageText.includes('verification') ||
        pageText.includes('verify your identity') ||
        pageText.includes('security code') ||
        pageText.includes('one-time') ||
        pageText.includes('two-factor') ||
        pageText.includes('2fa') ||
        pageText.includes('enter the code') ||
        pageText.includes('sent a code')
      );
    });

    if (is2FAPage) {
      logWarning('login', 'Two-factor authentication detected, checking email for code...');

      // Check if there's an option to send code via email and click it
      const emailOption = await this.page.$(
        'button:has-text("email"), button:has-text("Email"), [data-testid*="email"], label:has-text("email")'
      );
      if (emailOption) {
        await emailOption.click();
        await this.page.waitForTimeout(3000);
      }

      // Fetch the 2FA code from email
      const code = await this.fetchEmailVerificationCode();

      // Enter the code
      const codeInput = await this.page.$(
        'input[type="text"][name*="code"], input[type="tel"], input[name*="otp"], input[name*="verification"], input[autocomplete="one-time-code"], input[inputmode="numeric"]'
      );
      if (codeInput) {
        await codeInput.fill(code);
      } else {
        // Try to find any visible text input that might be for the code
        const inputs = await this.page.$$('input[type="text"], input:not([type])');
        for (const input of inputs) {
          const isVisible = await input.isVisible();
          if (isVisible) {
            await input.fill(code);
            break;
          }
        }
      }

      // Submit the verification code
      const verifyButton = await this.page.$(
        'button[type="submit"], button:has-text("Verify"), button:has-text("Submit"), button:has-text("Continue")'
      );
      if (verifyButton) {
        await verifyButton.click();
      }

      // Wait for navigation after 2FA
      await this.page
        .waitForFunction(
          () => {
            const url = window.location.href;
            return !url.includes('login') && !url.includes('verify') && !url.includes('mfa');
          },
          { timeout: this.config.timeout }
        )
        .catch((error) => {
          if (error instanceof Error && error.message.includes('Timeout')) {
            return;
          }
          throw error;
        });
    } else {
      // No 2FA, just wait for login to complete
      await this.page
        .waitForFunction(
          () => {
            const url = window.location.href;
            if (!url.includes('login')) return true;
            if (document.querySelector('a[href*="/claims"], a[href*="/home"]')) return true;
            return false;
          },
          { timeout: this.config.timeout }
        )
        .catch((error) => {
          if (error instanceof Error && error.message.includes('Timeout')) {
            return;
          }
          throw error;
        });
    }

    // Wait for SPA to settle after login
    await this.page.waitForTimeout(3000);

    // Verify login was successful
    const currentUrl = this.page.url();
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      await this.page
        .screenshot({ path: join(this.config.downloadDir, `login-debug-${Date.now()}.png`) })
        .catch(() => {});

      const errorMsg = await this.page.$('.error-text, [role="alert"], .error-message');
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
    memberName: string,
    claimType: string,
    dateOfService: string,
    amountPaid: string,
    reimburseProvider: boolean,
    invoiceFilePath?: string,
    endDate?: string,
    isAccidentRelated: boolean = false,
    isEmploymentRelated: boolean = false,
    isOutsideUS: boolean = false,
    hasOtherCoverage: boolean = false
  ): Promise<ClaimSubmissionData> {
    const page = await this.ensureBrowser();
    const validationErrors: string[] = [];

    // Navigate to the submit a claim page
    await page.goto(`${BASE_URL}/digital-claims`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Wait for the claims form to load
    await page
      .waitForSelector('form, [data-testid*="claim"], .claim-form, h1:has-text("Submit a Claim")', {
        timeout: 10000,
      })
      .catch(() => {});

    // Select the member (if there's a dropdown/selector)
    try {
      const memberSelect = await page.$(
        'select[name*="member"], select[name*="who"], [data-testid*="member-select"]'
      );
      if (memberSelect) {
        // Try to select by visible text
        await memberSelect.selectOption({ label: memberName });
      }
    } catch {
      logDebug('prepareClaim', 'Member selection not available or pre-populated');
    }

    // Select claim type
    try {
      const claimTypeSelect = await page.$(
        'select[name*="type"], select[name*="claim"], [data-testid*="claim-type"]'
      );
      if (claimTypeSelect) {
        await claimTypeSelect.selectOption({ label: claimType });
      } else {
        // Try radio buttons or other selection mechanisms
        const typeOption = await page.$(
          `label:has-text("${claimType}"), input[value="${claimType}"], button:has-text("${claimType}")`
        );
        if (typeOption) {
          await typeOption.click();
        }
      }
    } catch {
      logDebug('prepareClaim', 'Claim type selection failed');
      validationErrors.push('Could not select claim type');
    }

    // Fill date of service
    try {
      const dateInput = await page.$(
        'input[name*="date"], input[type="date"], input[placeholder*="mm/dd/yyyy" i]'
      );
      if (dateInput) {
        await dateInput.fill(dateOfService);
      }
    } catch {
      validationErrors.push('Could not fill date of service');
    }

    // Fill end date if provided
    if (endDate) {
      try {
        const endDateInput = await page.$(
          'input[name*="end"], input[name*="endDate"], input[placeholder*="mm/dd/yyyy" i]:nth-of-type(2)'
        );
        if (endDateInput) {
          await endDateInput.fill(endDate);
        }
      } catch {
        logDebug('prepareClaim', 'End date field not found');
      }
    }

    // Fill amount paid
    try {
      const amountInput = await page.$(
        'input[name*="amount"], input[name*="paid"], input[type="number"], input[placeholder*="$"]'
      );
      if (amountInput) {
        // Strip $ sign if present
        const cleanAmount = amountPaid.replace(/^\$/, '');
        await amountInput.fill(cleanAmount);
      }
    } catch {
      validationErrors.push('Could not fill amount paid');
    }

    // Check "reimburse provider" checkbox if requested
    if (reimburseProvider) {
      try {
        const reimburseCheckbox = await page.$(
          'input[type="checkbox"][name*="reimburse"], label:has-text("reimburse") input[type="checkbox"], label:has-text("I have not paid")'
        );
        if (reimburseCheckbox) {
          await reimburseCheckbox.click();
        }
      } catch {
        logDebug('prepareClaim', 'Reimburse provider checkbox not found');
      }
    }

    // Upload itemized bill if provided
    if (invoiceFilePath) {
      try {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(invoiceFilePath);
          await page.waitForTimeout(2000);
        }
      } catch {
        validationErrors.push('Could not upload itemized bill');
      }
    }

    // Handle yes/no questions
    const booleanQuestions = [
      { value: isAccidentRelated, text: 'accident' },
      { value: isEmploymentRelated, text: 'employment' },
      { value: isOutsideUS, text: 'outside' },
      { value: hasOtherCoverage, text: 'other' },
    ];

    for (const question of booleanQuestions) {
      try {
        const answer = question.value ? 'Yes' : 'No';
        // Find the question section and click the appropriate radio button
        const radioSelector = `input[type="radio"][value="${answer.toLowerCase()}"], input[type="radio"][value="${answer}"]`;
        const questionSection = await page.$(
          `fieldset:has-text("${question.text}"), div:has-text("${question.text}")`
        );
        if (questionSection) {
          const radio = await questionSection.$(radioSelector);
          if (radio) {
            await radio.click();
          } else {
            // Try clicking the label with the answer text
            const label = await questionSection.$(`label:has-text("${answer}")`);
            if (label) {
              await label.click();
            }
          }
        }
      } catch {
        logDebug('prepareClaim', `Could not set ${question.text} question`);
      }
    }

    return {
      memberName,
      claimType,
      dateOfService,
      endDate,
      amountPaid,
      reimburseProvider,
      invoiceFile: invoiceFilePath,
      isAccidentRelated,
      isEmploymentRelated,
      isOutsideUS,
      hasOtherCoverage,
      isReadyToSubmit: validationErrors.length === 0,
      validationErrors,
      confirmationMessage:
        validationErrors.length > 0
          ? `Cannot submit claim - validation errors:\n${validationErrors.join('\n')}`
          : 'Claim form filled and ready for submission.',
    };
  }

  async submitClaim(): Promise<ClaimSubmissionResult> {
    const page = await this.ensureBrowser();

    try {
      // Set up network monitoring to verify form submission
      let formSubmitted = false;
      const requestListener = (request: { method(): string; url(): string }) => {
        if (request.method() === 'POST' && request.url().includes('claim')) {
          formSubmitted = true;
        }
      };
      page.on('request', requestListener);

      // Click the Next/Submit button to proceed through the form
      const nextButton = await page.$(
        'button:has-text("Next"), button:has-text("Submit"), button[type="submit"]'
      );
      if (nextButton) {
        await nextButton.click({ force: true });
      }

      // Wait for the review page
      await page.waitForTimeout(3000);

      // On the review page, look for the final submit button
      const finalSubmitButton = await page.$(
        'button:has-text("Submit"), button:has-text("Confirm"), button[type="submit"]'
      );
      if (finalSubmitButton) {
        await finalSubmitButton.click({ force: true });
      }

      // Wait for submission to complete
      await page.waitForTimeout(5000);

      // Check for success indicators
      const pageText = await page.evaluate(() => document.body?.innerText || '');
      const isSuccess =
        pageText.toLowerCase().includes('success') ||
        pageText.toLowerCase().includes('submitted') ||
        pageText.toLowerCase().includes('confirmation') ||
        pageText.toLowerCase().includes('thank you') ||
        formSubmitted;

      // Try to extract confirmation number
      const confMatch = pageText.match(
        /(?:confirmation|reference|claim)\s*(?:number|#|id)[:\s]*([A-Z0-9-]+)/i
      );

      // Clean up request listener
      page.removeListener('request', requestListener);

      if (isSuccess) {
        return {
          success: true,
          message: 'Claim submitted successfully.',
          confirmationNumber: confMatch?.[1],
        };
      } else {
        // Take a screenshot for debugging
        await page
          .screenshot({
            path: join(this.config.downloadDir, `submit-debug-${Date.now()}.png`),
          })
          .catch(() => {});

        return {
          success: false,
          message: 'Claim submission may not have completed. Please check your Aetna account.',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error during submission: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getClaims(): Promise<Claim[]> {
    const page = await this.ensureBrowser();
    const claims: Claim[] = [];

    // Navigate to claims page
    await page.goto(`${BASE_URL}/digital-claims`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Wait for claims to load
    await page
      .waitForSelector(
        '.claim-card, [data-testid*="claim"], table, .claims-list, [class*="claim"]',
        { timeout: 10000 }
      )
      .catch(() => {});

    // Extract claims from the page
    const extractedClaims = await page.evaluate(() => {
      const results: Array<{
        claimId: string;
        memberName: string;
        claimType: string;
        dateOfService: string;
        claimAmount: string;
        status: string;
        providerName?: string;
        description?: string;
      }> = [];

      // Try to find claim cards or rows
      const claimElements = document.querySelectorAll(
        '.claim-card, [data-testid*="claim-row"], tr[class*="claim"], [class*="claim-item"], [class*="ClaimCard"]'
      );

      claimElements.forEach((el, index) => {
        const text = el.textContent || '';
        // Try to extract structured data from the claim element
        const claimId =
          el
            .querySelector('[class*="id"], [class*="number"], [data-testid*="id"]')
            ?.textContent?.trim() || `CLAIM-${index + 1}`;
        const memberName =
          el
            .querySelector('[class*="member"], [class*="name"], [class*="patient"]')
            ?.textContent?.trim() || '';
        const claimType = el.querySelector('[class*="type"]')?.textContent?.trim() || '';
        const dateOfService = el.querySelector('[class*="date"], time')?.textContent?.trim() || '';
        const claimAmount =
          el
            .querySelector('[class*="amount"], [class*="cost"], [class*="price"]')
            ?.textContent?.trim() || '';
        const status = el.querySelector('[class*="status"]')?.textContent?.trim() || '';
        const providerName =
          el.querySelector('[class*="provider"], [class*="doctor"]')?.textContent?.trim() ||
          undefined;

        if (text.length > 0) {
          results.push({
            claimId,
            memberName,
            claimType,
            dateOfService,
            claimAmount,
            status,
            providerName,
          });
        }
      });

      // If no structured elements found, try parsing from table rows
      if (results.length === 0) {
        const rows = document.querySelectorAll('table tbody tr');
        rows.forEach((row, index) => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            results.push({
              claimId: cells[0]?.textContent?.trim() || `CLAIM-${index + 1}`,
              memberName: '',
              claimType: cells[1]?.textContent?.trim() || '',
              dateOfService: cells[2]?.textContent?.trim() || '',
              claimAmount: cells[3]?.textContent?.trim() || '',
              status: cells[4]?.textContent?.trim() || '',
              providerName: cells[5]?.textContent?.trim() || undefined,
            });
          }
        });
      }

      return results;
    });

    claims.push(...extractedClaims);
    return claims;
  }

  async getClaimDetails(claimId: string): Promise<ClaimDetails> {
    const page = await this.ensureBrowser();

    // Navigate to claims page
    await page.goto(`${BASE_URL}/digital-claims`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Try to find and click on the specific claim
    const claimLink = await page.$(
      `a:has-text("${claimId}"), [data-testid*="${claimId}"], tr:has-text("${claimId}") a, [class*="claim"]:has-text("${claimId}")`
    );

    if (claimLink) {
      await claimLink.click();
      await page.waitForTimeout(3000);
    }

    // Extract claim details from the page
    const details = await page.evaluate((searchId) => {
      const result: {
        claimId: string;
        memberName: string;
        claimType: string;
        dateOfService: string;
        claimAmount: string;
        status: string;
        providerName?: string;
        amountBilled?: string;
        amountAllowed?: string;
        amountPaid?: string;
        patientResponsibility?: string;
        deductible?: string;
        copay?: string;
        coinsurance?: string;
      } = {
        claimId: searchId,
        memberName: '',
        claimType: '',
        dateOfService: '',
        claimAmount: '',
        status: '',
      };

      // Try to extract details from structured elements
      const getValue = (label: string): string => {
        const el = document.querySelector(
          `[class*="${label.toLowerCase()}"], dt:has-text("${label}") + dd, label:has-text("${label}") + span`
        );
        return el?.textContent?.trim() || '';
      };

      result.memberName = getValue('member') || getValue('patient') || getValue('name');
      result.claimType = getValue('type');
      result.dateOfService = getValue('date');
      result.claimAmount = getValue('amount') || getValue('total');
      result.status = getValue('status');
      result.providerName = getValue('provider') || getValue('doctor') || undefined;
      result.amountBilled = getValue('billed') || undefined;
      result.amountAllowed = getValue('allowed') || undefined;
      result.amountPaid = getValue('paid') || undefined;
      result.patientResponsibility = getValue('responsibility') || undefined;
      result.deductible = getValue('deductible') || undefined;
      result.copay = getValue('copay') || undefined;
      result.coinsurance = getValue('coinsurance') || undefined;

      return result;
    }, claimId);

    return details;
  }

  async getCurrentUrl(): Promise<string> {
    if (!this.page) {
      return '';
    }
    return this.page.url();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  getConfig(): AetnaClaimsConfig {
    return this.config;
  }
}

// =============================================================================
// Server Factory
// =============================================================================

export type ClientFactory = () => IAetnaClaimsClient;

/**
 * Callback invoked when background login fails
 */
export type LoginFailedCallback = (error: Error) => void;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'aetna-claims-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Track active client for cleanup
  let activeClient: IAetnaClaimsClient | null = null;

  // Track background login state
  let loginPromise: Promise<void> | null = null;
  let loginFailed = false;
  let loginError: Error | null = null;
  let onLoginFailed: LoginFailedCallback | null = null;

  /**
   * Create the client instance (but don't initialize/login yet)
   */
  const createClient = (): IAetnaClaimsClient => {
    const username = process.env.AETNA_USERNAME;
    const password = process.env.AETNA_PASSWORD;
    const emailImapHost = process.env.EMAIL_IMAP_HOST || 'imap.gmail.com';
    const emailImapPort = parseInt(process.env.EMAIL_IMAP_PORT || '993', 10);
    const emailImapUser = process.env.EMAIL_IMAP_USER;
    const emailImapPassword = process.env.EMAIL_IMAP_PASSWORD;
    const headless = process.env.HEADLESS !== 'false';
    const timeout = parseInt(process.env.TIMEOUT || '30000', 10);
    const downloadDir = process.env.AETNA_DOWNLOAD_DIR || '/tmp/aetna-downloads';

    if (!username || !password) {
      throw new Error('AETNA_USERNAME and AETNA_PASSWORD environment variables must be configured');
    }

    if (!emailImapUser || !emailImapPassword) {
      throw new Error(
        'EMAIL_IMAP_USER and EMAIL_IMAP_PASSWORD environment variables must be configured for 2FA'
      );
    }

    activeClient = new AetnaClaimsClient({
      username,
      password,
      emailImapHost,
      emailImapPort,
      emailImapUser,
      emailImapPassword,
      headless,
      timeout,
      downloadDir,
    });
    return activeClient;
  };

  /**
   * Start background login process
   */
  const startBackgroundLogin = (onFailed?: LoginFailedCallback): void => {
    if (loginPromise) {
      return;
    }

    onLoginFailed = onFailed || null;

    if (!activeClient) {
      createClient();
    }

    loginPromise = activeClient!.initialize().catch((error) => {
      loginFailed = true;
      loginError = error instanceof Error ? error : new Error(String(error));

      if (onLoginFailed) {
        onLoginFailed(loginError);
      }

      throw loginError;
    });
  };

  /**
   * Get a client that is ready to use (login completed)
   */
  const getReadyClient = async (): Promise<IAetnaClaimsClient> => {
    if (loginFailed && loginError) {
      throw new Error(`Login failed: ${loginError.message}`);
    }

    if (loginPromise) {
      await loginPromise;
      if (!activeClient) {
        throw new Error('Client was not created during login');
      }
      return activeClient;
    }

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
    const factory = clientFactory || (() => activeClient || createClient());
    const registerTools = createRegisterTools(factory, getReadyClient);
    registerTools(server);
  };

  const cleanup = async () => {
    if (activeClient) {
      await activeClient.close();
      activeClient = null;
    }
    loginPromise = null;
    loginFailed = false;
    loginError = null;
  };

  return { server, registerHandlers, cleanup, startBackgroundLogin };
}
