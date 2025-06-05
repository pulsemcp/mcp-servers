#!/bin/bash

# Git Worktree script
# Creates a new git worktree with a branch and opens it in VS Code Insider

# Function to display help
show_help() {
    echo "Usage: $(basename $0) [OPTIONS] [branch-suffix]"
    echo ""
    echo "Creates a new git worktree with a branch and opens it in VS Code Insider."
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "ARGUMENTS:"
    echo "  branch-suffix   Optional branch name suffix (default: patch-{timestamp})"
    echo ""
    echo "Examples:"
    echo "  $(basename $0)                    # Create worktree with auto-generated branch name"
    echo "  $(basename $0) fix-bug            # Create worktree with branch tadasant/fix-bug"
}

# Get the git repository root (works in both main repo and worktrees)
CURRENT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$CURRENT_ROOT" ]; then
  echo "Error: Not in a git repository"
  exit 1
fi

# Find the main worktree (the actual git directory)
GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null)"
if [ "$GIT_COMMON_DIR" = ".git" ] || [ "$GIT_COMMON_DIR" = "$(pwd)/.git" ]; then
  # We're in the main repository
  MAIN_WORKTREE="$CURRENT_ROOT"
else
  # We're in a worktree, find the main worktree
  MAIN_WORKTREE="$(dirname "$GIT_COMMON_DIR")"
fi

# Parse command line arguments
BRANCH_SUFFIX=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
        *)
            BRANCH_SUFFIX="$1"
            shift
            ;;
    esac
done

# If no argument provided, use patch-{datetime}
if [ -z "$BRANCH_SUFFIX" ]; then
  BRANCH_SUFFIX="patch-$(date +%s)"
fi

# Create the full branch name with github username prefix
BRANCH_NAME="tadasant/$BRANCH_SUFFIX"

# Create worktree directory name (replace / with -)
WORKTREE_DIR=$(echo "$BRANCH_NAME" | tr '/' '-')

# Stash any uncommitted changes
echo "Checking for uncommitted changes..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Stashing uncommitted changes..."
  git stash push -m "Auto-stash before creating worktree $BRANCH_NAME"
  STASHED=true
else
  STASHED=false
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Switching to main branch..."
  git checkout main
fi

# Pull latest main branch
echo "Pulling latest main branch..."
git pull origin main

# Create the worktree (at the same level as other worktrees)
echo "Creating worktree: $WORKTREE_DIR"
echo "With branch: $BRANCH_NAME"

# Get the parent directory of the main worktree
WORKTREES_PARENT="$(dirname "$MAIN_WORKTREE")"
NEW_WORKTREE_PATH="$WORKTREES_PARENT/$WORKTREE_DIR"

git worktree add "$NEW_WORKTREE_PATH" -b "$BRANCH_NAME"

if [ $? -eq 0 ]; then
  echo "Worktree created successfully!"
  
  # Copy .env files if they exist
  echo "Copying environment files..."
  
  # Define the files to copy (adjust based on your project structure)
  FILES_TO_COPY=(
    ".env"
    ".env.local"
    ".vscode/tasks.json"
  )
  
  # Copy each file if it exists (from current worktree)
  for FILE in "${FILES_TO_COPY[@]}"; do
    SOURCE_FILE="$CURRENT_ROOT/$FILE"
    if [ -f "$SOURCE_FILE" ]; then
      TARGET_FILE="$NEW_WORKTREE_PATH/$FILE"
      TARGET_DIR=$(dirname "$TARGET_FILE")
      
      # Create target directory if it doesn't exist
      mkdir -p "$TARGET_DIR"
      
      # Copy the file
      cp "$SOURCE_FILE" "$TARGET_FILE"
      echo "  ✓ Copied $FILE"
    fi
  done
  
  echo "Opening in VS Code Insider..."
  code-insiders "$NEW_WORKTREE_PATH" --new-window
  
  # If we stashed changes, apply them back on main
  if [ "$STASHED" = true ]; then
    echo "Returning to original location and applying stashed changes..."
    cd "$CURRENT_ROOT"
    git stash pop
  fi
else
  echo "Failed to create worktree"
  exit 1
fi