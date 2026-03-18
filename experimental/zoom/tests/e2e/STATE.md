# E2E Test External State Requirements

This document describes the external state (Zoom account configuration) that the e2e/manual tests depend on. These invariants must be true for the tests to pass.

## Zoom Account Requirements

The e2e tests run against a real Zoom account. The following invariants are assumed:

### Authentication

- A valid Zoom OAuth access token is available (set via `ZOOM_ACCESS_TOKEN` environment variable)
- The token has the following scopes:
  - `meeting:read` - to list and get meeting details
  - `recording:read` - to list cloud recordings
- The token belongs to a Zoom user with an active account (Pro, Business, or Enterprise plan recommended for recording access)

### Meetings

- The authenticated user has **at least 1 scheduled meeting** (upcoming or past)
- At least one meeting should have a known, stable meeting ID that can be used for `get_meeting` tests

### Recordings

- The authenticated user has **at least 1 cloud recording** from within the past 30 days
- At least one recording should include:
  - An MP4 video file
  - Optionally, a transcript file (TRANSCRIPT type)
- Cloud recording must be enabled on the Zoom account (this is an admin-level setting)

### Rate Limits

- The Zoom API has rate limits (varies by plan). Tests should:
  - Use small `page_size` values (e.g., 5-10) to minimize API load
  - Include reasonable delays between test calls if running the full suite
  - Be aware that rate limit errors (HTTP 429) may occur if tests are run repeatedly in quick succession

## Environment Variables

| Variable            | Required | Description                         |
| ------------------- | -------- | ----------------------------------- |
| `ZOOM_ACCESS_TOKEN` | Yes      | OAuth access token for the Zoom API |

## How to Set Up

1. Create a Zoom Server-to-Server OAuth app or OAuth app at https://marketplace.zoom.us/
2. Generate an access token with the required scopes
3. Create a `.env` file in the `experimental/zoom/` directory:
   ```
   ZOOM_ACCESS_TOKEN=your_token_here
   ```
4. Ensure your Zoom account has at least one scheduled meeting and one cloud recording

## Known Limitations

- Zoom OAuth access tokens expire (typically after 1 hour for user-level tokens). You may need to refresh the token before running tests.
- Cloud recording availability depends on your Zoom plan. Free plans do not support cloud recording.
- The Zoom API may return different results depending on account settings and plan tier.

## MASTER_KEY for CI

For CI/CD, the `ZOOM_ACCESS_TOKEN` is stored as a GitHub Actions secret named `MASTER_KEY`. This key must be manually rotated when it expires.

**To add the secret:**

1. Go to the GitHub repository Settings
2. Navigate to **Secrets and variables** > **Actions**
3. Add a new repository secret named `MASTER_KEY` with your Zoom access token value

Note: The current CI workflow uses a test placeholder token for functional and integration tests (which use mocked API clients). The `MASTER_KEY` secret is only needed if you add e2e tests that hit the real Zoom API in CI.
