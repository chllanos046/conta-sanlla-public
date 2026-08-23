"use client";
import { useState, useEffect } from "react";

const EVENT = "thememodechange";
const KEY = "preferredThemeMode";

export function useThemeMode() {
  const [mode, setModeState] = useState("light");

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) setModeState(stored);

    const sync = () => setModeState(localStorage.getItem(KEY) || "light");
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setMode = (val) => {
    localStorage.setItem(KEY, val);
    setModeState(val);
    window.dispatchEvent(new Event(EVENT));
  };

  return [mode, setMode];
}
