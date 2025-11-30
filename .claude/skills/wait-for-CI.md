# Wait for CI Skill

This skill blocks until CI either passes or fails on the current PR.

## Usage

Use this skill when you need to wait for CI to complete on a PR. It will:
1. Detect when CI starts (fails if CI doesn't start within 1 minute)
2. Block until CI either passes (all green) or fails (first failure detected)
3. Report the final status

## Instructions

Execute the following loop to wait for CI:

### Step 1: Get the current PR number

```bash
gh pr view --json number -q '.number'
```

If there's no PR, this skill cannot be used. Exit and inform the user.

### Step 2: Wait for CI to start (max 1 minute)

Poll every 10 seconds for up to 1 minute to detect CI starting:

```bash
gh pr checks --json name,state,startedAt -q '.[] | select(.startedAt != null)'
```

If after 6 attempts (1 minute) no checks have started, report a failure:
- "CI did not start within 1 minute. Please check if CI is configured correctly for this repository."

### Step 3: Wait for CI to complete

Once CI has started, poll every 15 seconds until completion:

```bash
gh pr checks --json name,state,conclusion
```

Parse the output to determine status:
- If any check has `"conclusion": "failure"` - CI has failed, exit immediately and report which check(s) failed
- If any check has `"conclusion": "cancelled"` - CI was cancelled, exit and report
- If all checks have a non-null conclusion and all are `"success"` - CI passed, exit successfully
- If checks still have `"state": "pending"` or `"state": "in_progress"` with null conclusion - continue polling

### Step 4: Report the result

After CI completes, provide a clear summary:

**On success:**
- "CI passed. All checks are green."

**On failure:**
- "CI failed. The following checks failed: [list of failed check names]"
- Include any available details about the failures

**On timeout or other issues:**
- Report what happened and suggest next steps

## Example polling loop

```bash
# Check CI status
gh pr checks --json name,state,conclusion,startedAt 2>/dev/null
```

The output is JSON array like:
```json
[
  {"name": "test", "state": "completed", "conclusion": "success", "startedAt": "..."},
  {"name": "lint", "state": "in_progress", "conclusion": null, "startedAt": "..."}
]
```

Continue polling until all checks have a non-null `conclusion` field, then evaluate the results.
