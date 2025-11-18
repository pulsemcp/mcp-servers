#!/bin/bash
set -e

# Read tool use JSON from stdin
TOOL_JSON=$(cat)

# Extract tool name
TOOL_NAME=$(echo "$TOOL_JSON" | jq -r '.name')

# Define the allowed root
ALLOWED_ROOT="/Users/admin/github-projects/agents/agent-orchestrator/tmp/clones/mcp-servers-main-1763404095-0c9707f8"

# Function to validate a path
validate_path() {
  local path="$1"

  # Skip empty paths
  if [ -z "$path" ]; then
    return 0
  fi

  # Check for directory traversal attempts using relative paths
  if [[ "$path" == *".."* ]]; then
    echo "Error: Path contains '..' which could escape filesystem root: $path" >&2
    exit 1
  fi

  # Convert to absolute path for comparison
  # If path is already absolute, realpath will normalize it
  # If path is relative, it will be resolved relative to current directory
  if [[ "$path" == /* ]]; then
    # Absolute path
    RESOLVED_PATH=$(readlink -f "$path" 2>/dev/null || echo "$path")
  else
    # Relative path - resolve relative to allowed root
    RESOLVED_PATH=$(cd "$ALLOWED_ROOT" && readlink -f "$path" 2>/dev/null || echo "$ALLOWED_ROOT/$path")
  fi

  # Check if resolved path starts with allowed root
  if [[ "$RESOLVED_PATH" != "$ALLOWED_ROOT"* ]]; then
    echo "Error: Path '$path' (resolves to '$RESOLVED_PATH') is outside allowed filesystem root: $ALLOWED_ROOT" >&2
    exit 1
  fi
}

# Validate paths based on tool type
case "$TOOL_NAME" in
  Bash)
    # For Bash, we need to check the command for absolute paths outside root
    COMMAND=$(echo "$TOOL_JSON" | jq -r '.input.command // empty')

    # Skip validation for whitelisted commands
    # - gh commands: Allow all gh CLI commands (read-only tool for GitHub interaction)
    # - git commands: Only allow read-only operations (log, show, diff, status, etc.)
    #   Block dangerous operations that could modify outside filesystem root
    if [[ "$COMMAND" =~ ^gh[[:space:]] ]]; then
      # Allow all gh commands (read-only GitHub CLI)
      exit 0
    fi

    # For git commands, only allow read-only operations
    if [[ "$COMMAND" =~ ^git[[:space:]] ]]; then
      # Extract the git subcommand (first word after 'git')
      GIT_SUBCOMMAND=$(echo "$COMMAND" | awk '{print $2}')

      # Whitelist of read-only git commands
      case "$GIT_SUBCOMMAND" in
        # Read-only commands - safe to allow
        log|show|diff|status|branch|tag|remote|ls-files|ls-tree|ls-remote|cat-file|rev-parse|describe|shortlog|blame|annotate|reflog|config)
          exit 0
          ;;
        # All other commands (clone, checkout, commit, push, pull, etc.) must respect filesystem root
        *)
          # Fall through to path validation
          ;;
      esac
    fi

    # Extract potential absolute paths from the command
    # This is a basic check - looks for strings starting with /
    PATHS=$(echo "$COMMAND" | grep -oE '(/[^ ]*|"[^"]*"|'\''[^'\'']*'\'')'  | sed "s/[\"']//g" || true)

    if [ -n "$PATHS" ]; then
      while IFS= read -r path; do
        # Only validate paths that start with /
        if [[ "$path" == /* ]]; then
          validate_path "$path"
        fi
      done <<< "$PATHS"
    fi
    ;;
  Read|Write|Edit|Glob|NotebookEdit)
    # These tools have file_path or path parameters
    FILE_PATH=$(echo "$TOOL_JSON" | jq -r '.input.file_path // .input.path // .input.notebook_path // empty')
    validate_path "$FILE_PATH"
    ;;
  Grep)
    # Grep has optional path parameter
    GREP_PATH=$(echo "$TOOL_JSON" | jq -r '.input.path // empty')
    validate_path "$GREP_PATH"
    ;;
esac

# If we get here, validation passed
exit 0