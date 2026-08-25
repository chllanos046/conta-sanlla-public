"use client";
import { useState, useEffect } from "react";

const EVENT = "localechange";
const KEY = "preferredLocale";

export function useLocale() {
  const [locale, setLocaleState] = useState("en");

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) setLocaleState(stored);

    const sync = () => setLocaleState(localStorage.getItem(KEY) || "en");
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setLocale = (val) => {
    localStorage.setItem(KEY, val);
    setLocaleState(val);
    window.dispatchEvent(new Event(EVENT));
  };

  return [locale, setLocale];
}
