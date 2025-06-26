# Publishing MCP Servers

This document outlines the process for publishing MCP servers from this monorepo to npm.

## Overview

Our monorepo contains multiple MCP servers that can be independently versioned and published to npm. The publication process is designed to be:

- **Server-specific**: Each server can be published independently without affecting others
- **Automated**: Publishing happens automatically when PRs with version bumps are merged to main
- **Verified**: PRs are checked to ensure all publication requirements are met

## Publication Flow

### 1. Stage the Publication

From within the server's `local/` directory (e.g., `experimental/appsignal/local/`):

```bash
# Navigate to the server's local directory
cd experimental/appsignal/local/

# Bump the version (choose one)
npm run stage-publish patch  # For bug fixes (0.1.0 -> 0.1.1)
npm run stage-publish minor  # For new features (0.1.0 -> 0.2.0)
npm run stage-publish major  # For breaking changes (0.1.0 -> 1.0.0)
```

This will:

- Update the version in `package.json`
- Create a git commit with the version bump
- Create a git tag (e.g., `appsignal-mcp-server@0.1.1`)

### 2. Update the Changelog

After staging the publication, update the server's CHANGELOG.md file:

1. Navigate to the server's root directory (e.g., `experimental/appsignal/`)
2. Edit `CHANGELOG.md`
3. Move items from `[Unreleased]` to a new version section
4. Add the version number and date
5. Follow the [Keep a Changelog](https://keepachangelog.com) format

Example:

```markdown
## [0.1.1] - 2024-01-15

### Fixed

- Fixed authentication error handling
- Improved error messages

### Added

- Added retry logic for API calls
```

### 3. Create and Submit PR

```bash
# Push your changes and tags
git push origin <your-branch>
git push origin --tags

# Create a PR through GitHub UI or CLI
gh pr create --title "Publish appsignal-mcp-server@0.1.1" \
  --body "Publishing AppSignal MCP server version 0.1.1

## Changes
- Fixed authentication error handling
- Added retry logic

## Checklist
- [x] Version bumped in package.json
- [x] CHANGELOG.md updated
- [x] All tests passing
- [x] Git tag created"
```

### 4. PR Verification

When you open a PR, the "Verify MCP Server Publication Staged" GitHub Action will:

- Check that version was bumped in `package.json`
- Verify that `CHANGELOG.md` was updated with the new version
- Ensure the git tag exists and matches the package version
- Run tests for the modified server
- Verify the build succeeds
- Check that the main README.md has been updated with the new version number

### 5. Automatic Publishing

When your PR is merged to `main`, the "Publish Updated MCP Servers" GitHub Action will:

1. Detect which servers have version bumps
2. For each updated server:
   - Run the build process
   - Run all tests
   - Publish to npm with public access
   - Update GitHub releases

## Important Notes

### Package Naming

All experimental MCP servers should follow the naming convention: `<name>-mcp-server`. All productionized servers should follow the naming convention: `@pulsemcp/<name>-mcp-server`

### Version Management

- Each server maintains its own version in its `local/package.json`
- Versions are independent - publishing one server doesn't affect others
- Use semantic versioning (semver)

### Directory Structure

```
experimental/
└── appsignal/
    ├── CHANGELOG.md      # Server-specific changelog
    ├── local/
    │   └── package.json  # Contains version and npm scripts
    └── shared/           # Shared code (not published directly)
```

### npm Access

Servers are published with public access by default. Ensure no sensitive information is included in the published package.

### Pre-publication Checklist

Before creating a PR:

- [ ] Version bumped using `npm run stage-publish`
- [ ] CHANGELOG.md updated with new version section
- [ ] All tests pass (`npm test`, `npm run test:integration`)
- [ ] Build succeeds (`npm run build`)
- [ ] No sensitive information in code
- [ ] Git tag created and pushed
- [ ] Main README.md updated - change server's "Local Status" from "Not Yet Published" to the version number

## Troubleshooting

### Version Already Exists

If npm publish fails because the version already exists:

1. Check npm to see what versions are published
2. Bump to a higher version
3. Update CHANGELOG.md accordingly

### Missing Changelog Entry

The PR verification will fail if:

- CHANGELOG.md doesn't exist
- The new version isn't listed in CHANGELOG.md
- The changelog entry doesn't follow the expected format

### Tag Mismatch

Ensure your git tag matches the pattern: `<package-name>@<version>`
Example: `appsignal-mcp-server@0.1.1`

### README.md Not Updated

The PR verification will fail if the main README.md hasn't been updated with the new version:

- For servers showing "Not Yet Published", update to the actual version number
- The server must appear in the correct table (Experimental or Productionized)
- The version in README.md must match the version in package.json

The automated check looks for entries like:

```
| server-name | Description | 0.1.0 | ... |
```

## Adding a New Server to the Publication Process

When adding a new MCP server:

1. Ensure `package.json` has:
   - Correct name following `<name>-mcp-server` convention
   - `stage-publish` script: `"stage-publish": "npm version"`
   - Proper version number (usually start at `0.1.0`)

2. Create a `CHANGELOG.md` in the server's root directory

3. The GitHub Actions will automatically detect and handle the new server

## Manual Publishing (Emergency Only)

If automatic publishing fails, authorized maintainers can manually publish:

```bash
cd experimental/appsignal/local/
npm run build
npm publish --access public
```

Always prefer the automated process to ensure consistency and proper verification.
