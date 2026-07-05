import { NextResponse } from "next/server";
import Processes, { type ProcessTableRow } from "@/lib/models/processes/Processes";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";

type ErrorResponse = { message: string; status: number; requestId?: string };

const ROUTE = "/api/processes";

type UserPostRequest =
    | { petition: "GetRows"; client: string; data: { simulationOnly?: boolean } }
    | { petition: "RunCalculoAmortizacion"; client: string; data: { row: ProcessTableRow } }
    | { petition: "RunGeneracionAsientos"; client: string; data: { row: ProcessTableRow } }
    | { petition: "FinalizeCalculoAmortizacion"; client: string; data: Record<string, never> }
    | { petition: "RunCierreMensual"; client: string; data: { row: ProcessTableRow } }
    | { petition: "RunCierreEjercicio"; client: string; data: { row: ProcessTableRow } };

export async function POST(
    request: Request
): Promise<NextResponse<ProcessTableRow[] | { ok: boolean } | ErrorResponse>> {
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

        const processes = new Processes(client);

        switch (petition) {
            case "GetRows":
                return NextResponse.json(await processes.getProcessRows(Boolean((body as Extract<UserPostRequest, { petition: "GetRows" }>).data?.simulationOnly)));
            case "RunCalculoAmortizacion": {
                const row = (body as Extract<UserPostRequest, { petition: "RunCalculoAmortizacion" }>).data?.row;
                if (!row) return errorJson("row is required", 400, requestId);
                await processes.runCalculoAmortizacion(row);
                return NextResponse.json({ ok: true });
            }
            case "RunGeneracionAsientos": {
                const row = (body as Extract<UserPostRequest, { petition: "RunGeneracionAsientos" }>).data?.row;
                if (!row) return errorJson("row is required", 400, requestId);
                await processes.runGeneracionAsientos(row);
                return NextResponse.json({ ok: true });
            }
            case "FinalizeCalculoAmortizacion":
                await processes.syncCabeceraFecproFromParametroMl();
                return NextResponse.json({ ok: true });
            case "RunCierreMensual": {
                const row = (body as Extract<UserPostRequest, { petition: "RunCierreMensual" }>).data?.row;
                if (!row) return errorJson("row is required", 400, requestId);
                await processes.runCierreMensual(row);
                return NextResponse.json({ ok: true });
            }
            case "RunCierreEjercicio": {
                const row = (body as Extract<UserPostRequest, { petition: "RunCierreEjercicio" }>).data?.row;
                if (!row) return errorJson("row is required", 400, requestId);
                await processes.runCierreEjercicio(row);
                return NextResponse.json({ ok: true });
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
