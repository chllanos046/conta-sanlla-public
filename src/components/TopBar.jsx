"use client";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import MenuIcon from "@mui/icons-material/Menu";
import Image from "next/image";

export default function TopBar({ onMenuClick, isMobile }) {
  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        {!isMobile && (
          <IconButton color="inherit" edge="start" onClick={onMenuClick} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
        )}

        {/* Logo + Title — centered on mobile, left-aligned on desktop */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexGrow: { xs: 1, sm: 0 },
            justifyContent: { xs: "center", sm: "flex-start" },
            mr: { xs: 0, sm: 0 },
          }}
        >
          <Image
            src="/logo.png"
            alt="Conta Sanlla"
            width={32}
            height={32}
            style={{ borderRadius: 6 }}
          />
          <Typography variant="h6" noWrap>
            Conta Sanlla
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
