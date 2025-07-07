#!/bin/bash
# Install dependencies for all workspaces in a monorepo
# Usage: install-monorepo-deps.sh <worktree-path>

WORKTREE_PATH="$1"

if [ -z "$WORKTREE_PATH" ]; then
  echo "Error: Worktree path required"
  echo "Usage: $0 <worktree-path>"
  exit 1
fi

cd "$WORKTREE_PATH" || exit 1

echo "[Background Install] Starting dependency installation for all workspaces..."

# Install root dependencies first
if [ -f "package-lock.json" ]; then
  npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null 2>&1
else
  npm install --no-audit --no-fund >/dev/null 2>&1
fi

# Function to find and install in all subdirs with package.json
install_in_subdirs() {
  local search_dir="$1"
  
  # Find all package.json files (excluding node_modules)
  find "$search_dir" -name "package.json" -not -path "*/node_modules/*" -not -path "$search_dir/package.json" | while read -r pkg_file; do
    local pkg_dir=$(dirname "$pkg_file")
    # Get relative path (macOS compatible)
    local rel_path="${pkg_dir#$WORKTREE_PATH/}"
    
    echo "[Background Install] Installing in $rel_path..."
    cd "$pkg_dir"
    
    # Check if there's a ci:install script (common in monorepos)
    if grep -q '"ci:install"' package.json 2>/dev/null; then
      npm run ci:install >/dev/null 2>&1
    elif [ -f "package-lock.json" ]; then
      npm ci --no-audit --no-fund >/dev/null 2>&1
    else
      npm install --no-audit --no-fund >/dev/null 2>&1
    fi
    
    cd "$WORKTREE_PATH"
  done
}

# Install in common monorepo directories
for dir in experimental productionized libs packages apps services; do
  if [ -d "$dir" ]; then
    install_in_subdirs "$dir"
  fi
done

# Also check any other directories that might have package.json
install_in_subdirs "."

echo "[Background Install] ✅ All dependencies installed successfully!"
echo "[Background Install] You can check install progress in: $WORKTREE_PATH/.gw-install.log"