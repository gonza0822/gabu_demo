import { NextResponse } from "next/server";
import InventarioBien from "@/lib/models/fixedAssets/InventarioBien";
import type { InventarioBienRow } from "@/lib/fixedAssets/scanAssetSummary";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";
import { getSessionValue } from "@/lib/session/sessionStore";

type ErrorResponse = { message: string; status: number; requestId?: string };

type GetLastRequest = { petition: "GetLast"; client: string; data: { bienId: string } };
type ConfirmRequest = { petition: "Confirm"; client: string; data: { bienId: string } };
type UserPostRequest = GetLastRequest | ConfirmRequest;

const ROUTE = "/api/fixedAssets/inventario";

export async function POST(
    request: Request
): Promise<NextResponse<InventarioBienRow | { last: InventarioBienRow | null } | ErrorResponse>> {
    const requestId = createRequestId();
    let client: string | undefined;
    let petition: string | undefined;

    try {
        const body = (await request.json()) as UserPostRequest;
        client = body.client;
        petition = body.petition;
        if (!client) {
            return errorJson("Client is required", 400, requestId);
        }
        const userId = (await getSessionValue("user"))?.trim() || "";
        if (!userId) {
            return errorJson("Sesión inválida.", 401, requestId);
        }

        const bienId = typeof body.data?.bienId === "string" ? body.data.bienId : "";
        if (!bienId) {
            return errorJson("El bien es obligatorio.", 400, requestId);
        }

        const model = new InventarioBien(client, userId);

        switch (petition) {
            case "GetLast":
                return NextResponse.json({ last: await model.getLast(bienId) });
            case "Confirm":
                return NextResponse.json(await model.confirm(bienId));
            default:
                return errorJson("Petición inválida.", 400, requestId);
        }
    } catch (err) {
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
