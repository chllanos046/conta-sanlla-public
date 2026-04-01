import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    secondary: { main: "#dc004e" },
    income:  { main: "#2e7d32", light: "#4caf50", dark: "#1b5e20", contrastText: "#fff" },
    expense: { main: "#d32f2f", light: "#ef5350", dark: "#b71c1c", contrastText: "#fff" },
    balance: { main: "#757575", light: "#9e9e9e", dark: "#424242", contrastText: "#fff" },
    background: {
      default: "#f0f2f5",
      paper: "#ffffff",
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
          border: "1px solid rgba(0,0,0,0.12)",
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
          boxShadow: "0px 1px 4px rgba(0,0,0,0.2)",
        },
      },
    },
  },
});

export default theme;
