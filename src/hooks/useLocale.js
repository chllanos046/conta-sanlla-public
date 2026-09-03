"use client";
import { useSyncExternalStore } from "react";

const EVENT = "localechange";
const KEY = "preferredLocale";

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const getSnapshot = () => localStorage.getItem(KEY) || "en";
const getServerSnapshot = () => "en";

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = (val) => {
    localStorage.setItem(KEY, val);
    window.dispatchEvent(new Event(EVENT));
  };

  return [locale, setLocale];
}
