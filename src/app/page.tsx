import Portada from "@/components/Portada";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ interno?: string }>;
}) {
  const parametros = await searchParams;
  return <Portada modoInterno={parametros.interno !== undefined} />;
}
