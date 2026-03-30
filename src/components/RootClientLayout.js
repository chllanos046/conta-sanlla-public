"use client";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { SessionProvider } from "next-auth/react";
import AppShell from "@/components/AppShell";
import theme from "@/styles/theme";

export default function RootClientLayout({ children }) {
  return (
    <SessionProvider>
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </SessionProvider>
  );
}
