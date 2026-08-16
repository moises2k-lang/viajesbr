"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, MapPin, Tag, Clock, Plane, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { actividadesDetalle, fechasRecomendadas, type PaqueteTematico } from "@/lib/experiencias-helpers";
import SelectorMoneda from "@/components/SelectorMoneda";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useMoneda } from "@/components/MonedaContext";

interface Categoria {
  id: string;
  nombre: string;
}

function banderaUrl(code: string | null): string | null {
  return code ? `https://flagcdn.com/w160/${code.toLowerCase()}.png` : null;
}

export const dynamic = "force-dynamic";

export default function ExperienciasPage() {
  const { t } = useI18n();
  const { moneda, setMoneda } = useMoneda();
  const [categoria, setCategoria] = useState<string>("");
  const [paquetes, setPaquetes] = useState<PaqueteTematico[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    setError(null);
    fetch(`/api/experiencias?categoria=${encodeURIComponent(categoria)}`)
      .then(async (r) => {
        const cuerpo = (await r.json()) as {
          paquetes?: PaqueteTematico[];
          categorias?: Categoria[];
          error?: string;
        };
        if (!r.ok) throw new Error(cuerpo.error ?? "Error al cargar experiencias");
        setPaquetes(cuerpo.paquetes ?? []);
        if (!categoria) setCategorias(cuerpo.categorias ?? []);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setCargando(false));
  }, [categoria]);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="bg-[#0B2545]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="IA Travel Planning" className="h-9" src="/logo.svg" />
          </Link>
          <nav className="flex items-center gap-4 text-sm text-white/80">
            <Link className="hover:text-white" href="/">
              {t("common.flights")}
            </Link>
            <Link className="hover:text-white" href="/corporativo">
              {t("common.corporate")}
            </Link>
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#0B2545]">
            {t("experiences.title")}
          </h1>
          <p className="mt-2 text-[#5A6B80]">{t("experiences.subtitle")}</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition ${
              !categoria
                ? "bg-[#0B2545] text-white"
                : "border border-[#E4E8EE] bg-white text-[#0B2545] hover:border-[#14477E]/40"
            }`}
            onClick={() => setCategoria("")}
            type="button"
          >
            <Map className="h-4 w-4" /> {t("experiences.allCategories")}
          </button>
          {categorias.map((cat) => (
            <button
              className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                categoria === cat.id
                  ? "bg-[#0B2545] text-white"
                  : "border border-[#E4E8EE] bg-white text-[#0B2545] hover:border-[#14477E]/40"
              }`}
              key={cat.id}
              onClick={() => setCategoria(cat.id)}
              type="button"
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {cargando && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                className="h-64 animate-pulse rounded-2xl bg-white"
                key={i}
              />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {!cargando && !error && paquetes.length === 0 && (
          <p className="text-[#5A6B80]">No hay experiencias en esta categoría.</p>
        )}

        {!cargando && !error && paquetes.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paquetes.map((p) => {
              const imagen = p.imagen ?? banderaUrl(p.destinoPaisCode);
              return (
                <Link
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#E4E8EE] bg-white shadow-sm transition hover:border-[#14477E]/40 hover:shadow-md"
                  href={`/experiencias/${p.slug}`}
                  key={p.id}
                >
                  <div className="relative h-40 w-full overflow-hidden bg-[#E4E8EE]">
                    {imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={p.destinoCiudad}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        src={imagen}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#5A6B80]">
                        <MapPin className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-[#0B2545]/80 px-2.5 py-1 text-xs font-medium text-white">
                      <Tag className="mr-1 inline h-3 w-3" />
                      {p.categoria}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-lg font-semibold text-[#0B2545]">
                      {p.titulo}
                    </h2>
                    {p.subtitulo && (
                      <p className="text-sm text-[#14477E]">{p.subtitulo}</p>
                    )}
                    <p className="mt-2 line-clamp-2 text-sm text-[#5A6B80]">
                      {p.descripcion}
                    </p>
                    {(() => {
                      const recomendadas = fechasRecomendadas(p);
                      const actividades = actividadesDetalle(p).slice(0, 3);
                      return (
                        <>
                          {recomendadas && (
                            <p className="mt-2 flex items-start gap-1 text-xs text-[#C9A227]">
                              <Sun className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="line-clamp-1">{recomendadas}</span>
                            </p>
                          )}
                          {actividades.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {actividades.map((a, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-[#F5F7FA] px-2 py-0.5 text-xs text-[#5A6B80]"
                                >
                                  {a.titulo}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#5A6B80]">
                      {p.duracionNoches && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-1">
                          <Clock className="h-3 w-3" /> {p.duracionNoches}{" "}
                          {t("experiences.nights")}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F7FA] px-2 py-1">
                        <Plane className="h-3 w-3" /> {p.destinoCiudad} (
                        {p.destinoIata})
                      </span>
                    </div>
                    <div className="mt-auto pt-4">
                      <span className="inline-flex w-full items-center justify-center rounded-xl bg-[#C9A227] px-4 py-2.5 text-sm font-medium text-white transition group-hover:bg-[#b08f22]">
                        {t("experiences.buildPackage")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
