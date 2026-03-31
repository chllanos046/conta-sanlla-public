---
name: finish-feature
description: Stages all changes, writes a conventional commit, pushes the branch, and creates a Pull Request targeting main using CLAUDE.md standards. Use when a feature is ready for review.
---

# Finish Feature

You are helping the developer close out a feature branch and open it for review.

## Steps

1. **Check current status** — run `git status` and `git diff --stat` to see
   exactly what has changed. Report a brief summary of modified files before
   proceeding.

2. **Read CLAUDE.md** — open and read `CLAUDE.md` at the project root.
   You will use its standards to write both the commit message and PR description.

3. **Stage all changes** — run:
   ```bash
   git add .
   ```

4. **Write a conventional commit** — based on the changes you observed, write
a commit message following the Conventional Commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `chore:` for tooling, config, or non-functional changes
- `refactor:` for code restructuring without behavior change

Example: `feat: add dashboard layout with sidebar navigation`

Run:
```bash
git commit -m "<your generated message>"
``` 

5. **Push the branch** — run:
```bash
git push origin HEAD
``` 


6. **Create the Pull Request** — use the `gh` CLI to open a PR targeting `main`:
```bash
gh pr create --base main --title "<conventional commit title>" --body "<description>"
```


The PR body must include:
- **What changed**: a clear summary of what was built or fixed
- **Why**: the reason or context for the change
- **Files modified**: a brief list of the key files touched
- **How to test**: steps a reviewer can follow to verify the feature works
- **Checklist**:
  - [ ] Follows code standards in CLAUDE.md
  - [ ] No hardcoded secrets or API keys
  - [ ] No unused imports or dead code
  - [ ] Error handling on all async functions

7. **Confirm** — report the PR URL so the developer can open it for review.
