# Push working state to a PR

Our goal is to take the current state of our git diff (ALL The files), commit the files (with a reasonable commit message), push them (to a branch), open a PR, verify the PR passed CI checks (don't skip this!), and surface the link to the PR back to me so I can click it to review.

Follow this checklist when executing this:

- [ ] **CRITICAL**: Check git status and verify ALL modified files are included
- [ ] Assess whether we are in a good state to commit to a feature branch
- [ ] Analyze the diff to come up with a good commit message
- [ ] **BEFORE COMMITTING**: Run `git status` and verify all intended changes are staged
- [ ] **BEFORE COMMITTING**: Run `git diff --cached` to review exactly what will be committed
- [ ] Commit the changes
- [ ] **AFTER COMMITTING**: Run `git status` again to ensure working tree is clean
- [ ] Run pre-commit checklist (see below)
- [ ] Push it
- [ ] Open a PR
- [ ] Perform self-code review of the PR diff
- [ ] Action any issues found during review
- [ ] Wait for CI to complete using the `wait-for-CI` skill
- [ ] If CI fails, investigate the failure, fix it. Repeat until CI is passing
- [ ] Think about what you learned during this PR creation process. Add any useful insights to the "Claude Learnings" section in the appropriate CLAUDE.md file (could be root or subdirectory)
- [ ] Surface the PR link back to the user

## Workflow Details

For detailed git workflow information including branch naming conventions and recovery procedures, see [docs/GIT_WORKFLOW.md](../../docs/GIT_WORKFLOW.md).

## Quick Reference

### If on wrong branch

- **On main**: `git reset --soft` to origin/main, stash, create feature branch, pop stash
- **On unrelated branch**: Same process - reset to origin, stash, checkout main, pull, create new branch

### CRITICAL: Git Status Verification

**ALWAYS run these commands before committing to ensure no files are missed:**

```bash
# 1. Check what files are modified
git status

# 2. Review all changes that will be committed
git diff --cached

# 3. If you see "Changes not staged for commit", add them:
git add .

# 4. Verify working tree is clean after staging
git status

# 5. Final review of what will be committed
git diff --cached
```

**Common scenarios that cause missed files:**

- Running `npm version` or `npm run stage-publish` (modifies package.json, package-lock.json, creates git tags)
- Build processes that modify generated files
- Auto-formatting that changes multiple files
- Dependency updates that modify lock files

### Pre-PR checklist

1. **MANDATORY**: Complete git status verification above
2. Check for and resolve any merge conflicts:
   - Pull latest from main with `git pull --rebase origin main`
   - If conflicts exist, resolve them before proceeding
3. Run linting and formatting:
   - `npm run lint:fix` - Auto-fix linting issues
   - `npm run format` - Format code with Prettier
   - Commit any fixes with proper git status checks
4. Run tests to ensure everything passes:
   - `npm run test:run` - Run functional tests
   - `npm run test:integration` - Run integration tests

### Post-PR open checklist

#### Merge conflicts

Immediately check if there are any merge conflicts. Resolve them by following [merge_conflicts.md](./merge_conflicts.md).

#### Self-Code Review

Before waiting for CI, perform a self-code review of your PR diff:

1. Review the diff on GitHub or via `gh pr diff`
2. Look for:
   - Logic errors or bugs
   - Missing edge cases
   - Code style issues
   - Unnecessary changes or debug code
   - Security concerns
3. Fix any issues found and push the fixes

#### CI Monitoring

After completing your self-review (and actioning any issues), monitor CI status and fix any failures by following [ensure_ci_success.md](./ensure_ci_success.md).
