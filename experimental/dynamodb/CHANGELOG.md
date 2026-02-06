# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Table-level access control via `DYNAMODB_ALLOWED_TABLES` environment variable
  - Restricts operations to a specific set of tables
  - `list_tables` filters results to only show allowed tables
  - All other operations return "Access denied" error for non-allowed tables
  - Batch operations validate all tables in the request

### Changed

- **BREAKING**: Removed `dynamodb_` prefix from all tool names (e.g., `dynamodb_get_item` is now `get_item`). MCP clients typically prefix tool names with the server name, making the prefix redundant.
- Renamed `query` to `query_items` for clarity
- Renamed `scan` to `scan_table` for clarity

## [0.1.0] - 2026-02-06

### Added

- Initial DynamoDB MCP server implementation
- **Readonly tools**: `list_tables`, `describe_table`, `get_item`, `query_items`, `scan_table`, `batch_get_items`
- **ReadWrite tools**: `put_item`, `update_item`, `delete_item`, `batch_write_items`
- **Admin tools**: `create_table`, `delete_table`, `update_table`
- Fine-grained tool access control via environment variables:
  - `DYNAMODB_ENABLED_TOOL_GROUPS`: Enable tool groups (readonly, readwrite, admin)
  - `DYNAMODB_ENABLED_TOOLS`: Whitelist specific tools
  - `DYNAMODB_DISABLED_TOOLS`: Blacklist specific tools
- AWS credential support via environment variables or default credential chain
- Custom endpoint support for local DynamoDB or LocalStack
- Configuration resource at `dynamodb://config`
