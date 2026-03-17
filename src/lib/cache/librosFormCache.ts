import type { LibroAccordionData } from "@/lib/models/fixedAssets/FixedAsset";

/**
 * Devuelve los acordeones de libros (monedas) para "Aplicar a".
 * Si ya se cargaron para este client, usa caché; si no, llama a la API y guarda en caché.
 */
let cached: { client: string; acordeones: LibroAccordionData[] } | null = null;

/** Devuelve los datos desde caché si existen para este client (síncrono). */
export function getLibrosFormDataFromCache(client: string): LibroAccordionData[] | null {
  if (cached && cached.client === client) return cached.acordeones;
  return null;
}

export async function getLibrosFormDataCached(client: string): Promise<LibroAccordionData[]> {
  if (cached && cached.client === client) return cached.acordeones;
  const res = await fetch("/api/fixedAssets/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ petition: "GetLibrosFormData", client, data: {} }),
  });
  const data = await res.json();
  const acordeones = data && Array.isArray(data.acordeones) ? data.acordeones : [];
  cached = { client, acordeones };
  return acordeones;
}
