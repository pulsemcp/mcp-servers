import { z } from 'zod';
import { refreshCognitoTokens } from '../pointsyeah-client/lib/auth.js';
import { setAuthenticated, setRefreshToken } from '../state.js';

const SetRefreshTokenSchema = z.object({
  refreshToken: z.string().min(100),
});

const TOOL_DESCRIPTION = `Set the PointsYeah refresh token for authentication.

The server needs a valid Cognito refresh token to access PointsYeah APIs. This token expires periodically and must be refreshed by logging in again.

**How to obtain the token:**
1. Go to https://www.pointsyeah.com/landing?route=signIn and log in
2. Open browser DevTools (F12) -> Console
3. Run: document.cookie.split('; ').find(c => c.includes('.refreshToken=')).split('=').slice(1).join('=')
4. Copy the output and pass it as the refreshToken parameter

**Note:** Once a valid token is set, this tool will be hidden and the flight search tools will become available. If the token later expires or is revoked, this tool will reappear.`;

export type OnAuthSuccess = () => Promise<void>;

export function setRefreshTokenTool(onAuthSuccess: OnAuthSuccess) {
  return {
    name: 'set_refresh_token',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        refreshToken: {
          type: 'string',
          description:
            'AWS Cognito refresh token from PointsYeah browser cookies. ' +
            'This is a long JWT string (1000+ characters).',
        },
      },
      required: ['refreshToken'],
    },
    handler: async (args: unknown) => {
      try {
        const { refreshToken } = SetRefreshTokenSchema.parse(args);

        // Validate the token by actually calling Cognito
        await refreshCognitoTokens(refreshToken);

        // Token is valid — update state
        setRefreshToken(refreshToken);
        setAuthenticated(true);

        // Notify the tool layer to swap tool lists
        await onAuthSuccess();

        return {
          content: [
            {
              type: 'text',
              text: 'Refresh token set successfully. Authentication verified. Flight search and other tools are now available.',
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (message.includes('expired or revoked')) {
          return {
            content: [
              {
                type: 'text',
                text:
                  'The provided refresh token is expired or revoked. ' +
                  'Please log in to PointsYeah again and obtain a fresh token.\n\n' +
                  '1. Go to https://www.pointsyeah.com/landing?route=signIn\n' +
                  '2. Open DevTools Console\n' +
                  "3. Run: document.cookie.split('; ').find(c => c.includes('.refreshToken=')).split('=').slice(1).join('=')",
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `Error setting refresh token: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
