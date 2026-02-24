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

**Test Date:** 2026-02-24
**Branch:** claude/slack-attachment-support
**Commit:** 0993879
**Tested By:** Claude

### Summary

**Manual tests:** Not run — no SLACK_BOT_TOKEN available in this environment. This change only adds formatting for attachment/file data already returned by the Slack API; no API call behavior was modified.

**Functional tests:** 18 of 18 tests passed (100%)
**Integration tests:** 12 of 12 tests passed (100%)

### Functional Test Results (v0.0.2)

| Test                                             | Status  | Notes                                      |
| ------------------------------------------------ | ------- | ------------------------------------------ |
| List channels                                    | ✅ Pass | Lists channels correctly                   |
| Get channel info with messages                   | ✅ Pass | Channel metadata and messages displayed    |
| Display attachment info for unfurled links       | ✅ Pass | Title, text, image URL, service name shown |
| Display file info for uploaded files             | ✅ Pass | File name, mimetype, size, permalink shown |
| Get channel info without messages                | ✅ Pass | Metadata only when include_messages=false  |
| Require channel_id parameter                     | ✅ Pass | Returns error without channel_id           |
| Get thread with replies                          | ✅ Pass | Parent + replies displayed                 |
| Display attachments in parent and reply messages | ✅ Pass | Attachments in parent, files in replies    |
| Require channel_id and thread_ts                 | ✅ Pass | Returns error without thread_ts            |
| Post a message                                   | ✅ Pass | Message posted successfully                |
| Require channel_id and text                      | ✅ Pass | Returns error without text                 |
| Reply to a thread                                | ✅ Pass | Reply posted to thread                     |
| Support broadcast option                         | ✅ Pass | Broadcast flag passed correctly            |
| Update a message                                 | ✅ Pass | Message updated successfully               |
| Add a reaction                                   | ✅ Pass | Reaction added                             |
| Strip colons from emoji name                     | ✅ Pass | Colons stripped before API call            |
| Handle empty channel list                        | ✅ Pass | Shows "No channels found"                  |
| Handle errors                                    | ✅ Pass | Returns isError with message               |

### Integration Test Results (v0.0.2)

| Test                                      | Status  | Notes                                    |
| ----------------------------------------- | ------- | ---------------------------------------- |
| Initialize successfully                   | ✅ Pass | Server starts and connects               |
| Register all expected tools               | ✅ Pass | 7 tools registered                       |
| Proper tool descriptions and schemas      | ✅ Pass | Schemas validated                        |
| List all channels                         | ✅ Pass | Found 2 channels                         |
| Get specific channel details              | ✅ Pass | Channel metadata correct                 |
| Include messages when requested           | ✅ Pass | Messages displayed                       |
| Display attachments and files in messages | ✅ Pass | Attachments and files rendered in output |
| Get thread with replies                   | ✅ Pass | Parent + reply shown                     |
| Post a new message                        | ✅ Pass | Message posted                           |
| Reply to a thread                         | ✅ Pass | Reply posted                             |
| Update a message                          | ✅ Pass | Message updated                          |
| Add a reaction                            | ✅ Pass | Reaction added                           |

## Getting the Bot Token

1. Go to https://api.slack.com/apps
2. Select your app (or create a new one)
3. Navigate to **OAuth & Permissions**
4. Add the required Bot Token Scopes listed above
5. Install/Reinstall the app to your workspace
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
7. **Important**: Invite the bot to channels where you want it to read messages
