"use client";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import MenuIcon from "@mui/icons-material/Menu";
import Image from "next/image";
import { useCurrency } from "@/hooks/useCurrency";

export default function TopBar({ onMenuClick, isMobile }) {
  const [currency, setCurrency] = useCurrency();

  return (
    <AppBar position="fixed" enableColorOnDark sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
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
            flexGrow: { xs: 1, sm: 1 },
            justifyContent: { xs: "center", sm: "flex-start" },
          }}
        >
          <Image
            src="/logo.svg"
            alt="Conta Sanlla"
            width={32}
            height={32}
            style={{ borderRadius: 6 }}
          />
          <Typography variant="h6" noWrap>
            Conta Sanlla
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={currency}
          exclusive
          onChange={(_, val) => { if (val) setCurrency(val); }}
          size="small"
          sx={{ ml: 1 }}
        >
          <ToggleButton
            value="USD"
            sx={{
              color: "inherit",
              borderColor: "rgba(255,255,255,0.3)",
              "&.Mui-selected": {
                color: "primary.main",
                bgcolor: "#F1EBE1",
                "&:hover": { bgcolor: "#F1EBE1" },
              },
            }}
          >
            USD
          </ToggleButton>
          <ToggleButton
            value="ARS"
            sx={{
              color: "inherit",
              borderColor: "rgba(255,255,255,0.3)",
              "&.Mui-selected": {
                color: "primary.main",
                bgcolor: "#F1EBE1",
                "&:hover": { bgcolor: "#F1EBE1" },
              },
            }}
          >
            ARS
          </ToggleButton>
        </ToggleButtonGroup>
      </Toolbar>
    </AppBar>
  );
}
