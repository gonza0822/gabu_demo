import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import FixedAsset from '@/lib/models/fixedAssets/FixedAsset';
import {
    MAX_FOTO_BYTES,
    assertFotoBelongsToBien,
    isAllowedFotoUpload,
    mimeFromFileName,
    resolveAbsoluteFotoPath,
} from '@/lib/uploads/assetFotoStorage';

export type ErrorResponse = { message: string; status: number };

function fotoFileName(relativePath: string): string {
    return relativePath.split('/').pop() ?? 'foto';
}

export async function GET(request: Request): Promise<NextResponse<Buffer | { fotos: string[] } | ErrorResponse>> {
    try {
        const params = new URL(request.url).searchParams;
        const client = params.get('client');
        const bienId = params.get('bienId');
        if (!client || !bienId) {
            return NextResponse.json({ message: 'client y bienId son requeridos', status: 400 }, { status: 400 });
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
                return NextResponse.json({ message: 'Foto no encontrada', status: 404 }, { status: 404 });
            }
        } else {
            relative = stored[0] ?? null;
        }

        if (!relative) {
            return NextResponse.json({ message: 'Sin foto', status: 404 }, { status: 404 });
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
        return NextResponse.json({ message: msg, status }, { status });
    }
}

export async function POST(request: Request): Promise<NextResponse<{ ok: boolean; foto: string; fotos: string[] } | ErrorResponse>> {
    try {
        const form = await request.formData();
        const client = String(form.get('client') ?? '').trim();
        const bienId = String(form.get('bienId') ?? '').trim();
        const file = form.get('file');

        if (!client) {
            return NextResponse.json({ message: 'Client is required', status: 400 }, { status: 400 });
        }
        if (!bienId) {
            return NextResponse.json({ message: 'bienId is required', status: 400 }, { status: 400 });
        }
        if (!file || !(file instanceof File)) {
            return NextResponse.json({ message: 'Archivo requerido', status: 400 }, { status: 400 });
        }
        if (!isAllowedFotoUpload(file.name, file.type)) {
            return NextResponse.json({ message: 'Formato de imagen no permitido', status: 400 }, { status: 400 });
        }
        if (file.size > MAX_FOTO_BYTES) {
            return NextResponse.json({ message: 'La imagen supera el tamaño máximo (10 MB)', status: 400 }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const model = new FixedAsset(client);
        const relative = await model.saveImagenFoto(bienId, buffer, file.name);
        const fotos = await model.getImagenFotosRelative(bienId);

        return NextResponse.json({ ok: true, foto: relative, fotos });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ message: msg, status: 500 }, { status: 500 });
    }
}

export async function DELETE(request: Request): Promise<NextResponse<{ ok: boolean; fotos: string[] } | ErrorResponse>> {
    try {
        const params = new URL(request.url).searchParams;
        const client = params.get('client');
        const bienId = params.get('bienId');
        const pathParam = params.get('path');
        if (!client || !bienId || !pathParam) {
            return NextResponse.json({ message: 'client, bienId y path son requeridos', status: 400 }, { status: 400 });
        }

        const relative = assertFotoBelongsToBien(bienId, decodeURIComponent(pathParam));
        const model = new FixedAsset(client);
        await model.deleteImagenFoto(bienId, relative);
        const fotos = await model.getImagenFotosRelative(bienId);

        return NextResponse.json({ ok: true, fotos });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const status = /no encontrada|inválid/i.test(msg) ? 404 : 500;
        return NextResponse.json({ message: msg, status }, { status });
    }
}
