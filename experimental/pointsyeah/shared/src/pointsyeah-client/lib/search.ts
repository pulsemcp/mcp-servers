import type { FlightSearchParams, FlightSearchTask } from '../../types.js';
import { logDebug } from '../../logging.js';
import { getUserSubFromIdToken } from './auth.js';

const CLIENT_ID = '3im8jrentts1pguuouv5s57gfu';

const DEFAULT_BANKS = 'Amex,Bilt,Capital+One,Chase,Citi,WF';
const DEFAULT_AIRLINE_PROGRAMS = 'AR,AM,AC,KL,AS,AA,AV,DL,EK,EY,AY,B6,LH,QF,SK,SQ,NK,TK,UA,VS,VA';

/**
 * Build the Cognito localStorage entries that need to be injected as cookies.
 */
function buildCognitoCookies(
  userId: string,
  accessToken: string,
  idToken: string,
  refreshToken: string
): Array<{ name: string; value: string; domain: string; path: string }> {
  const prefix = `CognitoIdentityServiceProvider.${CLIENT_ID}.${userId}`;
  const domain = '.pointsyeah.com';
  const path = '/';

  return [
    { name: `${prefix}.accessToken`, value: accessToken, domain, path },
    { name: `${prefix}.idToken`, value: idToken, domain, path },
    { name: `${prefix}.refreshToken`, value: refreshToken, domain, path },
    { name: `${prefix}.clockDrift`, value: '0', domain, path },
    {
      name: `${prefix}.signInDetails`,
      value: JSON.stringify({ loginId: '', authFlowType: 'USER_SRP_AUTH' }),
      domain,
      path,
    },
    {
      name: `CognitoIdentityServiceProvider.${CLIENT_ID}.LastAuthUser`,
      value: userId,
      domain,
      path,
    },
  ];
}

/**
 * Build the search URL for PointsYeah flight search.
 */
function buildSearchUrl(params: FlightSearchParams): string {
  const cabins = params.cabins.join(',');
  const primaryCabin = params.cabins[0] || 'Economy';

  const urlParams = new URLSearchParams({
    cabins,
    cabin: primaryCabin,
    banks: DEFAULT_BANKS,
    airlineProgram: DEFAULT_AIRLINE_PROGRAMS,
    tripType: params.tripType,
    adults: String(params.adults),
    children: String(params.children),
    departure: params.departure,
    arrival: params.arrival,
    departDate: params.departDate,
    departDateSec: params.departDate,
    multiday: 'false',
  });

  if (params.returnDate) {
    urlParams.set('returnDate', params.returnDate);
    urlParams.set('returnDateSec', params.returnDate);
  }

  return `https://www.pointsyeah.com/search?${urlParams.toString()}`;
}

export interface PlaywrightSearchDeps {
  launchBrowser: () => Promise<PlaywrightBrowserContext>;
}

export interface PlaywrightBrowserContext {
  addCookies: (
    cookies: Array<{ name: string; value: string; domain: string; path: string }>
  ) => Promise<void>;
  newPage: () => Promise<PlaywrightPage>;
  close: () => Promise<void>;
}

export interface PlaywrightPage {
  goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<void>;
  waitForResponse: (
    predicate: (response: PlaywrightResponse) => boolean,
    options?: { timeout?: number }
  ) => Promise<PlaywrightResponse>;
  close: () => Promise<void>;
}

export interface PlaywrightResponse {
  url: () => string;
  json: () => Promise<unknown>;
}

/**
 * Create a flight search task using Playwright to handle the encrypted request.
 * Returns the task_id that can be used to poll for results.
 */
export async function createSearchTask(
  params: FlightSearchParams,
  accessToken: string,
  idToken: string,
  refreshToken: string,
  playwright: PlaywrightSearchDeps
): Promise<FlightSearchTask> {
  const userId = getUserSubFromIdToken(idToken);
  const cookies = buildCognitoCookies(userId, accessToken, idToken, refreshToken);
  const searchUrl = buildSearchUrl(params);

  logDebug('search', `Creating search task: ${searchUrl}`);

  const context = await playwright.launchBrowser();

  try {
    await context.addCookies(cookies);
    const page = await context.newPage();

    try {
      // Set up response interception before navigating
      const responsePromise = page.waitForResponse(
        (response: PlaywrightResponse) =>
          response.url().includes('api2.pointsyeah.com/flight/search/create_task'),
        { timeout: 60000 }
      );

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      const response = await responsePromise;
      const data = (await response.json()) as {
        code: number;
        success: boolean;
        data: FlightSearchTask;
      };

      if (!data.success) {
        throw new Error(`Search task creation failed: ${JSON.stringify(data)}`);
      }

      logDebug('search', `Search task created: ${data.data.task_id}`);

      return data.data;
    } finally {
      await page.close();
    }
  } finally {
    await context.close();
  }
}

// Re-export for tests
export { buildSearchUrl, buildCognitoCookies };
