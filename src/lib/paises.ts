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

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function construirIndicePorNombre(): Map<string, string> {
  const enIngles = new Intl.DisplayNames(["en"], { type: "region" });
  const enEspanol = new Intl.DisplayNames(["es"], { type: "region" });
  const indice = new Map<string, string>();
  for (const primera of LETRAS) {
    for (const segunda of LETRAS) {
      const codigo = `${primera}${segunda}`;
      for (const nombres of [enIngles, enEspanol]) {
        const nombre = nombres.of(codigo);
        if (nombre && nombre.toUpperCase() !== codigo) {
          indice.set(nombre.toLocaleLowerCase(), codigo);
        }
      }
    }
  }
  return indice;
}

let indicePorNombre: Map<string, string> | null = null;

/** Código ISO a partir del nombre del país en inglés o español (Argentina → AR). */
export function codigoPais(nombre: string): string | null {
  if (!indicePorNombre) indicePorNombre = construirIndicePorNombre();
  return indicePorNombre.get(nombre.trim().toLocaleLowerCase()) ?? null;
}

export function nombrePais(codigoPais: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(codigoPais)) return null;
  const nombre = nombres.of(codigoPais.toUpperCase());
  return nombre && nombre.toUpperCase() !== codigoPais.toUpperCase() ? nombre : null;
}
