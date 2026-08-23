"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Image from "next/image";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade-out after 1.8s, unmount after transition completes
    const fadeTimer = setTimeout(() => setFadeOut(true), 1800);
    const hideTimer = setTimeout(() => setVisible(false), 2400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999,
        backgroundColor: "#DB5D3B",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: fadeOut ? "none" : "all",
      }}
    >
      <Box
        sx={{
          "@keyframes pulse": {
            "0%":   { opacity: 1 },
            "50%":  { opacity: 0.15 },
            "100%": { opacity: 1 },
          },
          animation: "pulse 1.6s ease-in-out infinite",
        }}
      >
        <Image
          src="/logo.svg"
          alt="Conta Sanlla"
          width={96}
          height={96}
          style={{ borderRadius: 18, display: "block" }}
          priority
        />
      </Box>
    </Box>
  );
}
