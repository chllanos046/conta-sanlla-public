---
name: start-feature
description: Creates a feature branch from main and explores the codebase in Plan Mode before any changes are made. Use when starting work on a new feature.
---

# Start Feature

You are helping the developer start a new feature branch safely.

## Steps

1. **Create the branch** — run these git commands in sequence:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/$ARGUMENTS
   ```
  
Confirm the branch was created successfully before proceeding.

2. **Enter Plan Mode** — switch to Plan Mode now. Do not write or modify any files.

3. **Explore the codebase** — read and understand the areas of the project
most relevant to the feature described in `$ARGUMENTS`. Look at:
- Related existing components or pages
- API routes or data fetching patterns that may be involved
- Any relevant entries in `CLAUDE.md` that apply to this feature

4. **Report back** — summarize what you found: which files are relevant,
what patterns are already in use, and any potential concerns to keep
in mind when planning. Do not suggest implementation steps yet.
Ask me what I want to implement as part of this feature, and wait for my response before proceeding to the next step.