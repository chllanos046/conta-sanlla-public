"use client";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function Footer({ drawerWidth }) {
  return (
    <Box
      component="footer"
      sx={{
        position: "fixed",
        bottom: 0,
        left: drawerWidth,
        right: 0,
        height: 67,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: (theme) =>
          theme.transitions.create("left", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} Conta Sanlla
      </Typography>
    </Box>
  );
}
