"use client";

import { useEffect, useMemo, useState } from "react";
import {
  I18nContext,
  translate,
  type Locale,
  detectLocale,
  DEFAULT_LOCALE,
  LOCALES,
} from "@/lib/i18n";

interface Props {
  children: React.ReactNode;
}

export default function I18nProvider({ children }: Props) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const detected = detectLocale();
    if (LOCALES.includes(detected) && detected !== locale) {
      setLocaleState(detected);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("locale", locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
  }

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (path: string, params?: Record<string, string | number>) =>
        translate(locale, path, params),
    }),
    [locale],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}
