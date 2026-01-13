# Google Calendar Workspace MCP Server

An MCP (Model Context Protocol) server for Google Calendar integration using service account authentication with domain-wide delegation. This server enables AI assistants to interact with Google Calendar to list events, create events, manage calendars, and query availability.

## Features

- **List Events**: View calendar events within a specified time range with filtering
- **Get Event Details**: Retrieve complete information about specific events
- **Create Events**: Create new calendar events with attendees, location, and descriptions
- **List Calendars**: Discover available calendars
- **Query Free/Busy**: Check availability and find busy time slots

## Prerequisites

1. **Google Cloud Project** with Calendar API enabled
2. **Service Account** with domain-wide delegation
3. **Google Workspace Admin** access to grant calendar permissions

## Setup

### 1. Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create a service account:
   - Navigate to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Provide a name and description
   - Click "Create and Continue"
   - Skip granting roles (not needed for domain-wide delegation)
   - Click "Done"
5. Create a key for the service account:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select "JSON" format
   - Download the key file
6. Note the service account's **Client ID** (found in the service account details)

### 2. Enable Domain-Wide Delegation

1. In the service account details, click "Show domain-wide delegation"
2. Check "Enable Google Workspace Domain-wide Delegation"
3. Save the changes
4. Note the **Client ID** (you'll need this for the next step)

### 3. Grant Calendar Permissions in Google Workspace Admin

1. Go to [Google Workspace Admin Console](https://admin.google.com/)
2. Navigate to "Security" > "Access and data control" > "API Controls"
3. Click "Manage Domain Wide Delegation"
4. Click "Add new"
5. Enter the service account's **Client ID**
6. In the "OAuth Scopes" field, add:
   ```
   https://www.googleapis.com/auth/calendar
   ```
7. Click "Authorize"

### 4. Configure Environment Variables

Extract the following from your downloaded JSON key file:

- `client_email`: The service account email
- `private_key`: The private key (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

Set these environment variables:

```bash
export GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
export GCAL_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key content\n-----END PRIVATE KEY-----"
export GCAL_IMPERSONATE_EMAIL="user@yourdomain.com"
```

**Note**: `GCAL_IMPERSONATE_EMAIL` should be the email address of the user whose calendar you want to access.

## Installation

### Using NPX (Recommended)

```bash
npx google-calendar-workspace-mcp-server
```

### Using NPM

```bash
npm install -g google-calendar-workspace-mcp-server
google-calendar-workspace-mcp-server
```

## Usage with Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "npx",
      "args": ["google-calendar-workspace-mcp-server"],
      "env": {
        "GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL": "your-service-account@your-project.iam.gserviceaccount.com",
        "GCAL_SERVICE_ACCOUNT_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nYour private key\n-----END PRIVATE KEY-----",
        "GCAL_IMPERSONATE_EMAIL": "user@yourdomain.com"
      }
    }
  }
}
```

## Available Tools

### gcal_list_events

Lists events from a calendar within an optional time range.

**Parameters:**

- `calendar_id` (optional): Calendar ID (default: "primary")
- `time_min` (optional): Start time in RFC3339 format
- `time_max` (optional): End time in RFC3339 format
- `max_results` (optional): Maximum events to return (default: 10, max: 250)
- `query` (optional): Free text search query
- `single_events` (optional): Expand recurring events (default: true)
- `order_by` (optional): "startTime" or "updated"

**Example:**

```
List my events for the next week
```

### gcal_get_event

Retrieves detailed information about a specific event.

**Parameters:**

- `event_id` (required): The event ID
- `calendar_id` (optional): Calendar ID (default: "primary")

**Example:**

```
Get details for event ID abc123
```

### gcal_create_event

Creates a new calendar event.

**Parameters:**

- `summary` (required): Event title
- `start_datetime` OR `start_date` (required): Event start time
- `end_datetime` OR `end_date` (required): Event end time
- `description` (optional): Event description
- `location` (optional): Event location
- `attendees` (optional): Array of email addresses
- `calendar_id` (optional): Calendar ID (default: "primary")

**Example:**

```
Create a meeting tomorrow at 2pm for 1 hour titled "Team Sync"
```

### gcal_list_calendars

Lists all calendars available to the authenticated user.

**Parameters:**

- `max_results` (optional): Maximum calendars to return (default: 50, max: 250)

**Example:**

```
Show all my calendars
```

### gcal_query_freebusy

Queries availability information for calendars.

**Parameters:**

- `time_min` (required): Start time in RFC3339 format
- `time_max` (required): End time in RFC3339 format
- `calendar_ids` (required): Array of calendar IDs to check
- `timezone` (optional): Time zone for the query

**Example:**

```
Check if I'm free tomorrow between 2pm and 4pm
```

## Development

```bash
# Install dependencies
npm run install-all

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run integration tests
npm run test:integration

# Run all tests
npm run test:all
```

## Security Considerations

- **Private Key Security**: Never commit your service account private key to version control
- **Least Privilege**: Only grant the minimum required OAuth scopes
- **Key Rotation**: Regularly rotate service account keys
- **Access Logging**: Monitor service account usage in Google Cloud Console

## Troubleshooting

### Authentication Failed

- Verify service account credentials are correct
- Ensure domain-wide delegation is enabled
- Check that the correct OAuth scope is authorized in Admin Console
- Verify the impersonate email address is correct

### Permission Denied

- Ensure the calendar scope (`https://www.googleapis.com/auth/calendar`) is granted in Google Workspace Admin Console
- Verify the impersonated user has access to the calendar

### Calendar Not Found

- Check that the calendar ID is correct
- Verify the impersonated user has access to the calendar
- Use `gcal_list_calendars` to discover available calendar IDs

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.
