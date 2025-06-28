#!/bin/bash
# Git commit wrapper that prevents --no-verify usage
# This enforces the CLAUDE.md policy of never bypassing pre-commit hooks

# Check if --no-verify is in the arguments
for arg in "$@"; do
    if [[ "$arg" == "--no-verify" || "$arg" == "-n" ]]; then
        echo ""
        echo "❌ ERROR: --no-verify is disabled in this repository"
        echo ""
        echo "📖 From CLAUDE.md: NEVER use git commit --no-verify"
        echo ""
        echo "🔧 If pre-commit hooks fail, fix the underlying issue:"
        echo ""
        echo "   🔨 Dependency/Module Issues (Cannot find module errors):"
        echo "      cd /path/to/repo/root"
        echo "      rm -rf node_modules package-lock.json"
        echo "      npm install"
        echo ""
        echo "   📝 Linting Issues:"
        echo "      npm run lint:fix    (from repo root)"
        echo ""
        echo "   🎨 Formatting Issues:"
        echo "      npm run format      (from repo root)"
        echo ""
        echo "   📁 Working from subdirectory? Always commit from repo root:"
        echo "      cd /path/to/repo/root && git add . && git commit"
        echo ""
        echo "💡 Pre-commit hooks prevent CI failures. Bypassing them creates more work!"
        echo ""
        exit 1
    fi
done

# If no --no-verify found, proceed with normal git commit
exec git commit "$@"