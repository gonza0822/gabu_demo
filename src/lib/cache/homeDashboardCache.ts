import type { HomeDashboardData } from "@/lib/models/Home";

const HOME_CACHE_TTL_MS = 60 * 1000;
const homeCacheByClient = new Map<string, { data: HomeDashboardData; updatedAt: number }>();
const inflightByClient = new Map<string, Promise<HomeDashboardData>>();

function isFresh(entry: { data: HomeDashboardData; updatedAt: number } | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.updatedAt < HOME_CACHE_TTL_MS;
}

export function getHomeDashboardFromCache(client: string): HomeDashboardData | null {
    const entry = homeCacheByClient.get(client);
    if (!isFresh(entry)) return null;
    return entry?.data ?? null;
}

export function setHomeDashboardInCache(client: string, data: HomeDashboardData): void {
    homeCacheByClient.set(client, { data, updatedAt: Date.now() });
}

export async function prefetchHomeDashboard(client: string): Promise<void> {
    if (!client) return;
    const cached = getHomeDashboardFromCache(client);
    if (cached) return;
    const inflight = inflightByClient.get(client);
    if (inflight) {
        await inflight;
        return;
    }
    const promise = fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client }),
    }).then(async (res) => {
        const payload = (await res.json()) as HomeDashboardData;
        if (!res.ok) throw new Error("No se pudo precargar home");
        setHomeDashboardInCache(client, payload);
        return payload;
    });
    inflightByClient.set(client, promise);
    try {
        await promise;
    } finally {
        inflightByClient.delete(client);
    }
}
