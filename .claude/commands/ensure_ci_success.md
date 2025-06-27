Before handing back control to the user, ensure CI is successful:

1. Check CI status with `gh pr checks <PR_NUMBER> --repo <OWNER>/<REPO>`
2. If any checks fail:
   - View the failure logs
   - Fix the issues locally
   - Commit and push the fixes
   - Continue monitoring until all checks pass
3. Only proceed to Post-PR steps after all CI checks are green
