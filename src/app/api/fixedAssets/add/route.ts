import { NextResponse } from "next/server";
import FixedAsset, { type AbmDatosGeneralesData, type AbmCabeceraData, type AbmLibrosData } from "@/lib/models/fixedAssets/FixedAsset";

export type ErrorResponse = { message: string; status: number };

type UserPostRequest =
    | { petition: "GetFormData"; client: string; data: {} }
    | { petition: "GetCabeceraFormData"; client: string; data: {} }
    | { petition: "GetLibrosFormData"; client: string; data: {} }
    | { petition: "GetCCostosOptions"; client: string; data: {} }
    | { petition: "Add"; client: string; data: Record<string, unknown> };

export async function POST(
    request: Request
): Promise<NextResponse<AbmDatosGeneralesData | AbmCabeceraData | AbmLibrosData | { key: string; value: string }[] | { ok: boolean } | ErrorResponse>> {
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
                return NextResponse.json(await fixedAssetModel.getAbmCabeceraData());
            case "GetLibrosFormData":
                return NextResponse.json(await fixedAssetModel.getAbmLibrosData());
            case "GetCCostosOptions":
                return NextResponse.json(await fixedAssetModel.getCCostosOptions());
            case "Add":
                return NextResponse.json({ ok: true });
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
