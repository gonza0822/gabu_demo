import { NextResponse } from "next/server";
import Processes, { type ProcessTableRow } from "@/lib/models/processes/Processes";

type ErrorResponse = { message: string; status: number };

type UserPostRequest =
    | { petition: "GetRows"; client: string; data: { simulationOnly?: boolean } }
    | { petition: "RunCalculoAmortizacion"; client: string; data: { row: ProcessTableRow } }
    | { petition: "RunGeneracionAsientos"; client: string; data: { row: ProcessTableRow } }
    | { petition: "FinalizeCalculoAmortizacion"; client: string; data: {} }
    | { petition: "RunCierreMensual"; client: string; data: { row: ProcessTableRow } }
    | { petition: "RunCierreEjercicio"; client: string; data: { row: ProcessTableRow } };

export async function POST(
    request: Request
): Promise<NextResponse<ProcessTableRow[] | { ok: boolean } | ErrorResponse>> {
    try {
        const { client, petition, data } = (await request.json()) as UserPostRequest;
        if (!client) {
            return NextResponse.json({ message: "Client is required", status: 400 }, { status: 400 });
        }

        const processes = new Processes(client);

        switch (petition) {
            case "GetRows":
                return NextResponse.json(await processes.getProcessRows(Boolean(data?.simulationOnly)));
            case "RunCalculoAmortizacion": {
                const row = data?.row;
                if (!row) return NextResponse.json({ message: "row is required", status: 400 }, { status: 400 });
                await processes.runCalculoAmortizacion(row);
                return NextResponse.json({ ok: true });
            }
            case "RunGeneracionAsientos": {
                const row = data?.row;
                if (!row) return NextResponse.json({ message: "row is required", status: 400 }, { status: 400 });
                await processes.runGeneracionAsientos(row);
                return NextResponse.json({ ok: true });
            }
            case "FinalizeCalculoAmortizacion":
                await processes.syncCabeceraFecproFromParametroMl();
                return NextResponse.json({ ok: true });
            case "RunCierreMensual": {
                const row = data?.row;
                if (!row) return NextResponse.json({ message: "row is required", status: 400 }, { status: 400 });
                await processes.runCierreMensual(row);
                return NextResponse.json({ ok: true });
            }
            case "RunCierreEjercicio": {
                const row = data?.row;
                if (!row) return NextResponse.json({ message: "row is required", status: 400 }, { status: 400 });
                await processes.runCierreEjercicio(row);
                return NextResponse.json({ ok: true });
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
