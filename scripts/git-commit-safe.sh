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
        echo "   1. Fix dependency issues: npm install"
        echo "   2. Fix linting issues: npm run lint:fix"
        echo "   3. Fix formatting issues: npm run format"
        echo "   4. Then commit normally: git commit"
        echo ""
        echo "💡 Pre-commit hooks prevent CI failures. Bypassing them creates more work!"
        echo ""
        exit 1
    fi
done

# If no --no-verify found, proceed with normal git commit
exec git commit "$@"