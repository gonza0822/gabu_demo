import { NextResponse } from "next/server";
import Investments, { InvestmentType, InvestmentsData } from "@/lib/models/investments/Investments";
import { ConverFieldModel } from "@/generated/prisma/models";
import { ReOrderData } from "@/lib/models/tables/Table";

type ErrorResponse = { message: string; status: number };

type UserPostRequest =
    | { petition: "Get"; client: string; data: { type: InvestmentType } }
    | { petition: "SetListShow"; client: string; data: { type: InvestmentType; fieldId: string; listShow: boolean } }
    | { petition: "UpdateOrder"; client: string; data: { type: InvestmentType; order: ReOrderData } };

export async function POST(
    request: Request
): Promise<NextResponse<InvestmentsData | ConverFieldModel | ConverFieldModel[] | ErrorResponse>> {
    try {
        const { client, petition, data } = (await request.json()) as UserPostRequest;
        if (!client) {
            return NextResponse.json({ message: "Client is required", status: 400 }, { status: 400 });
        }
        if (!data?.type) {
            return NextResponse.json({ message: "Type is required", status: 400 }, { status: 400 });
        }

        const model = new Investments(client, data.type);

        switch (petition) {
            case "Get":
                return NextResponse.json(await model.getAll());
            case "SetListShow":
                return NextResponse.json(await model.setListShow(data.fieldId, data.listShow));
            case "UpdateOrder":
                return NextResponse.json(await model.changeOrder(data.order));
            default:
                return NextResponse.json({ message: "Peticion desconocida", status: 400 }, { status: 400 });
        }
    } catch (err) {
        if (err instanceof Error) {
            console.error(err);
            return NextResponse.json({ message: err.message, status: 500 }, { status: 500 });
        }
        return NextResponse.json({ message: "Error desconocido", status: 500 }, { status: 500 });
    }
}
