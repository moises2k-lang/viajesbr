"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n, getLocaleName, LOCALES, LOCALE_COUNTRY, type Locale } from "@/lib/i18n";
import Bandera from "@/components/Bandera";
import { ChevronDown, Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fuera(evento: MouseEvent) {
      if (ref.current && !ref.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function seleccionar(loc: Locale) {
    setLocale(loc);
    setAbierto(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-sm font-medium text-white hover:bg-white/20"
        onClick={() => setAbierto((a) => !a)}
        type="button"
      >
        <Globe className="h-4 w-4" />
        <Bandera iso={LOCALE_COUNTRY[locale]} clase="h-3 w-5 rounded-[2px]" />
        <span className="hidden sm:inline">{getLocaleName(locale)}</span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
      {abierto && (
        <ul className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-[#E4E8EE] bg-white py-1 shadow-lg">
          <li className="sr-only">{t("common.language")}</li>
          {LOCALES.map((loc) => (
            <li key={loc}>
              <button
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  locale === loc
                    ? "bg-[#F5F7FA] font-medium text-[#0B2545]"
                    : "text-[#0B2545] hover:bg-[#F5F7FA]"
                }`}
                onClick={() => seleccionar(loc)}
                type="button"
              >
                <Bandera iso={LOCALE_COUNTRY[loc]} clase="h-3.5 w-5 rounded-[2px]" />
                {getLocaleName(loc)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
