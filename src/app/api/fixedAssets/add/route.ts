import { NextResponse } from "next/server";
import FixedAsset, { type AbmDatosGeneralesData, type AbmCabeceraData, type AbmLibrosData } from "@/lib/models/fixedAssets/FixedAsset";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";

export type ErrorResponse = { message: string; status: number; requestId?: string };

const ROUTE = "/api/fixedAssets/add";

type UserPostRequest =
    | { petition: "GetFormData"; client: string; data: Record<string, never> }
    | { petition: "GetCabeceraFormData"; client: string; data: { simulationOnly?: boolean } }
    | { petition: "GetLibrosFormData"; client: string; data: { simulationOnly?: boolean } }
    | { petition: "GetCCostosOptions"; client: string; data: Record<string, never> }
    | { petition: "Add"; client: string; data: Record<string, unknown> }
    | { petition: "GetBienData"; client: string; data: { bienId: string; simulationOnly?: boolean } }
    | { petition: "UpdateAnotaciones"; client: string; data: { bienId: string; anotaciones: string } }
    | { petition: "Update"; client: string; data: { bienId: string } & Record<string, unknown> };

export async function POST(
    request: Request
): Promise<NextResponse<AbmDatosGeneralesData | AbmCabeceraData | AbmLibrosData | { key: string; value: string }[] | { ok: boolean } | Record<string, unknown> | ErrorResponse>> {
    const requestId = createRequestId();
    let client: string | undefined;
    let petition: string | undefined;

    try {
        const body = await request.json() as UserPostRequest;
        client = body.client;
        petition = body.petition;

        if (!client) {
            return errorJson("Client is required", 400, requestId);
        }

        const fixedAssetModel = new FixedAsset(client);

        switch (petition) {
            case "GetFormData":
                return NextResponse.json(await fixedAssetModel.getAbmDatosGenerales());
            case "GetCabeceraFormData":
                return NextResponse.json(
                    await fixedAssetModel.getAbmCabeceraData(Boolean((body as { data?: { simulationOnly?: boolean } }).data?.simulationOnly))
                );
            case "GetLibrosFormData":
                return NextResponse.json(await fixedAssetModel.getAbmLibrosData(Boolean((body as { data?: { simulationOnly?: boolean } }).data?.simulationOnly)));
            case "GetCCostosOptions":
                return NextResponse.json(await fixedAssetModel.getCCostosOptions());
            case "GetBienData": {
                const data = (body as { data?: { bienId: string; simulationOnly?: boolean } }).data;
                if (!data?.bienId) {
                    return errorJson("bienId is required", 400, requestId);
                }
                const bien = await fixedAssetModel.getBienById(data.bienId, { simulationOnly: Boolean(data.simulationOnly) });
                if (!bien) {
                    return errorJson("Bien no encontrado", 404, requestId);
                }
                return NextResponse.json(bien);
            }
            case "UpdateAnotaciones": {
                const data = (body as { data?: { bienId: string; anotaciones: string } }).data;
                if (!data?.bienId) {
                    return errorJson("bienId is required", 400, requestId);
                }
                try {
                    await fixedAssetModel.updateAnotaciones(data.bienId, data.anotaciones ?? '');
                    return NextResponse.json({ ok: true });
                } catch (err) {
                    const loggedId = await logApiError({ route: ROUTE, err, client, petition, bienId: data.bienId, requestId });
                    const msg = err instanceof Error ? err.message : String(err);
                    return errorJson(msg, 500, loggedId);
                }
            }
            case "Update": {
                const data = (body as { data?: { bienId: string } & Record<string, unknown> }).data;
                if (!data?.bienId || typeof data.bienId !== 'string') {
                    return errorJson("bienId is required", 400, requestId);
                }
                const { bienId, ...payload } = data;
                try {
                    await fixedAssetModel.updateBien(bienId, payload as Parameters<typeof fixedAssetModel.updateBien>[1]);
                    return NextResponse.json({ ok: true });
                } catch (err) {
                    const loggedId = await logApiError({ route: ROUTE, err, client, petition, bienId, requestId });
                    const msg = err instanceof Error ? err.message : String(err);
                    return errorJson(msg, 500, loggedId);
                }
            }
            case "Add": {
                const data = (body as { data?: Record<string, unknown> }).data;
                if (!data || typeof data !== 'object') {
                    return errorJson("Data is required", 400, requestId);
                }
                try {
                    const result = await fixedAssetModel.addBien(data as Parameters<typeof fixedAssetModel.addBien>[0]);
                    const bienId = `${result.idCodigo}-${result.idSubien}-0-0`;
                    return NextResponse.json({ ok: true, bienId, idCodigo: result.idCodigo });
                } catch (addErr) {
                    const msg = addErr instanceof Error ? addErr.message : String(addErr);
                    const cause = addErr && typeof addErr === 'object' && 'cause' in addErr ? (addErr as { cause?: unknown }).cause : null;
                    const full = msg + (cause ? String(cause) : '');
                    if (/truncat|String or binary data would be truncated|DriverAdapterError/i.test(full)) {
                        const lenReport = Object.entries(data).flatMap(([k, v]) => {
                            if (v && typeof v === 'object' && !Array.isArray(v)) {
                                return Object.entries(v as Record<string, unknown>).map(([f, val]) => `${k}.${f}: ${String(val).length} chars`);
                            }
                            return [`${k}: ${String(v).length} chars`];
                        });
                        await logApiError({
                            route: ROUTE,
                            err: addErr,
                            client,
                            petition,
                            requestId,
                            extra: { truncation: true, fieldLengths: lenReport.join(', ') },
                        });
                        return errorJson(
                            "Algún campo excede la longitud permitida. Revisar en consola del servidor: cabecera (idDescripcion=6, idActivo=15, idFactura=30, idCencos=5, idPlanta=5), distribucion (idCencos=5), libros (idMoneda=2).",
                            500,
                            requestId
                        );
                    }
                    throw addErr;
                }
            }
            default:
                return NextResponse.json({ ok: true });
        }
    } catch (err) {
        const loggedId = await logApiError({ route: ROUTE, err, client, petition, requestId });
        if (err instanceof Error) {
            return errorJson(err.message, 500, loggedId);
        }
        return errorJson("Error desconocido", 500, loggedId);
    }
}
