"use client";
import { useState, Suspense } from "react";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const DRAWER_WIDTH = 240;
const MINI_DRAWER_WIDTH = 64;

const AUTH_ROUTES = ["/login", "/register"];

export default function AppShell({ children }) {
  const theme = useTheme();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const toggleDesktop = () => setOpen((prev) => !prev);
  const toggleMobile = () => setMobileOpen((prev) => !prev);

  const sidebarWidth = !isMobile && open ? DRAWER_WIDTH : MINI_DRAWER_WIDTH;

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <TopBar onMenuClick={isMobile ? toggleMobile : toggleDesktop} />
        <Sidebar
          open={open}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          isMobile={isMobile}
          drawerWidth={DRAWER_WIDTH}
          miniWidth={MINI_DRAWER_WIDTH}
        />
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            p: 3,
            mt: "64px",
            ml: 0,
            transition: theme.transitions.create("margin-left", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            minHeight: "calc(100vh - 64px)",
          }}
        >
          {children}
        </Box>
      </Box>
    </Suspense>
  );
}
