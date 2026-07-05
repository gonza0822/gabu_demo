import { NextResponse } from "next/server";
import FixedAsset from "@/lib/models/fixedAssets/FixedAsset";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";

/** Límite de runtime en hosts que lo respetan (p. ej. Vercel); el batch puede tardar varios minutos. */
export const maxDuration = 900;

const ROUTE = "/api/simulations/restart";

type Body =
    | { petition: "GetLibros"; client: string }
    | { petition: "Reiniciar"; client: string; data: { idMoextra: string } };

export async function POST(request: Request): Promise<NextResponse> {
    const requestId = createRequestId();
    let client: string | undefined;
    let petition: string | undefined;

    try {
        const body = (await request.json()) as Body;
        client = body.client;
        petition = body.petition;

        if (!client) {
            return errorJson("Client is required", 400, requestId);
        }

        const fixedAssetModel = new FixedAsset(client);

        if (petition === "GetLibros") {
            return NextResponse.json(await fixedAssetModel.getLibrosParaReinicioSimulacion());
        }

        if (petition === "Reiniciar") {
            if (!("data" in body)) {
                return errorJson("idMoextra es requerido", 400, requestId);
            }
            const idMoextra = body.data?.idMoextra;
            if (!idMoextra || typeof idMoextra !== "string") {
                return errorJson("idMoextra es requerido", 400, requestId);
            }
            try {
                const result = await fixedAssetModel.reiniciarSimulacionDesdeLibro(idMoextra);
                return NextResponse.json(result);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return errorJson(msg, 400, requestId);
            }
        }

        return errorJson("Petición no reconocida", 400, requestId);
    } catch (e) {
        const loggedId = await logApiError({ route: ROUTE, err: e, client, petition, requestId });
        const msg = e instanceof Error ? e.message : String(e);
        return errorJson(msg, 500, loggedId);
    }
}
