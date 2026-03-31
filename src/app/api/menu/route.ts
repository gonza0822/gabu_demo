import { NextResponse } from 'next/server';
import { Menu } from '@/store/navSlice';
import { setSessionStore, getSessionValue } from '@/lib/session/sessionStore';
import LZString from 'lz-string';
import menuConfig from '@/config/menu.json';

type ErrorResponse = {
    message: string,
    status: number
}

type PostResponse = {
    success: boolean
}

function sameSubmenu(a: { submenuTitle: string; table: string; path: string }, b: { submenuTitle: string; table: string; path: string }): boolean {
    return a.submenuTitle === b.submenuTitle && a.table === b.table && a.path === b.path;
}

function normalizeMenuValue(value: string): string {
    return (value || "").trim().toLowerCase();
}

function mergeSessionMenuWithConfig(sessionMenu: Menu): Menu {
    const configMenu = (menuConfig as Menu[]).find((m) => m.client === sessionMenu.client);
    if (!configMenu) return sessionMenu;

    const merged: Menu = {
        client: configMenu.client,
        maxOrder: 0,
        menu: configMenu.menu.map((menuItem) => ({
            ...menuItem,
            submenu: menuItem.submenu.map((submenu) => ({ ...submenu })),
        })),
    };

    for (const mergedMenuItem of merged.menu) {
        const sessionMenuItem = sessionMenu.menu.find((m) => m.menuTitle === mergedMenuItem.menuTitle);
        if (!sessionMenuItem) continue;

        for (const mergedSubmenu of mergedMenuItem.submenu) {
            const sessionSubmenu = sessionMenuItem.submenu.find((s) => sameSubmenu(s, mergedSubmenu));
            if (!sessionSubmenu) continue;
            mergedSubmenu.isOpen = sessionSubmenu.isOpen;
            mergedSubmenu.active = sessionSubmenu.active;
            mergedSubmenu.order = sessionSubmenu.order;
        }
    }

    // Preserva submenús dinámicos/sesión que no existen en menu.json.
    for (const sessionMenuItem of sessionMenu.menu) {
        const mergedMenuItem = merged.menu.find((m) => m.menuTitle === sessionMenuItem.menuTitle);
        if (!mergedMenuItem) continue;
        for (const sessionSubmenu of sessionMenuItem.submenu) {
            const normalizedSessionTitle = normalizeMenuValue(sessionSubmenu.submenuTitle);
            const normalizedSessionPath = normalizeMenuValue(sessionSubmenu.path);
            const existsByTitle = mergedMenuItem.submenu.some(
                (s) => normalizeMenuValue(s.submenuTitle) === normalizedSessionTitle
            );
            const existsByPath = normalizedSessionPath !== "" && mergedMenuItem.submenu.some(
                (s) => normalizeMenuValue(s.path) === normalizedSessionPath
            );
            const exists = mergedMenuItem.submenu.some((s) => sameSubmenu(s, sessionSubmenu));
            if (!exists && !existsByTitle && !existsByPath) {
                mergedMenuItem.submenu.push({ ...sessionSubmenu });
            }
        }
    }

    merged.maxOrder = merged.menu
        .flatMap((m) => m.submenu)
        .reduce((max, s) => (s.order > max ? s.order : max), 0);

    return merged;
}

export async function POST(request: Request) : Promise<NextResponse<PostResponse | ErrorResponse>> {
    try {
        const token = await getSessionValue("token");
        if(!token){
            return NextResponse.json({
                message: "No autorizado",
                status: 401
            });
        }

        const menuJson : string = await request.text();

        await setSessionStore("menu", LZString.compressToBase64(menuJson), 60 * 60 * 24);
        
        return NextResponse.json({ success: true });
    } catch (err) {

        return NextResponse.json({
            message: "Error guardando el menu",
            status: 500
        });
    }
}

export async function GET() : Promise<NextResponse<Menu | ErrorResponse>> {
    try {
        const compressedMenu : string | null = await getSessionValue("menu");

        if(compressedMenu){
            const menuJson : string | null = LZString.decompressFromBase64(compressedMenu) || null;
            if(menuJson){
                const sessionMenu : Menu = JSON.parse(menuJson);
                const mergedMenu = mergeSessionMenuWithConfig(sessionMenu);
                return NextResponse.json(mergedMenu);
            } else {
                throw new Error("Error al descomprimir el menu.");
            } 
        } else {
            throw new Error("No se encontro el menu en la sesion.");
        }
    } catch (err) {

        return NextResponse.json({
            message: "Error obteniendo el menu",
            status: 500
        });
    }
}