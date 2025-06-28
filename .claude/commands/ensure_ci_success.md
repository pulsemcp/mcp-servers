Before handing back control to the user, ensure CI is successful:

1. Check CI status with `gh pr checks <PR_NUMBER> --repo <OWNER>/<REPO>`
2. If any checks fail:
   - View the failure logs
   - Fix the issues locally
   - **CRITICAL**: Run `git status` to see all modified files from the fix
   - **CRITICAL**: Run `git add .` to stage all changes from the fix
   - **CRITICAL**: Run `git status` again to verify working tree is clean
   - Commit and push the fixes
   - Continue monitoring until all checks pass
3. Once CI is successful, think about what you learned during this PR process. Add any useful insights to the "Claude Learnings" section in the appropriate CLAUDE.md file (could be root or subdirectory)
