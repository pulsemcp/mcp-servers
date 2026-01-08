# Manual Testing Results

This file tracks the results of manual testing against real GCS credentials.

## Latest Test Run

**Date:** 2026-01-08 20:15 UTC
**Branch:** claude/file-upload-mcp-server
**Commit:** 12067ab (tests run against uncommitted refactor changes)
**Tested By:** Claude
**Environment:** Real GCS bucket with inline credentials

### Test Results

**Type:** Full manual testing with real GCS credentials
**Status:** :white_check_mark: Core functionality verified (15/18 tests passed)

**Details:**

- All upload operations work correctly (PNG, text, from disk)
- Download works for both text and binary (base64) content
- List files and directories works correctly
- GetInfo retrieves correct metadata
- Delete successfully removes files
- Exists correctly detects file presence/absence
- Content type detection and override works
- Modify content type works

**Known Limitations:**

- 3 tests failed due to bucket having **uniform bucket-level access** enabled
- ACL-related operations (makePublic/makePrivate) require object-level ACLs
- This is expected behavior - not a code bug

### Manual Test Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 18    |
| Passed      | 15    |
| Failed      | 3     |
| Pass Rate   | 83%   |

### Test Breakdown

| Test Suite             | Status             | Tests | Notes                                       |
| ---------------------- | ------------------ | ----- | ------------------------------------------- |
| upload                 | :warning: Partial  | 2/3   | Public upload fails (uniform bucket access) |
| uploadFile             | :white_check_mark: | 1/1   | Upload from disk works                      |
| download               | :white_check_mark: | 2/2   | Text and base64 download work               |
| list                   | :white_check_mark: | 2/2   | Files and directories listing works         |
| getInfo                | :white_check_mark: | 1/1   | File metadata retrieval works               |
| modify                 | :warning: Partial  | 1/3   | Content type works, ACL changes fail        |
| delete                 | :white_check_mark: | 1/1   | File deletion works                         |
| exists                 | :white_check_mark: | 2/2   | Existence check works                       |
| content type detection | :white_check_mark: | 3/3   | Auto-detect and override work               |

### Failed Tests Detail

All 3 failures are due to the same GCS bucket configuration:

```
Error: Cannot update access control for an object when uniform bucket-level access is enabled.
```

This is expected behavior when the GCS bucket has **uniform bucket-level access** enabled. To use per-object ACLs (makePublic/makePrivate), the bucket must be configured with **fine-grained** access control.

---

## Setup for Manual Testing

### Option 1: Inline credentials (recommended)

1. Create a GCS bucket
2. Create a service account with Storage Admin role
3. Create a JSON key for the service account
4. Create `.env` file with:
   ```bash
   GCS_BUCKET=your-bucket-name
   GCS_PROJECT_ID=your-project-id
   GCS_CLIENT_EMAIL=sa-name@project.iam.gserviceaccount.com
   GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

### Option 2: Key file

1. Create a GCS bucket
2. Create a service account with Storage Admin role
3. Download the service account key JSON file
4. Set environment variables:
   ```bash
   export GCS_BUCKET=your-bucket
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   ```

### Running Tests

```bash
npm run test:manual
```

---

## Previous Test Runs

### 2026-01-08 17:00 UTC

**Branch:** claude/file-upload-mcp-server
**Commit:** dc54a70
**Type:** Build verification and functional/integration tests only
**Status:** :white_check_mark: Build successful, all tests passed (15/15)

- Successfully built shared module
- Successfully built local module
- TypeScript compilation completed without errors
- All 11 functional tests passed
- All 4 integration tests passed with mock GCS client
