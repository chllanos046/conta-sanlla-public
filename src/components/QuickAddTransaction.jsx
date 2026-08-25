"use client";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";

export function QuickAddFab({ onClick }) {
  return (
    <Fab
      color="primary"
      aria-label="add transaction"
      onClick={onClick}
      sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1200, display: { xs: "none", sm: "flex" } }}
    >
      <AddIcon />
    </Fab>
  );
}
