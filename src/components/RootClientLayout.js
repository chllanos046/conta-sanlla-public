"use client";
import { useMemo } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { SessionProvider } from "next-auth/react";
import AppShell from "@/components/AppShell";
import { getTheme } from "@/styles/theme";
import { useThemeMode } from "@/hooks/useThemeMode";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import SplashScreen from "@/components/SplashScreen";
import { NotificationProvider } from "@/components/NotificationProvider";
import { ConfirmDialogProvider } from "@/components/ConfirmDialogProvider";

export default function RootClientLayout({ children }) {
  const [mode] = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <SessionProvider>
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <NotificationProvider>
            <ConfirmDialogProvider>
              <SplashScreen />
              <PwaUpdatePrompt />
              <AppShell>{children}</AppShell>
            </ConfirmDialogProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </SessionProvider>
  );
}
