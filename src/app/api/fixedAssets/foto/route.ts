import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import FixedAsset from '@/lib/models/fixedAssets/FixedAsset';
import {
    ALLOWED_FOTO_MIME,
    MAX_FOTO_BYTES,
    mimeFromFileName,
    resolveAbsoluteFotoPath,
} from '@/lib/uploads/assetFotoStorage';

export type ErrorResponse = { message: string; status: number };

export async function GET(request: Request): Promise<NextResponse<Buffer | ErrorResponse>> {
    try {
        const params = new URL(request.url).searchParams;
        const client = params.get('client');
        const bienId = params.get('bienId');
        if (!client || !bienId) {
            return NextResponse.json({ message: 'client y bienId son requeridos', status: 400 }, { status: 400 });
        }

        const model = new FixedAsset(client);
        const relative = await model.getImagenFotoRelative(bienId);
        if (!relative) {
            return NextResponse.json({ message: 'Sin foto', status: 404 }, { status: 404 });
        }

        const absolute = resolveAbsoluteFotoPath(relative);
        const buffer = await readFile(absolute);
        const fileName = relative.split('/').pop() ?? 'foto';
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': mimeFromFileName(fileName),
                'Cache-Control': 'private, max-age=60',
            },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const status = /no encontrada|Sin foto|inválid/i.test(msg) ? 404 : 500;
        return NextResponse.json({ message: msg, status }, { status });
    }
}

export async function POST(request: Request): Promise<NextResponse<{ ok: boolean; foto: string } | ErrorResponse>> {
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
        if (!ALLOWED_FOTO_MIME.has(file.type)) {
            return NextResponse.json({ message: 'Formato de imagen no permitido', status: 400 }, { status: 400 });
        }
        if (file.size > MAX_FOTO_BYTES) {
            return NextResponse.json({ message: 'La imagen supera el tamaño máximo (10 MB)', status: 400 }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const model = new FixedAsset(client);
        const relative = await model.saveImagenFoto(bienId, buffer, file.name);

        return NextResponse.json({ ok: true, foto: relative });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ message: msg, status: 500 }, { status: 500 });
    }
}
