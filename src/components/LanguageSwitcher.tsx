"use client";

import { useI18n, useLocaleName, LOCALES, type Locale } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="relative inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-white">
      <Globe className="h-4 w-4" />
      <label className="sr-only" htmlFor="lang">{t("common.language")}</label>
      <select
        className="appearance-none bg-transparent pr-4 pl-1 text-sm font-medium text-white outline-none"
        id="lang"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((loc) => (
          <option className="text-[#0B2545]" key={loc} value={loc}>
            {useLocaleName(loc)}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px] text-white/80">▼</span>
    </div>
  );
}
