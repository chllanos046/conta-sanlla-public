"use client";
import { useState, Suspense } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import Loading from "@/components/Loading";
import MobileBottomNav from "@/components/MobileBottomNav";
import { TransactionDialogProvider } from "@/contexts/TransactionDialogContext";

const DRAWER_WIDTH = 240;
const MINI_DRAWER_WIDTH = 64;

const AUTH_ROUTES = ["/login", "/register"];

export default function AppShell({ children }) {
  const theme = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const toggleDesktop = () => setOpen((prev) => !prev);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <TransactionDialogProvider>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <TopBar onMenuClick={toggleDesktop} />
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <Sidebar
            open={open}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            isMobile={false}
            drawerWidth={DRAWER_WIDTH}
            miniWidth={MINI_DRAWER_WIDTH}
          />
        </Box>
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 0, sm: 3 },
            mt: { xs: "56px", sm: "64px" },
            ml: 0,
            pb: { xs: "88px", sm: 3 },
            transition: theme.transitions.create("margin-left", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            minHeight: "calc(100vh - 64px)",
          }}
        >
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </Box>
        <Box sx={{ display: { xs: "block", sm: "none" } }}>
          <MobileBottomNav />
        </Box>
      </Box>
    </TransactionDialogProvider>
    </LocalizationProvider>
  );
}
