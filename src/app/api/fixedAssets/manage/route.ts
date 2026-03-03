import { NextResponse } from "next/server";
import { ConverFieldModel } from "@/generated/prisma/models";
import { FixedAssetsData } from "@/lib/models/fixedAssets/FixedAsset";
import FixedAsset from "@/lib/models/fixedAssets/FixedAsset";
import { ReOrderData } from "@/lib/models/tables/Table";

export type ErrorResponse = { message: string, status: number }

export async function POST(request: Request): Promise<NextResponse<FixedAssetsData | ConverFieldModel | unknown[] | ErrorResponse>> {

    type SetListShowData = { fieldId: string; listShow: boolean };

    type UserPostRequest =
        | { petition: "Get"; client: string; data: {} }
        | { petition: "UpdateOrder"; client: string; data: ReOrderData }
        | { petition: "SetListShow"; client: string; data: SetListShowData };

    try {

        const { client, petition, data } = await request.json() as UserPostRequest;
        const fixedAssetsModel = new FixedAsset(client);

        switch (petition) {
            case "Get":
                return NextResponse.json(await fixedAssetsModel.getAll());
            case "UpdateOrder":
                return NextResponse.json(await fixedAssetsModel.changeOrder(data as ReOrderData));
            case "SetListShow": {
                const { fieldId, listShow } = data as SetListShowData;
                return NextResponse.json(await fixedAssetsModel.setListShow(fieldId, listShow));
            }
            default:
                throw new Error("Petición desconocida");
        }

    } catch (err) {
        if (err instanceof Error) {
            console.log(err);
            return NextResponse.json({ message: err.message, status: 500 });
        }
        return NextResponse.json({ message: "Error desconocido", status: 500 });
    }
}
