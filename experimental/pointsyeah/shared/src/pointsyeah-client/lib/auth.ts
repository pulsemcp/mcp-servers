import type { CognitoTokens, CognitoAuthResult } from '../../types.js';
import { logDebug, logError } from '../../logging.js';
import { COGNITO_ENDPOINT, COGNITO_CLIENT_ID, FETCH_TIMEOUT_MS } from '../../constants.js';

/**
 * Decode a JWT payload without verification (we just need the claims).
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
  return JSON.parse(payload);
}

/**
 * Refresh Cognito tokens using a refresh token.
 * This is an unauthenticated call to Cognito's InitiateAuth endpoint.
 */
export async function refreshCognitoTokens(refreshToken: string): Promise<CognitoTokens> {
  logDebug('auth', 'Refreshing Cognito tokens...');

  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logError('auth', `Cognito refresh failed (${response.status}): ${errorBody}`);

    if (errorBody.includes('NotAuthorizedException')) {
      throw new Error(
        'Refresh token expired or revoked. Please re-login to PointsYeah and update POINTSYEAH_REFRESH_TOKEN.'
      );
    }

    throw new Error(`Cognito token refresh failed: ${response.status} ${errorBody}`);
  }

  const result = (await response.json()) as CognitoAuthResult;
  const { AccessToken, IdToken, ExpiresIn } = result.AuthenticationResult;

  // Parse the exp claim from the access token
  const payload = decodeJwtPayload(AccessToken);
  const expiresAt = (payload.exp as number) || Math.floor(Date.now() / 1000) + ExpiresIn;

  logDebug('auth', `Tokens refreshed, expires at ${new Date(expiresAt * 1000).toISOString()}`);

  return {
    accessToken: AccessToken,
    idToken: IdToken,
    expiresAt,
  };
}

/**
 * Extract the user sub (subject) from an ID token.
 */
export function getUserSubFromIdToken(idToken: string): string {
  const payload = decodeJwtPayload(idToken);
  const sub = payload.sub;
  if (typeof sub !== 'string') {
    throw new Error('Could not extract user sub from ID token');
  }
  return sub;
}
