import { NextResponse } from "next/server";
import Investments, {
    InvestmentType,
    InvestmentsData,
    TransferSupportData,
    ChargesTransferPayload,
    ChargesTransferSimulationPayload,
    ChargesTransferResult,
} from "@/lib/models/investments/Investments";
import { ConverFieldModel } from "@/generated/prisma/models";
import { ReOrderData } from "@/lib/models/tables/Table";

type ErrorResponse = { message: string; status: number };

type UserPostRequest =
    | { petition: "Get"; client: string; data: { type: InvestmentType } }
    | { petition: "GetTransferSupport"; client: string; data: { type: InvestmentType } }
    | { petition: "GetTransferSupportSimulation"; client: string; data: { type: InvestmentType } }
    | { petition: "TransferCharges"; client: string; data: { type: InvestmentType } & ChargesTransferPayload }
    | { petition: "TransferChargesSimulation"; client: string; data: { type: InvestmentType } & ChargesTransferSimulationPayload }
    | { petition: "SetListShow"; client: string; data: { type: InvestmentType; fieldId: string; listShow: boolean } }
    | { petition: "UpdateOrder"; client: string; data: { type: InvestmentType; order: ReOrderData } }
    | { petition: "GetByBien"; client: string; data: { type: InvestmentType; bienId: string } };

export async function POST(
    request: Request
): Promise<
    NextResponse<InvestmentsData | TransferSupportData | ChargesTransferResult | ConverFieldModel | ConverFieldModel[] | ErrorResponse>
> {
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
            case "GetTransferSupport":
                return NextResponse.json(await model.getTransferSupportData());
            case "GetTransferSupportSimulation":
                return NextResponse.json(await model.getTransferSupportData(true));
            case "TransferCharges":
                return NextResponse.json(await model.transferChargesToFixedAsset(data));
            case "TransferChargesSimulation":
                return NextResponse.json(await model.transferChargesToSimulation(data));
            case "SetListShow":
                return NextResponse.json(await model.setListShow(data.fieldId, data.listShow));
            case "UpdateOrder":
                return NextResponse.json(await model.changeOrder(data.order));
            case "GetByBien": {
                const bienId = (data as { bienId?: string }).bienId;
                if (!bienId?.trim()) {
                    return NextResponse.json({ message: "bienId is required", status: 400 }, { status: 400 });
                }
                if (data.type !== "charges") {
                    return NextResponse.json({ message: "GetByBien sólo aplica a cargos", status: 400 }, { status: 400 });
                }
                return NextResponse.json(await model.getChargesByBienId(bienId.trim()));
            }
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
