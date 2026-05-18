import type { LibroAccordionData } from "@/lib/models/fixedAssets/FixedAsset";
import { getLibrosDataFromCache } from "@/lib/cache/fixedAssetsBootstrapCache";

/**
 * Devuelve los acordeones de libros (monedas) para "Aplicar a".
 * Si ya se cargaron para este client, usa caché; si no, llama a la API y guarda en caché.
 */
const LIBROS_CACHE_TTL_MS = 10 * 60 * 1000;
const cachedByKey = new Map<string, { acordeones: LibroAccordionData[]; updatedAt: number }>();
const inflightByKey = new Map<string, Promise<LibroAccordionData[]>>();

function librosCacheKey(client: string, simulationOnly: boolean): string {
  return simulationOnly ? `${client}::simulacion` : client;
}

/** Devuelve los datos desde caché si existen para este client (síncrono). */
export function getLibrosFormDataFromCache(client: string, simulationOnly = false): LibroAccordionData[] | null {
  const key = librosCacheKey(client, simulationOnly);
  const cached = cachedByKey.get(key);
  if (cached && Date.now() - cached.updatedAt < LIBROS_CACHE_TTL_MS) return cached.acordeones;

  const bootstrap = getLibrosDataFromCache(key);
  if (bootstrap?.acordeones?.length) {
    cachedByKey.set(key, { acordeones: bootstrap.acordeones, updatedAt: Date.now() });
    return bootstrap.acordeones;
  }

  return null;
}

export async function getLibrosFormDataCached(client: string, simulationOnly = false): Promise<LibroAccordionData[]> {
  const key = librosCacheKey(client, simulationOnly);
  const cached = getLibrosFormDataFromCache(client, simulationOnly);
  if (cached) return cached;

  const inflight = inflightByKey.get(key);
  if (inflight) return inflight;

  const promise = fetch("/api/fixedAssets/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ petition: "GetLibrosFormData", client, data: { simulationOnly: !!simulationOnly } }),
  })
    .then(async (res) => {
      const data = await res.json();
      const acordeones = data && Array.isArray(data.acordeones) ? data.acordeones : [];
      cachedByKey.set(key, { acordeones, updatedAt: Date.now() });
      return acordeones;
    })
    .finally(() => {
      inflightByKey.delete(key);
    });

  inflightByKey.set(key, promise);
  return promise;
}

export function clearLibrosFormCache(client?: string): void {
  if (!client) {
    cachedByKey.clear();
    inflightByKey.clear();
    return;
  }
  const baseKey = librosCacheKey(client, false);
  const simulationKey = librosCacheKey(client, true);
  cachedByKey.delete(baseKey);
  cachedByKey.delete(simulationKey);
  inflightByKey.delete(baseKey);
  inflightByKey.delete(simulationKey);
}
