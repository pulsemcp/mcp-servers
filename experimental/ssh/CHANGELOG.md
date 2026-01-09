# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-01-09

### Added

- SSH connection health check on startup to surface configuration issues immediately
- `HEALTH_CHECK_TIMEOUT` environment variable for configuring health check timeout (default: 10 seconds)
- `SKIP_HEALTH_CHECKS` environment variable to disable startup health check (set to "true" to skip)
- Helpful error messages with hints for common SSH connection issues (authentication, timeout, connection refused, DNS resolution)

## [0.1.0] - 2026-01-08

### Added

- Initial implementation of SSH MCP server
- SSH agent authentication support for passphrase-protected keys
- Private key file authentication as fallback
- `ssh_execute` tool for running commands on remote servers
- `ssh_upload` tool for uploading files via SFTP
- `ssh_download` tool for downloading files via SFTP
- `ssh_list_directory` tool for browsing remote file systems
- `ssh_connection_info` tool for checking connection configuration
- Tool grouping system (readonly, write, admin) for access control
- Configuration resource at `ssh://config` for debugging
- Environment variable validation at startup (port, timeout validation)
- Comprehensive error handling with user-friendly messages
- Input validation with Zod schemas for all tool parameters
- Proper resource cleanup (SSH connections always disconnected via try/finally)
