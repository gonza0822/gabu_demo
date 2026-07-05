export type ApiErrorResponse = { message: string; status: number; requestId?: string };

export function formatApiErrorMessage(message: string, requestId?: string | null): string {
    const ref = typeof requestId === 'string' && requestId ? requestId : null;
    return ref ? `${message} (Ref: ${ref})` : message;
}

export function formatApiErrorFromBody(
    body: { message?: string; requestId?: string } | null | undefined,
    fallback: string
): string {
    return formatApiErrorMessage(body?.message ?? fallback, body?.requestId);
}
