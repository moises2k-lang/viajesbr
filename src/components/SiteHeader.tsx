"use client";

import Link from "next/link";
import { useState } from "react";
import { useMoneda } from "@/components/MonedaContext";
import { useAuth } from "@/components/AuthContext";
import SelectorMoneda from "@/components/SelectorMoneda";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AuthModal from "@/components/AuthModal";
import { useI18n } from "@/lib/i18n";
import { User, LogOut } from "lucide-react";

export default function SiteHeader() {
  const { t } = useI18n();
  const { moneda, setMoneda } = useMoneda();
  const { usuario, cargando: cargandoAuth, cerrarSesion } = useAuth();
  const [modalAuth, setModalAuth] = useState(false);

  return (
    <header className="bg-[#0B2545]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" prefetch={false}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="IA Travel Planning" className="h-9" src="/logo.svg" />
        </Link>
        <div className="flex items-center gap-4">
          <SelectorMoneda
            className="w-28"
            etiqueta=""
            placeholder=""
            valor={moneda}
            onCambio={(nuevo) => setMoneda(nuevo ?? "USD")}
          />
          <LanguageSwitcher />
          <nav className="flex items-center gap-4 text-sm text-white/80">
            <Link
              className="hover:text-white"
              href="/admin/itinerarios"
              prefetch={false}
            >
              {t("common.itineraries")}
            </Link>
            <Link
              className="hover:text-white"
              href="/admin/markup"
              prefetch={false}
            >
              {t("common.markup")}
            </Link>
            {!cargandoAuth &&
              (usuario ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">
                    {usuario.nombre ?? usuario.email}
                  </span>
                  <button
                    className="inline-flex items-center gap-1 text-white/80 hover:text-white"
                    onClick={() => void cerrarSesion()}
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  className="inline-flex items-center gap-1 hover:text-white"
                  onClick={() => setModalAuth(true)}
                  type="button"
                >
                  <User className="h-4 w-4" /> {t("common.login")}
                </button>
              ))}
          </nav>
        </div>
      </div>
      <AuthModal abierto={modalAuth} onCerrar={() => setModalAuth(false)} />
    </header>
  );
}
