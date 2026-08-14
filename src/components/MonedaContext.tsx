"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface Tasas {
  base: string;
  rates: Record<string, number>;
}

interface MonedaContextValue {
  moneda: string;
  setMoneda: (moneda: string) => void;
  tasas: Tasas | null;
  cargandoTasas: boolean;
  convertir: (monto: number, monedaOrigen?: string | null) => number | null;
}

const MonedaContext = createContext<MonedaContextValue | null>(null);

export function MonedaProvider({
  children,
  monedaInicial = "USD",
}: {
  children: ReactNode;
  monedaInicial?: string;
}) {
  const [moneda, setMoneda] = useState(monedaInicial);
  const [tasas, setTasas] = useState<Tasas | null>(null);
  const [cargandoTasas, setCargandoTasas] = useState(false);

  useEffect(() => {
    setCargandoTasas(true);
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(async (respuesta) => {
        if (!respuesta.ok) return;
        const cuerpo = await respuesta.json();
        if (cuerpo?.rates) {
          setTasas({ base: cuerpo.base_code ?? "USD", rates: cuerpo.rates });
        }
      })
      .catch(() => {
        // Si falla, mostramos los precios en la moneda origen.
      })
      .finally(() => setCargandoTasas(false));
  }, []);

  const convertir = useMemo(
    () =>
      (monto: number, monedaOrigen?: string | null): number | null => {
        const origen = monedaOrigen?.toUpperCase() ?? moneda.toUpperCase();
        const destino = moneda.toUpperCase();
        if (origen === destino) return monto;
        if (!tasas || !tasas.rates[origen] || !tasas.rates[destino])
          return null;
        return (monto * tasas.rates[destino]) / tasas.rates[origen];
      },
    [moneda, tasas],
  );

  return (
    <MonedaContext.Provider
      value={{ moneda, setMoneda, tasas, cargandoTasas, convertir }}
    >
      {children}
    </MonedaContext.Provider>
  );
}

export function useMoneda() {
  const contexto = useContext(MonedaContext);
  if (!contexto) {
    throw new Error("useMoneda debe usarse dentro de MonedaProvider");
  }
  return contexto;
}
