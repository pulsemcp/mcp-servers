# Pulse Fetch Shared

This package contains shared code and utilities for both local and remote implementations of the Pulse Fetch server. It is not a standalone server; just ensures that we have strong design feature parity across the local (stdio) and remote (HTTP) implementations.

## How It Works

This package uses a local file reference approach instead of creating a published npm package. This allows for:

1. Sharing code between different implementations
2. Maintaining a single source of truth for common functionality
3. Easy development workflow with automatic rebuilding

## Usage

The shared package is used by both local and remote implementations through the `file:../shared` reference in package.json.

To update and use the shared code:

1. Make changes to the shared code
2. Run `npm run build` in the shared folder (or let the `predev` and `prebuild` scripts handle this for you)
3. The implementations will automatically use the latest compiled version
