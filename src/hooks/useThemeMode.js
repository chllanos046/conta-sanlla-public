"use client";
import { useSyncExternalStore } from "react";

const EVENT = "thememodechange";
const KEY = "preferredThemeMode";

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const getSnapshot = () => localStorage.getItem(KEY) || "light";
const getServerSnapshot = () => "light";

export function useThemeMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = (val) => {
    localStorage.setItem(KEY, val);
    window.dispatchEvent(new Event(EVENT));
  };

  return [mode, setMode];
}
