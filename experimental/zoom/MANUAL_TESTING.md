# Manual Testing

## Prerequisites

- Zoom OAuth access token with `meeting:read` and `recording:read` scopes
- `.env` file with `ZOOM_ACCESS_TOKEN` set

## First-Time Setup

```bash
npm run test:manual:setup
```

## Running Tests

```bash
npm run test:manual
```

## Latest Test Results

**Commit:** 1542e1e905effde4e993c20eaa0e797b87a902f8
**Date:** 2026-03-18
**Status:** N/A - Initial server setup, no manual tests implemented yet

Manual tests will be added in a future PR when Zoom API credentials are available. Functional tests (11/11 passing) verify tool logic with mocked clients.
