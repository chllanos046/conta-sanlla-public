---
name: nextjs-component
description: Generate a new Next.js React component following project conventions with Javascript, proper exports, and MUI styling
---

# Next.js Component Generator

When creating a new component:

1. **File location**: `src/components/[category]/ComponentName.jsx`
2. **Always use Javascript** - no TypeScript for components
3. **Client vs Server**: Default to Server Component unless component uses:
   - useState, useEffect, or other React hooks
   - Event handlers (onClick, onChange, etc.)
   - Browser APIs
   Add `"use client"` directive only when needed
4. **Export pattern**: Named export only, no default export
5. **MUI imports**: Use `@mui/material` — no star imports

## Template

```jsx
"use client"; // only if needed

import * as React;
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export const [ComponentName] = (props) => {
  return (
    <Box>
      <Typography>
      </Typography>
    </Box>
  );
};
```

Create a corresponding test file in `__tests__/components/`.