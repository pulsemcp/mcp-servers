# Aetna Claims MCP Server

An MCP server for managing Aetna health insurance claims using Playwright browser automation with email-based two-factor authentication support.

## Features

- **Automated Login with Email 2FA**: Logs into Aetna's health portal and handles email-based two-factor authentication by reading verification codes via IMAP
- **View Claims**: Retrieve all insurance claims from your Aetna account
- **Claim Details**: Get detailed information about specific claims including financial breakdown
- **Submit Claims**: Prepare and submit new insurance claims with a safety confirmation flow

## Tools

### `get_claims`

Get all insurance claims from your Aetna account.

### `get_claim_details`

Get detailed information about a specific claim including financial breakdown (billed, allowed, paid, deductible, copay, coinsurance).

### `prepare_claim_to_submit`

Prepare a claim for submission. Fills out the form and validates everything before submitting. Returns a confirmation token that must be used with `submit_claim`.

Parameters:

- `member_name` (required): Name of the member the claim is for
- `claim_type` (required): Medical, Dental, Vision, or Pharmacy
- `date_of_service` (required): Start date (MM/DD/YYYY)
- `amount_paid` (required): Amount paid
- `end_date`: Optional end date
- `reimburse_provider`: Reimburse provider directly (default: false)
- `invoice_file_path`: Path to itemized bill (JPEG, PDF, PNG, DOCX)
- `is_accident_related`: Accident-related claim (default: false)
- `is_employment_related`: Employment-related claim (default: false)
- `is_outside_us`: Services outside the U.S. (default: false)
- `has_other_coverage`: Other group health plan coverage (default: false)

### `submit_claim`

Submit a prepared claim using the confirmation token from `prepare_claim_to_submit`.

## Configuration

### Required Environment Variables

| Variable              | Description                                      |
| --------------------- | ------------------------------------------------ |
| `AETNA_USERNAME`      | Your Aetna account username                      |
| `AETNA_PASSWORD`      | Your Aetna account password                      |
| `EMAIL_IMAP_USER`     | Email address for receiving 2FA codes            |
| `EMAIL_IMAP_PASSWORD` | Email password or app-specific password for IMAP |

### Optional Environment Variables

| Variable             | Default                | Description                    |
| -------------------- | ---------------------- | ------------------------------ |
| `EMAIL_IMAP_HOST`    | `imap.gmail.com`       | IMAP server host               |
| `EMAIL_IMAP_PORT`    | `993`                  | IMAP server port               |
| `HEADLESS`           | `true`                 | Run browser in headless mode   |
| `TIMEOUT`            | `30000`                | Browser operation timeout (ms) |
| `AETNA_DOWNLOAD_DIR` | `/tmp/aetna-downloads` | Document download directory    |

### Gmail Setup for 2FA

If using Gmail to receive Aetna 2FA codes:

1. Enable 2-Step Verification on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the app password as `EMAIL_IMAP_PASSWORD`

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aetna-claims": {
      "command": "npx",
      "args": ["-y", "aetna-claims-mcp-server"],
      "env": {
        "AETNA_USERNAME": "your-username",
        "AETNA_PASSWORD": "your-password",
        "EMAIL_IMAP_USER": "your-email@gmail.com",
        "EMAIL_IMAP_PASSWORD": "your-app-password"
      }
    }
  }
}
```

## Development

```bash
npm run install-all      # Install all dependencies
npm run build            # Build TypeScript
npm run dev              # Development mode with auto-reload
npm run test             # Run functional tests
npm run test:integration # Run integration tests
npm run test:manual      # Run manual tests (needs credentials)
```
