# Wait for CI Skill

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

If after 2 attempts (about 1 minute total) there are still no checks, CI may not be configured for this repository.
