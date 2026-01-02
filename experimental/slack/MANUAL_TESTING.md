# Manual Testing Results

This document tracks manual testing of the Slack MCP Server against real Slack APIs.

## Latest Test Run

- **Date**: Pending - needs Bot Token
- **Commit**: (pending)
- **Tester**: (pending)
- **Results**: Manual tests require Bot User OAuth Token (xoxb-...)

## Test Environment Requirements

- Slack Workspace with a bot app installed
- Bot User OAuth Token (starts with `xoxb-`)
- Bot must have the following OAuth scopes:
  - `channels:read` - View basic channel information
  - `channels:history` - View messages in public channels
  - `groups:read` - View private channels
  - `groups:history` - View messages in private channels
  - `chat:write` - Send messages
  - `reactions:write` - Add reactions

## Test Cases

### Channel Operations

| Test                 | Status  | Notes |
| -------------------- | ------- | ----- |
| List channels        | Pending |       |
| Get channel info     | Pending |       |
| Get channel messages | Pending |       |

### Message Operations

| Test              | Status  | Notes |
| ----------------- | ------- | ----- |
| Post message      | Pending |       |
| Add reaction      | Pending |       |
| Update message    | Pending |       |
| Post thread reply | Pending |       |
| Get thread        | Pending |       |

## Instructions

1. Copy `.env.example` to `.env`
2. Add your Slack Bot User OAuth Token (get from app's OAuth & Permissions page)
3. Run `npm run test:manual:setup` for first-time setup
4. Run `npm run test:manual` to execute tests
5. Update this document with results

## Getting the Bot Token

1. Go to https://api.slack.com/apps
2. Select your app (or create a new one)
3. Navigate to **OAuth & Permissions**
4. Add the required Bot Token Scopes listed above
5. Install/Reinstall the app to your workspace
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
