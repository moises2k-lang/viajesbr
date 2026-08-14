const nombres = new Intl.DisplayNames(["es"], { type: "region" });

/** Emoji de bandera a partir del código ISO de dos letras (AR → 🇦🇷). */
export function bandera(codigoPais: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(codigoPais)) return null;
  return codigoPais
    .toUpperCase()
    .split("")
    .map((letra) => String.fromCodePoint(0x1f1e6 + letra.charCodeAt(0) - 65))
    .join("");
}

export function nombrePais(codigoPais: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(codigoPais)) return null;
  const nombre = nombres.of(codigoPais.toUpperCase());
  return nombre && nombre.toUpperCase() !== codigoPais.toUpperCase() ? nombre : null;
}
