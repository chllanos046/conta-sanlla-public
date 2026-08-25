"use client";
import { useLocale } from "./useLocale";
import en from "@/i18n/en";
import es from "@/i18n/es";

const DICTS = { en, es };

export function useTranslation() {
  const [locale, setLocale] = useLocale();

  const t = (key) => {
    const parts = key.split(".");
    let val = DICTS[locale] ?? DICTS.en;
    for (const p of parts) val = val?.[p];
    return val ?? key;
  };

  return { t, locale, setLocale };
}
