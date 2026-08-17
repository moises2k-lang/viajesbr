"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  Map,
  TicketsPlane,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

export type HeroTab = "vuelos" | "hoteles" | "paquetes" | "corporativo";

interface Props {
  active: HeroTab;
  title?: string;
  subtitle?: string;
  onTab?: (tab: HeroTab) => void;
  /** muestra el sub-link a Viajes temáticos bajo Paquetes */
  paquetesSublink?: boolean;
  className?: string;
  children?: ReactNode;
}

const TAB_ITEMS: {
  id: HeroTab;
  labelKey: "common.flights" | "common.hotels" | "common.packages" | "common.corporate";
  icon: typeof TicketsPlane;
  href: string;
  query?: string;
}[] = [
  { id: "vuelos", labelKey: "common.flights", icon: TicketsPlane, href: "/", query: "vuelos" },
  { id: "hoteles", labelKey: "common.hotels", icon: Building2, href: "/", query: "hoteles" },
  { id: "paquetes", labelKey: "common.packages", icon: Briefcase, href: "/", query: "paquetes" },
  { id: "corporativo", labelKey: "common.corporate", icon: Users, href: "/corporativo" },
];

export default function HeroTabs({
  active,
  title,
  subtitle,
  onTab,
  paquetesSublink = false,
  className = "pb-6 pt-2",
  children,
}: Props) {
  const { t } = useI18n();

  return (
    <section className={`bg-[#0B2545] text-white ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {children}
        {title && (
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        )}
        {subtitle && (
          <p className="mt-1 text-sm text-white/70">{subtitle}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.id;
            const baseClass =
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition";
            const className = selected
              ? `${baseClass} bg-white text-[#0B2545]`
              : `${baseClass} bg-white/15 text-white hover:bg-white/25`;
            const content = (
              <>
                <Icon className="h-4 w-4" /> {t(tab.labelKey)}
              </>
            );

            if (onTab) {
              return (
                <button
                  key={tab.id}
                  className={className}
                  onClick={() => onTab(tab.id)}
                  type="button"
                >
                  {content}
                </button>
              );
            }

            const href = tab.query ? `${tab.href}?tab=${tab.query}` : tab.href;
            return (
              <Link
                key={tab.id}
                className={className}
                href={href}
                prefetch={false}
              >
                {content}
              </Link>
            );
          })}
        </div>

        {(paquetesSublink || active === "paquetes") && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
              href="/experiencias"
              prefetch={false}
            >
              <Map className="h-4 w-4" /> {t("experiences.title")}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
