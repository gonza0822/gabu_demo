import { NextResponse } from "next/server";
import { ConverFieldModel } from "@/generated/prisma/models";
import { FixedAssetsData } from "@/lib/models/fixedAssets/FixedAsset";
import FixedAsset from "@/lib/models/fixedAssets/FixedAsset";
import { ReOrderData } from "@/lib/models/tables/Table";

export type ErrorResponse = { message: string, status: number }

export async function POST(request: Request): Promise<NextResponse<FixedAssetsData | ConverFieldModel | unknown[] | { ok: boolean } | ErrorResponse>> {

    type SetListShowData = { fieldId: string; listShow: boolean };

    type BajaData = {
        selectedAssets: { [key: string]: unknown }[];
        fechaBaja: string;
        tipoBaja: string;
        precioVenta: string;
        porcentajeBaja: string;
    };

    type TransferData = {
        selectedAssets: { [key: string]: unknown }[];
        fechaTransferencia: string;
        cuentaDestino: string;
        porcentajeTransferencia: string;
    };

    type BajaFisicaData = { bienId: string };

    type UserPostRequest =
        | { petition: "Get"; client: string; data: {} }
        | { petition: "GetSimulacion"; client: string; data: {} }
        | { petition: "UpdateOrder"; client: string; data: ReOrderData }
        | { petition: "SetListShow"; client: string; data: SetListShowData }
        | { petition: "Baja"; client: string; data: BajaData }
        | { petition: "Transfer"; client: string; data: TransferData }
        | { petition: "BajaFisica"; client: string; data: BajaFisicaData };

    try {

        const { client, petition, data } = await request.json() as UserPostRequest;
        const fixedAssetsModel = new FixedAsset(client);

        switch (petition) {
            case "Get":
                return NextResponse.json(await fixedAssetsModel.getAll());
            case "GetSimulacion":
                return NextResponse.json(await fixedAssetsModel.getAllSimulacion());
            case "UpdateOrder":
                return NextResponse.json(await fixedAssetsModel.changeOrder(data as ReOrderData));
            case "SetListShow": {
                const { fieldId, listShow } = data as SetListShowData;
                return NextResponse.json(await fixedAssetsModel.setListShow(fieldId, listShow));
            }
            case "Baja": {
                const bajaData = data as BajaData;
                if (!bajaData?.selectedAssets?.length) {
                    return NextResponse.json({ message: "No hay bienes seleccionados", status: 400 }, { status: 400 });
                }
                const result = await fixedAssetsModel.bajaBienes({
                    selectedAssets: bajaData.selectedAssets,
                    fechaBaja: bajaData.fechaBaja ?? "",
                    tipoBaja: bajaData.tipoBaja ?? "",
                    precioVenta: bajaData.precioVenta ?? "0",
                    porcentajeBaja: bajaData.porcentajeBaja ?? "100",
                });
                return NextResponse.json(result);
            }
            case "Transfer": {
                const transferData = data as TransferData;
                if (!transferData?.selectedAssets?.length) {
                    return NextResponse.json({ message: "No hay bienes seleccionados", status: 400 }, { status: 400 });
                }
                if (!transferData?.cuentaDestino?.trim()) {
                    return NextResponse.json({ message: "Cuenta destino requerida", status: 400 }, { status: 400 });
                }
                const result = await fixedAssetsModel.transferBienes({
                    selectedAssets: transferData.selectedAssets,
                    fechaTransferencia: transferData.fechaTransferencia ?? "",
                    cuentaDestino: transferData.cuentaDestino ?? "",
                    porcentajeTransferencia: transferData.porcentajeTransferencia ?? "100",
                });
                return NextResponse.json(result);
            }
            case "BajaFisica": {
                const bajaFisicaData = data as BajaFisicaData;
                if (!bajaFisicaData?.bienId?.trim()) {
                    return NextResponse.json({ message: "bienId requerido", status: 400 }, { status: 400 });
                }
                const result = await fixedAssetsModel.bajaFisica(bajaFisicaData.bienId);
                return NextResponse.json(result);
            }
            default:
                throw new Error("Petición desconocida");
        }

    } catch (err) {
        if (err instanceof Error) {
            console.log(err);
            return NextResponse.json({ message: err.message, status: 500 }, { status: 500 });
        }
        return NextResponse.json({ message: "Error desconocido", status: 500 }, { status: 500 });
    }
}
