import { NextResponse } from 'next/server';
import type { ApiErrorResponse } from './apiError';

export function errorJson(message: string, status: number, requestId?: string) {
    return NextResponse.json({ message, status, requestId } satisfies ApiErrorResponse, { status });
}
