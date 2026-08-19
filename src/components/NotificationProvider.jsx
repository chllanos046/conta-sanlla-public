"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [state, setState] = useState({ open: false, message: "", severity: "success" });

  const notify = useCallback((message, severity) => {
    setState({ open: true, message, severity });
  }, []);

  const value = useMemo(
    () => ({
      notifySuccess: (message) => notify(message, "success"),
      notifyError: (message) => notify(message, "error"),
    }),
    [notify]
  );

  const handleClose = () => setState((s) => ({ ...s, open: false }));

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={state.severity} onClose={handleClose}>
          {state.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotify must be used within a NotificationProvider");
  return ctx;
}
