import path from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';

export const GABU_UPLOADS_ROOT =
    process.env.GABU_UPLOADS_PATH?.trim() || 'C:\\ProgramData\\Gabu\\uploads';

const BIEN_ID_REGEX = /^\d{6}-\d{3}-[^-]+-[^-]+$/;

export function assertValidBienId(bienId: string): string {
    const trimmed = bienId.trim();
    if (!BIEN_ID_REGEX.test(trimmed)) {
        throw new Error('bienId inválido');
    }
    return trimmed;
}

/** Parsea `imagenes.foto`: una ruta simple o un JSON array de rutas relativas. */
export function parseFotoPathsStored(raw: string | null | undefined): string[] {
    if (!raw?.trim()) return [];
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
        try {
            const parsed: unknown = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
                    .map((p) => p.trim().replace(/\\/g, '/'));
            }
        } catch {
            /* valor legacy o corrupto: tratar como ruta única */
        }
    }
    return [trimmed.replace(/\\/g, '/')];
}

/** Serializa rutas para `imagenes.foto` (siempre JSON array si hay al menos una). */
export function serializeFotoPathsStored(paths: string[]): string | null {
    const normalized = paths
        .map((p) => p.trim().replace(/\\/g, '/'))
        .filter(Boolean);
    if (normalized.length === 0) return null;
    return JSON.stringify(normalized);
}

export function assertFotoBelongsToBien(bienId: string, relativePath: string): string {
    const safeBienId = assertValidBienId(bienId);
    const normalized = relativePath.replace(/\\/g, '/').trim();
    const expectedPrefix = `${safeBienId}/fotos/`;
    if (!normalized.startsWith(expectedPrefix)) {
        throw new Error('Ruta de foto inválida para el bien');
    }
    resolveAbsoluteFotoPath(normalized);
    return normalized;
}

/** Ruta relativa guardada en `imagenes.foto`: `{bienId}/fotos/{nombreArchivo}` */
export function buildRelativeFotoPath(bienId: string, fileName: string): string {
    const safeBienId = assertValidBienId(bienId);
    const safeName = sanitizeFileName(fileName);
    return `${safeBienId}/fotos/${safeName}`.replace(/\\/g, '/');
}

export function getFotosDirectory(bienId: string): string {
    const safeBienId = assertValidBienId(bienId);
    return path.join(GABU_UPLOADS_ROOT, safeBienId, 'fotos');
}

export function resolveAbsoluteFotoPath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').trim();
    if (!normalized || normalized.includes('..')) {
        throw new Error('Ruta de foto inválida');
    }
    const absolute = path.resolve(GABU_UPLOADS_ROOT, ...normalized.split('/'));
    const rootResolved = path.resolve(GABU_UPLOADS_ROOT);
    if (!absolute.startsWith(rootResolved)) {
        throw new Error('Ruta de foto fuera del directorio permitido');
    }
    return absolute;
}

export function sanitizeFileName(original: string): string {
    const base = path.basename(original).trim();
    if (!base) throw new Error('Nombre de archivo inválido');
    const sanitized = base.replace(/[^a-zA-Z0-9._-áéíóúÁÉÍÓÚñÑ ]/g, '_');
    if (!sanitized || sanitized === '.' || sanitized === '..') {
        throw new Error('Nombre de archivo inválido');
    }
    return sanitized;
}

export const ALLOWED_FOTO_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
]);

const ALLOWED_FOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

/** Acepta MIME del navegador o extensión (Windows a veces envía `file.type` vacío). */
export function isAllowedFotoUpload(fileName: string, mimeType: string): boolean {
    if (mimeType && ALLOWED_FOTO_MIME.has(mimeType)) return true;
    const ext = path.extname(fileName).toLowerCase();
    return ALLOWED_FOTO_EXTENSIONS.has(ext);
}

export const MAX_FOTO_BYTES = 10 * 1024 * 1024;

export function mimeFromFileName(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.webp':
            return 'image/webp';
        case '.gif':
            return 'image/gif';
        case '.bmp':
            return 'image/bmp';
        default:
            return 'application/octet-stream';
    }
}

export async function writeFotoFile(
    bienId: string,
    fileName: string,
    buffer: Buffer
): Promise<{ relativePath: string; absolutePath: string }> {
    const relativePath = buildRelativeFotoPath(bienId, fileName);
    const absolutePath = resolveAbsoluteFotoPath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return { relativePath, absolutePath };
}

export async function deleteFotoFileIfExists(relativePath: string | null | undefined): Promise<void> {
    if (!relativePath?.trim()) return;
    try {
        const absolute = resolveAbsoluteFotoPath(relativePath);
        await unlink(absolute);
    } catch (err) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : '';
        if (code !== 'ENOENT') throw err;
    }
}
