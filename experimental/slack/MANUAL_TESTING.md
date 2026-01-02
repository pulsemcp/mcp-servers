# Manual Testing Results

This file tracks the **most recent** manual test results for the Slack MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Set up API credentials** - Ensure you have the necessary API credentials in your `.env` file:

   ```bash
   cp .env.example .env
   # Edit .env with your Slack Bot Token
   ```

2. **Required OAuth Scopes for Bot Token:**

   - `channels:read` - View basic channel information
   - `channels:history` - View messages in public channels
   - `groups:read` - View private channels
   - `groups:history` - View messages in private channels
   - `chat:write` - Send messages
   - `reactions:write` - Add reactions

3. **Important: Bot must be invited to channels**
   - For reading messages, threads, and adding reactions, the bot must be a member of the channel
   - Invite the bot using `/invite @YourBotName` in the channel
   - Without this, operations requiring channel membership will fail with `not_in_channel`

### Running Tests

```bash
# First time setup
npm run test:manual:setup

# Run manual tests
npm run test:manual
```

## Latest Test Results

**Test Date:** 2026-01-02
**Branch:** claude/add-slack-mcp-server
**Commit:** 728ff22
**Tested By:** Claude

### Summary

**Overall:** 5 of 8 tests passed (62.5%)

The passing tests demonstrate core functionality works correctly. The 3 failing tests all fail with `not_in_channel` error because the bot was not invited to the test channel - this is expected Slack API behavior, not a code bug.

### Detailed Results

| Test                 | Status  | Notes                               |
| -------------------- | ------- | ----------------------------------- |
| List channels        | ✅ Pass | Found 9 channels                    |
| Get channel info     | ✅ Pass | Retrieved #general with 2 members   |
| Get channel messages | ❌ Fail | `not_in_channel` - bot not invited  |
| Post message         | ✅ Pass | Successfully posted to #general     |
| Add reaction         | ❌ Fail | `not_in_channel` - bot not invited  |
| Update message       | ✅ Pass | Successfully updated posted message |
| Post thread reply    | ✅ Pass | Successfully posted thread reply    |
| Get thread replies   | ❌ Fail | `not_in_channel` - bot not invited  |

### Analysis

The `not_in_channel` errors are expected Slack API behavior:

- The bot can **post** to public channels without being a member
- The bot **cannot read** messages or add reactions without being a channel member
- This is a Slack permission model, not a bug in our implementation

To fix the failing tests, invite the bot to the channel:

```
/invite @YourBotName
```

### Test Cases Status

| Tool                   | Functional Test | Integration Test | Manual Test             |
| ---------------------- | --------------- | ---------------- | ----------------------- |
| slack_get_channels     | ✅ Pass         | ✅ Pass          | ✅ Pass                 |
| slack_get_channel      | ✅ Pass         | ✅ Pass          | ✅ Pass                 |
| slack_get_thread       | ✅ Pass         | ✅ Pass          | ⚠️ Needs channel invite |
| slack_post_message     | ✅ Pass         | ✅ Pass          | ✅ Pass                 |
| slack_reply_to_thread  | ✅ Pass         | ✅ Pass          | ✅ Pass                 |
| slack_update_message   | ✅ Pass         | ✅ Pass          | ✅ Pass                 |
| slack_react_to_message | ✅ Pass         | ✅ Pass          | ⚠️ Needs channel invite |

## Getting the Bot Token

1. Go to https://api.slack.com/apps
2. Select your app (or create a new one)
3. Navigate to **OAuth & Permissions**
4. Add the required Bot Token Scopes listed above
5. Install/Reinstall the app to your workspace
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
7. **Important**: Invite the bot to channels where you want it to read messages
