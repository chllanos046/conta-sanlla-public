"use client";
import { useSyncExternalStore } from "react";

const EVENT = "currencychange";
const KEY = "preferredCurrency";

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const getSnapshot = () => localStorage.getItem(KEY) || "USD";
const getServerSnapshot = () => "USD";

export function useCurrency() {
  const currency = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCurrency = (val) => {
    localStorage.setItem(KEY, val);
    window.dispatchEvent(new Event(EVENT));
  };

  return [currency, setCurrency];
}
