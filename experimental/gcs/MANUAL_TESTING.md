# Manual Testing Results

## Prerequisites

1. Commit all changes to the branch
2. Set up `.env` file with real GCS credentials (see `.env.example`)
3. Run `npm run test:manual:setup` for first-time setup

## Running Manual Tests

```bash
npm run test:manual
```

## Latest Test Results

**Commit:** 304feb7
**Result:** Manual tests not re-run — this is a dependency-only change that pins `fast-xml-parser` to `>=5.3.4 <5.5.0` to work around a broken upstream release. No server code was modified. All functional tests (24/24) and integration tests (16/16) pass.

## Test Results

### 2026-02-28 - v0.1.1 (tool group change only, no API code changes)

**Commit:** 5457e46
**Result:** Manual tests not re-run — this change only moves `delete_object` and `delete_bucket` from the `readwrite` tool group to a new `delete` tool group. No API-calling code was modified. All functional tests (24/24) and integration tests (16/16) pass, including 3 new tool group filtering tests.

### 2026-02-10 - v0.1.0 Manual Testing

**Commit:** 7ad94af
**Result:** 9/9 tests passed (100%)

```
 ✓ GCS Manual Tests > Bucket Operations > should list buckets  449ms
 ✓ GCS Manual Tests > Bucket Operations > should create a test bucket  811ms
 ✓ GCS Manual Tests > Bucket Operations > should check if bucket exists
 ✓ GCS Manual Tests > Object Operations > should put an object  461ms
 ✓ GCS Manual Tests > Object Operations > should list objects
 ✓ GCS Manual Tests > Object Operations > should get an object
 ✓ GCS Manual Tests > Object Operations > should copy an object  425ms
 ✓ GCS Manual Tests > Object Operations > should delete an object  301ms
 ✓ GCS Manual Tests > Cleanup > should delete the test bucket  806ms

Test Files  1 passed (1)
     Tests  9 passed (9)
```

**Key functionality verified:**

- Authentication via inline service account JSON (`GCS_SERVICE_ACCOUNT_KEY_JSON`)
- Bucket CRUD: list (found 5 existing), create, head (existence check), delete
- Object CRUD: put with metadata, list with prefix filter, get with content verification, copy, delete
- Cleanup: bucket deletion after emptying objects
