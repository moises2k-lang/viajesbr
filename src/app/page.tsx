import Portada from "@/components/Portada";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ interno?: string; tab?: string | string[] }>;
}) {
  const parametros = await searchParams;
  const tab = Array.isArray(parametros.tab) ? parametros.tab[0] : parametros.tab;
  return (
    <Portada
      modoInterno={parametros.interno !== undefined}
      pestanaInicial={tab}
    />
  );
}
