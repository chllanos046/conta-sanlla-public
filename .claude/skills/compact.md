---
name: compact
description: Summarize the entire conversation into 5-7 bullet points for copy-paste into a new chat
---

Summarize our entire conversation into **5-7 bullet points** using this exact format:

```
## Context Handoff — [topic in 3-5 words]

**Project:** Conta-Sanlla (Next.js 16, MUI v7, NextAuth v5, MySQL2)

**Summary:**
- [What we were building/fixing and why]
- [Key decisions made and the reasoning]
- [Constraints or gotchas discovered]
- [Current state — what works, what doesn't]
- [Next step or open question]
- [Any critical code snippet or file path, if relevant]
- [Any blocked/unresolved issue, if relevant]

**Files changed:** `path/to/file.js`, `path/to/other.js`
**Status:** [In progress | Blocked on X | Ready to continue]
```

Rules:
- Include actual code snippets (inline or fenced) for anything non-obvious.
- Include exact file paths for every file touched.
- Omit pleasantries, narration, and filler — facts only.
- Output must be ready to paste directly into a new chat with zero editing.
