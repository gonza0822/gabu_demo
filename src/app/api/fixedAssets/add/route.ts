import { NextResponse } from "next/server";
import FixedAsset, { type AbmDatosGeneralesData, type AbmCabeceraData, type AbmLibrosData } from "@/lib/models/fixedAssets/FixedAsset";

export type ErrorResponse = { message: string; status: number };

type UserPostRequest =
    | { petition: "GetFormData"; client: string; data: {} }
    | { petition: "GetCabeceraFormData"; client: string; data: { simulationOnly?: boolean } }
    | { petition: "GetLibrosFormData"; client: string; data: { simulationOnly?: boolean } }
    | { petition: "GetCCostosOptions"; client: string; data: {} }
    | { petition: "Add"; client: string; data: Record<string, unknown> }
    | { petition: "GetBienData"; client: string; data: { bienId: string; simulationOnly?: boolean } }
    | { petition: "Update"; client: string; data: { bienId: string } & Record<string, unknown> };

export async function POST(
    request: Request
): Promise<NextResponse<AbmDatosGeneralesData | AbmCabeceraData | AbmLibrosData | { key: string; value: string }[] | { ok: boolean } | Record<string, unknown> | ErrorResponse>> {
    try {
        const body = await request.json() as UserPostRequest;
        const { client, petition } = body;

        if (!client) {
            return NextResponse.json({ message: "Client is required", status: 400 }, { status: 400 });
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
                    return NextResponse.json({ message: "bienId is required", status: 400 }, { status: 400 });
                }
                const bien = await fixedAssetModel.getBienById(data.bienId, { simulationOnly: Boolean(data.simulationOnly) });
                if (!bien) {
                    return NextResponse.json({ message: "Bien no encontrado", status: 404 }, { status: 404 });
                }
                return NextResponse.json(bien);
            }
            case "Update": {
                const data = (body as { data?: { bienId: string } & Record<string, unknown> }).data;
                if (!data?.bienId || typeof data.bienId !== 'string') {
                    return NextResponse.json({ message: "bienId is required", status: 400 }, { status: 400 });
                }
                const { bienId, ...payload } = data;
                try {
                    await fixedAssetModel.updateBien(bienId, payload as Parameters<typeof fixedAssetModel.updateBien>[1]);
                    return NextResponse.json({ ok: true });
                } catch (updateErr) {
                    const msg = updateErr instanceof Error ? updateErr.message : String(updateErr);
                    return NextResponse.json({ message: msg, status: 500 }, { status: 500 });
                }
            }
            case "Add": {
                const data = (body as { data?: Record<string, unknown> }).data;
                if (!data || typeof data !== 'object') {
                    return NextResponse.json({ message: "Data is required", status: 400 }, { status: 400 });
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
                        const payload = JSON.stringify(data, null, 2);
                        console.error('[Add] String truncation - payload (revisar longitudes):', payload);
                        const lenReport = Object.entries(data).flatMap(([k, v]) => {
                            if (v && typeof v === 'object' && !Array.isArray(v)) {
                                return Object.entries(v as Record<string, unknown>).map(([f, val]) => `${k}.${f}: ${String(val).length} chars`);
                            }
                            return [`${k}: ${String(v).length} chars`];
                        });
                        console.error('[Add] Longitudes:', lenReport.join(', '));
                        return NextResponse.json({
                            message: "Algún campo excede la longitud permitida. Revisar en consola del servidor: cabecera (idDescripcion=6, idActivo=15, idFactura=30, idCencos=5, idPlanta=5), distribucion (idCencos=5), libros (idMoneda=2).",
                            status: 500,
                        }, { status: 500 });
                    }
                    throw addErr;
                }
            }
            default:
                return NextResponse.json({ ok: true });
        }
    } catch (err) {
        if (err instanceof Error) {
            console.error(err);
            return NextResponse.json({ message: err.message, status: 500 }, { status: 500 });
        }
        return NextResponse.json({ message: "Error desconocido", status: 500 }, { status: 500 });
    }
}
