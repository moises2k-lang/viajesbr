"use client";

import Link from "next/link";
import { useMoneda } from "@/components/MonedaContext";
import { useAuth } from "@/components/AuthContext";
import SelectorMoneda from "@/components/SelectorMoneda";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export default function SiteHeader() {
  const { t } = useI18n();
  const { moneda, setMoneda } = useMoneda();
  const { usuario } = useAuth();

  return (
    <header className="bg-[#0B2545]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" prefetch={false}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="IA Travel Planning" className="h-9" src="/logo.svg" />
        </Link>
        <nav className="flex items-center gap-4 text-sm text-white/80">
          <Link className="hover:text-white" href="/" prefetch={false}>
            {t("common.flights")}
          </Link>
          <Link className="hover:text-white" href="/experiencias" prefetch={false}>
            {t("experiences.title")}
          </Link>
          <Link className="hover:text-white" href="/corporativo" prefetch={false}>
            {t("common.corporate")}
          </Link>
          {usuario && (
            <Link
              className="hover:text-white"
              href="/admin/itinerarios"
              prefetch={false}
            >
              {t("common.itineraries")}
            </Link>
          )}
          <SelectorMoneda
            className="w-28"
            etiqueta=""
            placeholder=""
            valor={moneda}
            onCambio={(nuevo) => setMoneda(nuevo ?? "USD")}
          />
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
