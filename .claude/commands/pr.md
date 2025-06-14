# Push working state to a PR

Our goal is to take the current state of our git diff (ALL The files), commit the files (with a reasonable commit message), push them (to a branch), open a PR, and surface the link to the PR back to me so I can click it.

Follow this checklist when executing this:

- [ ] Assess whether we are in a good state to commit to a feature branch
- [ ] Analyze the diff to come up with a good commit message
- [ ] Commit the changes
- [ ] Run pre-commit checklist (see below)
- [ ] Push it
- [ ] Open a PR
- [ ] Wait for the PR to successfully pass CI
- [ ] If it fails CI, investigate the failure, fix it. Repeat until CI is passing
- [ ] Surface the PR link back to the user

## Workflow Details

For detailed git workflow information including branch naming conventions and recovery procedures, see [docs/GIT_WORKFLOW.md](../../docs/GIT_WORKFLOW.md).

## Quick Reference

### If on wrong branch

- **On main**: `git reset --soft` to origin/main, stash, create feature branch, pop stash
- **On unrelated branch**: Same process - reset to origin, stash, checkout main, pull, create new branch

### Pre-PR checklist

1. Check for and resolve any merge conflicts:
   - Pull latest from main with `git pull --rebase origin main`
   - If conflicts exist, resolve them before proceeding
2. Run linting and formatting:
   - `npm run lint:fix` - Auto-fix linting issues
   - `npm run format` - Format code with Prettier
   - Commit any fixes
3. Run tests to ensure everything passes:
   - `npm run test:run` - Run functional tests
   - `npm run test:integration` - Run integration tests

### CI Monitoring

After creating the PR, monitor CI status and fix any failures:

1. Check CI status with `gh pr checks <PR_NUMBER> --repo <OWNER>/<REPO>`
2. If any checks fail:
   - View the failure logs
   - Fix the issues locally
   - Commit and push the fixes
   - Continue monitoring until all checks pass
3. Only proceed to Post-PR steps after all CI checks are green
