import { NextResponse } from 'next/server';
import { Menu } from '@/store/navSlice';
import { setSessionStore, getSessionValue } from '@/lib/session/sessionStore';
import LZString from 'lz-string';
import { createRequestId, errorJson, logApiError } from '@/lib/logger';
import { buildMenuForUser } from '@/lib/security/gabuMenuPermissions';
import clients from '@/config/clients.json';

type ErrorResponse = {
    message: string,
    status: number,
    requestId?: string,
}

type PostResponse = {
    success: boolean
}

const ROUTE = '/api/menu';

export async function POST(request: Request) : Promise<NextResponse<PostResponse | ErrorResponse>> {
    const requestId = createRequestId();

    try {
        const token = await getSessionValue("token");
        if(!token){
            return errorJson("No autorizado", 401, requestId);
        }

        const menuJson : string = await request.text();

        await setSessionStore("menu", LZString.compressToBase64(menuJson), 60 * 60 * 24);
        
        return NextResponse.json({ success: true });
    } catch (err) {
        const loggedId = await logApiError({ route: ROUTE, err, petition: 'POST', requestId });
        return errorJson("Error guardando el menu", 500, loggedId);
    }
}

export async function GET() : Promise<NextResponse<Menu | ErrorResponse>> {
    const requestId = createRequestId();
    let client: string | undefined;

    try {
        const token = await getSessionValue("token");
        const userId = (await getSessionValue("user"))?.trim() || "";
        client = (await getSessionValue("client"))?.trim() || clients[0]?.client;

        if (!token || !userId) {
            return errorJson("No autorizado", 401, requestId);
        }

        if (!client) {
            return errorJson("No se encontro el cliente", 400, requestId);
        }

        let sessionMenu: Menu | null = null;
        const compressedMenu = await getSessionValue("menu");
        if (compressedMenu) {
            const menuJson = LZString.decompressFromBase64(compressedMenu) || null;
            if (menuJson) {
                sessionMenu = JSON.parse(menuJson) as Menu;
            }
        }

        const menu = await buildMenuForUser(client, userId, sessionMenu);
        return NextResponse.json(menu);
    } catch (err) {
        const loggedId = await logApiError({ route: ROUTE, err, client, petition: 'GET', requestId });
        return errorJson("Error obteniendo el menu", 500, loggedId);
    }
}
