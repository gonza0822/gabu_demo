import { NextResponse } from "next/server";
import { ConverFieldModel } from "@/generated/prisma/models";
import { FixedAssetsData } from "@/lib/models/fixedAssets/FixedAsset";
import FixedAsset from "@/lib/models/fixedAssets/FixedAsset";
import { ReOrderData } from "@/lib/models/tables/Table";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";
import { getSessionValue } from "@/lib/session/sessionStore";

export type ErrorResponse = { message: string; status: number; requestId?: string };

const ROUTE = "/api/fixedAssets/manage";

export async function POST(request: Request): Promise<NextResponse<FixedAssetsData | ConverFieldModel | unknown[] | { ok: boolean } | ErrorResponse>> {

    type SetListShowData = { fieldId: string; listShow: boolean; tableId?: string };
    type SetListShowBatchData = { updates: { fieldId: string; listShow: boolean }[]; tableId?: string };

    type BajaData = {
        selectedAssets: { [key: string]: unknown }[];
        fechaBaja: string;
        tipoBaja: string;
        precioVenta: string;
        porcentajeBaja: string;
        simulationOnly?: boolean;
    };

    type TransferData = {
        selectedAssets: { [key: string]: unknown }[];
        fechaTransferencia: string;
        cuentaDestino: string;
        porcentajeTransferencia: string;
        simulationOnly?: boolean;
    };

    type BajaFisicaData = { bienId: string };

    type UserPostRequest =
        | { petition: "Get"; client: string; data: Record<string, never> }
        | { petition: "GetSimulacion"; client: string; data: Record<string, never> }
        | { petition: "UpdateOrder"; client: string; data: ReOrderData }
        | { petition: "SetListShow"; client: string; data: SetListShowData }
        | { petition: "SetListShowBatch"; client: string; data: SetListShowBatchData }
        | { petition: "Baja"; client: string; data: BajaData }
        | { petition: "Transfer"; client: string; data: TransferData }
        | { petition: "BajaFisica"; client: string; data: BajaFisicaData };

    const requestId = createRequestId();
    let client: string | undefined;
    let petition: string | undefined;

    try {

        const body = await request.json() as UserPostRequest;
        client = body.client;
        petition = body.petition;
        const { data } = body;
        const userId = (await getSessionValue("user"))?.trim() || "";
        const fixedAssetsModel = new FixedAsset(client, userId);

        switch (petition) {
            case "Get":
                return NextResponse.json(await fixedAssetsModel.getAll());
            case "GetSimulacion":
                return NextResponse.json(await fixedAssetsModel.getAllSimulacion());
            case "UpdateOrder":
                return NextResponse.json(await fixedAssetsModel.changeOrder(data as ReOrderData));
            case "SetListShow": {
                const { fieldId, listShow, tableId } = data as SetListShowData;
                return NextResponse.json(await fixedAssetsModel.setListShow(fieldId, listShow, tableId || "actifijo"));
            }
            case "SetListShowBatch": {
                const batch = data as SetListShowBatchData;
                const updates = (batch?.updates ?? []).map((u) => ({
                    idCampo: u.fieldId,
                    listShow: u.listShow,
                }));
                return NextResponse.json(await fixedAssetsModel.setListShowBatch(updates, batch?.tableId || "actifijo"));
            }
            case "Baja": {
                const bajaData = data as BajaData;
                if (!bajaData?.selectedAssets?.length) {
                    return errorJson("No hay bienes seleccionados", 400, requestId);
                }
                const result = await fixedAssetsModel.bajaBienes({
                    selectedAssets: bajaData.selectedAssets,
                    fechaBaja: bajaData.fechaBaja ?? "",
                    tipoBaja: bajaData.tipoBaja ?? "",
                    precioVenta: bajaData.precioVenta ?? "0",
                    porcentajeBaja: bajaData.porcentajeBaja ?? "100",
                    simulationOnly: !!bajaData.simulationOnly,
                });
                return NextResponse.json(result);
            }
            case "Transfer": {
                const transferData = data as TransferData;
                if (!transferData?.selectedAssets?.length) {
                    return errorJson("No hay bienes seleccionados", 400, requestId);
                }
                if (!transferData?.cuentaDestino?.trim()) {
                    return errorJson("Cuenta destino requerida", 400, requestId);
                }
                const result = await fixedAssetsModel.transferBienes({
                    selectedAssets: transferData.selectedAssets,
                    fechaTransferencia: transferData.fechaTransferencia ?? "",
                    cuentaDestino: transferData.cuentaDestino ?? "",
                    porcentajeTransferencia: transferData.porcentajeTransferencia ?? "100",
                    simulationOnly: !!transferData.simulationOnly,
                });
                return NextResponse.json(result);
            }
            case "BajaFisica": {
                const bajaFisicaData = data as BajaFisicaData;
                if (!bajaFisicaData?.bienId?.trim()) {
                    return errorJson("bienId requerido", 400, requestId);
                }
                const result = await fixedAssetsModel.bajaFisica(bajaFisicaData.bienId);
                return NextResponse.json(result);
            }
            default:
                throw new Error("Petición desconocida");
        }

    } catch (err) {
        const loggedId = await logApiError({ route: ROUTE, err, client, petition, requestId });
        if (err instanceof Error) {
            return errorJson(err.message, 500, loggedId);
        }
        return errorJson("Error desconocido", 500, loggedId);
    }
}
