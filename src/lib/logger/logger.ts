import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export const GABU_LOGS_ROOT =
    process.env.GABU_LOGS_PATH?.trim() || 'C:\\ProgramData\\Gabu\\logs';

export type LogLevel = 'info' | 'warn' | 'error';

export type LogContext = {
    client?: string;
    route?: string;
    petition?: string;
    bienId?: string;
    requestId?: string;
    [key: string]: unknown;
};

function logFileName(level: LogLevel): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const date = `${yyyy}-${mm}-${dd}`;
    return level === 'error' ? `error-${date}.log` : `app-${date}.log`;
}

function serializeError(err: unknown): Record<string, unknown> | undefined {
    if (err instanceof Error) {
        const cause = 'cause' in err ? err.cause : undefined;
        return {
            name: err.name,
            message: err.message,
            stack: err.stack,
            ...(cause !== undefined ? { cause: cause instanceof Error ? serializeError(cause) : String(cause) } : {}),
        };
    }
    if (err !== undefined && err !== null) {
        return { message: String(err) };
    }
    return undefined;
}

async function writeLog(level: LogLevel, message: string, err?: unknown, context?: LogContext): Promise<void> {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
        ...(serializeError(err) ? { error: serializeError(err) } : {}),
    };

    const line = `${JSON.stringify(entry)}\n`;

    if (level === 'error') console.error('[gabu]', line.trim());
    else if (level === 'warn') console.warn('[gabu]', line.trim());
    else console.log('[gabu]', line.trim());

    try {
        await mkdir(GABU_LOGS_ROOT, { recursive: true });
        await appendFile(path.join(GABU_LOGS_ROOT, logFileName(level)), line, 'utf8');
    } catch (writeErr) {
        console.error('[gabu] No se pudo escribir el log en disco:', writeErr);
    }
}

export function createRequestId(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}

export const logger = {
    info(message: string, context?: LogContext): Promise<void> {
        return writeLog('info', message, undefined, context);
    },
    warn(message: string, err?: unknown, context?: LogContext): Promise<void> {
        return writeLog('warn', message, err, context);
    },
    error(message: string, err?: unknown, context?: LogContext): Promise<void> {
        return writeLog('error', message, err, context);
    },
};

export async function logApiError(opts: {
    route: string;
    err: unknown;
    client?: string;
    petition?: string;
    bienId?: string;
    requestId?: string;
    extra?: Record<string, unknown>;
}): Promise<string> {
    const requestId = opts.requestId ?? createRequestId();
    await logger.error(`Error en ${opts.route}`, opts.err, {
        route: opts.route,
        client: opts.client,
        petition: opts.petition,
        bienId: opts.bienId,
        requestId,
        ...opts.extra,
    });
    return requestId;
}
