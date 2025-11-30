---
name: wait-for-CI
description: Block until CI passes or fails on the current PR
---

# Wait for CI

This skill blocks until CI either passes or fails on the current PR using a single blocking command.

## Usage

Run this command to block until CI completes:

```bash
gh pr checks --watch --fail-fast
```

This command will:

- Block until all CI checks complete
- Exit with code 0 if all checks pass
- Exit with non-zero code and stop early (`--fail-fast`) if any check fails

## Handling "no checks" case

If CI hasn't started yet, the command may return immediately with "no checks reported". In that case, wait briefly and retry:

```bash
sleep 30 && gh pr checks --watch --fail-fast
```

If after 2 attempts (about 1 minute total) there are still no checks, one of the following is true:

- **You have merge conflicts.** Resolve them and then start the CI wait again.
- **Your changes are not triggering CI.** Check the GitHub Actions setup to confirm nothing will have triggered. If true, you can consider CI green.
- **GitHub is having issues.** Check status.github.com to verify. If true, bail out and let the user know they'll need to try again when GitHub is back.
