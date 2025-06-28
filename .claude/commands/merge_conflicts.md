There are merge conflicts in CI.

- [ ] **BEFORE STARTING**: Run `git status` to see current state
- [ ] Analyze the commit(s) that introduced the merge conflicts so you understand their intent
- [ ] Initiate a git rebase on `main`
- [ ] Go file-by-file as conflicts occur, assessing what the right merging is that still accomplishes the intent of both your PR and the conflicting commits
- [ ] **AFTER RESOLVING EACH CONFLICT**: Run `git status` to see remaining conflicts
- [ ] **BEFORE CONTINUING REBASE**: Run `git add .` to stage all resolved conflicts
- [ ] **AFTER REBASE COMPLETE**: Run `git status` to ensure working tree is clean
- [ ] Push changes that resolve the merge conflict
