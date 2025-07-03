Goal: get a version bump for any relevant MCP servers in place, and get the PR going that we can merge after human review.

We are doing a version bump of type (major/minor/patch): $ARGUMENTS

I want you to:

- [ ] **CRITICAL FIRST STEP**: Before starting, run `git status` to see current state
- [ ] Run the publication process for server updates ([PUBLISHING_SERVERS.md](../../docs/PUBLISHING_SERVERS.md))
- [ ] **IMMEDIATELY AFTER VERSION BUMP**: Run `git status` to see ALL files modified by npm version command
- [ ] **BEFORE ANY COMMITS**: Ensure ALL files from the version bump are staged (package.json, package-lock.json, CHANGELOG.md, README.md, etc.)
- [ ] Open a PR (or update current one for your branch) in accordance with [pr.md](./pr.md). You **must** follow the full process explained in `pr.md`.

## Version Bump File Checklist

**After running `npm run stage-publish`, these files are typically modified and MUST be committed together:**

- [ ] `experimental/{server}/local/package.json` - Version number updated
- [ ] `experimental/{server}/package-lock.json` - Lock file updated
- [ ] `experimental/{server}/CHANGELOG.md` - New version entry added
- [ ] `README.md` - Version number updated in server table
- [ ] Git tag created (verify with `git tag | grep {version}`)

# **NEVER commit version bumps piecemeal - all version-related changes must be in the same commit or you will break CI.**

- [ ] Think about what you learned during this publishing and PR process. Add any useful insights to the "Claude Learnings" section in the appropriate CLAUDE.md file (could be root or subdirectory)
