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

/** Código ISO a partir del emoji de bandera (🇦🇷 → ar). Windows no dibuja estos emoji. */
export function isoDeBandera(emoji: string): string | null {
  const puntos = [...emoji.trim()].map((letra) => letra.codePointAt(0) ?? 0);
  if (puntos.length !== 2) return null;
  const letras = puntos.map((punto) => punto - 0x1f1e6);
  if (letras.some((letra) => letra < 0 || letra > 25)) return null;
  return letras.map((letra) => String.fromCharCode(97 + letra)).join("");
}

/** Separa el emoji de bandera del inicio de un texto ("🇲🇽 Cancún" → 🇲🇽 + "Cancún"). */
export function separarBandera(texto: string): {
  bandera: string | null;
  resto: string;
} {
  const letras = [...texto];
  const posible = letras.slice(0, 2).join("");
  if (isoDeBandera(posible) === null) return { bandera: null, resto: texto };
  return { bandera: posible, resto: letras.slice(2).join("").trim() };
}

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function construirIndicePorNombre(): Map<string, string> {
  // liteAPI devuelve el país en inglés o español, y en forma corta ("EE. UU.", "US").
  const variantes = (["en", "es"] as const).flatMap((idioma) =>
    (["long", "short"] as const).map(
      (style) => new Intl.DisplayNames([idioma], { type: "region", style }),
    ),
  );
  const indice = new Map<string, string>();
  for (const primera of LETRAS) {
    for (const segunda of LETRAS) {
      const codigo = `${primera}${segunda}`;
      for (const nombres of variantes) {
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
  return nombre && nombre.toUpperCase() !== codigoPais.toUpperCase()
    ? nombre
    : null;
}
