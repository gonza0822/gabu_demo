import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma/prisma";
import clients from "@/config/clients.json";
import menuConfig from "@/config/menu.json";
import type { Menu, MenuObj, Submenu } from "@/store/navSlice";

/** apli_id_nr de GABU en [Database].dbo.aplicaciones */
export const GABU_APLI_ID = 31;

const BYPASS_USERS = new Set(["HOC"]);

function allCatalogItemIds(catalog: Menu): number[] {
    return catalog.menu.flatMap((group) =>
        group.submenu
            .map((item) => item.itemIdNr)
            .filter((id): id is number => typeof id === "number")
    );
}

function toItemId(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "bigint") return Number(value);
    if (value != null && typeof value === "object" && "toNumber" in value) {
        const n = (value as { toNumber: () => number }).toNumber();
        return Number.isFinite(n) ? n : null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export function getCatalogMenu(client: string): Menu | undefined {
    return (menuConfig as Menu[]).find((m) => m.client === client);
}

export function filterMenuByItemIds(catalog: Menu, allowed: Set<number>): Menu {
    const menu: MenuObj[] = catalog.menu
        .map((group) => ({
            ...group,
            submenu: group.submenu.filter((item) => {
                if (typeof item.itemIdNr !== "number") return false;
                return allowed.has(item.itemIdNr);
            }),
        }))
        .filter((group) => group.submenu.length > 0);

    return {
        client: catalog.client,
        maxOrder: 0,
        menu,
    };
}

function sameSubmenu(a: Submenu, b: Submenu): boolean {
    return a.submenuTitle === b.submenuTitle && a.table === b.table && a.path === b.path;
}

export function mergeSessionOntoFiltered(filtered: Menu, sessionMenu: Menu | null): Menu {
    if (!sessionMenu) {
        return filtered;
    }

    const merged: Menu = {
        client: filtered.client,
        maxOrder: 0,
        menu: filtered.menu.map((group) => ({
            ...group,
            submenu: group.submenu.map((item) => ({ ...item })),
        })),
    };

    for (const group of merged.menu) {
        const sessionGroup = sessionMenu.menu.find((m) => m.menuTitle === group.menuTitle);
        if (!sessionGroup) continue;

        for (const item of group.submenu) {
            const sessionItem = sessionGroup.submenu.find((s) => sameSubmenu(s, item));
            if (!sessionItem) continue;
            item.isOpen = sessionItem.isOpen;
            item.active = sessionItem.active;
            item.order = sessionItem.order;
        }

        for (const sessionItem of sessionGroup.submenu) {
            if (typeof sessionItem.itemIdNr === "number") continue;
            const exists = group.submenu.some(
                (s) => sameSubmenu(s, sessionItem) || s.path === sessionItem.path
            );
            if (!exists) {
                group.submenu.push({ ...sessionItem });
            }
        }
    }

    merged.maxOrder = merged.menu
        .flatMap((m) => m.submenu)
        .reduce((max, s) => (s.order > max ? s.order : max), 0);

    return merged;
}

export async function getAllowedGabuItemIds(userId: string, client?: string): Promise<Set<number>> {
    const catalog = getCatalogMenu(client || "Admagro") ?? (menuConfig as Menu[])[0];
    const catalogIds = new Set(catalog ? allCatalogItemIds(catalog) : []);
    const normalizedUser = userId.trim().toUpperCase();

    if (BYPASS_USERS.has(normalizedUser)) {
        return catalogIds;
    }

    const prismaClientName = client || clients[0]?.client;
    if (!prismaClientName) {
        return new Set();
    }

    const prisma = getPrisma(prismaClientName);
    const rows = await prisma.$queryRaw<{ itemId: unknown }[]>(Prisma.sql`
        SELECT CAST(perm_item_id_nr AS int) AS itemId
        FROM [Database].dbo.permisos
        WHERE LTRIM(RTRIM(perm_usua_id)) = ${userId.trim()}
          AND perm_apli_id = ${GABU_APLI_ID}
    `);

    const allowed = new Set<number>();
    for (const row of rows) {
        const id = toItemId(row.itemId);
        if (id != null) allowed.add(id);
    }
    return allowed;
}

export async function buildMenuForUser(
    client: string,
    userId: string,
    sessionMenu: Menu | null
): Promise<Menu> {
    const catalog = getCatalogMenu(client);
    if (!catalog) {
        return { client, menu: [], maxOrder: 0 };
    }

    const allowed = await getAllowedGabuItemIds(userId, client);
    const filtered = filterMenuByItemIds(catalog, allowed);
    return mergeSessionOntoFiltered(filtered, sessionMenu);
}
