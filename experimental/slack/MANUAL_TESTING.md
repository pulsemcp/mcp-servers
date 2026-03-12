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
   - `files:read` - Access file info and download files
   - `files:write` - Upload files and snippets

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

**Test Date:** 2026-03-12
**Branch:** main
**Commit:** 3aa6e4d
**Tested By:** Claude

### Summary

**Manual tests:** 12 of 12 tests passed (100%)
**Functional tests:** 27 of 27 tests passed (100%)
**Integration tests:** 15 of 15 tests passed (100%)

### Manual Test Results (v0.0.4)

| Test                                         | Status  | Notes                                                                                    |
| -------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| List channels                                | ✅ Pass | Found channels via real Slack API                                                        |
| Get channel info                             | ✅ Pass | Retrieved #general (C08AX7WQ552) with metadata                                           |
| Post message                                 | ✅ Pass | Posted message to #general (ts: 1773274782.325359)                                       |
| Add reaction                                 | ✅ Pass | Added white_check_mark reaction                                                          |
| Update message                               | ✅ Pass | Updated posted message content                                                           |
| Post thread reply                            | ✅ Pass | Reply posted to thread (ts: 1773274783.610479)                                           |
| Get thread with replies                      | ✅ Pass | Retrieved thread with 1 reply                                                            |
| Upload text snippet to channel               | ✅ Pass | Uploaded test-snippet.txt (362 bytes), File ID: F0AL6202L68, permalink confirmed         |
| Upload snippet as thread reply               | ✅ Pass | Uploaded thread-reply.txt (28 bytes) to thread, File ID: F0AKW2LA6V9                     |
| Upload code snippet with syntax highlighting | ✅ Pass | Uploaded example.ts (102 bytes) with TypeScript title, File ID: F0AL0CBBFJA              |
| Download file from channel                   | ✅ Pass | Downloaded example.ts (102 B) to /tmp/slack-files/F0AL0CBBFJA-example.ts via file:// URI |
| Handle invalid file ID                       | ✅ Pass | Returns error "Slack API error: file_not_found"                                          |

### Functional Test Results (v0.0.4)

| Test                                             | Status  | Notes                                            |
| ------------------------------------------------ | ------- | ------------------------------------------------ |
| List channels                                    | ✅ Pass | Lists channels correctly                         |
| Get channel info with messages                   | ✅ Pass | Channel metadata and messages displayed          |
| Display attachment info for unfurled links       | ✅ Pass | Title, text, image URL, service name shown       |
| Display file info with ID and download hint      | ✅ Pass | Shows file ID and "use slack_download_file" hint |
| Get channel info without messages                | ✅ Pass | Metadata only when include_messages=false        |
| Require channel_id parameter                     | ✅ Pass | Returns error without channel_id                 |
| Get thread with replies                          | ✅ Pass | Parent + replies displayed                       |
| Display attachments in parent and reply messages | ✅ Pass | Attachments in parent, files in replies          |
| Require channel_id and thread_ts                 | ✅ Pass | Returns error without thread_ts                  |
| Post a message                                   | ✅ Pass | Message posted successfully                      |
| Require channel_id and text                      | ✅ Pass | Returns error without text                       |
| Reply to a thread                                | ✅ Pass | Reply posted to thread                           |
| Support broadcast option                         | ✅ Pass | Broadcast flag passed correctly                  |
| Update a message                                 | ✅ Pass | Message updated successfully                     |
| Add a reaction                                   | ✅ Pass | Reaction added                                   |
| Strip colons from emoji name                     | ✅ Pass | Colons stripped before API call                  |
| Handle empty channel list                        | ✅ Pass | Shows "No channels found"                        |
| Handle errors                                    | ✅ Pass | Returns isError with message                     |
| Download file successfully                       | ✅ Pass | Downloads to /tmp, returns file:// URI           |
| Require file_id parameter                        | ✅ Pass | Returns error without file_id                    |
| Handle download errors                           | ✅ Pass | Returns isError with error message               |
| Upload snippet with required params              | ✅ Pass | Uploads snippet, returns file info               |
| Upload snippet with optional params              | ✅ Pass | All optional params passed correctly             |
| Upload snippet with thread_ts                    | ✅ Pass | Thread info included in response                 |
| Require channel_id and content                   | ✅ Pass | Returns error without content                    |
| Reject empty content                             | ✅ Pass | Empty string rejected by Zod validation          |
| Handle upload errors                             | ✅ Pass | Returns isError with error message               |

### Integration Test Results (v0.0.4)

| Test                                      | Status  | Notes                                           |
| ----------------------------------------- | ------- | ----------------------------------------------- |
| Initialize successfully                   | ✅ Pass | Server starts and connects                      |
| Register all expected tools               | ✅ Pass | 9 tools registered (added slack_upload_snippet) |
| Proper tool descriptions and schemas      | ✅ Pass | Schemas validated                               |
| List all channels                         | ✅ Pass | Found 2 channels                                |
| Get specific channel details              | ✅ Pass | Channel metadata correct                        |
| Include messages when requested           | ✅ Pass | Messages displayed                              |
| Display attachments and files in messages | ✅ Pass | Files show ID + download hint                   |
| Get thread with replies                   | ✅ Pass | Parent + reply shown                            |
| Post a new message                        | ✅ Pass | Message posted                                  |
| Reply to a thread                         | ✅ Pass | Reply posted                                    |
| Update a message                          | ✅ Pass | Message updated                                 |
| Add a reaction                            | ✅ Pass | Reaction added                                  |
| Upload snippet to channel                 | ✅ Pass | Snippet uploaded with file ID                   |
| Upload snippet with optional params       | ✅ Pass | Filename and title confirmed                    |
| Upload snippet as thread reply            | ✅ Pass | Thread info in response                         |

## Getting the Bot Token

1. Go to https://api.slack.com/apps
2. Select your app (or create a new one)
3. Navigate to **OAuth & Permissions**
4. Add the required Bot Token Scopes listed above
5. Install/Reinstall the app to your workspace
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
7. **Important**: Invite the bot to channels where you want it to read messages
