# Changelog

All notable changes to `@pulsemcp/mcp-elicitation` will be documented in this file.

## [1.1.0] - 2026-04-26

### Added

- New `ELICITATION_PREFER_HTTP_FALLBACK` env var (and matching `preferHttpFallback` field on `ElicitationConfig`). When set to `"true"` and both `ELICITATION_REQUEST_URL` and `ELICITATION_POLL_URL` are configured, the HTTP fallback (Tier 3) is used in preference to native elicitation (Tier 2), even when the client advertises the `elicitation` capability.
  - Motivation: headless agent runtimes (e.g., Claude Code running under Agent Orchestrator) advertise the `elicitation` capability but auto-cancel the request, so confirmation prompts never reach a human. The new flag lets operators force the HTTP fallback path in those environments.
  - Default behavior is unchanged. The flag is opt-in and only swaps tier order when both fallback URLs are configured.

## [1.0.1] - prior

- Initial published version.
