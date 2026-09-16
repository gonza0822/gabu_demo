import { NextResponse } from "next/server";
import SavedFilters, { DuplicateFilterParamsError, type SavedFilterRow } from "@/lib/models/fixedAssets/SavedFilters";
import { parseSavedFilterValues, type FilterValues } from "@/lib/fixedAssets/filterValues";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";
import { getSessionValue } from "@/lib/session/sessionStore";

type ErrorResponse = { message: string; status: number; requestId?: string };

type ListRequest = { petition: "List"; client: string; data?: Record<string, never> };
type SaveRequest = { petition: "Save"; client: string; data: { nombre: string; filtros: FilterValues } };
type DeleteRequest = { petition: "Delete"; client: string; data: { id: number } };
type UserPostRequest = ListRequest | SaveRequest | DeleteRequest;

const ROUTE = "/api/fixedAssets/savedFilters";

function asFilterValues(raw: unknown): FilterValues {
    return parseSavedFilterValues(raw);
}

export async function POST(
    request: Request
): Promise<NextResponse<SavedFilterRow[] | SavedFilterRow | { ok: boolean } | ErrorResponse>> {
    const requestId = createRequestId();
    let client: string | undefined;
    let petition: string | undefined;

    try {
        const body = (await request.json()) as UserPostRequest;
        client = body.client;
        petition = body.petition;
        const userId = (await getSessionValue("user"))?.trim() || "";
        if (!userId) {
            return errorJson("Sesión inválida.", 401);
        }

        const model = new SavedFilters(client, userId);

        switch (petition) {
            case "List":
                return NextResponse.json(await model.list());
            case "Save": {
                const data = (body as SaveRequest).data;
                return NextResponse.json(await model.save(data.nombre, asFilterValues(data.filtros)));
            }
            case "Delete": {
                const data = (body as DeleteRequest).data;
                await model.remove(Number(data.id));
                return NextResponse.json({ ok: true });
            }
            default:
                return errorJson("Petición inválida.", 400);
        }
    } catch (err) {
        if (err instanceof DuplicateFilterParamsError) {
            return errorJson(err.message, 409);
        }
        const loggedId = await logApiError({
            route: ROUTE,
            err,
            client,
            petition,
            requestId,
        });
        if (err instanceof Error) {
            return errorJson(err.message, 500, loggedId);
        }
        return errorJson("Error desconocido en el servidor.", 500, loggedId);
    }
}
