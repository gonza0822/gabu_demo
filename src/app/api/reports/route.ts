import { NextResponse } from "next/server";
import Reports, { type ReportType, type ReportsConfig } from "@/lib/models/reports/Reports";

type ErrorResponse = { message: string; status: number };

type GenerateData = {
    reportType: ReportType;
    book: string;
    bookTableName: string;
    period: string;
};

type UserPostRequest =
    | { petition: "GetConfig"; client: string; data: {} }
    | { petition: "Generate"; client: string; data: GenerateData };

export async function POST(
    request: Request
): Promise<NextResponse<ReportsConfig | Record<string, unknown>[] | { ok: boolean } | ErrorResponse>> {
    try {
        const { client, petition, data } = (await request.json()) as UserPostRequest;
        if (!client) {
            return NextResponse.json({ message: "Client is required", status: 400 }, { status: 400 });
        }

        const reports = new Reports(client);

        switch (petition) {
            case "GetConfig":
                return NextResponse.json(await reports.getConfig());
            case "Generate": {
                const payload = data;
                if (!payload?.reportType || !payload?.book || !payload?.bookTableName || !payload?.period) {
                    return NextResponse.json({ message: "Faltan datos para generar el reporte", status: 400 }, { status: 400 });
                }
                return NextResponse.json(
                    await reports.runReport({
                        reportType: payload.reportType,
                        book: payload.book,
                        bookTableName: payload.bookTableName,
                        period: payload.period,
                    })
                );
            }
            default:
                return NextResponse.json({ message: "Petición desconocida", status: 400 }, { status: 400 });
        }
    } catch (err) {
        if (err instanceof Error) {
            console.error(err);
            return NextResponse.json({ message: err.message, status: 500 }, { status: 500 });
        }
        return NextResponse.json({ message: "Error desconocido", status: 500 }, { status: 500 });
    }
}
