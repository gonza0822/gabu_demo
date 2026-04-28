import type {
  AbmCabeceraData,
  AbmDatosGeneralesData,
  AbmLibrosData,
  FixedAssetsData,
} from "@/lib/models/fixedAssets/FixedAsset";

type BootstrapCacheEntry = {
  manageData?: FixedAssetsData;
  datosGenerales?: AbmDatosGeneralesData;
  cabeceraData?: AbmCabeceraData;
  librosData?: AbmLibrosData;
  selectedBienById?: Record<string, Record<string, unknown>>;
  updatedAt: number;
};

const cacheByClient = new Map<string, BootstrapCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function postJson<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) {
      const message =
        data && typeof data === "object" && "message" in data
          ? String((data as { message?: unknown }).message ?? "Error")
          : `Error ${res.status}`;
      throw new Error(message);
    }
    return data as T;
  });
}

function isEntryFresh(entry: BootstrapCacheEntry | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.updatedAt < CACHE_TTL_MS;
}

function getOrCreateEntry(client: string): BootstrapCacheEntry {
  const current = cacheByClient.get(client);
  if (current) return current;
  const created: BootstrapCacheEntry = { updatedAt: 0 };
  cacheByClient.set(client, created);
  return created;
}

export function clearFixedAssetsBootstrapCache(client?: string): void {
  if (client) {
    cacheByClient.delete(client);
    return;
  }
  cacheByClient.clear();
}

export function setManageDataInCache(client: string, manageData: FixedAssetsData): void {
  const entry = getOrCreateEntry(client);
  entry.manageData = manageData;
  entry.updatedAt = Date.now();
}

/**
 * Lee datos de grilla cacheados. Acepta la clave compuesta usada en ManageContainer (`client::modo::ver`)
 * o la clave solo `client` del prefetch tras login, para no duplicar el `Get` pesado.
 */
export function getManageDataFromCache(key: string): FixedAssetsData | null {
  const read = (k: string): FixedAssetsData | null => {
    const entry = cacheByClient.get(k);
    if (!isEntryFresh(entry)) return null;
    return entry?.manageData ?? null;
  };
  const direct = read(key);
  if (direct != null) return direct;
  if (!key.includes("::")) return null;
  const baseKey = key.split("::")[0];
  return baseKey ? read(baseKey) : null;
}

export function setDatosGeneralesInCache(client: string, datosGenerales: AbmDatosGeneralesData): void {
  const entry = getOrCreateEntry(client);
  entry.datosGenerales = datosGenerales;
  entry.updatedAt = Date.now();
}

export function getDatosGeneralesFromCache(client: string): AbmDatosGeneralesData | null {
  const entry = cacheByClient.get(client);
  if (!isEntryFresh(entry)) return null;
  return entry?.datosGenerales ?? null;
}

export function setCabeceraDataInCache(client: string, cabeceraData: AbmCabeceraData): void {
  const entry = getOrCreateEntry(client);
  entry.cabeceraData = cabeceraData;
  entry.updatedAt = Date.now();
}

export function getCabeceraDataFromCache(client: string): AbmCabeceraData | null {
  const entry = cacheByClient.get(client);
  if (!isEntryFresh(entry)) return null;
  return entry?.cabeceraData ?? null;
}

export function setLibrosDataInCache(client: string, librosData: AbmLibrosData): void {
  const entry = getOrCreateEntry(client);
  entry.librosData = librosData;
  entry.updatedAt = Date.now();
}

export function getLibrosDataFromCache(client: string): AbmLibrosData | null {
  const entry = cacheByClient.get(client);
  if (!isEntryFresh(entry)) return null;
  return entry?.librosData ?? null;
}

export function setSelectedBienFromGrid(client: string, bienId: string, bienData: Record<string, unknown>): void {
  if (!client || !bienId) return;
  const entry = getOrCreateEntry(client);
  const selectedById = entry.selectedBienById ?? {};
  selectedById[bienId] = bienData;
  entry.selectedBienById = selectedById;
  entry.updatedAt = Date.now();
}

export function getSelectedBienFromGrid(client: string, bienId: string): Record<string, unknown> | null {
  if (!client || !bienId) return null;
  const entry = cacheByClient.get(client);
  if (!isEntryFresh(entry)) return null;
  return entry?.selectedBienById?.[bienId] ?? null;
}

export async function prefetchFixedAssetsBootstrap(client: string): Promise<void> {
  if (!client) return;
  const entry = cacheByClient.get(client);
  if (isEntryFresh(entry) && entry?.manageData && entry?.datosGenerales && entry?.cabeceraData && entry?.librosData) {
    return;
  }

  const [manageData, datosGenerales, cabeceraData, librosData] = await Promise.all([
    postJson<FixedAssetsData>("/api/fixedAssets/manage", { petition: "Get", client, data: {} }),
    postJson<AbmDatosGeneralesData>("/api/fixedAssets/add", { petition: "GetFormData", client, data: {} }),
    postJson<AbmCabeceraData>("/api/fixedAssets/add", { petition: "GetCabeceraFormData", client, data: {} }),
    postJson<AbmLibrosData>("/api/fixedAssets/add", { petition: "GetLibrosFormData", client, data: {} }),
  ]);

  cacheByClient.set(client, {
    manageData,
    datosGenerales,
    cabeceraData,
    librosData,
    updatedAt: Date.now(),
  });
}
