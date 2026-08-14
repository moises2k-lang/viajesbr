"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SelectorConBandera from "@/components/SelectorConBandera";
import BanderaIso from "@/components/BanderaIso";
import { PAISES_TELEFONO } from "@/lib/telefonos";

interface Props {
  value: string;
  onChange: (value: string) => void;
  etiqueta?: string;
  className?: string;
  required?: boolean;
}

function isoPorDefecto(): string {
  return (
    PAISES_TELEFONO.find((p) => p.codigo === "52")?.iso ??
    PAISES_TELEFONO[0]?.iso ??
    "MX"
  );
}

function parsear(value: string): { iso: string; numero: string } {
  const limpio = value.replace(/[^\d]/g, "");
  if (!limpio) return { iso: isoPorDefecto(), numero: "" };

  const ordenados = [...PAISES_TELEFONO].sort(
    (a, b) => b.codigo.length - a.codigo.length,
  );
  for (const pais of ordenados) {
    if (limpio.startsWith(pais.codigo)) {
      return { iso: pais.iso, numero: limpio.slice(pais.codigo.length) };
    }
  }
  return { iso: isoPorDefecto(), numero: limpio };
}

export default function SelectorTelefono({
  value,
  onChange,
  etiqueta = "Teléfono",
  className,
  required = false,
}: Props) {
  const inicial = useMemo(() => parsear(value), [value]);
  const [iso, setIso] = useState(inicial.iso);
  const [numero, setNumero] = useState(inicial.numero);
  const previo = useRef(value);

  const items = useMemo(
    () =>
      PAISES_TELEFONO.map((p) => ({
        valor: p.iso,
        iso: p.iso,
        etiqueta: `+${p.codigo} ${p.nombre}`,
      })),
    [],
  );

  useEffect(() => {
    if (previo.current !== value) {
      const parsed = parsear(value);
      setIso(parsed.iso);
      setNumero(parsed.numero);
      previo.current = value;
    }
  }, [value]);

  function emitir(nuevoIso: string, nuevoNumero: string) {
    const pais = PAISES_TELEFONO.find((p) => p.iso === nuevoIso);
    if (!pais) return;
    const soloDigitos = nuevoNumero.replace(/\D/g, "");
    const completo = soloDigitos
      ? `+${pais.codigo} ${soloDigitos}`
      : `+${pais.codigo}`;
    onChange(completo);
  }

  function cambiarNumero(raw: string) {
    const soloDigitos = raw.replace(/\D/g, "");
    setNumero(soloDigitos);
    emitir(iso, soloDigitos);
  }

  function cambiarIso(nuevoIso: string) {
    setIso(nuevoIso);
    emitir(nuevoIso, numero);
  }

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-[#0B2545]">
        {etiqueta}
      </label>
      <div className="flex">
        <SelectorConBandera
          botonClassName="rounded-r-none border-r-0"
          buscable
          className="shrink-0"
          items={items}
          listaClassName="w-64"
          placeholder="+"
          placeholderBusqueda="Buscar país..."
          renderEtiqueta={(item) => {
            const pais = PAISES_TELEFONO.find((p) => p.iso === item.valor);
            if (!pais) return item.etiqueta;
            return (
              <span className="flex items-center gap-2">
                <BanderaIso iso={pais.iso} />
                <span>+{pais.codigo}</span>
              </span>
            );
          }}
          valor={iso}
          onCambio={cambiarIso}
        />
        <input
          className="min-w-0 flex-1 rounded-r-md border border-neutral-300 px-3 py-2 text-sm text-[#0B2545] focus:border-[#14477E] focus:outline-none"
          onChange={(e) => cambiarNumero(e.target.value)}
          placeholder="Número"
          required={required}
          type="tel"
          value={numero}
        />
      </div>
    </div>
  );
}
