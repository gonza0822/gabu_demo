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
import { createRequestId, errorJson, logApiError } from "@/lib/logger";

type ErrorResponse = { message: string; status: number; requestId?: string };

const ROUTE = "/api/investments";

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
        if (!body.data?.type) {
            return errorJson("Type is required", 400, requestId);
        }

        const model = new Investments(client, body.data.type);

        switch (petition) {
            case "Get":
                return NextResponse.json(await model.getAll());
            case "GetTransferSupport":
                return NextResponse.json(await model.getTransferSupportData());
            case "GetTransferSupportSimulation":
                return NextResponse.json(await model.getTransferSupportData(true));
            case "TransferCharges":
                return NextResponse.json(await model.transferChargesToFixedAsset((body as Extract<UserPostRequest, { petition: "TransferCharges" }>).data));
            case "TransferChargesSimulation":
                return NextResponse.json(await model.transferChargesToSimulation((body as Extract<UserPostRequest, { petition: "TransferChargesSimulation" }>).data));
            case "SetListShow": {
                const d = (body as Extract<UserPostRequest, { petition: "SetListShow" }>).data;
                return NextResponse.json(await model.setListShow(d.fieldId, d.listShow));
            }
            case "UpdateOrder": {
                const d = (body as Extract<UserPostRequest, { petition: "UpdateOrder" }>).data;
                return NextResponse.json(await model.changeOrder(d.order));
            }
            case "GetByBien": {
                const d = (body as Extract<UserPostRequest, { petition: "GetByBien" }>).data;
                const bienId = d.bienId;
                if (!bienId?.trim()) {
                    return errorJson("bienId is required", 400, requestId);
                }
                if (d.type !== "charges") {
                    return errorJson("GetByBien sólo aplica a cargos", 400, requestId);
                }
                return NextResponse.json(await model.getChargesByBienId(bienId.trim()));
            }
            default:
                return errorJson("Peticion desconocida", 400, requestId);
        }
    } catch (err) {
        const loggedId = await logApiError({ route: ROUTE, err, client, petition, requestId });
        if (err instanceof Error) {
            return errorJson(err.message, 500, loggedId);
        }
        return errorJson("Error desconocido", 500, loggedId);
    }
}
