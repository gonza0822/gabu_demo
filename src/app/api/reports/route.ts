import { NextResponse } from "next/server";
import Reports, {
    type ReportType,
    type ReportsConfig,
    type ChargeCompositionData,
} from "@/lib/models/reports/Reports";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";

type ErrorResponse = { message: string; status: number; requestId?: string };

const ROUTE = "/api/reports";

type GenerateData = {
    reportType: ReportType;
    book: string;
    bookTableName: string;
    period: string;
    /** YYYY-MM-DD; obligatorio para Altas / Bajas / Transferencias. */
    dateFrom?: string;
    dateTo?: string;
};

type UserPostRequest =
    | { petition: "GetConfig"; client: string; data: { simulationOnly?: boolean } }
    | { petition: "Generate"; client: string; data: GenerateData }
    | { petition: "GetAsientosFieldLabels"; client: string; data: { book: string; bookTableName: string } }
    | { petition: "GetChargeComposition"; client: string; data: { bienIds: string[] } };

export async function POST(
    request: Request
): Promise<
        NextResponse<
            ReportsConfig | Record<string, unknown>[] | ChargeCompositionData | { labels: Record<string, string> } | { ok: boolean } | ErrorResponse
        >
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

        const reports = new Reports(client);

        switch (petition) {
            case "GetConfig":
                return NextResponse.json(await reports.getConfig(Boolean((body as Extract<UserPostRequest, { petition: "GetConfig" }>).data?.simulationOnly)));
            case "GetAsientosFieldLabels": {
                const d = (body as Extract<UserPostRequest, { petition: "GetAsientosFieldLabels" }>).data;
                if (!d?.book || !d?.bookTableName) {
                    return errorJson("Faltan datos del libro", 400, requestId);
                }
                return NextResponse.json({
                    labels: await reports.getAsientosConverFieldLabels(d.book, d.bookTableName),
                });
            }
            case "Generate": {
                const payload = (body as Extract<UserPostRequest, { petition: "Generate" }>).data;
                if (!payload?.reportType || !payload?.book || !payload?.bookTableName) {
                    return errorJson("Faltan datos para generar el reporte", 400, requestId);
                }
                const period = payload.period ?? "";
                if (payload.reportType !== "ASIENTOS" && !period) {
                    return errorJson("Faltan datos para generar el reporte", 400, requestId);
                }
                return NextResponse.json(
                    await reports.runReport({
                        reportType: payload.reportType,
                        book: payload.book,
                        bookTableName: payload.bookTableName,
                        period,
                        dateFrom: payload.dateFrom,
                        dateTo: payload.dateTo,
                    })
                );
            }
            case "GetChargeComposition": {
                const d = (body as Extract<UserPostRequest, { petition: "GetChargeComposition" }>).data;
                return NextResponse.json(await reports.getChargeCompositionForBienIds(d?.bienIds ?? []));
            }
            default:
                return errorJson("Petición desconocida", 400, requestId);
        }
    } catch (err) {
        const loggedId = await logApiError({ route: ROUTE, err, client, petition, requestId });
        if (err instanceof Error) {
            return errorJson(err.message, 500, loggedId);
        }
        return errorJson("Error desconocido", 500, loggedId);
    }
}
