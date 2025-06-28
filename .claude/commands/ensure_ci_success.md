Before handing back control to the user, ensure CI is successful:

1. Check CI status with `gh pr checks <PR_NUMBER> --repo <OWNER>/<REPO>`
2. If any checks fail:
   - View the failure logs
   - Fix the issues locally
   - **CRITICAL**: Run `git status` to see all modified files from the fix
   - **CRITICAL**: Run `git add .` to stage all changes from the fix
   - **CRITICAL**: Run `git status` again to verify working tree is clean
   - **CRITICAL**: Use `git commit` (not `git commit --no-verify`) - the alias enforces safety
   - Push the fixes
   - Continue monitoring until all checks pass
