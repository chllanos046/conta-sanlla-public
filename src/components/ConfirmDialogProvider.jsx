"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

const ConfirmDialogContext = createContext(null);

export function ConfirmDialogProvider({ children }) {
  const [message, setMessage] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((msg) => {
    setMessage(msg);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = (result) => {
    resolveRef.current?.(result);
    setMessage(null);
  };

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Dialog open={message !== null} onClose={() => settle(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{message}</DialogTitle>
        <DialogActions>
          <Button onClick={() => settle(false)}>Cancel</Button>
          <Button onClick={() => settle(true)} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  return ctx;
}
