import { createTheme } from "@mui/material/styles";

export function getTheme(mode = "light") {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: "#DB5D3B", light: "#E58267", dark: "#B84A2E", contrastText: "#fff" },
      secondary: { main: "#6366f1", light: "#818cf8", dark: "#4f46e5", contrastText: "#fff" },
      income:  { main: "#2e7d32", light: "#4caf50", dark: "#1b5e20", contrastText: "#fff" },
      expense: { main: "#d32f2f", light: "#ef5350", dark: "#b71c1c", contrastText: "#fff" },
      balance: { main: "#757575", light: "#9e9e9e", dark: "#424242", contrastText: "#fff" },
      background: {
        default: isDark ? "#191817" : "#F1EBE1",
        paper: isDark ? "#232120" : "#ffffff",
      },
      text: {
        primary: isDark ? "#F1EBE1" : "#191817",
        secondary: isDark ? "rgba(241,235,225,0.7)" : "rgba(25,24,23,0.6)",
      },
    },
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      subtitle2: { fontWeight: 500 },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: "none",
            border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: "20px 24px",
            "&:last-child": { paddingBottom: "20px" },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: isDark ? "0px 1px 4px rgba(0,0,0,0.5)" : "0px 1px 4px rgba(0,0,0,0.2)",
          },
        },
      },
    },
  });
}
