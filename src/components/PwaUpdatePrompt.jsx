"use client";
import { useEffect, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Button from "@mui/material/Button";

export function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setOpen(true);
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);

  const handleReload = () => {
    setOpen(false);
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <Snackbar
      open={open}
      message="A new version is available"
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      action={
        <>
          <Button color="inherit" size="small" onClick={() => setOpen(false)}>
            Later
          </Button>
          <Button
            color="primary"
            size="small"
            variant="contained"
            onClick={handleReload}
            sx={{ ml: 1 }}
          >
            Reload
          </Button>
        </>
      }
    />
  );
}
