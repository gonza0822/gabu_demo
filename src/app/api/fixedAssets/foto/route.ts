import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import FixedAsset from '@/lib/models/fixedAssets/FixedAsset';
import { createRequestId, errorJson, logApiError } from '@/lib/logger';
import {
    MAX_FOTO_BYTES,
    assertFotoBelongsToBien,
    isAllowedFotoUpload,
    mimeFromFileName,
    resolveAbsoluteFotoPath,
} from '@/lib/uploads/assetFotoStorage';

export type ErrorResponse = { message: string; status: number; requestId?: string };

const ROUTE = '/api/fixedAssets/foto';

function fotoFileName(relativePath: string): string {
    return relativePath.split('/').pop() ?? 'foto';
}

export async function GET(request: Request): Promise<NextResponse<Buffer | { fotos: string[] } | ErrorResponse>> {
    const requestId = createRequestId();
    let client: string | null = null;
    let bienId: string | null = null;

    try {
        const params = new URL(request.url).searchParams;
        client = params.get('client');
        bienId = params.get('bienId');
        if (!client || !bienId) {
            return errorJson('client y bienId son requeridos', 400, requestId);
        }

        const model = new FixedAsset(client);
        const stored = await model.getImagenFotosRelative(bienId);

        if (params.get('list') === '1') {
            return NextResponse.json({ fotos: stored });
        }

        const pathParam = params.get('path');
        let relative: string | null;
        if (pathParam) {
            const decoded = decodeURIComponent(pathParam);
            relative = assertFotoBelongsToBien(bienId, decoded);
            if (!stored.includes(relative)) {
                return errorJson('Foto no encontrada', 404, requestId);
            }
        } else {
            relative = stored[0] ?? null;
        }

        if (!relative) {
            return errorJson('Sin foto', 404, requestId);
        }

        const absolute = resolveAbsoluteFotoPath(relative);
        const buffer = await readFile(absolute);
        const fileName = fotoFileName(relative);
        const headers: Record<string, string> = {
            'Content-Type': mimeFromFileName(fileName),
            'Cache-Control': 'private, max-age=60',
        };
        if (params.get('download') === '1') {
            headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(fileName)}"`;
        }
        return new NextResponse(buffer, { headers });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const status = /no encontrada|Sin foto|inválid/i.test(msg) ? 404 : 500;
        if (status >= 500) {
            const loggedId = await logApiError({
                route: ROUTE,
                err,
                client: client ?? undefined,
                bienId: bienId ?? undefined,
                petition: 'GET',
                requestId,
            });
            return errorJson(msg, status, loggedId);
        }
        return errorJson(msg, status, requestId);
    }
}

export async function POST(request: Request): Promise<NextResponse<{ ok: boolean; foto: string; fotos: string[] } | ErrorResponse>> {
    const requestId = createRequestId();
    let client = '';
    let bienId = '';

    try {
        const form = await request.formData();
        client = String(form.get('client') ?? '').trim();
        bienId = String(form.get('bienId') ?? '').trim();
        const file = form.get('file');

        if (!client) {
            return errorJson('Client is required', 400, requestId);
        }
        if (!bienId) {
            return errorJson('bienId is required', 400, requestId);
        }
        if (!file || !(file instanceof File)) {
            return errorJson('Archivo requerido', 400, requestId);
        }
        if (!isAllowedFotoUpload(file.name, file.type)) {
            return errorJson('Formato de imagen no permitido', 400, requestId);
        }
        if (file.size > MAX_FOTO_BYTES) {
            return errorJson('La imagen supera el tamaño máximo (10 MB)', 400, requestId);
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const model = new FixedAsset(client);
        const relative = await model.saveImagenFoto(bienId, buffer, file.name);
        const fotos = await model.getImagenFotosRelative(bienId);

        return NextResponse.json({ ok: true, foto: relative, fotos });
    } catch (err) {
        const loggedId = await logApiError({
            route: ROUTE,
            err,
            client: client || undefined,
            bienId: bienId || undefined,
            petition: 'POST',
            requestId,
        });
        const msg = err instanceof Error ? err.message : String(err);
        return errorJson(msg, 500, loggedId);
    }
}

export async function DELETE(request: Request): Promise<NextResponse<{ ok: boolean; fotos: string[] } | ErrorResponse>> {
    const requestId = createRequestId();
    let client: string | null = null;
    let bienId: string | null = null;

    try {
        const params = new URL(request.url).searchParams;
        client = params.get('client');
        bienId = params.get('bienId');
        const pathParam = params.get('path');
        if (!client || !bienId || !pathParam) {
            return errorJson('client, bienId y path son requeridos', 400, requestId);
        }

        const relative = assertFotoBelongsToBien(bienId, decodeURIComponent(pathParam));
        const model = new FixedAsset(client);
        await model.deleteImagenFoto(bienId, relative);
        const fotos = await model.getImagenFotosRelative(bienId);

        return NextResponse.json({ ok: true, fotos });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const status = /no encontrada|inválid/i.test(msg) ? 404 : 500;
        if (status >= 500) {
            const loggedId = await logApiError({
                route: ROUTE,
                err,
                client: client ?? undefined,
                bienId: bienId ?? undefined,
                petition: 'DELETE',
                requestId,
            });
            return errorJson(msg, status, loggedId);
        }
        return errorJson(msg, status, requestId);
    }
}
