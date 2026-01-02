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
**Commit:** 969fae4
**Tested By:** Claude

### Summary

**Overall:** 8 of 8 tests passed (100%)

All tests pass when the bot is properly invited to test channels (#general, #clawdbot-testing).

### Detailed Results

| Test                 | Status  | Notes                                |
| -------------------- | ------- | ------------------------------------ |
| List channels        | ✅ Pass | Found 9 channels                     |
| Get channel info     | ✅ Pass | Retrieved #general with 2 members    |
| Get channel messages | ✅ Pass | Retrieved messages from #general     |
| Post message         | ✅ Pass | Successfully posted to #general      |
| Add reaction         | ✅ Pass | Successfully added thumbsup reaction |
| Update message       | ✅ Pass | Successfully updated posted message  |
| Post thread reply    | ✅ Pass | Successfully posted thread reply     |
| Get thread replies   | ✅ Pass | Retrieved thread with all replies    |

### Test Cases Status

| Tool                   | Functional Test | Integration Test | Manual Test |
| ---------------------- | --------------- | ---------------- | ----------- |
| slack_get_channels     | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| slack_get_channel      | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| slack_get_thread       | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| slack_post_message     | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| slack_reply_to_thread  | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| slack_update_message   | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| slack_react_to_message | ✅ Pass         | ✅ Pass          | ✅ Pass     |

## Getting the Bot Token

1. Go to https://api.slack.com/apps
2. Select your app (or create a new one)
3. Navigate to **OAuth & Permissions**
4. Add the required Bot Token Scopes listed above
5. Install/Reinstall the app to your workspace
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
7. **Important**: Invite the bot to channels where you want it to read messages
