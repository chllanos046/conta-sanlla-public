"use client";
import { useState, useEffect } from "react";

const EVENT = "currencychange";

export function useCurrency() {
  const [currency, setCurrencyState] = useState("USD");

  useEffect(() => {
    const stored = localStorage.getItem("preferredCurrency");
    if (stored) setCurrencyState(stored);

    const sync = () =>
      setCurrencyState(localStorage.getItem("preferredCurrency") || "USD");
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setCurrency = (val) => {
    localStorage.setItem("preferredCurrency", val);
    setCurrencyState(val);
    window.dispatchEvent(new Event(EVENT));
  };

  return [currency, setCurrency];
}
